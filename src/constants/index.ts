/** All UI strings and configuration constants — Rule 04: no hardcoded text in JSX */

import type { GalleryProject, TrainingConfig } from '../types';

// ── Color Palette (5 Combos) ──────────────────────────────────────
export const COLORS = {
  primary: '#00A19B',
  primaryDark: '#008A85',
  primaryLight: '#00B5AE',
  secondary: '#0A3625',
  secondaryLight: '#0A4A3C',
  surface: '#F2EFE7',
  surfaceAlt: '#E4DDD3',
  surfaceDark: '#081912',
  surfaceDarkAlt: '#0D2B1F',
  warning: '#F2B759',
  error: '#8B004A',
  textPrimary: '#2E1F26',
  textSecondary: '#5A4D52',
  textOnDark: '#F2EFE7',
  textOnDarkSecondary: '#99ADA3',
  border: '#D4CCC4',
  borderDark: '#1A4636',
  wattle: '#CCDA47',
  caramel: '#C87740',
  khakiOrange: '#F2B759',
  darkSlate: '#0A4A3C',
  murrey: '#8B004A',
  alabaster: '#F2EFE7',
  iceLatte: '#E4DDD3',
  theMint: '#00A19B',
  raisin: '#2E1F26',
  bottleGreen: '#0A3625',
} as const;

export const CLASS_COLORS = [
  '#00A19B', '#8B004A', '#CCDA47', '#0A3625',
  '#F2B759', '#C87740', '#0A4A3C', '#2E1F26',
  '#00B5AE', '#B8C63E', '#D9984A', '#6F003B',
  '#148F89', '#A06530', '#0D5A49', '#E0D847',
  '#795548', '#F2B759', '#00A19B', '#8B004A',
] as const;

// ── UI Strings ─────────────────────────────────────────────
export const STRINGS = {
  APP_NAME: 'Teachable Machine Pro',
  APP_TAGLINE: 'Train your own AI. No code. No cost.',
  APP_SUBTITLE: 'Build custom machine learning models directly in your browser using TensorFlow.js — powered by Google Gemini AI for intelligent tutoring.',

  // Navigation
  NAV_HOME: 'Home',
  NAV_NEW_PROJECT: 'New Project',
  NAV_GALLERY: 'Gallery',
  NAV_SAVE: 'Save',
  NAV_EXPORT: 'Export',

  // Steps
  STEP_DATA: 'Add Data',
  STEP_TRAIN: 'Train',
  STEP_TEST: 'Test',

  // Class Manager
  CLASS_ADD: 'Add Class',
  CLASS_MIN_WARNING: 'You need at least 2 classes to train',
  CLASS_DELETE_CONFIRM: 'Delete this class and all its samples?',
  CLASS_DEFAULT_PREFIX: 'Class',

  // Data capture
  CAPTURE_IMAGE_WEBCAM: 'Webcam',
  CAPTURE_IMAGE_UPLOAD: 'Upload',
  CAPTURE_HOLD_HINT: 'Hold to capture continuously',
  CAPTURE_CLICK_HINT: 'Click to capture one frame',
  CAPTURE_DROP_HINT: 'Drag & drop images here, or click to browse',
  CAPTURE_TEXT_PLACEHOLDER: 'Type a text sample and press Enter...',
  CAPTURE_AUDIO_RECORD: 'Hold to Record',

  // Training
  TRAIN_START: 'Start Training',
  TRAIN_STOP: 'Stop Training',
  TRAIN_EPOCHS_LABEL: 'Epochs',
  TRAIN_LR_LABEL: 'Learning Rate',
  TRAIN_BATCH_LABEL: 'Batch Size',
  TRAIN_LOSS: 'Loss',
  TRAIN_ACCURACY: 'Accuracy',
  TRAIN_VALIDATION: 'Validation',
  TRAIN_MIN_SAMPLES: 'Add at least 5 samples per class',
  TRAIN_MIN_CLASSES: 'Add at least 2 classes',

  // Testing
  TEST_RESULT: 'Prediction',
  TEST_CONFIDENCE: 'Confidence',
  TEST_NO_MODEL: 'Train your model first to start testing',
  TEST_LIVE: 'Live Mode',

  // AI Assistant
  AI_TITLE: 'AI Assistant',
  AI_POWERED_BY: 'Powered by Gemini & Groq',
  AI_PLACEHOLDER: 'Ask me about your model...',
  AI_OFFLINE_TIP: 'AI is offline. Here are some tips based on your metrics:',

  // Export
  EXPORT_TITLE: 'Export Model',
  EXPORT_TFJS: 'TensorFlow.js',
  EXPORT_TFJS_DESC: 'Download as a deployable TensorFlow.js model package',
  EXPORT_JSON: 'JSON Snapshot',
  EXPORT_JSON_DESC: 'Full project with model weights — can be re-imported',

  // Quick prompts
  PROMPT_LOW_ACC: 'Why is my accuracy low?',
  PROMPT_IMPROVE: 'How to improve?',
  PROMPT_EXPLAIN: 'Explain this model',
  PROMPT_MORE_DATA: 'Add more data?',

  // Gallery
  GALLERY_TITLE: 'Project Gallery',
  GALLERY_SUBTITLE: 'Start with a pre-built template or create your own from scratch',

  // Errors
  ERROR_WEBCAM: 'Camera access denied. Please allow camera permissions.',
  ERROR_MIC: 'Microphone access denied. Please allow mic permissions.',
  ERROR_FILE_TYPE: 'Only JPG, PNG, and WEBP files are supported',
  ERROR_FILE_SIZE: 'File size must be under 5MB',
  ERROR_STORAGE_FULL: 'Storage is full. Delete old projects to free space.',
  ERROR_AI_RATE_LIMIT: 'Gemini is busy, retrying in 5s...',
  ERROR_AI_OFFLINE: 'Could not reach AI assistant. Showing offline tips.',
  ERROR_AI_EMPTY: 'No response received. Try rephrasing your question.',


  // Resolve hardcoded
  AI_TUTOR_WELCOME: "Hi! I'm your ML tutor.",
  AI_TUTOR_SUB: "Ask me anything about your model, training, or machine learning concepts.",
  TEST_BTN_CAPTURE: "Capture & Predict",
  TEST_BTN_STOP_LIVE: "Stop Live",
  TEST_TEXT_PLACEHOLDER: "Type text to classify...",
  CHART_EMPTY_STATE: "ics will appear here during training.",
} as const;

