import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppErrorBoundary } from './components/ui/AppErrorBoundary';
import { lockViewportZoom } from './utils/disableZoom';
import { migrateServiceWorkerCache } from './pwa/migrateServiceWorker';
import { initPwaUpdates } from './pwa/registerUpdates';
import { installChunkLoadRecovery, isChunkLoadError, redirectToCacheReset } from './utils/chunkLoadRecovery';

installChunkLoadRecovery();

async function boot() {
  await migrateServiceWorkerCache(__APP_VERSION__);

  lockViewportZoom();
  initPwaUpdates();

  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </React.StrictMode>
  );

  window.__makaraMarkBootOk?.();
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  if (isChunkLoadError(err?.message || String(err))) {
    redirectToCacheReset();
  }
});
