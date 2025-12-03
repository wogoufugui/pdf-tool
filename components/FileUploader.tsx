import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  label?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFilesSelected, 
  accept, 
  multiple = false, 
  label 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
    // Reset input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`relative w-full h-48 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
        isDragging
          ? 'border-blue-500 bg-blue-50 scale-[1.01]'
          : 'border-slate-300 bg-white hover:bg-slate-50'
      }`}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
      />
      <div
        className={`p-3 rounded-full mb-3 transition-colors ${
          isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <UploadCloud size={32} />
      </div>
      <p className={`font-medium text-lg ${isDragging ? 'text-blue-600' : 'text-slate-600'}`}>
        {isDragging ? t('upload_release') : (label || t('upload_click_drag'))}
      </p>
      <p className="text-slate-400 text-sm mt-1">
        {t('upload_formats')}：{accept.replace(/\./g, ' ').toUpperCase()}
      </p>
    </div>
  );
};

export default FileUploader;