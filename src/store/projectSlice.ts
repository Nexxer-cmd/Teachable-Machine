/** Project state slice — manages classes, samples, and project metadata */

import type { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ClassData, DataType, Project, Sample, TrainingConfig } from '../types';
import { CLASS_COLORS, DEFAULT_TRAINING_CONFIG } from '../constants';

export interface ProjectSlice {
  // State
  currentProject: Project | null;
  savedProjects: Project[];
  selectedClassId: string | null;

  // Actions
  createProject: (name: string, dataType: DataType) => void;
  loadProject: (project: Project) => void;
  closeProject: () => void;
  updateProjectName: (name: string) => void;

  // Class management
  addClass: () => void;
  removeClass: (classId: string) => void;
  renameClass: (classId: string, name: string) => void;
  selectClass: (classId: string | null) => void;

  // Sample management
  addSample: (classId: string, sample: Omit<Sample, 'id' | 'timestamp'>) => void;
  addSamples: (classId: string, samples: Omit<Sample, 'id' | 'timestamp'>[]) => void;
  removeSample: (classId: string, sampleId: string) => void;
  clearClassSamples: (classId: string) => void;

  // Config
  updateTrainingConfig: (config: Partial<TrainingConfig>) => void;

  // Persistence
  saveProject: () => void;
  deleteSavedProject: (projectId: string) => void;
  loadSavedProjects: () => void;
}

const createDefaultClasses = (): ClassData[] => [
  { id: uuidv4(), name: 'Class 1', color: CLASS_COLORS[0], samples: [] },
  { id: uuidv4(), name: 'Class 2', color: CLASS_COLORS[1], samples: [] },
];

export const createProjectSlice: StateCreator<ProjectSlice> = (set, get) => ({
  currentProject: null,
  savedProjects: [],
  selectedClassId: null,

  createProject: (name, dataType) => {
    const classes = createDefaultClasses();
    const project: Project = {
      id: uuidv4(),
      name,
      dataType,
      classes,
      trainingConfig: { ...DEFAULT_TRAINING_CONFIG },
      trainingMetrics: [],
      modelTrained: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set({ currentProject: project, selectedClassId: classes[0].id });
  },

  loadProject: (project) => {
    set({
      currentProject: project,
      selectedClassId: project.classes[0]?.id || null,
    });
  },

  closeProject: () => {
    set({ currentProject: null, selectedClassId: null });
  },

  updateProjectName: (name) => {
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, name, updatedAt: Date.now() }
        : null,
    }));
  },

  addClass: () => {
    set((state) => {
      if (!state.currentProject) return state;
      const classCount = state.currentProject.classes.length;
      if (classCount >= 20) return state;
      const newClass: ClassData = {
        id: uuidv4(),
        name: `Class ${classCount + 1}`,
        color: CLASS_COLORS[classCount % CLASS_COLORS.length],
        samples: [],
      };
      return {
        currentProject: {
          ...state.currentProject,
          classes: [...state.currentProject.classes, newClass],
          updatedAt: Date.now(),
        },
      };
    });
  },

  removeClass: (classId) => {
    set((state) => {
      if (!state.currentProject) return state;
      if (state.currentProject.classes.length <= 2) return state;
      const classes = state.currentProject.classes.filter((c) => c.id !== classId);
      return {
        currentProject: {
          ...state.currentProject,
          classes,
          updatedAt: Date.now(),
        },
        selectedClassId:
          state.selectedClassId === classId ? classes[0]?.id || null : state.selectedClassId,
      };
    });
  },

  renameClass: (classId, name) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          classes: state.currentProject.classes.map((c) =>
            c.id === classId ? { ...c, name } : c
          ),
          updatedAt: Date.now(),
        },
      };
    });
  },

  selectClass: (classId) => set({ selectedClassId: classId }),

  addSample: (classId, sample) => {
    set((state) => {
      if (!state.currentProject) return state;
      const newSample: Sample = {
        ...sample,
        id: uuidv4(),
        timestamp: Date.now(),
      };
      return {
        currentProject: {
          ...state.currentProject,
          classes: state.currentProject.classes.map((c) =>
            c.id === classId ? { ...c, samples: [...c.samples, newSample] } : c
          ),
          updatedAt: Date.now(),
        },
      };
    });
  },

  addSamples: (classId, samples) => {
    set((state) => {
      if (!state.currentProject) return state;
      const newSamples: Sample[] = samples.map((s) => ({
        ...s,
        id: uuidv4(),
        timestamp: Date.now(),
      }));
      return {
        currentProject: {
          ...state.currentProject,
          classes: state.currentProject.classes.map((c) =>
            c.id === classId ? { ...c, samples: [...c.samples, ...newSamples] } : c
          ),
          updatedAt: Date.now(),
        },
      };
    });
  },

  removeSample: (classId, sampleId) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          classes: state.currentProject.classes.map((c) =>
            c.id === classId
              ? { ...c, samples: c.samples.filter((s) => s.id !== sampleId) }
              : c
          ),
          updatedAt: Date.now(),
        },
      };
    });
  },

  clearClassSamples: (classId) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          classes: state.currentProject.classes.map((c) =>
            c.id === classId ? { ...c, samples: [] } : c
          ),
          updatedAt: Date.now(),
        },
      };
    });
  },

  updateTrainingConfig: (config) => {
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          trainingConfig: { ...state.currentProject.trainingConfig, ...config },
          updatedAt: Date.now(),
        },
      };
    });
  },

  saveProject: () => {
    const { currentProject, savedProjects } = get();
    if (!currentProject) return;
    const existing = savedProjects.findIndex((p) => p.id === currentProject.id);
    const updated = [...savedProjects];
    if (existing >= 0) {
      updated[existing] = currentProject;
    } else {
      updated.push(currentProject);
    }
    set({ savedProjects: updated });
    try {
      localStorage.setItem('tm_projects', JSON.stringify(updated));
    } catch {
      console.warn('Failed to save to localStorage');
    }
  },

  deleteSavedProject: (projectId) => {
    set((state) => {
      const updated = state.savedProjects.filter((p) => p.id !== projectId);
      try {
        localStorage.setItem('tm_projects', JSON.stringify(updated));
      } catch {
        console.warn('Failed to update localStorage');
      }
      return { savedProjects: updated };
    });
  },

  loadSavedProjects: () => {
    try {
      const raw = localStorage.getItem('tm_projects');
      if (raw) {
        const projects: Project[] = JSON.parse(raw);
        set({ savedProjects: projects });
      }
    } catch {
      console.warn('Failed to load from localStorage');
    }
  },
});
