import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import saveAs from 'file-saver';
import { Eraser, Loader2, UploadCloud, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { useLanguage } from '../components/LanguageContext';

const RemoveWatermark: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [watermarkText, setWatermarkText] = useState("");
  const [status, setStatus] = useState<'idle' | 'scanning' | 'removing'>('idle');
  const [detectedText, setDetectedText] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setWatermarkText("");
    setDetectedText(null);
    setStatus('idle');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.toLowerCase().endsWith('.pdf')) {
        handleFile([droppedFile]);
      } else {
        alert(t('alert_only_pdf'));
      }
    }
  };

  // Heuristic: Scan first page for rotated text, which is often a watermark
  const autoDetect = async () => {
    if (!file) return;
    setStatus('scanning');
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        
        let candidate = "";
        
        // Check text items
        for (const item of textContent.items) {
             const txItem = item as any;
             // Check transform matrix [scaleX, skewY, skewX, scaleY, tx, ty]
             // If skewY/skewX (indices 1 and 2) are non-zero, it's rotated
             if (Math.abs(txItem.transform[1]) > 0.1 || Math.abs(txItem.transform[2]) > 0.1) {
                 if (txItem.str.trim().length > 3) {
                     candidate = txItem.str;
                     break; // Found a rotated text
                 }
             }
        }

        if (candidate) {
            setDetectedText(candidate);
            setWatermarkText(candidate);
        } else {
            setDetectedText(null);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setStatus('idle');
    }
  };

  const removeAndDownload = async () => {
    if (!file || !watermarkText.trim()) return;
    setStatus('removing');

    try {
        const arrayBuffer = await file.arrayBuffer();
        const srcDoc = await PDFDocument.load(arrayBuffer);
        const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
        
        const pages = srcDoc.getPages();
        const totalPages = srcDoc.getPageCount();

        for (let i = 0; i < totalPages; i++) {
            const page = pages[i];
            const { height: pageHeight } = page.getSize();
            
            // Get text positions from PDF.js
            const pdfPage = await pdfJsDoc.getPage(i + 1);
            const textContent = await pdfPage.getTextContent();
            
            // Filter items that match the watermark text (fuzzy match)
            // Note: PDF.js often splits text into multiple items. 
            // Simple approach: remove any item that contains part of the string or matches exactly.
            // Better approach: Remove items that *contain* the watermark string.
            
            const target = watermarkText.trim().toLowerCase();

            for (const item of textContent.items) {
                const txItem = item as any;
                const str = txItem.str.toLowerCase();
                
                if (str.includes(target) || target.includes(str) && str.length > 3) {
                    // Found a match. Get coordinates.
                    // transform: [scaleX, skewY, skewX, scaleY, x, y]
                    const tx = txItem.transform[4];
                    const ty = txItem.transform[5];
                    
                    // Estimate Width/Height
                    // txItem.width is usually available
                    const w = txItem.width;
                    const h = txItem.height || (Math.abs(txItem.transform[3])); // scaleY as approx height
                    
                    // Add some padding to ensure coverage
                    const padding = 2;
                    
                    // Draw a white rectangle over it
                    // PDF-lib uses bottom-left origin, same as PDF.js default output usually.
                    // However, we might need to handle rotation. 
                    // For now, drawing directly at (tx, ty) usually works for standard PDFs.
                    
                    page.drawRectangle({
                        x: tx - padding,
                        y: ty - padding, // PDF.js y is usually from bottom. 
                        width: w + (padding * 2),
                        height: h + (padding * 2),
                        color: rgb(1, 1, 1), // White
                        opacity: 1,
                        // If the text was rotated, we might need to rotate the rect, 
                        // but covering the bounding box is often safer/easier if we don't have exact rotation angle easily handy in this loop context
                        // without calculating from the matrix.
                        // Let's assume non-rotated rect for simplicity or simple coverage.
                    });
                }
            }
        }

        const pdfBytes = await srcDoc.save();
        saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'cleaned_document.pdf');

    } catch (e) {
        console.error(e);
        alert(t('alert_convert_fail')); // Generic fail message
    } finally {
        setStatus('idle');
    }
  };

  return (
    <div 
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative"
      onDragOver={onDragOver} 
      onDragLeave={onDragLeave} 
      onDrop={onDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-blue-500 border-dashed rounded-2xl">
          <div className="bg-white p-8 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center gap-4 text-blue-600">
              <UploadCloud size={64} />
              <h3 className="text-2xl font-bold">{t('edit_drag_overlay')}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800">{t('wm_title')}</h2>
        <p className="text-slate-500 mt-2">{t('wm_desc')}</p>
      </div>

      {!file ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <FileUploader 
            onFilesSelected={handleFile} 
            accept=".pdf" 
            label={t('wm_upload_label')} 
           />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-2xl mx-auto">
             <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                    <Eraser size={24}/>
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-800">{file.name}</h3>
                    <p className="text-slate-500 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={() => setFile(null)} className="ml-auto text-sm text-blue-600 hover:underline">{t('select_other_file')}</button>
            </div>

            <div className="space-y-4">
                <label className="block font-medium text-slate-700">{t('wm_input_label')}</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder={t('wm_input_placeholder')}
                        className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                        onClick={autoDetect}
                        disabled={status !== 'idle'}
                        className="bg-slate-100 text-slate-600 px-4 rounded-xl hover:bg-slate-200 font-medium flex items-center gap-2"
                        title={t('wm_btn_scan')}
                    >
                        {status === 'scanning' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    </button>
                </div>

                {detectedText && (
                    <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {t('wm_scan_result')} <strong>{detectedText}</strong>
                    </div>
                )}
                {status === 'idle' && detectedText === null && watermarkText === "" && (
                     <p className="text-xs text-slate-400">{t('wm_no_scan_result')}</p>
                )}

                <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2 text-amber-800 text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {t('wm_hint')}
                </div>

                <button
                    onClick={removeAndDownload}
                    disabled={!watermarkText || status !== 'idle'}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
                >
                    {status === 'removing' ? <Loader2 className="animate-spin" /> : <Eraser size={20}/>}
                    {status === 'removing' ? t('wm_status_removing') : t('wm_btn_remove')}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default RemoveWatermark;