/**
 * TensorFlow.js ML Trainer — handles all in-browser machine learning
 * Supports image (MobileNet transfer learning), text (Bag-of-Words TF-IDF), and CSV classification
 * Rule 14: Training is cancellable via model.stopTraining = true
 */

import * as tf from '@tensorflow/tfjs';
import type { ClassData, DataType, TrainingConfig, TrainingMetrics } from '../types';
import { ML_CONFIG } from '../constants';

let currentModel: tf.LayersModel | null = null;
let baseModel: tf.LayersModel | null = null;
let isStopRequested = false;

// Persist data preprocessing states for inference
let textVocab: Record<string, number> = {};
let textIdf: Record<string, number> = {};
let csvMin: tf.Tensor | null = null;
let csvMax: tf.Tensor | null = null;

// ── Preprocessing State Persistence ──────────────────────────
// Fixes Bug 1: textVocab / csvMin / csvMax must survive page reloads.

const PREPROCESSING_KEY = 'tm-preprocessing-state';

interface PreprocessingState {
  textVocab: Record<string, number>;
  textIdf: Record<string, number>;
  csvMin: number[] | null;
  csvMax: number[] | null;
}

/** Save preprocessing state to localStorage so inference works after reload. */
function savePreprocessingState(): void {
  try {
    const state: PreprocessingState = {
      textVocab,
      textIdf,
      csvMin: csvMin ? Array.from(csvMin.dataSync()) : null,
      csvMax: csvMax ? Array.from(csvMax.dataSync()) : null,
    };
    localStorage.setItem(PREPROCESSING_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to persist preprocessing state:', err);
  }
}

/** Restore preprocessing state from localStorage. */
function restorePreprocessingState(): void {
  try {
    const raw = localStorage.getItem(PREPROCESSING_KEY);
    if (!raw) return;

    const state: PreprocessingState = JSON.parse(raw);

    // Restore textVocab (plain object, always safe)
    if (state.textVocab && Object.keys(state.textVocab).length > 0) {
      textVocab = state.textVocab;
    }

    // Restore textIdf
    if (state.textIdf && Object.keys(state.textIdf).length > 0) {
      textIdf = state.textIdf;
    }

    // Restore csvMin / csvMax as 1-D tensors, kept outside tf.tidy
    if (state.csvMin) {
      if (csvMin) csvMin.dispose();
      csvMin = tf.keep(tf.tensor1d(state.csvMin));
    }
    if (state.csvMax) {
      if (csvMax) csvMax.dispose();
      csvMax = tf.keep(tf.tensor1d(state.csvMax));
    }
  } catch (err) {
    console.warn('Failed to restore preprocessing state:', err);
  }
}

/** Load MobileNet feature extractor for image classification */
async function loadMobileNet(): Promise<tf.LayersModel> {
  if (baseModel) return baseModel;

  // Load MobileNetV1 from TF Hub
  const mobilenet = await tf.loadLayersModel(
    'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
  );

  // Use an intermediate layer as feature extractor
  const layer = mobilenet.getLayer('conv_pw_13_relu');
  baseModel = tf.model({
    inputs: mobilenet.inputs,
    outputs: layer.output as tf.SymbolicTensor,
  });

  return baseModel;
}

/** Convert base64 image to tensor */
function imageToTensor(base64: string): tf.Tensor3D {
  return tf.tidy(() => {
    const img = new Image();
    img.src = base64;
    const canvas = document.createElement('canvas');
    canvas.width = ML_CONFIG.IMAGE_SIZE;
    canvas.height = ML_CONFIG.IMAGE_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, ML_CONFIG.IMAGE_SIZE, ML_CONFIG.IMAGE_SIZE);
    const imageData = ctx.getImageData(0, 0, ML_CONFIG.IMAGE_SIZE, ML_CONFIG.IMAGE_SIZE);
    return tf.browser.fromPixels(imageData).toFloat().div(255.0);
  });
}

/**
 * Validate that a base64 string is a valid image (not raw audio).
 * Fixes Bug 3a: Audio pipeline assumes spectrogram images but may receive raw audio blobs.
 */
