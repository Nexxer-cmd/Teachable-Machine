/** Audio capture — microphone recording with waveform visualization */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { STRINGS } from '../../constants';
import { FiMic, FiSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AudioCapture() {
  const { selectedClassId, addSample, currentProject } = useStore();
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedClass = currentProject?.classes.find((c) => c.id === selectedClassId);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getFloatTimeDomainData(dataArray);

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface-card').trim() || '#1A1D27';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4285F4';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      let rms = 0;

      for (let i = 0; i < bufferLength; i++) {
        rms += dataArray[i] * dataArray[i];
        const y = (dataArray[i] * 0.5 + 0.5) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      rms = Math.sqrt(rms / bufferLength);
      setAudioLevel(Math.min(rms * 5, 1));

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  }, []);

  const startRecording = async () => {
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          addSample(selectedClassId!, {
            type: 'audio',
            data: reader.result as string,
            preview: `🎵 ${(blob.size / 1024).toFixed(1)}KB`,
          });
          toast.success('Audio sample recorded');
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((t) => t.stop());
        audioContext.close();
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      drawWaveform();
    } catch {
      toast.error(STRINGS.ERROR_MIC);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
    }
  };

  return (
    <div>
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

      {/* Waveform display */}
      <div style={{
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        marginBottom: '16px',
        border: '1px solid var(--border-color)',
        background: 'var(--surface-card)',
      }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          style={{ width: '100%', height: '150px', display: 'block' }}
        />
        {/* Audio level meter */}
        <div style={{ height: '4px', background: 'var(--border-color)' }}>
          <div style={{
            height: '100%',
            width: `${audioLevel * 100}%`,
            background: audioLevel > 0.7 ? 'var(--error)' : 'var(--primary)',
            transition: 'width 0.05s',
          }} />
        </div>
      </div>

      {/* Record button */}
      <button
        className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'} btn-lg`}
        onClick={isRecording ? stopRecording : startRecording}
        style={{ width: '100%' }}
        aria-label={isRecording ? 'Stop recording' : STRINGS.CAPTURE_AUDIO_RECORD}
      >
        {isRecording ? <FiSquare size={18} /> : <FiMic size={18} />}
        {isRecording ? 'Stop Recording' : STRINGS.CAPTURE_AUDIO_RECORD}
      </button>

      {/* Audio samples list */}
      {selectedClass && selectedClass.samples.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Recorded Samples ({selectedClass.samples.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {selectedClass.samples.map((sample, i) => (
              <div
                key={sample.id}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiMic size={14} style={{ color: 'var(--primary)' }} />
                <span>Sample {i + 1}</span>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto', fontSize: '12px' }}>
                  {sample.preview}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
