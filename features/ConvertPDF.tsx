import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import { FileType, Loader2, Wand2, UploadCloud } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { convertToTable } from '../services/geminiService';

const ConvertPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState<'word' | 'excel' | 'txt'>('word');
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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
      if (droppedFile.type === 'application/pdf' || droppedFile.name.toLowerCase().endsWith('.pdf')) {
        handleFile(droppedFile);
      } else {
        alert("请上传 PDF 文件");
      }
    }
  };

  const convert = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Load PDF via PDF.js
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      
      // Extract text from pages (limit to first 10 for performance in this demo context)
      const maxPages = Math.min(pdf.numPages, 10);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n\n';
      }

      if (target === 'txt') {
        saveAs(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'converted.txt');
      } else if (target === 'word') {
        const html = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'></head><body><pre>${text}</pre></body></html>`;
        saveAs(new Blob([html], { type: 'application/msword' }), 'converted.doc');
      } else if (target === 'excel') {
        // Use Gemini AI to structure data for Excel
        const tableHtml = await convertToTable(text);
        const excelHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${tableHtml}</body></html>`;
        saveAs(new Blob([excelHtml], { type: 'application/vnd.ms-excel' }), 'converted.xls');
      }
    } catch (e) {
      console.error(e);
      alert("转换失败。");
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
              <h3 className="text-2xl font-bold">松开以打开 PDF</h3>
            </div>
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800">转换 PDF</h2>
        <p className="text-slate-500 mt-2">从 PDF 中提取文本和数据为可编辑格式。</p>
      </div>

      {!file ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <FileUploader onFilesSelected={(fs) => handleFile(fs[0])} accept=".pdf" label="上传要转换的 PDF" />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-2xl mx-auto text-center">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
              <FileType size={32} className="text-blue-600"/>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-6">{file.name}</h3>
          
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

          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-sm mb-6 text-left">
            <span className="font-bold">注意：</span> Excel 转换使用 AI 检测表格。结果可能因 PDF 复杂度而异。
          </div>

          <button
            onClick={convert}
            disabled={processing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
          >
            {processing ? <Loader2 className="animate-spin" /> : <Wand2 size={20}/>}
            {processing ? '分析与转换中...' : '开始转换'}
          </button>
          
          <button onClick={() => setFile(null)} className="mt-4 text-sm text-slate-400 hover:text-slate-600 underline">
              选择其他文件
          </button>
        </div>
      )}
    </div>
  );
};

export default ConvertPDF;