function isValidImageData(base64: string): boolean {
  // data:image/* prefix is required for valid image data
  return base64.startsWith('data:image/');
}

/** Prepare image dataset with MobileNet feature extraction */
async function prepareImageDataset(
  classes: ClassData[],
  onProgress?: (msg: string) => void
): Promise<{ features: tf.Tensor; labels: tf.Tensor }> {
  onProgress?.('Loading MobileNet...');
  const featureExtractor = await loadMobileNet();

  const allFeatures: tf.Tensor[] = [];
  const allLabels: number[] = [];

  for (let classIdx = 0; classIdx < classes.length; classIdx++) {
    const cls = classes[classIdx];
    onProgress?.(`Processing ${cls.name} (${cls.samples.length} samples)...`);

    for (const sample of cls.samples) {
      const imgTensor = imageToTensor(sample.data);
      const batched = imgTensor.expandDims(0);
      const features = featureExtractor.predict(batched) as tf.Tensor;
      const flattened = features.reshape([1, -1]);
      allFeatures.push(flattened);
      allLabels.push(classIdx);
      imgTensor.dispose();
      batched.dispose();
      features.dispose();
    }
  }

  const featureTensor = tf.concat(allFeatures);
  allFeatures.forEach((f) => f.dispose());

  const labelsTensor = tf.oneHot(tf.tensor1d(allLabels, 'int32'), classes.length);

  return { features: featureTensor, labels: labelsTensor };
}

// ── Text Processing: Bag-of-Words with TF-IDF ───────────────

/** Tokenize text: lowercase, remove punctuation, split on whitespace */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // remove punctuation
    .split(/\s+/)
    .filter((w) => w.length > 1); // remove single-char words
}

/** Build Bag-of-Words vocabulary and IDF weights from training data */
function buildBowVocabulary(classes: ClassData[]): {
  vocab: Record<string, number>;
  idf: Record<string, number>;
} {
  const docFreq: Record<string, number> = {};
  let totalDocs = 0;
  const allWords = new Set<string>();

  // Count document frequency for each word
  for (const cls of classes) {
    for (const sample of cls.samples) {
      const words = new Set(tokenize(sample.data));
      totalDocs++;
      words.forEach((word) => {
        allWords.add(word);
        docFreq[word] = (docFreq[word] || 0) + 1;
      });
    }
  }

  // Sort by frequency and take top N
  const sortedWords = [...allWords]
    .sort((a, b) => (docFreq[b] || 0) - (docFreq[a] || 0))
    .slice(0, ML_CONFIG.TEXT_VOCAB_SIZE);

  // Build vocab index
  const vocab: Record<string, number> = {};
  sortedWords.forEach((word, i) => {
    vocab[word] = i;
  });

  // Compute IDF: log(totalDocs / docFreq)
  const idf: Record<string, number> = {};
  sortedWords.forEach((word) => {
    idf[word] = Math.log((totalDocs + 1) / ((docFreq[word] || 0) + 1)) + 1;
  });

  return { vocab, idf };
}

