import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { marked } from 'marked';
import { Loader2, Sparkles, BookOpen } from 'lucide-react';
import FileUploader from '../components/FileUploader';
import { translateText } from '../services/geminiService';

const TranslatePDF: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [status, setStatus] = useState<'idle' | 'extracting' | 'ready' | 'translating' | 'done' | 'error'>('idle');

  const handleFile = async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setStatus('extracting');
    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      // Limit pages to avoid hitting token limits too fast in demo
      const maxPages = Math.min(pdf.numPages, 5);
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + "\n\n";
      }
      setOriginalText(fullText);
      setStatus('ready');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const performTranslate = async () => {
    setStatus('translating');
    try {
      // Chunking might be needed for very large texts, but we limit extraction above
      const res = await translateText(originalText.substring(0, 15000));
      setTranslatedText(res);
      setStatus('done');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="mb-6 flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-purple-500" />
            AI 翻译器
           </h2>
           <p className="text-slate-500 text-sm">将 PDF 内容翻译为中文，同时保留上下文。</p>
        </div>
      </div>

      {!file ? (
        <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                 <FileUploader onFilesSelected={handleFile} accept=".pdf" label="上传要翻译的 PDF" />
            </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded shadow-sm">
                    <BookOpen size={18} className="text-blue-600"/>
                </div>
                <span className="font-semibold text-slate-700">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
                {status === 'ready' && (
                    <button onClick={performTranslate} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-purple-200">
                        使用 AI 翻译
                    </button>
                )}
                <button onClick={() => setFile(null)} className="text-slate-400 hover:text-slate-600 px-2">
                    关闭
                </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Original Text Column */}
            <div className="flex-1 border-r border-slate-100 flex flex-col min-w-0">
                <div className="p-2 bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">原文</div>
                <textarea
                    className="flex-1 p-6 resize-none bg-slate-50 text-slate-600 text-sm font-mono leading-relaxed focus:outline-none"
                    readOnly
                    value={status === 'extracting' ? '正在提取文本...' : originalText}
                />
            </div>
            
            {/* Translated Text Column */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                <div className="p-2 bg-purple-50 text-xs font-bold text-purple-600 uppercase tracking-wider text-center border-b border-purple-100">AI 译文</div>
                <div className="flex-1 p-6 overflow-auto prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-600">
                    {status === 'translating' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                            <Loader2 className="animate-spin text-purple-600 mb-2" size={32} />
                            <p className="text-purple-600 font-medium">翻译中...</p>
                        </div>
                    )}
                    {status === 'done' && (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(translatedText) as string }} />
                    )}
                    {status === 'error' && <p className="text-red-500">翻译失败。</p>}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslatePDF;