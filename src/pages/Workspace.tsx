/** Workspace page — main three-panel layout with step-based content */

import { useState } from 'react';
import { useStore } from '../store';
import { STRINGS, ML_CONFIG } from '../constants';
import { trainModel, stopTraining } from '../lib/trainer';
import ClassManager from '../components/ClassManager';
import StepIndicator from '../components/StepIndicator';
import ImageCapture from '../components/capture/ImageCapture';
import TextCapture from '../components/capture/TextCapture';
import AudioCapture from '../components/capture/AudioCapture';
import TrainingCharts from '../components/charts/TrainingCharts';
import Inference from '../components/Inference';
import AIAssistant from '../components/AIAssistant';
import ExportModal from '../components/ExportModal';
import { FiPlay, FiSquare, FiAlertCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Workspace() {
  const {
    currentProject,
    currentStep,
    isTraining,
    trainingProgress,
    currentEpoch,
    totalEpochs,
    startTraining,
    stopTraining: setStopTraining,
    updateEpoch,
    setModelReady,
    setStep,
  } = useStore();

  const [trainStatus, setTrainStatus] = useState('');

  if (!currentProject) return null;

  const totalSamples = currentProject.classes.reduce((sum, c) => sum + c.samples.length, 0);
  const minSamplesOk = currentProject.classes.every((c) => c.samples.length >= ML_CONFIG.MIN_SAMPLES_PER_CLASS);
  const minClassesOk = currentProject.classes.length >= ML_CONFIG.MIN_CLASSES;
  const canTrain = minSamplesOk && minClassesOk && !isTraining;

  const handleStartTraining = async () => {
    if (!canTrain) {
      if (!minClassesOk) toast.error(STRINGS.TRAIN_MIN_CLASSES);
      else if (!minSamplesOk) toast.error(STRINGS.TRAIN_MIN_SAMPLES);
      return;
    }

    const config = currentProject.trainingConfig;
    startTraining(config.epochs);
    setTrainStatus('Preparing...');

    try {
      await trainModel(
        currentProject.dataType,
        currentProject.classes,
        config,
        (metrics) => {
          updateEpoch(metrics);
          setTrainStatus(`Epoch ${metrics.epoch + 1}/${config.epochs} — Acc: ${metrics.accuracy.toFixed(1)}%`);
        },
        (msg) => setTrainStatus(msg)
      );
      setModelReady(true);
      setStep('test');
      toast.success('Training complete!');
    } catch (err) {
      setStopTraining();
      const message = err instanceof Error ? err.message : 'Training failed';
      toast.error(message);
    }
    setTrainStatus('');
  };

  const handleStopTraining = () => {
    stopTraining();
    setStopTraining();
    toast.success('Training stopped');
  };

  const renderDataStep = () => {
    switch (currentProject.dataType) {
      case 'image':
        return <ImageCapture />;
      case 'text':
        return <TextCapture />;
      case 'audio':
        return <AudioCapture />;
      case 'csv':
        return (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '16px', fontWeight: 600 }}>CSV Upload</p>
            <p style={{ fontSize: '14px' }}>Drag and drop a CSV file or paste tabular data</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderTrainStep = () => (
    <div>
      {/* Training config */}
      <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Training Configuration</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* Epochs */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {STRINGS.TRAIN_EPOCHS_LABEL}
            </label>
            <input
              type="range"
              min="1"
              max="200"
              value={currentProject.trainingConfig.epochs}
              onChange={(e) => useStore.getState().updateTrainingConfig({ epochs: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
              aria-label="Number of epochs"
            />
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{currentProject.trainingConfig.epochs}</span>
          </div>

          {/* Learning Rate */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {STRINGS.TRAIN_LR_LABEL}
            </label>
            <select
              className="input"
              value={currentProject.trainingConfig.learningRate}
              onChange={(e) => useStore.getState().updateTrainingConfig({ learningRate: parseFloat(e.target.value) })}
              aria-label="Learning rate"
            >
              <option value="0.01">0.01 (Fast)</option>
              <option value="0.001">0.001 (Default)</option>
              <option value="0.0001">0.0001 (Slow)</option>
            </select>
          </div>

          {/* Batch Size */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              {STRINGS.TRAIN_BATCH_LABEL}
            </label>
            <select
              className="input"
              value={currentProject.trainingConfig.batchSize}
              onChange={(e) => useStore.getState().updateTrainingConfig({ batchSize: parseInt(e.target.value) })}
              aria-label="Batch size"
            >
              <option value="8">8</option>
              <option value="16">16 (Default)</option>
              <option value="32">32</option>
              <option value="64">64</option>
            </select>
          </div>
        </div>

        {/* Data summary */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total Samples</span>
            <span style={{ fontWeight: 700 }}>{totalSamples}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Classes</span>
            <span style={{ fontWeight: 700 }}>{currentProject.classes.length}</span>
          </div>
          {currentProject.classes.map((cls) => (
            <div key={cls.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              marginTop: '4px',
              paddingLeft: '12px',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cls.color }} />
                {cls.name}
              </span>
              <span style={{
                fontWeight: 600,
                color: cls.samples.length < ML_CONFIG.MIN_SAMPLES_PER_CLASS ? 'var(--error)' : 'var(--secondary)',
              }}>
                {cls.samples.length} samples
              </span>
            </div>
          ))}
        </div>

        {/* Validation warnings */}
        {(!minClassesOk || !minSamplesOk) && (
          <div style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(249, 171, 0, 0.08)',
            border: '1px solid rgba(249, 171, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--warning)',
          }}>
            <FiAlertCircle size={16} />
            {!minClassesOk ? STRINGS.TRAIN_MIN_CLASSES : STRINGS.TRAIN_MIN_SAMPLES}
          </div>
        )}
      </div>

      {/* Train / Stop button */}
      {isTraining ? (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${trainingProgress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{trainStatus}</span>
              <span style={{ fontWeight: 600 }}>Epoch {currentEpoch}/{totalEpochs}</span>
            </div>
          </div>
          <button
            className="btn btn-danger btn-lg"
            onClick={handleStopTraining}
            style={{ width: '100%' }}
            aria-label={STRINGS.TRAIN_STOP}
          >
            <FiSquare size={18} />
            {STRINGS.TRAIN_STOP}
          </button>
        </div>
      ) : (
        <motion.button
          className={`btn btn-primary btn-lg ${canTrain ? 'btn-pulse' : ''}`}
          onClick={handleStartTraining}
          disabled={!canTrain}
          style={{ width: '100%', opacity: canTrain ? 1 : 0.5 }}
          aria-label={STRINGS.TRAIN_START}
          whileHover={canTrain ? { scale: 1.02 } : {}}
          whileTap={canTrain ? { scale: 0.98 } : {}}
        >
          <FiPlay size={18} />
          {STRINGS.TRAIN_START}
        </motion.button>
      )}

      {/* Training Charts */}
      <div style={{ marginTop: '24px' }}>
        <TrainingCharts />
      </div>
    </div>
  );

  return (
    <div className="workspace">
      <ClassManager />

      <div className="workspace-main">
        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <StepIndicator />
        </div>

        {/* Step content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1 }}
        >
          {currentStep === 'data' && renderDataStep()}
          {currentStep === 'train' && renderTrainStep()}
          {currentStep === 'test' && <Inference />}
        </motion.div>
      </div>

      <AIAssistant />
      <ExportModal />
    </div>
  );
}
