import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from '@/router/AppRouter';
import { ToastContainer } from '@/components/ui/Toast/Toast';
import { LockScreen } from '@/pages/Lock/LockScreen';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Spinner } from '@/components/ui/Spinner/Spinner';

/**
 * Componente raíz de la aplicación.
 * Maneja:
 * - Inicialización de stores
 * - Pantalla de bloqueo
 * - Proveedor de toasts
 * - Router
 * - Tema (dark/light)
 */
const AppContent: React.FC = () => {
  const { status, initialize, checkAutoLock, updateActivity } = useAuthStore();
  const { settings, loadSettings } = useSettingsStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadSettings(), initialize()]);
      setIsInitializing(false);
    };
    init();
  }, []);

  // Aplicar tema
  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme);
    }
  }, [settings?.theme]);

  // Auto-lock check al enfocar la ventana
  useEffect(() => {
    const handleFocus = () => {
      checkAutoLock();
      updateActivity();
    };
    const handleClick = () => updateActivity();

    window.addEventListener('focus', handleFocus);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('click', handleClick);
    };
  }, [checkAutoLock, updateActivity]);

  // Gestionar prompt de instalación PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      // El evento se maneja en settingsStore
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isInitializing) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '16px',
        background: 'var(--color-bg-base)'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a5 5 0 0 1 5 5c0 2-1 4-3 5.4a7 7 0 0 1 3 6.6" />
          <path d="M12 2a5 5 0 0 0-5 5c0 2 1 4 3 5.4a7 7 0 0 0-3 6.6" />
        </svg>
        <Spinner size="md" />
      </div>
    );
  }

  // Mostrar pantalla de bloqueo si está bloqueado o requiere PIN
  if (status === 'locked') {
    return <LockScreen />;
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
};

export const App: React.FC = () => (
  <ToastContainer>
    <AppContent />
  </ToastContainer>
);
