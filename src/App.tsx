/** App root — routes between Home and Workspace based on project state */

import { useEffect } from 'react';
import { useStore } from './store';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workspace from './pages/Workspace';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const { currentProject, darkMode, loadSavedProjects, setIsMobile } = useStore();

  // Initialize on mount
  useEffect(() => {
    // Load saved projects from localStorage
    loadSavedProjects();

    // Apply saved dark mode preference
    const savedDarkMode = localStorage.getItem('tm_darkMode');
    if (savedDarkMode !== null) {
      const isDark = JSON.parse(savedDarkMode);
      document.documentElement.classList.toggle('dark', isDark);
      if (isDark !== darkMode) {
        useStore.getState().toggleDarkMode();
      }
    } else {
      // Default to dark mode
      document.documentElement.classList.add('dark');
    }

    // Responsive check
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--surface-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: 'var(--shadow-md)',
          },
        }}
      />
      <Navbar />
      {currentProject ? <Workspace /> : <Home />}
    </>
  );
}