/** Convert a single text to a TF-IDF vector using the vocabulary */
function textToTfIdfVector(text: string, vocab: Record<string, number>, idf: Record<string, number>): number[] {
  const vocabSize = Object.keys(vocab).length;
  const vector = new Array(vocabSize).fill(0);
  const words = tokenize(text);

  // Count term frequencies
  const tf_counts: Record<string, number> = {};
  for (const word of words) {
    if (word in vocab) {
      tf_counts[word] = (tf_counts[word] || 0) + 1;
    }
  }

  // Compute TF-IDF for each word
  const maxTf = Math.max(...Object.values(tf_counts), 1);
  for (const [word, count] of Object.entries(tf_counts)) {
    const idx = vocab[word];
    if (idx !== undefined) {
      // Normalized TF * IDF
      const normalizedTf = count / maxTf;
      vector[idx] = normalizedTf * (idf[word] || 1);
    }
  }

  // L2 normalize the entire vector for better model performance
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/** Build TF-IDF dataset for text classification */
function prepareTextDataset(
  classes: ClassData[]
): { features: tf.Tensor; labels: tf.Tensor; vocabSize: number } {
  // Build vocabulary and IDF weights
  const { vocab, idf } = buildBowVocabulary(classes);
  textVocab = vocab; // Save globally for inference
  textIdf = idf;     // Save IDF for inference

  const vocabSize = Object.keys(vocab).length;
  const allFeatures: number[][] = [];
  const allLabels: number[] = [];

  for (let classIdx = 0; classIdx < classes.length; classIdx++) {
    for (const sample of classes[classIdx].samples) {
      const vector = textToTfIdfVector(sample.data, vocab, idf);
      allFeatures.push(vector);
      allLabels.push(classIdx);
    }
  }

  return {
    features: tf.tensor2d(allFeatures),
    labels: tf.oneHot(tf.tensor1d(allLabels, 'int32'), classes.length),
    vocabSize,
  };
}

/** Get adaptive training config based on sample count */
function getAdaptiveConfig(totalSamples: number, config: TrainingConfig): {
  epochs: number;
  learningRate: number;
  batchSize: number;
  validationSplit: number;
} {
  let { epochs, learningRate, batchSize, validationSplit } = config;

  if (totalSamples < 20) {
    // Very few samples — no validation, more epochs, smaller batch
    validationSplit = 0;
    epochs = Math.max(epochs, 100);
    batchSize = Math.min(batchSize, totalSamples);
    learningRate = Math.min(learningRate, 0.005);
  } else if (totalSamples < 50) {
    validationSplit = 0.1;
    epochs = Math.max(epochs, 80);
    batchSize = Math.min(batchSize, Math.ceil(totalSamples / 2));
  } else if (totalSamples < 100) {
    validationSplit = Math.min(validationSplit, 0.15);
    batchSize = Math.min(batchSize, 16);
  }

  return { epochs, learningRate, batchSize, validationSplit };
}

/** Build and train image classification model */
async function trainImageModel(
  classes: ClassData[],
  config: TrainingConfig,
  onEpochEnd: (metrics: TrainingMetrics) => void,
  onProgress?: (msg: string) => void
): Promise<tf.LayersModel> {
  const { features, labels } = await prepareImageDataset(classes, onProgress);
  const featureShape = features.shape[1]!;
  const totalSamples = features.shape[0];
  const adaptive = getAdaptiveConfig(totalSamples, config);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [featureShape], units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(adaptive.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  onProgress?.('Training started...');

  await model.fit(features, labels, {
    epochs: adaptive.epochs,
    batchSize: adaptive.batchSize,
    validationSplit: adaptive.validationSplit,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (isStopRequested) {
          model.stopTraining = true;
          return;
        }
        onEpochEnd({
          epoch,
          loss: logs?.loss ?? 0,
          accuracy: (logs?.acc ?? logs?.accuracy ?? 0) * 100,
          valLoss: logs?.val_loss ?? 0,
          valAccuracy: (logs?.val_acc ?? logs?.val_accuracy ?? 0) * 100,
        });
      },
    },
  });

  features.dispose();
  labels.dispose();

  return model;
}

