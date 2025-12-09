import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import { FileType, Loader2, Wand2, UploadCloud, ArrowRightLeft, FileText, FileSpreadsheet } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { convertToTable } from '../services/geminiService';
import { useLanguage } from '../components/LanguageContext';
// @ts-ignore
import * as mammoth from 'mammoth';
// @ts-ignore
import * as XLSX from 'xlsx';

type ConversionMode = 'pdf-to-file' | 'file-to-pdf';

const ConvertPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ConversionMode>('pdf-to-file');
  const [target, setTarget] = useState<'word' | 'excel' | 'txt'>('word');
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  const handleFile = (f: File) => {
    setFile(f);
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
      
      if (mode === 'pdf-to-file') {
        if (droppedFile.type === 'application/pdf' || name.endsWith('.pdf')) {
          handleFile(droppedFile);
        } else {
          alert(t('alert_only_pdf'));
        }
      } else {
        if (name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
          handleFile(droppedFile);
        } else {
          alert(t('convert_upload_file_to_pdf')); 
        }
      }
    }
  };

  const convertFileToPdf = async () => {
    if (!file) return;
    setProcessing(true);
    try {
        const arrayBuffer = await file.arrayBuffer();
        let htmlContent = "";

        if (file.name.endsWith('.docx')) {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            htmlContent = `
                <div style="font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000; padding: 20px;">
                    <style>
                        p { margin-bottom: 10pt; }
                        table { border-collapse: collapse; width: 100%; margin-bottom: 10pt; }
                        td, th { border: 1px solid #000; padding: 4pt; }
                        img { max-width: 100%; height: auto; }
                        h1, h2, h3, h4, h5, h6 { margin-top: 15pt; margin-bottom: 10pt; font-family: Arial, sans-serif; }
                    </style>
                    ${result.value}
                </div>
            `;
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const workbook = XLSX.read(arrayBuffer);
            let sheetsHtml = "";
            
            workbook.SheetNames.forEach((name: string) => {
                const sheet = workbook.Sheets[name];
                // Check if sheet has a range (not empty)
                if (sheet['!ref']) {
                    const html = XLSX.utils.sheet_to_html(sheet);
                    // Minimal styling wrapper for the table
                    if (html) {
                        sheetsHtml += `
                            <div style="page-break-after: always; margin-bottom: 30px;">
                                <h3 style="border-bottom: 2px solid #3b82f6; color: #1e3a8a; padding-bottom: 5px; margin-bottom: 15px;">${name}</h3>
                                ${html}
                            </div>
                        `;
                    }
                }
            });

            htmlContent = `
                <div style="font-family: Arial, sans-serif; font-size: 10pt; padding: 20px;">
                    <style>
                        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                        td, th { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        th { background-color: #e2e8f0; font-weight: bold; }
                    </style>
                    ${sheetsHtml}
                </div>
            `;
        }

        const container = document.createElement('div');
        container.innerHTML = htmlContent;

        const opt = {
            margin:       10, // mm
            filename:     `${file.name.split('.')[0]}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Check for html2pdf
        // @ts-ignore
        if (window.html2pdf) {
             // @ts-ignore
             await window.html2pdf().set(opt).from(container).save();
        } else {
             console.error("html2pdf library missing");
             alert("PDF generation component not loaded. Please refresh the page.");
        }

    } catch (e) {
        console.error(e);
        alert(t('alert_convert_fail'));
    } finally {
        setProcessing(false);
    }
  };

  const convertPdfToFile = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      const maxPages = Math.min(pdf.numPages, 20); // Limit to 20 pages for client-side perf
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n\n';
      }

      if (target === 'txt') {
        saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'converted.txt');
      } else if (target === 'word') {
        // Minimal HTML wrapper for Word
        const html = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'></head><body><pre style="font-family: sans-serif; white-space: pre-wrap;">${text}</pre></body></html>`;
        saveAs(new Blob([html], { type: 'application/msword' }), 'converted.doc');
      } else if (target === 'excel') {
        const tableHtml = await convertToTable(text);
        const excelHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${tableHtml}</body></html>`;
        saveAs(new Blob([excelHtml], { type: 'application/vnd.ms-excel' }), 'converted.xls');
      }
    } catch (e) {
      console.error(e);
      alert(t('alert_convert_fail'));
    } finally {
      setProcessing(false);
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

      <div className="flex justify-center mb-6">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
          <button
            onClick={() => { setMode('pdf-to-file'); setFile(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              mode === 'pdf-to-file' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileType size={16} /> {t('convert_mode_pdf_to_file')}
          </button>
          <button
            onClick={() => { setMode('file-to-pdf'); setFile(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              mode === 'file-to-pdf' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ArrowRightLeft size={16} /> {t('convert_mode_file_to_pdf')}
          </button>
        </div>
      </div>

      {!file ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <FileUploader 
            onFilesSelected={(fs) => handleFile(fs[0])} 
            accept={mode === 'pdf-to-file' ? ".pdf" : ".docx,.xlsx,.xls"} 
            label={mode === 'pdf-to-file' ? t('convert_upload_label') : t('convert_upload_file_to_pdf')} 
           />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-2xl mx-auto text-center">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
              {mode === 'pdf-to-file' ? <FileType size={32} className="text-blue-600"/> : <FileText size={32} className="text-blue-600"/>}
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-6">{file.name}</h3>
          
          {mode === 'pdf-to-file' && (
            <div className="grid grid-cols-3 gap-3 mb-8">
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
          )}

          {mode === 'pdf-to-file' && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-sm mb-6 text-left">
                <span className="font-bold">{t('convert_note')}</span> {t('convert_note_text')}
            </div>
          )}

          {mode === 'file-to-pdf' && (
             <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-blue-800 text-sm mb-6 text-left">
                {t('convert_warn_layout')}
            </div>
          )}

          <button
            onClick={mode === 'pdf-to-file' ? convertPdfToFile : convertFileToPdf}
            disabled={processing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
          >
            {processing ? <Loader2 className="animate-spin" /> : <Wand2 size={20}/>}
            {processing ? t('convert_processing') : (mode === 'pdf-to-file' ? t('btn_start_convert') : t('convert_btn_to_pdf'))}
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