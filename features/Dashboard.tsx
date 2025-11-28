import React from 'react';
import { Edit3, Files, Scissors, Image as ImageIcon, RefreshCw, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ToolType } from '../types';

interface DashboardProps {
  onNavigate: (tool: ToolType) => void;
}

const ToolCard: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}> = ({ title, desc, icon, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col text-left p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 group"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${color}`}>
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
      {title}
    </h3>
    <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
      {desc}
    </p>
    <div className="flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
      开始使用 <ArrowRight size={16} className="ml-1" />
    </div>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            全能 PDF 处理工具箱
          </h1>
          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            基于浏览器本地处理，安全高效。集成 Gemini AI 技术，为您提供智能的文档处理体验。无需上传文件到服务器。
          </p>
          <button 
            onClick={() => onNavigate(ToolType.EDIT)}
            className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg inline-flex items-center gap-2"
          >
            立即开始编辑 <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">热门工具</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard 
            title="PDF 编辑器" 
            desc="添加文本、图片、形状、水印，或裁剪页面。支持图章和签名。"
            icon={<Edit3 size={24} className="text-blue-600" />}
            color="bg-blue-50"
            onClick={() => onNavigate(ToolType.EDIT)}
          />
          <ToolCard 
            title="合并 PDF" 
            desc="将多个 PDF 文件合并为一个有序的文档。支持拖拽排序。"
            icon={<Files size={24} className="text-purple-600" />}
            color="bg-purple-50"
            onClick={() => onNavigate(ToolType.MERGE)}
          />
          <ToolCard 
            title="拆分 PDF" 
            desc="按页面范围拆分文档，或提取特定页面为新文件。"
            icon={<Scissors size={24} className="text-orange-600" />}
            color="bg-orange-50"
            onClick={() => onNavigate(ToolType.SPLIT)}
          />
          <ToolCard 
            title="图片转 PDF" 
            desc="将 JPG、PNG 图片转换为高质量的 PDF 文档。支持批量转换。"
            icon={<ImageIcon size={24} className="text-green-600" />}
            color="bg-green-50"
            onClick={() => onNavigate(ToolType.IMG_TO_PDF)}
          />
          <ToolCard 
            title="格式转换" 
            desc="利用 AI 技术将 PDF 转换为 Word、Excel 或文本格式。"
            icon={<RefreshCw size={24} className="text-indigo-600" />}
            color="bg-indigo-50"
            onClick={() => onNavigate(ToolType.CONVERT)}
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="flex flex-col items-center text-center p-4">
          <div className="bg-slate-100 p-3 rounded-full text-slate-600 mb-3">
            <ShieldCheck size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">隐私安全</h4>
          <p className="text-sm text-slate-500">文件在本地浏览器处理，无需上传</p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
           <div className="bg-slate-100 p-3 rounded-full text-slate-600 mb-3">
            <Zap size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">极速处理</h4>
          <p className="text-sm text-slate-500">基于 WebAssembly，性能接近原生应用</p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
           <div className="bg-slate-100 p-3 rounded-full text-slate-600 mb-3">
            <Edit3 size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">AI 驱动</h4>
          <p className="text-sm text-slate-500">集成 Google Gemini 模型辅助处理</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;