/** Build and train text classification model using Bag-of-Words TF-IDF */
async function trainTextModel(
  classes: ClassData[],
  config: TrainingConfig,
  onEpochEnd: (metrics: TrainingMetrics) => void
): Promise<tf.LayersModel> {
  const { features, labels, vocabSize } = prepareTextDataset(classes);
  const totalSamples = features.shape[0];
  const adaptive = getAdaptiveConfig(totalSamples, config);

  console.log(`Text model: ${totalSamples} samples, vocab size: ${vocabSize}, ` +
    `epochs: ${adaptive.epochs}, valSplit: ${adaptive.validationSplit}`);

  const model = tf.sequential();

  // Simple dense network on TF-IDF features — works great with small data
  model.add(tf.layers.dense({
    inputShape: [vocabSize],
    units: Math.min(64, Math.max(16, Math.floor(vocabSize / 2))),
    activation: 'relu',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
  }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({
    units: Math.min(32, Math.max(8, Math.floor(vocabSize / 4))),
    activation: 'relu',
  }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(adaptive.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(features, labels, {
    epochs: adaptive.epochs,
    batchSize: adaptive.batchSize,
    validationSplit: adaptive.validationSplit,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (isStopRequested) {
          model.stopTraining = true;
          return;
        }
        onEpochEnd({
          epoch,
          loss: logs?.loss ?? 0,
          accuracy: (logs?.acc ?? logs?.accuracy ?? 0) * 100,
          valLoss: logs?.val_loss ?? 0,
          valAccuracy: (logs?.val_acc ?? logs?.val_accuracy ?? 0) * 100,
        });
      },
    },
  });

  features.dispose();
  labels.dispose();

  return model;
}

/** Build and train CSV classification model */
async function trainCSVModel(
  classes: ClassData[],
  config: TrainingConfig,
  onEpochEnd: (metrics: TrainingMetrics) => void
): Promise<tf.LayersModel> {
  // Parse CSV data
  const allFeatures: number[][] = [];
  const allLabels: number[] = [];

  for (let classIdx = 0; classIdx < classes.length; classIdx++) {
    for (const sample of classes[classIdx].samples) {
      try {
        const values = JSON.parse(sample.data) as number[];
        allFeatures.push(values);
        allLabels.push(classIdx);
      } catch {
        console.warn('Skipping invalid CSV sample');
      }
    }
  }

  if (allFeatures.length === 0) throw new Error('No valid CSV data found');

  const featureDim = allFeatures[0].length;
  const featureTensor = tf.tensor2d(allFeatures);
  const totalSamples = allFeatures.length;
  const adaptive = getAdaptiveConfig(totalSamples, config);

  // Min-max normalize
  if (csvMin) csvMin.dispose();
  if (csvMax) csvMax.dispose();

  csvMin = tf.keep(featureTensor.min(0));
  csvMax = tf.keep(featureTensor.max(0));

  const range = csvMax!.sub(csvMin!).add(1e-7);
  const normalized = featureTensor.sub(csvMin!).div(range);

  const labelsTensor = tf.oneHot(tf.tensor1d(allLabels, 'int32'), classes.length);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [featureDim], units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(adaptive.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(normalized, labelsTensor, {
    epochs: adaptive.epochs,
    batchSize: adaptive.batchSize,
    validationSplit: adaptive.validationSplit,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        if (isStopRequested) {
          model.stopTraining = true;
          return;
        }
        onEpochEnd({
          epoch,
          loss: logs?.loss ?? 0,
          accuracy: (logs?.acc ?? logs?.accuracy ?? 0) * 100,
          valLoss: logs?.val_loss ?? 0,
          valAccuracy: (logs?.val_acc ?? logs?.val_accuracy ?? 0) * 100,
        });
      },
    },
  });

  featureTensor.dispose();
  normalized.dispose();
  labelsTensor.dispose();
  range.dispose();

  return model;
}

// ── Public API ────────────────────────────────────────────

/**
 * Train a model based on the data type
 */
export async function trainModel(
  dataType: DataType,
  classes: ClassData[],
  config: TrainingConfig,
  onEpochEnd: (metrics: TrainingMetrics) => void,
  onProgress?: (msg: string) => void
): Promise<void> {
  isStopRequested = false;

  // Dispose previous model
  if (currentModel) {
    currentModel.dispose();
    currentModel = null;
  }

  try {
    switch (dataType) {
      case 'image':
        currentModel = await trainImageModel(classes, config, onEpochEnd, onProgress);
        break;
      case 'text':
        currentModel = await trainTextModel(classes, config, onEpochEnd);
        break;
      case 'csv':
        currentModel = await trainCSVModel(classes, config, onEpochEnd);
        break;
      case 'audio': {
        // Bug 3a fix: Validate that audio samples have been converted to spectrogram images.
        const firstSample = classes[0]?.samples[0];
        if (firstSample && !isValidImageData(firstSample.data)) {
          throw new Error(
            'Audio training requires spectrogram images. ' +
            'The current audio capture records raw audio blobs. ' +
            'Please use the Image data type with screenshot-based spectrograms, ' +
            'or convert audio samples to spectrograms before training.'
          );
        }
        currentModel = await trainImageModel(classes, config, onEpochEnd, onProgress);
        break;
      }
    }

    // Save model weights to localStorage
    if (currentModel) {
      await currentModel.save('localstorage://teachable-machine-model');
    }

    // Persist preprocessing state (textVocab, textIdf, csvMin, csvMax)
    savePreprocessingState();
  } catch (error) {
    if (!isStopRequested) throw error;
  }
}

/** Stop the current training */
export function stopTraining(): void {
  isStopRequested = true;
}

/** Run inference on new input */
export async function predict(
  dataType: DataType,
  input: string,
  classNames: string[],
  classColors: string[]
): Promise<Array<{ className: string; classColor: string; confidence: number }>> {
  if (!currentModel) {
    // Try loading from localStorage
    try {
      currentModel = await tf.loadLayersModel('localstorage://teachable-machine-model');
      restorePreprocessingState();
    } catch {
      throw new Error('No trained model found. Please train a model first.');
    }
  }

  return tf.tidy(() => {
    let inputTensor: tf.Tensor;

    switch (dataType) {
      case 'image':
      case 'audio': {
        const imgTensor = imageToTensor(input);
        const batched = imgTensor.expandDims(0);
        if (baseModel) {
          const features = baseModel.predict(batched) as tf.Tensor;
          inputTensor = features.reshape([1, -1]);
        } else {
          inputTensor = batched;
        }
        break;
      }
      case 'text': {
        // Use Bag-of-Words TF-IDF vectorization (matches training)
        const vector = textToTfIdfVector(input, textVocab, textIdf);
        inputTensor = tf.tensor2d([vector]);
        break;
      }
      case 'csv': {
        const values = JSON.parse(input) as number[];
        const rawTensor = tf.tensor2d([values]);
        
        if (csvMin && csvMax) {
          const range = csvMax.sub(csvMin).add(1e-7);
          inputTensor = rawTensor.sub(csvMin).div(range);
        } else {
          console.warn('CSV normalization bounds not available. Predictions may be inaccurate.');
          inputTensor = rawTensor;
        }
        break;
      }
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    const prediction = currentModel!.predict(inputTensor) as tf.Tensor;
    const probabilities = prediction.dataSync();

    return classNames.map((name, i) => ({
      className: name,
      classColor: classColors[i] || '#666',
      confidence: Math.round(probabilities[i] * 10000) / 100,
    })).sort((a, b) => b.confidence - a.confidence);
  });
}

/** Export model as downloadable files */
export async function exportModel(): Promise<{ modelJSON: string; weightsData: ArrayBuffer; preprocessingState: string } | null> {
  if (!currentModel) return null;

  let capturedWeights: ArrayBuffer = new ArrayBuffer(0);

  const saveResult = await currentModel.save(tf.io.withSaveHandler(async (artifacts) => {
    if (artifacts.weightData) {
      capturedWeights = artifacts.weightData as ArrayBuffer;
    }
    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: 'JSON',
      },
      ...artifacts,
    };
  }));

  // Include preprocessing state in export
  const preprocessingState = JSON.stringify({
    textVocab,
    textIdf,
    csvMin: csvMin ? Array.from(csvMin.dataSync()) : null,
    csvMax: csvMax ? Array.from(csvMax.dataSync()) : null,
  });

  return {
    modelJSON: JSON.stringify(saveResult),
    weightsData: capturedWeights,
    preprocessingState,
  };
}

/** Get the current model (for direct access if needed) */
export function getCurrentModel(): tf.LayersModel | null {
  return currentModel;
}

/** Check if a model is loaded and ready */
export function isModelReady(): boolean {
  return currentModel !== null;
}