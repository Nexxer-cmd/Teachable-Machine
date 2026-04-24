/** Inference panel — test trained model with new input and see confidence bars */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { STRINGS } from '../constants';
import { predict } from '../lib/trainer';
import type { InferenceResult } from '../types';
import { FiCamera, FiType, FiPlay, FiZap, FiTarget } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Inference() {
  const { currentProject, modelReady } = useStore();
  const [results, setResults] = useState<InferenceResult[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      stopLive();
    };
  }, []);

  if (!currentProject) return null;

  const classNames = currentProject.classes.map((c) => c.name);
  const classColors = currentProject.classes.map((c) => c.color);

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return '#0A3625';
    if (confidence >= 50) return '#F2B759';
    return '#8B004A';
  };

  const runImagePrediction = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0, 224, 224);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    try {
      const preds = await predict(currentProject.dataType, dataUrl, classNames, classColors);
      setResults(preds);
    } catch (err) {
      console.error('Prediction failed:', err);
    }
  };

  const startLive = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    setIsLive(true);

    // use recursive loop for better control
    const loop = async () => {
      if (!streamRef.current) return;

      await runImagePrediction();

      // small delay between predictions
      liveIntervalRef.current = window.setTimeout(loop, 150);
    };

    loop();
  } catch {
    toast.error(STRINGS.ERROR_WEBCAM);
  }
};

const stopLive = () => {
  if (liveIntervalRef.current) {
    clearTimeout(liveIntervalRef.current);
    liveIntervalRef.current = null;
  }

  if (streamRef.current) {
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  setIsLive(false);
};

  const handleTextPredict = useCallback(async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    try {
      const preds = await predict('text', textInput, classNames, classColors);
      setResults(preds);
    } catch (err) {
      toast.error('Prediction failed');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, classNames, classColors]);

  const handleSingleCapture = async () => {
  let temporaryStream: MediaStream | null = null;

  if (!videoRef.current || !streamRef.current) {
    // start webcam for single capture
    try {
      temporaryStream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = temporaryStream;

      if (videoRef.current) {
        videoRef.current.srcObject = temporaryStream;
        await videoRef.current.play();

        // wait a bit for camera to adjust (prevents black frame)
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch {
      toast.error(STRINGS.ERROR_WEBCAM);
      return;
    }
  }

  await runImagePrediction();

  // stop camera if it was started temporarily
  if (temporaryStream && !isLive) {
    temporaryStream.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }
};

  if (!modelReady) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}>
        <FiZap size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {STRINGS.TEST_NO_MODEL}
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '400px' }}>
          Go to the Train step and train your model with at least 5 samples per class.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
        <FiZap style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }} />
        {STRINGS.TEST_RESULT}
      </h3>

      {/* Image/Audio testing */}
      {(currentProject.dataType === 'image' || currentProject.dataType === 'audio') && (
        <div>
          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            background: '#000',
            aspectRatio: '4/3',
            marginBottom: '12px',
            maxHeight: '300px',
          }}>
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            {isLive && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(217, 48, 37, 0.9)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#fff',
                  animation: 'pulse-ring 1s infinite',
                }} />
                LIVE
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleSingleCapture} style={{ flex: 1 }} aria-label="Capture and predict">
              <FiCamera size={16} />
              {STRINGS.TEST_BTN_CAPTURE}
            </button>
            <button
              className={`btn ${isLive ? 'btn-danger' : 'btn-secondary'}`}
              onClick={isLive ? stopLive : startLive}
              aria-label={isLive ? STRINGS.TEST_BTN_STOP_LIVE : STRINGS.TEST_LIVE}
            >
              <FiPlay size={16} />
              {isLive ? STRINGS.TEST_BTN_STOP_LIVE : STRINGS.TEST_LIVE}
            </button>
          </div>
        </div>
      )}

      {/* Text testing */}
      {currentProject.dataType === 'text' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            className="input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextPredict()}
            placeholder={STRINGS.TEST_TEXT_PLACEHOLDER}
            aria-label="Text input for prediction"
          />
          <button
            className="btn btn-primary"
            onClick={handleTextPredict}
            disabled={isProcessing || !textInput.trim()}
            aria-label="Predict text class"
          >
            <FiType size={16} />
            Predict
          </button>
        </div>
      )}

      {/* Results — confidence bars */}
      {results.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          {/* Top prediction badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            background: `${getConfidenceColor(results[0].confidence)}15`,
            border: `1px solid ${getConfidenceColor(results[0].confidence)}30`,
          }}>
            <FiTarget size={22} style={{ color: results[0].classColor, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: results[0].classColor }}>
                {results[0].className}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {results[0].confidence.toFixed(1)}% confidence
              </div>
            </div>
          </div>

          {/* All class confidence bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((result, i) => (
              <motion.div
                key={result.className}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: result.classColor,
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{result.className}</span>
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: getConfidenceColor(result.confidence),
                  }}>
                    {result.confidence.toFixed(1)}%
                  </span>
                </div>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{
                      width: `${Math.max(result.confidence, 2)}%`,
                      background: result.classColor,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