// ── Training Defaults ──────────────────────────────────────
export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  epochs: 50,
  learningRate: 0.001,
  batchSize: 16,
  validationSplit: 0.2,
};

// ── Gallery Templates ──────────────────────────────────────
export const GALLERY_PROJECTS: GalleryProject[] = [
  {
    id: 'face-expression',
    title: 'Face Expression',
    description: 'Classify happy, sad, surprised, and neutral expressions using your webcam',
    dataType: 'image',
    icon: 'FE',
    gradient: 'linear-gradient(135deg, #0A3625 0%, #00A19B 100%)',
    classes: ['Happy', 'Sad', 'Surprised', 'Neutral'],
  },
  {
    id: 'text-sentiment',
    title: 'Text Sentiment',
    description: 'Analyze whether text input is positive, negative, or neutral in sentiment',
    dataType: 'text',
    icon: 'TS',
    gradient: 'linear-gradient(135deg, #F2B759 0%, #C87740 100%)',
    classes: ['Positive', 'Negative', 'Neutral'],
  },
  {
    id: 'hand-gestures',
    title: 'Hand Gestures',
    description: 'Recognize different hand signs — rock, paper, scissors, thumbs up',
    dataType: 'image',
    icon: 'HG',
    gradient: 'linear-gradient(135deg, #00A19B 0%, #CCDA47 100%)',
    classes: ['Rock', 'Paper', 'Scissors', 'Thumbs Up'],
  },
  {
    id: 'sound-detection',
    title: 'Sound Detection',
    description: 'Detect and classify different sounds — clap, snap, whistle, silence',
    dataType: 'audio',
    icon: 'SD',
    gradient: 'linear-gradient(135deg, #C87740 0%, #F2B759 100%)',
    classes: ['Clap', 'Snap', 'Whistle', 'Silence'],
  },
  {
    id: 'number-classifier',
    title: 'Number Classifier',
    description: 'Draw digits 0–9 and train a model to recognize handwritten numbers',
    dataType: 'image',
    icon: 'NC',
    gradient: 'linear-gradient(135deg, #0A4A3C 0%, #00A19B 100%)',
    classes: ['Zero', 'One', 'Two', 'Three', 'Four'],
  },
  {
    id: 'object-sorter',
    title: 'Object Sorter',
    description: 'Point your camera at objects and teach AI to sort them into categories',
    dataType: 'image',
    icon: 'OS',
    gradient: 'linear-gradient(135deg, #8B004A 0%, #2E1F26 100%)',
    classes: ['Category A', 'Category B', 'Category C'],
  },
];

// ── Quick Prompts ──────────────────────────────────────────
export const QUICK_PROMPTS = [
  {
    label: STRINGS.PROMPT_LOW_ACC,
    prompt: 'Diagnose exactly why accuracy is low. Give 3 specific causes with fixes.',
  },
  {
    label: STRINGS.PROMPT_IMPROVE,
    prompt: 'Give 3 prioritized, concrete steps to improve this specific model.',
  },
  {
    label: STRINGS.PROMPT_EXPLAIN,
    prompt: 'Explain what kind of ML model was trained, how it works, use a simple analogy.',
  },
  {
    label: STRINGS.PROMPT_MORE_DATA,
    prompt: 'How much more data do I need per class? Give a specific number estimate.',
  },
] as const;

// ── Model Config ───────────────────────────────────────────
export const ML_CONFIG = {
  IMAGE_SIZE: 224,
  IMAGE_QUALITY: 0.7,
  MOBILENET_URL: 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/3/default/1',
  TEXT_MAX_LENGTH: 500,
  TEXT_VOCAB_SIZE: 10000,
  TEXT_EMBEDDING_DIM: 32,
  AUDIO_SAMPLE_RATE: 44100,
  AUDIO_FFT_SIZE: 1024,
  CAPTURE_FPS: 10,
  INFERENCE_DEBOUNCE_MS: 300,
  MIN_SAMPLES_PER_CLASS: 5,
  MIN_CLASSES: 2,
  MAX_CLASSES: 20,
} as const;

// ── API Config ─────────────────────────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
