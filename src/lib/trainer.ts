/**
 * TensorFlow.js ML Trainer — handles all in-browser machine learning
 * Supports image (MobileNet transfer learning), text, and CSV classification
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
let csvMin: tf.Tensor | null = null;
let csvMax: tf.Tensor | null = null;

// ── Preprocessing State Persistence ──────────────────────────
// Fixes Bug 1: textVocab / csvMin / csvMax must survive page reloads.

const PREPROCESSING_KEY = 'tm-preprocessing-state';

interface PreprocessingState {
  textVocab: Record<string, number>;
  csvMin: number[] | null;
  csvMax: number[] | null;
}

/** Save preprocessing state to localStorage so inference works after reload. */
function savePreprocessingState(): void {
  try {
    const state: PreprocessingState = {
      textVocab,
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

/** Build text tokenizer and prepare text dataset */
function prepareTextDataset(
  classes: ClassData[]
): { sequences: tf.Tensor; labels: tf.Tensor; vocabSize: number } {
  // Build vocabulary
  const wordCounts: Record<string, number> = {};
  for (const cls of classes) {
    for (const sample of cls.samples) {
      const words = sample.data.toLowerCase().split(/\s+/);
      for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
  }

  // Create word index (top N words)
  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, ML_CONFIG.TEXT_VOCAB_SIZE - 1);
  const wordIndex: Record<string, number> = {};
  sortedWords.forEach(([word], i) => {
    wordIndex[word] = i + 1; // 0 is reserved for padding
  });
  textVocab = wordIndex; // Save globally for inference

  const maxLen = 100;
  const allSequences: number[][] = [];
  const allLabels: number[] = [];

  for (let classIdx = 0; classIdx < classes.length; classIdx++) {
    for (const sample of classes[classIdx].samples) {
      const words = sample.data.toLowerCase().split(/\s+/);
      const seq = words.map((w) => wordIndex[w] || 0).slice(0, maxLen);
      while (seq.length < maxLen) seq.push(0); // pad
      allSequences.push(seq);
      allLabels.push(classIdx);
    }
  }

  return {
    sequences: tf.tensor2d(allSequences),
    labels: tf.oneHot(tf.tensor1d(allLabels, 'int32'), classes.length),
    vocabSize: Math.min(Object.keys(wordIndex).length + 1, ML_CONFIG.TEXT_VOCAB_SIZE),
  };
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

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [featureShape], units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  onProgress?.('Training started...');

  await model.fit(features, labels, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
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

/** Build and train text classification model */
async function trainTextModel(
  classes: ClassData[],
  config: TrainingConfig,
  onEpochEnd: (metrics: TrainingMetrics) => void
): Promise<tf.LayersModel> {
  const { sequences, labels, vocabSize } = prepareTextDataset(classes);

  const model = tf.sequential();
  model.add(
    tf.layers.embedding({
      inputDim: vocabSize,
      outputDim: ML_CONFIG.TEXT_EMBEDDING_DIM,
      inputLength: 100,
    })
  );
  model.add(tf.layers.globalAveragePooling1d());
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(sequences, labels, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
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

  sequences.dispose();
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

  // Min-max normalize
  if (csvMin) csvMin.dispose(); // Cleanup old training runs
  if (csvMax) csvMax.dispose();

  // Use tf.keep() to prevent garbage collection
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
    optimizer: tf.train.adam(config.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  await model.fit(normalized, labelsTensor, {
    epochs: config.epochs,
    batchSize: config.batchSize,
    validationSplit: config.validationSplit,
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
 * @param dataType - The type of data to train on
 * @param classes - Array of class data with samples
 * @param config - Training configuration
 * @param onEpochEnd - Callback for each epoch completion
 * @param onProgress - Optional progress message callback
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
        // The AudioCapture component stores raw audio as data:audio/* blobs.
        // Training on raw audio requires spectrogram conversion first.
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

    // Bug 1 fix: Persist preprocessing state (textVocab, csvMin, csvMax)
    // so inference works correctly after page reloads.
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
      // Bug 1 fix: Also restore preprocessing state when reloading model
      restorePreprocessingState();
    } catch {
      throw new Error('No trained model found. Please train a model first.');
    }
  }

  // Bug 3b fix: Wrap inference in tf.tidy() but do NOT manually dispose
  // tensors created inside it — tf.tidy() handles cleanup automatically.
  // Manual dispose inside tidy() is redundant and can cause double-dispose warnings.
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
        const words = input.toLowerCase().split(/\s+/);
        // Map words to the exact integer IDs learned during training
        const seq = words.map((w) => textVocab[w] || 0).slice(0, 100);
        while (seq.length < 100) seq.push(0);
        inputTensor = tf.tensor2d([seq]);
        break;
      }
      case 'csv': {
        const values = JSON.parse(input) as number[];
        const rawTensor = tf.tensor2d([values]);
        
        // Normalize the incoming inference data using the training bounds
        if (csvMin && csvMax) {
          const range = csvMax.sub(csvMin).add(1e-7);
          inputTensor = rawTensor.sub(csvMin).div(range);
          // Bug 3b fix: Do NOT call range.dispose() or rawTensor.dispose() here.
          // tf.tidy() will dispose all intermediate tensors automatically.
        } else {
          // Fallback: unnormalized (will produce poor results, but won't crash)
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

  // Include preprocessing state in export so imported models work correctly
  const preprocessingState = JSON.stringify({
    textVocab,
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