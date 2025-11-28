import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import saveAs from 'file-saver';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import FileUploader from '../components/FileUploader';

const ImageToPDF: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const convert = async () => {
    if (!files.length) return;
    setProcessing(true);
    try {
      const doc = await PDFDocument.create();
      for (const f of files) {
        const arrayBuffer = await f.arrayBuffer();
        let pdfImg;
        // Basic check for image type
        if (f.type === 'image/jpeg' || f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg')) {
          pdfImg = await doc.embedJpg(arrayBuffer);
        } else if (f.type === 'image/png' || f.name.toLowerCase().endsWith('.png')) {
          pdfImg = await doc.embedPng(arrayBuffer);
        } else {
             continue; // Skip unsupported
        }
        
        const page = doc.addPage([pdfImg.width, pdfImg.height]);
        page.drawImage(pdfImg, {
          x: 0,
          y: 0,
          width: pdfImg.width,
          height: pdfImg.height,
        });
      }
      const pdfBytes = await doc.save();
      saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), 'images_combined.pdf');
    } catch (e) {
      console.error(e);
      alert("转换失败。请检查您的图片文件。");
    } finally {
      setProcessing(false);
    }
  };

  const removeFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-800">图片转 PDF</h2>
        <p className="text-slate-500 mt-2">将 JPG 和 PNG 图片转换为高质量的 PDF 文档。</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <FileUploader
          onFilesSelected={(fs) => setFiles([...files, ...fs])}
          accept="image/png, image/jpeg"
          multiple={true}
          label="拖放图片 (JPG, PNG) 到此处"
        />

        {files.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-slate-700 mb-4">预览 ({files.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map((f, i) => (
                <div key={i} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={URL.createObjectURL(f)}
                    className="w-full h-full object-cover"
                    alt="preview"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => removeFile(i)}
                        className="bg-red-500 p-2 rounded-full text-white hover:bg-red-600 transition-colors"
                      >
                          <X size={16} />
                      </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate">
                      {f.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={convert}
        disabled={!files.length || processing}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2"
      >
        {processing ? <Loader2 className="animate-spin" /> : <ImageIcon size={20}/>}
        {processing ? '转换中...' : '转换为 PDF'}
      </button>
    </div>
  );
};

export default ImageToPDF;