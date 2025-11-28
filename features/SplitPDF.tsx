import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import saveAs from 'file-saver';
import { FileText, Loader2, CheckCircle2, UploadCloud } from 'lucide-react';
import FileUploader from '../components/FileUploader';

const SplitPDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<'split' | 'extract'>('split');
  const [rangeStr, setRangeStr] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setRangeStr('');
    try {
      const arrayBuffer = await f.arrayBuffer();
      const doc = await PDFDocument.load(arrayBuffer);
      setPageCount(doc.getPageCount());
    } catch (e) {
      alert("读取 PDF 文件失败。");
      setFile(null);
    }
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
        alert("请上传 PDF 文件");
      }
    }
  };

  const parseGroupToIndices = (str: string, max: number): number[] => {
    const indices: number[] = [];
    const p = str.trim();
    if (!p) return indices;
    if (p.includes('-')) {
      const [s, e] = p.split('-').map((n) => parseInt(n));
      if (!isNaN(s) && !isNaN(e)) {
        for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
          if (i >= 1 && i <= max) indices.push(i - 1);
        }
      }
    } else {
      const n = parseInt(p);
      if (!isNaN(n) && n >= 1 && n <= max) indices.push(n - 1);
    }
    return indices;
  };

  const executeAction = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const srcArrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(srcArrayBuffer);

      if (mode === 'split') {
        const groups = rangeStr.split(/[,;，]/).filter((s) => s.trim());
        for (let i = 0; i < groups.length; i++) {
          const indices = parseGroupToIndices(groups[i], pageCount);
          if (!indices.length) continue;
          const newDoc = await PDFDocument.create();
          const pages = await newDoc.copyPages(srcDoc, indices);
          pages.forEach((p) => newDoc.addPage(p));
          const pdfBytes = await newDoc.save();
          saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `split_part_${i + 1}.pdf`);
        }
      } else {
        const allIndices = new Set<number>();
        rangeStr.split(/[,;，]/).forEach((p) => parseGroupToIndices(p, pageCount).forEach((i) => allIndices.add(i)));
        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(srcDoc, Array.from(allIndices).sort((a, b) => a - b));
        pages.forEach((p) => newDoc.addPage(p));
        const pdfBytes = await newDoc.save();
        saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `extracted_pages.pdf`);
      }
    } catch (e) {
      console.error(e);
      alert("操作失败。");
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
        <h2 className="text-3xl font-bold text-slate-800">拆分或提取页面</h2>
        <p className="text-slate-500 mt-2">将 PDF 拆分为多个文件或提取特定页面。</p>
      </div>

      {!file ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <FileUploader onFilesSelected={handleFile} accept=".pdf" label="上传要拆分的 PDF" />
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-500">
                <FileText size={24}/>
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-800">{file.name}</h3>
                <p className="text-slate-500 text-sm">共 {pageCount} 页</p>
            </div>
            <button onClick={() => setFile(null)} className="ml-auto text-sm text-blue-600 hover:underline">更换文件</button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                mode === 'split' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-blue-200'
              }`}
              onClick={() => setMode('split')}
            >
              <div className="font-semibold mb-1">拆分为文件</div>
              <div className="text-xs opacity-70">将范围保存为单独的 PDF</div>
            </button>
            <button
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                mode === 'extract' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 hover:border-blue-200'
              }`}
              onClick={() => setMode('extract')}
            >
              <div className="font-semibold mb-1">提取为单个文件</div>
              <div className="text-xs opacity-70">将范围合并为一个 PDF</div>
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">页面范围</label>
            <input
              type="text"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="例如： 1-3, 5, 8-10"
              value={rangeStr}
              onChange={(e) => setRangeStr(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-2">使用逗号分隔多个范围。例如：“1, 3-5”表示第1页和第3到5页。</p>
          </div>

          <button
            onClick={executeAction}
            disabled={processing || !rangeStr}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex justify-center items-center gap-2"
          >
            {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20}/>}
            {processing ? '处理中...' : '下载 PDF'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SplitPDF;