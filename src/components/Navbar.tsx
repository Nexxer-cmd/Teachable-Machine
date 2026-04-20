/** Top navigation bar — logo, project actions, theme toggle */

import { useStore } from '../store';
import { STRINGS } from '../constants';
import { FiSun, FiMoon, FiSave, FiDownload, FiPlus, FiHome, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Navbar() {
  const {
    currentProject,
    darkMode,
    toggleDarkMode,
    saveProject,
    setShowExportModal,
    setShowNewProjectModal,
    toggleAIPanel,
    closeProject,
  } = useStore();

  const handleSave = () => {
    saveProject();
    toast.success('Project saved!');
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="navbar-brand"
          onClick={() => { if (currentProject) closeProject(); }}
          aria-label="Go to home page"
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}
        >
          <div className="navbar-brand-icon">TM</div>
          <span style={{ fontSize: '16px' }}>{STRINGS.APP_NAME}</span>
        </button>

        {currentProject && (
          <span style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            padding: '4px 12px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
          }}>
            {currentProject.name}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!currentProject && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewProjectModal(true)}
            aria-label={STRINGS.NAV_NEW_PROJECT}
          >
            <FiPlus size={16} />
            {STRINGS.NAV_NEW_PROJECT}
          </button>
        )}

        {currentProject && (
          <>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => closeProject()}
              aria-label={STRINGS.NAV_HOME}
              data-tooltip={STRINGS.NAV_HOME}
              style={{ position: 'relative' }}
            >
              <FiHome size={18} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={toggleAIPanel}
              aria-label="Toggle AI Assistant"
            >
              <FiMessageSquare size={18} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleSave}
              aria-label={STRINGS.NAV_SAVE}
            >
              <FiSave size={18} />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExportModal(true)}
              aria-label={STRINGS.NAV_EXPORT}
            >
              <FiDownload size={15} />
              {STRINGS.NAV_EXPORT}
            </button>
          </>
        )}

        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }} />

        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
        </button>
      </div>
    </nav>
  );
}
