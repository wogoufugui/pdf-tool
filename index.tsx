import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// Use a robust fallback version if the imported package version is not detected correctly.
// This ensures the worker matches the library version to prevent runtime errors.
try {
  // Handle different module shapes (ESM namespace vs default export)
  const lib = (pdfjsLib as any).default || pdfjsLib;
  const pdfJsVersion = lib.version || '4.4.168';
  
  // Ensure GlobalWorkerOptions exists
  if (lib.GlobalWorkerOptions) {
    lib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.mjs`;
  } else {
    // Fallback or older version structure
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