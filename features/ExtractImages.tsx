import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import saveAs from 'file-saver';
import { ImagePlus, Loader2, Download, UploadCloud, AlertCircle } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { useLanguage } from '../components/LanguageContext';

interface ExtractedImage {
  id: string;
  blobUrl: string;
  width: number;
  height: number;
  format: string;
}

const ExtractImages: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useLanguage();

  const handleFile = (files: File[]) => {
    setFile(files[0]);
    setImages([]);
    setError(null);
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

  const convertImgDataToBlob = (imgData: any, width: number, height: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');

      // Create ImageData
      // PDF.js often returns Uint8ClampedArray for RGBA or RGB
      // If RGB, we need to convert to RGBA
      let data = imgData;
      if (data.length === width * height * 3) {
          const newData = new Uint8ClampedArray(width * height * 4);
          for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
              newData[j] = data[i];
              newData[j + 1] = data[i + 1];
              newData[j + 2] = data[i + 2];
              newData[j + 3] = 255;
          }
          data = newData;
      }

      const idata = new ImageData(new Uint8ClampedArray(data), width, height);
      ctx.putImageData(idata, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject('Blob creation failed');
      }, 'image/png');
    });
  };

  const extract = async () => {
    if (!file) return;
    setProcessing(true);
    setImages([]);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extracted: ExtractedImage[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const ops = await page.getOperatorList();
        
        // Find paintImageXObject operations
        for (let j = 0; j < ops.fnArray.length; j++) {
            if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject || ops.fnArray[j] === pdfjsLib.OPS.paintInlineImageXObject) {
                const imgName = ops.argsArray[j][0];
                
                try {
                    // Retrieve image object
                    // @ts-ignore
                    const imgObj = await page.objs.get(imgName);
                    
                    if (imgObj) {
                        // Check if it's a bitmap or raw data
                        let blob: Blob | null = null;
                        const w = imgObj.width;
                        const h = imgObj.height;

                        if (imgObj.bitmap) {
                            // If ImageBitmap is available (modern browsers)
                            const canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(imgObj.bitmap, 0, 0);
                                blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                            }
                        } else if (imgObj.data) {
                            // Raw data
                            blob = await convertImgDataToBlob(imgObj.data, w, h);
                        }

                        if (blob) {
                            extracted.push({
                                id: `${i}-${j}`,
                                blobUrl: URL.createObjectURL(blob),
                                width: w,
                                height: h,
                                format: 'png'
                            });
                        }
                    }
                } catch (err) {
                    console.warn(`Failed to extract image ${imgName} on page ${i}`, err);
                }
            }
        }
      }

      if (extracted.length === 0) {
        setError(t('extract_no_images'));
      } else {
        setImages(extracted);
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
        <h2 className="text-3xl font-bold text-slate-800">{t('extract_img_title')}</h2>
        <p className="text-slate-500 mt-2">{t('extract_img_desc')}</p>
      </div>

      {!file ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <FileUploader 
            onFilesSelected={handleFile} 
            accept=".pdf" 
            label={t('extract_upload_label')} 
           />
        </div>
      ) : (
        <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                     <div className="p-3 bg-pink-50 rounded-lg text-pink-600">
                        <ImagePlus size={24} />
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-800">{file.name}</h3>
                        {images.length > 0 && <p className="text-sm text-green-600 font-medium">{t('extract_found_count', { count: images.length })}</p>}
                        {error && <p className="text-sm text-red-500 font-medium flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}
                     </div>
                </div>

                <div className="flex gap-3">
                     <button
                        onClick={() => setFile(null)}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium"
                      >
                        {t('select_other_file')}
                      </button>
                      
                     {!images.length && !error && (
                        <button
                            onClick={extract}
                            disabled={processing}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70"
                        >
                            {processing ? <Loader2 className="animate-spin" size={18} /> : null}
                            {processing ? t('extract_processing') : t('extract_btn')}
                        </button>
                     )}
                </div>
            </div>

            {/* Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((img) => (
                        <div key={img.id} className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="aspect-square bg-slate-50 p-2 flex items-center justify-center">
                                <img src={img.blobUrl} className="max-w-full max-h-full object-contain" alt="extracted" />
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={() => saveAs(img.blobUrl, `image-${img.id}.${img.format}`)}
                                    className="bg-white text-slate-800 p-2 rounded-lg shadow-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    title={t('btn_download')}
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                            <div className="p-2 text-xs text-slate-400 bg-white border-t border-slate-100 flex justify-between">
                                <span>{img.width} x {img.height}</span>
                                <span className="uppercase">{img.format}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ExtractImages;