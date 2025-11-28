import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// Ensure we use the version from the installed package, or fallback to a known stable version.
// We use the .mjs worker from jsDelivr which supports ES modules.
const pdfJsVersion = pdfjsLib.version || '4.4.168';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.mjs`;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);