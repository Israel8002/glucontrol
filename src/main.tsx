import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import { registerSW } from 'virtual:pwa-register';

// Registrar Service Worker para funcionalidad offline
const updateSW = registerSW({
  onNeedRefresh() {
    // Notificar al usuario que hay una actualización disponible
    if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('[GluControl] Aplicación lista para uso offline');
  },
  onRegistered(registration) {
    console.log('[GluControl] Service Worker registrado:', registration?.scope);
  },
  onRegisterError(error) {
    console.error('[GluControl] Error al registrar SW:', error);
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
