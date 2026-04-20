/** UI state slice — manages workspace step, panels, modals, and theme */

import type { StateCreator } from 'zustand';
import type { WorkspaceStep } from '../types';

export interface UISlice {
  // State
  currentStep: WorkspaceStep;
  showAIPanel: boolean;
  showExportModal: boolean;
  showNewProjectModal: boolean;
  darkMode: boolean;
  isMobile: boolean;

  // Actions
  setStep: (step: WorkspaceStep) => void;
  toggleAIPanel: () => void;
  setShowExportModal: (show: boolean) => void;
  setShowNewProjectModal: (show: boolean) => void;
  toggleDarkMode: () => void;
  setIsMobile: (isMobile: boolean) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  currentStep: 'data',
  showAIPanel: true,
  showExportModal: false,
  showNewProjectModal: false,
  darkMode: true,
  isMobile: false,

  setStep: (step) => set({ currentStep: step }),
  toggleAIPanel: () => set((state) => ({ showAIPanel: !state.showAIPanel })),
  setShowExportModal: (show) => set({ showExportModal: show }),
  setShowNewProjectModal: (show) => set({ showNewProjectModal: show }),
  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.darkMode;
      document.documentElement.classList.toggle('dark', newMode);
      localStorage.setItem('tm_darkMode', JSON.stringify(newMode));
      return { darkMode: newMode };
    });
  },
  setIsMobile: (isMobile) => set({ isMobile }),
});
