import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Force an update check on every load, and auto-reload once a newer
      // SW takes control — otherwise the already-open page stays stuck on
      // whatever code the previous SW served, even after a manual relaunch.
      registration.update().catch(() => {});
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            window.location.reload();
          }
        });
      });
    }).catch(() => {
      // Non-fatal: the app still works without offline caching, just without
      // the installability boost a registered SW provides on Android/Chrome.
    });

    let reloadedForNewController = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedForNewController) return;
      reloadedForNewController = true;
      window.location.reload();
    });
  });
}
