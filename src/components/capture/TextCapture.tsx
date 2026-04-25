/** Text capture — textarea input + file upload with chip preview for text classification */

import { useState, useCallback } from 'react';
import { useStore } from '../../store';
import { STRINGS } from '../../constants';
import { FiPlus, FiX, FiType, FiUpload, FiFile } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function TextCapture() {
  const { currentProject, selectedClassId, addSample, addSamples, removeSample } = useStore();
  const [textValue, setTextValue] = useState('');
  const [captureMode, setCaptureMode] = useState<'type' | 'upload'>('type');

  const selectedClass = currentProject?.classes.find((c) => c.id === selectedClassId);

  const handleAdd = () => {
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }
    const trimmed = textValue.trim();
    if (!trimmed) return;

    addSample(selectedClassId, {
      type: 'text',
      data: trimmed,
      preview: trimmed.slice(0, 60),
    });
    setTextValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  /** Handle file drop — parse .txt (one sample per line) or .csv */
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!selectedClassId) {
      toast.error('Select a class first');
      return;
    }

    for (const file of acceptedFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        let lines: string[];

        if (file.name.endsWith('.csv')) {
          // CSV: skip header, use first column as text
          const rows = text.split('\n').filter((l) => l.trim());
          lines = rows.slice(1).map((row) => {
            // Handle quoted CSV fields
            const match = row.match(/^"([^"]*)"/) || row.match(/^([^,]*)/);
            return match ? match[1].trim() : row.trim();
          });
        } else {
          // TXT: one sample per line
          lines = text.split('\n').filter((l) => l.trim());
        }

        const validLines = lines.filter((l) => l.length > 0);
        if (validLines.length === 0) {
          toast.error('No valid text found in file');
          return;
        }

        const samples = validLines.map((line) => ({
          type: 'text' as const,
          data: line,
          preview: line.slice(0, 60),
        }));

        addSamples(selectedClassId!, samples);
        toast.success(`Added ${samples.length} text samples from ${file.name}`);
      };
      reader.readAsText(file);
    }
  }, [selectedClassId, addSamples]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    noClick: false,
  });

  return (
    <div>
      {/* Mode Tabs */}
      <div className="tab-group" style={{ marginBottom: '16px' }}>
        <button
          className={`tab-item ${captureMode === 'type' ? 'active' : ''}`}
          onClick={() => setCaptureMode('type')}
          aria-label="Type text manually"
        >
          <FiType size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Type
        </button>
        <button
          className={`tab-item ${captureMode === 'upload' ? 'active' : ''}`}
          onClick={() => setCaptureMode('upload')}
          aria-label="Upload text file"
        >
          <FiUpload size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Upload
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

      {captureMode === 'type' ? (
        /* Manual text input */
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <FiType size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }} />
            <textarea
              className="input"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={STRINGS.CAPTURE_TEXT_PLACEHOLDER}
              style={{ paddingLeft: '36px', minHeight: '60px' }}
              aria-label="Text sample input"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={!textValue.trim() || !selectedClassId}
            aria-label="Add text sample"
            style={{ alignSelf: 'flex-start' }}
          >
            <FiPlus size={16} />
            Add
          </button>
        </div>
      ) : (
        /* File upload mode */
        <div
          {...getRootProps()}
          className={`drop-zone ${isDragActive ? 'active' : ''}`}
          aria-label="Drop zone for text files"
          style={{ marginBottom: '16px' }}
        >
          <input {...getInputProps()} />
          <FiFile size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>
            Drag & drop text files here, or click to browse
          </p>
          <p style={{ fontSize: '12px', opacity: 0.6 }}>
            .txt (one sample per line) or .csv (first column)
          </p>
        </div>
      )}

      {/* Text samples as chips */}
      {selectedClass && selectedClass.samples.length > 0 && (
        <div>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Samples ({selectedClass.samples.length})
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <AnimatePresence>
              {selectedClass.samples.map((sample) => (
                <motion.div
                  key={sample.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    maxWidth: '250px',
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {sample.preview || sample.data.slice(0, 40)}
                  </span>
                  <button
                    onClick={() => removeSample(selectedClassId!, sample.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexShrink: 0,
                    }}
                    aria-label={`Remove sample: ${sample.preview}`}
                  >
                    <FiX size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
