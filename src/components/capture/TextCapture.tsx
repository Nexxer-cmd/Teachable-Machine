/** Text capture — textarea input with chip preview for text classification */

import { useState } from 'react';
import { useStore } from '../../store';
import { STRINGS } from '../../constants';
import { FiPlus, FiX, FiType } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function TextCapture() {
  const { currentProject, selectedClassId, addSample, removeSample } = useStore();
  const [textValue, setTextValue] = useState('');

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

      {/* Text input */}
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
