/** Training state slice — manages ML training lifecycle and metrics */

import type { StateCreator } from 'zustand';
import type { TrainingMetrics } from '../types';

export interface TrainingSlice {
  // State
  isTraining: boolean;
  currentEpoch: number;
  totalEpochs: number;
  metrics: TrainingMetrics[];
  modelReady: boolean;
  trainingProgress: number;

  // Actions
  startTraining: (totalEpochs: number) => void;
  stopTraining: () => void;
  updateEpoch: (metrics: TrainingMetrics) => void;
  setModelReady: (ready: boolean) => void;
  resetTraining: () => void;
}

export const createTrainingSlice: StateCreator<TrainingSlice> = (set) => ({
  isTraining: false,
  currentEpoch: 0,
  totalEpochs: 0,
  metrics: [],
  modelReady: false,
  trainingProgress: 0,

  startTraining: (totalEpochs) => {
    set({
      isTraining: true,
      currentEpoch: 0,
      totalEpochs,
      metrics: [],
      trainingProgress: 0,
      modelReady: false,
    });
  },

  stopTraining: () => {
    set({ isTraining: false });
  },

  updateEpoch: (metrics) => {
    set((state) => ({
      currentEpoch: metrics.epoch + 1,
      metrics: [...state.metrics, metrics],
      trainingProgress: ((metrics.epoch + 1) / state.totalEpochs) * 100,
    }));
  },

  setModelReady: (ready) => {
    set({ modelReady: ready, isTraining: false });
  },

  resetTraining: () => {
    set({
      isTraining: false,
      currentEpoch: 0,
      totalEpochs: 0,
      metrics: [],
      modelReady: false,
      trainingProgress: 0,
    });
  },
});
