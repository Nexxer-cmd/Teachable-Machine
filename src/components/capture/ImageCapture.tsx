/** Image capture — webcam + drag-and-drop upload for image data */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { STRINGS, ML_CONFIG } from '../../constants';
import { useDropzone } from 'react-dropzone';
import { FiCamera, FiUpload, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ImageCapture() {
  const { currentProject, selectedClassId, addSample, addSamples } = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [captureMode, setCaptureMode] = useState<'webcam' | 'upload'>('webcam');

  const selectedClass = currentProject?.classes.find((c) => c.id === selectedClassId);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setWebcamActive(true);
    } catch {
      toast.error(STRINGS.ERROR_WEBCAM);
    }
  };

  const stopWebcam = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !selectedClassId) return;

    const canvas = canvasRef.current;
    canvas.width = ML_CONFIG.IMAGE_SIZE;
    canvas.height = ML_CONFIG.IMAGE_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0, ML_CONFIG.IMAGE_SIZE, ML_CONFIG.IMAGE_SIZE);
    const dataUrl = canvas.toDataURL('image/jpeg', ML_CONFIG.IMAGE_QUALITY);

    addSample(selectedClassId, {
      type: 'image',
      data: dataUrl,
      preview: dataUrl,
    });
  }, [selectedClassId, addSample]);

  const startContinuousCapture = () => {
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }
    captureFrame();
    captureIntervalRef.current = window.setInterval(captureFrame, 1000 / ML_CONFIG.CAPTURE_FPS);
  };

  const stopContinuousCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }

    const validFiles = acceptedFiles.filter((f) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(STRINGS.ERROR_FILE_TYPE);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(STRINGS.ERROR_FILE_SIZE);
        return false;
      }
      return true;
    });

    const readFiles = validFiles.map((file) => {
      return new Promise<{ type: 'image' as const; data: string; preview: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = ML_CONFIG.IMAGE_SIZE;
            canvas.height = ML_CONFIG.IMAGE_SIZE;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, ML_CONFIG.IMAGE_SIZE, ML_CONFIG.IMAGE_SIZE);
            const dataUrl = canvas.toDataURL('image/jpeg', ML_CONFIG.IMAGE_QUALITY);
            resolve({ type: 'image', data: dataUrl, preview: dataUrl });
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readFiles).then((samples) => {
      addSamples(selectedClassId!, samples);
      toast.success(`Added ${samples.length} images`);
    });
  }, [selectedClassId, addSamples]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    noClick: false,
  });

  return (
    <div>
      {/* Mode Tabs */}
      <div className="tab-group" style={{ marginBottom: '16px' }}>
        <button
          className={`tab-item ${captureMode === 'webcam' ? 'active' : ''}`}
          onClick={() => setCaptureMode('webcam')}
          aria-label="Webcam capture mode"
        >
          <FiCamera size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {STRINGS.CAPTURE_IMAGE_WEBCAM}
        </button>
        <button
          className={`tab-item ${captureMode === 'upload' ? 'active' : ''}`}
          onClick={() => setCaptureMode('upload')}
          aria-label="Upload mode"
        >
          <FiUpload size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {STRINGS.CAPTURE_IMAGE_UPLOAD}
        </button>
      </div>

      {/* Selected class indicator */}
      {selectedClass && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedClass.color }} />
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Adding to: {selectedClass.name}</span>
          <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>
            {selectedClass.samples.length} samples
          </span>
        </div>
      )}

      {captureMode === 'webcam' ? (
        <div>
          {/* Video preview */}
          <div style={{
            position: 'relative',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            background: '#000',
            aspectRatio: '4/3',
            marginBottom: '12px',
          }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              playsInline
              muted
            />
            {!webcamActive && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#fff',
              }}>
                <FiCamera size={40} style={{ opacity: 0.6 }} />
                <button className="btn btn-primary" onClick={startWebcam} aria-label="Start webcam">
                  Enable Camera
                </button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Capture controls */}
          {webcamActive && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ flex: 1 }}
                onClick={captureFrame}
                aria-label="Capture single frame"
              >
                <FiCamera size={18} />
                {STRINGS.CAPTURE_CLICK_HINT}
              </button>
              <button
                className="btn btn-secondary"
                onMouseDown={startContinuousCapture}
                onMouseUp={stopContinuousCapture}
                onMouseLeave={stopContinuousCapture}
                onTouchStart={startContinuousCapture}
                onTouchEnd={stopContinuousCapture}
                aria-label="Hold to capture continuously"
              >
                {STRINGS.CAPTURE_HOLD_HINT}
              </button>
              <button
                className="btn btn-ghost"
                onClick={stopWebcam}
                aria-label="Stop webcam"
              >
                Stop
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Upload mode */
        <div
          {...getRootProps()}
          className={`drop-zone ${isDragActive ? 'active' : ''}`}
          aria-label="Drop zone for images"
        >
          <input {...getInputProps()} />
          <FiImage size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>{STRINGS.CAPTURE_DROP_HINT}</p>
          <p style={{ fontSize: '12px', opacity: 0.6 }}>JPG, PNG, WEBP · Max 5MB each</p>
        </div>
      )}

      {/* Sample preview grid */}
      {selectedClass && selectedClass.samples.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Samples ({selectedClass.samples.length})
          </h4>
          <div className="sample-grid">
            {selectedClass.samples.slice(-50).map((sample) => (
              <div key={sample.id} className="sample-item">
                <img src={sample.preview || sample.data} alt="Sample" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
