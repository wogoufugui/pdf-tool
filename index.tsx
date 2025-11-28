import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
try {
  // Use the imported namespace directly. 
  // In modern bundlers with pdfjs-dist v4+, the exports are named.
  const lib = pdfjsLib;
  const pdfJsVersion = lib.version || '4.4.168';
  
  // Ensure GlobalWorkerOptions exists and set the worker source
  if (lib.GlobalWorkerOptions) {
    lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.mjs`;
  } else {
    // Fallback for older versions or different environments
    (window as any).pdfjsWorker = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn("Error configuring PDF.js worker:", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("FATAL: Root element not found");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("FATAL: Failed to render app:", error);
  }
}