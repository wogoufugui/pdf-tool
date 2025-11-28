import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import saveAs from 'file-saver';
import { ArrowUp, ArrowDown, X, Loader2 } from 'lucide-react';
import FileUploader from '../components/FileUploader';

const MergePDF: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === files.length - 1)) return;
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[index + direction];
    newFiles[index + direction] = temp;
    setFiles(newFiles);
  };

  const mergeFiles = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'merged_document.pdf');
    } catch (e) {
      console.error(e);
      alert("合并 PDF 失败。请确保所有文件都是有效的 PDF。");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800">合并 PDF 文件</h2>
        <p className="text-slate-500 mt-2">几秒钟内将多个 PDF 文件合并为一个文档。</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <FileUploader onFilesSelected={handleFiles} accept=".pdf" multiple={true} label="拖放 PDF 到此处进行合并" />
        
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-slate-700">已选文件 ({files.length})</h3>
            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[60%]">{f.name}</span>
                  <div className="flex items-center space-x-1">
                     <span className="text-xs text-slate-400 mr-2">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button onClick={() => moveFile(i, -1)} className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-blue-600 disabled:opacity-30" disabled={i === 0}><ArrowUp size={16}/></button>
                    <button onClick={() => moveFile(i, 1)} className="p-1.5 hover:bg-white rounded text-slate-400 hover:text-blue-600 disabled:opacity-30" disabled={i === files.length - 1}><ArrowDown size={16}/></button>
                    <button onClick={() => removeFile(i)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500"><X size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={mergeFiles}
        disabled={files.length < 2 || processing}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
      >
        {processing ? <Loader2 className="animate-spin" /> : null}
        {processing ? '正在合并...' : '立即合并 PDF'}
      </button>
    </div>
  );
};

export default MergePDF;