/** Home page — hero section, gallery templates, and recent projects */

import { useStore } from '../store';
import { STRINGS, GALLERY_PROJECTS } from '../constants';
import type { DataType } from '../types';
import { FiPlus, FiClock, FiTrash2, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Home() {
  const {
    savedProjects,
    createProject,
    loadProject,
    deleteSavedProject,
    setShowNewProjectModal,
    showNewProjectModal,
  } = useStore();

  const handleNewProject = (name: string, dataType: DataType) => {
    createProject(name, dataType);
    useStore.getState().setShowNewProjectModal(false);
    toast.success(`Created "${name}" project`);
  };

  const handleLoadSaved = (projectId: string) => {
    const project = savedProjects.find((p) => p.id === projectId);
    if (project) {
      loadProject(project);
    }
  };

  const handleGalleryClick = (template: typeof GALLERY_PROJECTS[0]) => {
    createProject(template.title, template.dataType);
    // Auto-rename classes from template
    const state = useStore.getState();
    if (state.currentProject) {
      template.classes.forEach((name, i) => {
        const cls = state.currentProject!.classes[i];
        if (cls) state.renameClass(cls.id, name);
        else {
          state.addClass();
          const newCls = useStore.getState().currentProject!.classes[useStore.getState().currentProject!.classes.length - 1];
          state.renameClass(newCls.id, name);
        }
      });
    }
    toast.success(`Started "${template.title}" project!`);
  };

  return (
    <main style={{ flex: 1, overflow: 'auto' }}>
      {/* Hero Section */}
      <section style={{
        padding: '80px 40px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background gradient orbs */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '400px',
          background: 'radial-gradient(ellipse at center, rgba(66, 133, 244, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ marginBottom: '16px' }}>
            <span className="badge badge-primary" style={{ fontSize: '13px', padding: '5px 14px' }}>
              ✨ 100% Free · Runs in Your Browser
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: '16px',
            letterSpacing: '-1px',
          }}>
            <span className="gradient-text">{STRINGS.APP_TAGLINE}</span>
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '600px',
            margin: '0 auto 32px',
            lineHeight: 1.6,
          }}>
            {STRINGS.APP_SUBTITLE}
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowNewProjectModal(true)}
              aria-label="Create new project"
            >
              <FiPlus size={20} />
              {STRINGS.NAV_NEW_PROJECT}
            </button>
            <a
              href="#gallery"
              className="btn btn-secondary btn-lg"
              style={{ textDecoration: 'none' }}
            >
              View Templates
              <FiArrowRight size={18} />
            </a>
          </div>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '40px',
            flexWrap: 'wrap',
          }}
        >
          {['TensorFlow.js', 'Google Gemini AI', 'Image · Text · Audio', 'Real-time Training', 'Export Models'].map((label) => (
            <div
              key={label}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              {label}
            </div>
          ))}
        </motion.div>
      </section>

      {/* Gallery Templates */}
      <section id="gallery" style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>{STRINGS.GALLERY_TITLE}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{STRINGS.GALLERY_SUBTITLE}</p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}>
          {GALLERY_PROJECTS.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div
                className="card card-elevated"
                onClick={() => handleGalleryClick(template)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleGalleryClick(template)}
                aria-label={`Start ${template.title} project`}
                style={{ cursor: 'pointer', overflow: 'hidden' }}
              >
                {/* Gradient header */}
                <div style={{
                  height: '80px',
                  background: template.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                }}>
                  {template.icon}
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{template.title}</h3>
                    <span className="badge badge-primary">{template.dataType}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                    {template.description}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {template.classes.map((cls) => (
                      <span
                        key={cls}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--surface)',
                          border: '1px solid var(--border-color)',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Projects */}
      {savedProjects.length > 0 && (
        <section style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <FiClock size={18} style={{ color: 'var(--text-secondary)' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Recent Projects</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {savedProjects.slice().reverse().map((project) => (
              <div
                key={project.id}
                className="card"
                style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => handleLoadSaved(project.id)}
                role="button"
                tabIndex={0}
                aria-label={`Open project ${project.name}`}
              >
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>{project.name}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {project.classes.length} classes · {project.dataType} · {new Date(project.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${project.name}"?`)) {
                        deleteSavedProject(project.id);
                      }
                    }}
                    aria-label={`Delete ${project.name}`}
                    style={{ color: 'var(--error)' }}
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreate={handleNewProject}
        />
      )}
    </main>
  );
}

/** New project creation modal */
function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, dataType: DataType) => void;
}) {
  const dataTypes: { type: DataType; label: string; icon: string; desc: string }[] = [
    { type: 'image', label: 'Image', icon: '📷', desc: 'Webcam or uploaded images' },
    { type: 'text', label: 'Text', icon: '📝', desc: 'Text classification' },
    { type: 'audio', label: 'Audio', icon: '🎵', desc: 'Sound and voice' },
    { type: 'csv', label: 'CSV', icon: '📊', desc: 'Tabular data' },
  ];

  const handleSelect = (type: DataType) => {
    const name = `My ${type.charAt(0).toUpperCase() + type.slice(1)} Project`;
    onCreate(name, type);
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-label="Create new project">
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{STRINGS.NAV_NEW_PROJECT}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Choose your data type to get started
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {dataTypes.map((dt) => (
            <div
              key={dt.type}
              className="card card-elevated"
              onClick={() => handleSelect(dt.type)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(dt.type)}
              aria-label={`Create ${dt.label} project`}
              style={{
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>{dt.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>{dt.label}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{dt.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
