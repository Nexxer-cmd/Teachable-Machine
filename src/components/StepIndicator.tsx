/** Three-step progress indicator — Data → Train → Test */

import { useStore } from '../store';
import { STRINGS } from '../constants';
import type { WorkspaceStep } from '../types';
import { FiDatabase, FiCpu, FiPlay, FiCheck } from 'react-icons/fi';

const steps: { key: WorkspaceStep; label: string; icon: React.ReactNode }[] = [
  { key: 'data', label: STRINGS.STEP_DATA, icon: <FiDatabase size={14} /> },
  { key: 'train', label: STRINGS.STEP_TRAIN, icon: <FiCpu size={14} /> },
  { key: 'test', label: STRINGS.STEP_TEST, icon: <FiPlay size={14} /> },
];

export default function StepIndicator() {
  const { currentStep, setStep, modelReady } = useStore();

  const getStepState = (stepKey: WorkspaceStep) => {
    const order = ['data', 'train', 'test'];
    const currentIdx = order.indexOf(currentStep);
    const stepIdx = order.indexOf(stepKey);

    if (stepKey === currentStep) return 'active';
    if (stepIdx < currentIdx) return 'completed';
    if (stepKey === 'test' && modelReady) return 'completed';
    return 'default';
  };

  return (
    <div className="step-indicator" role="navigation" aria-label="Training steps">
      {steps.map((step, i) => {
        const state = getStepState(step.key);
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className={`step-item ${state}`}
              onClick={() => setStep(step.key)}
              aria-label={`Step ${i + 1}: ${step.label}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <div className="step-number">
                {state === 'completed' ? <FiCheck size={14} /> : i + 1}
              </div>
              <span>{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`step-connector ${state === 'completed' ? 'completed' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
