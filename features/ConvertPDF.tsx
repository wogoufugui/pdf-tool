import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import { FileType, Loader2, Wand2, UploadCloud, ScanEye, AlertTriangle, Check } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { convertToTable, performOCR } from '../services/geminiService';
import { useLanguage } from '../components/LanguageContext';

const ConvertPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<'word' | 'excel' | 'txt'>('word');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0); // Track page progress
  const [isDragOver, setIsDragOver] = useState(false);
  const [useOCR, setUseOCR] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();

  const handleFile = (f: File) => {
    setFile(f);
    setUseOCR(false); // Reset on new file
    setProgress(0);
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
      const name = droppedFile.name.toLowerCase();
      
      if (droppedFile.type === 'application/pdf' || name.endsWith('.pdf')) {
        handleFile(droppedFile);
      } else {
        alert(t('alert_only_pdf'));
      }
    }
  };

  // Helper to render a PDF page to a base64 image string
  const renderPageToImage = async (page: any): Promise<string> => {
    const viewport = page.getViewport({ scale: 1.5 }); // Good balance of quality and size
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error("Canvas context failed");

    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  };

  const convertPdfToFile = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let finalContent = '';
      
      // Limit pages for client-side processing to prevent timeout/quota issues
      // For OCR (images), we might want a stricter limit or process sequentially
      const maxPages = Math.min(pdf.numPages, useOCR ? 5 : 20); 

      // --- STRATEGY A: OCR (Visual Recognition) ---
      if (useOCR) {
        for (let i = 1; i <= maxPages; i++) {
          setProgress(Math.round((i / maxPages) * 100));
          const page = await pdf.getPage(i);
          const imageBase64 = await renderPageToImage(page);
          const pageResult = await performOCR(imageBase64, target);
          finalContent += pageResult + '\n\n';
        }
      } 
      // --- STRATEGY B: Standard Text Extraction ---
      else {
        let rawText = '';
        for (let i = 1; i <= maxPages; i++) {
          setProgress(Math.round((i / maxPages) * 100));
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          
          const pageText = content.items.map((item: any) => {
              if (!item.str) return ''; 
              return item.hasEOL ? item.str + '\n' : item.str + ' ';
          }).join('');
          
          rawText += pageText + '\n\n';
        }

        // Scan detection check
        if (!rawText.trim()) {
          const confirmOCR = window.confirm(t('alert_scan_detected'));
          if (confirmOCR) {
            setUseOCR(true);
            setProcessing(false);
            // The user will click convert again, or we could recursively call convertPdfToFile here
            // But for safety/state updates, let's let them click the button again or trigger it via effect
            return; 
          } else {
             alert(t('alert_convert_empty'));
             setProcessing(false);
             return;
          }
        }

        // Post-processing text
        if (target === 'excel') {
           finalContent = await convertToTable(rawText);
        } else {
           finalContent = rawText;
        }
      }

      // --- SAVE FILE ---
      if (target === 'txt') {
        // Strip HTML tags if we came from OCR mode which returns HTML-like structure sometimes
        const plainText = useOCR ? finalContent.replace(/<[^>]*>?/gm, '') : finalContent;
        saveAs(new Blob([plainText], { type: 'text/plain;charset=utf-8' }), 'converted.txt');
      } 
      else if (target === 'word') {
        const htmlBody = useOCR ? finalContent : `<pre style="font-family: sans-serif; white-space: pre-wrap;">${finalContent}</pre>`;
        const html = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'></head><body>${htmlBody}</body></html>`;
        saveAs(new Blob([html], { type: 'application/msword' }), 'converted.doc');
      } 
      else if (target === 'excel') {
        // OCR returns <table> directly. Standard returns <table> from geminiService.
        // Wrap in HTML for Excel to interpret
        const excelHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${finalContent}</body></html>`;
        saveAs(new Blob([excelHtml], { type: 'application/vnd.ms-excel' }), 'converted.xls');
      }

    } catch (e) {
      console.error(e);
      alert(t('alert_convert_fail'));
    } finally {
      setProcessing(false);
      setProgress(0);
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
        <h2 className="text-3xl font-bold text-slate-800">{t('convert_title')}</h2>
        <p className="text-slate-500 mt-2">{t('convert_desc')}</p>
      </div>

      {!file ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <FileUploader 
            onFilesSelected={(fs) => handleFile(fs[0])} 
            accept=".pdf" 
            label={t('convert_upload_label')} 
           />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-2xl mx-auto text-center">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
              <FileType size={32} className="text-blue-600"/>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-6">{file.name}</h3>
          
          <div className="grid grid-cols-3 gap-3 mb-6">
            {['word', 'excel', 'txt'].map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t as any)}
                className={`p-4 border rounded-xl capitalize font-medium transition-all ${
                  target === t 
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 border-transparent' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* OCR Toggle */}
          <div 
            className={`mb-8 p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                useOCR ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
            }`}
            onClick={() => setUseOCR(!useOCR)}
          >
             <div className={`p-2 rounded-lg ${useOCR ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <ScanEye size={20} />
             </div>
             <div className="flex-1 text-left">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                    {t('convert_ocr_title')}
                    {useOCR && <Check size={16} className="text-indigo-600" />}
                </div>
                <div className="text-xs text-slate-500">{t('convert_ocr_desc')}</div>
             </div>
             <div className={`w-12 h-6 rounded-full p-1 transition-colors ${useOCR ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${useOCR ? 'translate-x-6' : 'translate-x-0'}`}></div>
             </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-sm mb-6 text-left flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">{t('convert_note')}</span> {useOCR ? t('convert_note_ocr') : t('convert_note_text')}
              </div>
          </div>

          <button
            onClick={convertPdfToFile}
            disabled={processing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 relative overflow-hidden"
          >
            {processing && (
                 <div className="absolute inset-0 bg-blue-700 w-full flex items-center justify-start">
                    <div className="h-full bg-blue-500/50 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                 </div>
            )}
            <div className="relative flex items-center gap-2 z-10">
                {processing ? <Loader2 className="animate-spin" /> : <Wand2 size={20}/>}
                {processing ? `${t('convert_processing')} ${progress}%` : t('btn_start_convert')}
            </div>
          </button>
          
          <button onClick={() => setFile(null)} className="mt-4 text-sm text-slate-400 hover:text-slate-600 underline">
              {t('select_other_file')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConvertPDF;