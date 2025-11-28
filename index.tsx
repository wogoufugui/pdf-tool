import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// Use a robust fallback version if the imported package version is not detected correctly.
// This ensures the worker matches the library version to prevent runtime errors.
const pdfJsVersion = pdfjsLib.version || '4.4.168';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfJsVersion}/build/pdf.worker.min.mjs`;

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