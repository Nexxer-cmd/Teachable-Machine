/** Core type definitions for Teachable Machine Pro */

export type DataType = 'image' | 'text' | 'audio' | 'csv';

export interface Sample {
  id: string;
  type: DataType;
  data: string; // base64 for image/audio, raw string for text, JSON for csv
  preview?: string; // thumbnail or preview text
  timestamp: number;
}

export interface ClassData {
  id: string;
  name: string;
  color: string;
  samples: Sample[];
}

export interface TrainingConfig {
  epochs: number;
  learningRate: number;
  batchSize: number;
  validationSplit: number;
}

export interface TrainingMetrics {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
}

export interface TrainingState {
  isTraining: boolean;
  isPaused: boolean;
  currentEpoch: number;
  totalEpochs: number;
  metrics: TrainingMetrics[];
  modelReady: boolean;
}

export interface InferenceResult {
  className: string;
  classColor: string;
  confidence: number;
}

export interface Project {
  id: string;
  name: string;
  dataType: DataType;
  classes: ClassData[];
  trainingConfig: TrainingConfig;
  trainingMetrics: TrainingMetrics[];
  modelTrained: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GalleryProject {
  id: string;
  title: string;
  description: string;
  dataType: DataType;
  icon: string;
  gradient: string;
  classes: string[];
}

export type WorkspaceStep = 'data' | 'train' | 'test';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
