/** Combined Zustand store — Rule 08: three slices (project, training, ui) */

import { create } from 'zustand';
import { createProjectSlice, type ProjectSlice } from './projectSlice';
import { createTrainingSlice, type TrainingSlice } from './trainingSlice';
import { createUISlice, type UISlice } from './uiSlice';

export type AppStore = ProjectSlice & TrainingSlice & UISlice;

export const useStore = create<AppStore>()((...a) => ({
  ...createProjectSlice(...a),
  ...createTrainingSlice(...a),
  ...createUISlice(...a),
}));
