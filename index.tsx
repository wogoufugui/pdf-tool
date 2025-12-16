import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
try {
  // Use the imported namespace directly.
  const lib = pdfjsLib;
  
  // Explicitly set the worker version to match the importmap version (5.4.449)
  // to prevent version mismatch errors which cause blank output.
  const workerUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs";
  
  // Ensure GlobalWorkerOptions exists and set the worker source
  if (lib.GlobalWorkerOptions) {
    lib.GlobalWorkerOptions.workerSrc = workerUrl;
  } else {
    // Fallback for older versions or different environments
    (window as any).pdfjsWorker = workerUrl;
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