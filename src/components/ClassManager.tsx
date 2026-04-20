/** Left sidebar — class list with add/rename/delete and sample counts */

import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { STRINGS, ML_CONFIG } from '../constants';
import { FiPlus, FiTrash2, FiEdit2, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ClassManager() {
  const {
    currentProject,
    selectedClassId,
    addClass,
    removeClass,
    renameClass,
    selectClass,
    clearClassSamples,
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (!currentProject) return null;

  const handleStartRename = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleConfirmRename = () => {
    if (editingId && editValue.trim()) {
      renameClass(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (currentProject.classes.length <= ML_CONFIG.MIN_CLASSES) {
      toast.error(STRINGS.CLASS_MIN_WARNING);
      return;
    }
    const cls = currentProject.classes.find((c) => c.id === id);
    if (cls && cls.samples.length > 0) {
      if (!confirm(STRINGS.CLASS_DELETE_CONFIRM)) return;
    }
    removeClass(id);
  };

  const handleAddClass = () => {
    if (currentProject.classes.length >= ML_CONFIG.MAX_CLASSES) {
      toast.error('Maximum 20 classes allowed');
      return;
    }
    addClass();
  };

  return (
    <aside className="sidebar" aria-label="Class manager">
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Classes</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {currentProject.classes.length} classes · {currentProject.dataType}
          </span>
        </div>
        <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
          {currentProject.dataType}
        </span>
      </div>

      {/* Class List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        <AnimatePresence>
          {currentProject.classes.map((cls) => (
            <motion.div
              key={cls.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div
                onClick={() => selectClass(cls.id)}
                role="button"
                tabIndex={0}
                aria-label={`Select class ${cls.name}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: selectedClassId === cls.id ? 'rgba(26, 115, 232, 0.08)' : 'transparent',
                  border: selectedClassId === cls.id ? '1px solid rgba(26, 115, 232, 0.2)' : '1px solid transparent',
                  transition: 'var(--transition)',
                }}
                onKeyDown={(e) => e.key === 'Enter' && selectClass(cls.id)}
              >
                {/* Color dot */}
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: cls.color,
                  flexShrink: 0,
                }} />

                {/* Name / Edit */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === cls.id ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        ref={inputRef}
                        className="input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleConfirmRename}
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
                        style={{ padding: '4px 8px', fontSize: '13px' }}
                        aria-label="Rename class"
                      />
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={handleConfirmRename}
                        aria-label="Confirm rename"
                      >
                        <FiCheck size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {cls.name}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        fontWeight: 500,
                      }}>
                        {cls.samples.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {editingId !== cls.id && (
                  <div style={{ display: 'flex', gap: '2px', opacity: 0.6 }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => { e.stopPropagation(); handleStartRename(cls.id, cls.name); }}
                      style={{ padding: '4px' }}
                      aria-label={`Rename ${cls.name}`}
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => { e.stopPropagation(); handleDelete(cls.id); }}
                      style={{ padding: '4px', color: 'var(--error)' }}
                      aria-label={`Delete ${cls.name}`}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Class Button */}
      <div style={{ padding: '12px' }}>
        <button
          className="btn btn-secondary"
          onClick={handleAddClass}
          aria-label={STRINGS.CLASS_ADD}
          style={{ width: '100%' }}
        >
          <FiPlus size={16} />
          {STRINGS.CLASS_ADD}
        </button>

        {/* Selected class quick actions */}
        {selectedClassId && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm('Clear all samples from this class?')) {
                clearClassSamples(selectedClassId);
              }
            }}
            style={{ width: '100%', marginTop: '6px', fontSize: '12px' }}
            aria-label="Clear samples"
          >
            Clear Samples
          </button>
        )}
      </div>
    </aside>
  );
}
