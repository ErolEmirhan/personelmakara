import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { lockViewportZoom } from './utils/disableZoom';
import { initPwaUpdates } from './pwa/registerUpdates';

lockViewportZoom();
initPwaUpdates();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
