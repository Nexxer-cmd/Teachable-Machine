/** Export modal — download model as TFjs zip or JSON snapshot */

import { useState } from 'react';
import { useStore } from '../store';
import { STRINGS } from '../constants';
import { exportModel } from '../lib/trainer';
import { FiDownload, FiPackage, FiCode, FiX } from 'react-icons/fi';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import toast from 'react-hot-toast';

export default function ExportModal() {
  const { currentProject, showExportModal, setShowExportModal, metrics } = useStore();
  const [isExporting, setIsExporting] = useState(false);

  if (!showExportModal || !currentProject) return null;

  const handleExportTFJS = async () => {
    setIsExporting(true);
    try {
      const result = await exportModel();
      if (!result) {
        toast.error('No model to export. Train a model first.');
        return;
      }

      const zip = new JSZip();
      zip.file('model.json', result.modelJSON);
      zip.file('README.md', generateReadme());

      // Add embed code snippet
      zip.file('embed.html', generateEmbedCode());

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, `${currentProject.name.replace(/\s+/g, '_')}_model.zip`);
      toast.success('Model exported as TensorFlow.js package');
    } catch (err) {
      toast.error('Export failed');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const snapshot = {
        version: '1.0',
        project: currentProject,
        metrics,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      saveAs(blob, `${currentProject.name.replace(/\s+/g, '_')}_snapshot.json`);
      toast.success('Project snapshot exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const generateReadme = () => `# ${currentProject.name}

Trained with Teachable Machine Pro
- Data Type: ${currentProject.dataType}
- Classes: ${currentProject.classes.map((c) => c.name).join(', ')}
- Epochs: ${metrics.length}
- Final Accuracy: ${metrics.length ? metrics[metrics.length - 1].accuracy.toFixed(1) + '%' : 'N/A'}

## Usage
Load this model with TensorFlow.js:
\`\`\`javascript
const model = await tf.loadLayersModel('model.json');
const prediction = model.predict(inputTensor);
\`\`\`
`;

  const generateEmbedCode = () => `<!DOCTYPE html>
<html>
<head>
  <title>${currentProject.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
</head>
<body>
  <h1>${currentProject.name}</h1>
  <script>
    async function loadModel() {
      const model = await tf.loadLayersModel('./model.json');
      console.log('Model loaded!', model);
      // Use model.predict(inputTensor) to make predictions
    }
    loadModel();
  </script>
</body>
</html>`;

  return (
    <div className="modal-overlay" onClick={() => setShowExportModal(false)} role="dialog" aria-label="Export model">
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiDownload size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>{STRINGS.EXPORT_TITLE}</h2>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowExportModal(false)}
            aria-label="Close export modal"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Export Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* TensorFlow.js */}
          <div className="card card-elevated" style={{ padding: '20px', cursor: 'pointer' }} onClick={handleExportTFJS}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius)',
                background: 'linear-gradient(135deg, #FF6F00, #FFA726)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FiPackage size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>{STRINGS.EXPORT_TFJS}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {STRINGS.EXPORT_TFJS_DESC}
                </p>
              </div>
              {isExporting ? <div className="spinner" /> : <FiDownload size={18} style={{ color: 'var(--text-secondary)' }} />}
            </div>
          </div>

          {/* JSON Snapshot */}
          <div className="card card-elevated" style={{ padding: '20px', cursor: 'pointer' }} onClick={handleExportJSON}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius)',
                background: 'linear-gradient(135deg, #1A73E8, #4285F4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <FiCode size={22} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>{STRINGS.EXPORT_JSON}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {STRINGS.EXPORT_JSON_DESC}
                </p>
              </div>
              <FiDownload size={18} style={{ color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>

        {/* Model info */}
        <div style={{
          marginTop: '20px',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Classes</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentProject.classes.map((c) => c.name).join(', ')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Trained Epochs</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{metrics.length}</span>
          </div>
          {metrics.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Final Accuracy</span>
              <span style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                {metrics[metrics.length - 1].accuracy.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
