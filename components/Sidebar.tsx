import React from 'react';
import { Layers, Edit3, Files, Scissors, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { ToolType, NavItemProps } from '../types';

const NavItem: React.FC<NavItemProps> = ({ id, label, icon, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
        : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
    }`}
  >
    <div className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}>
      {icon}
    </div>
    <span className="font-medium">{label}</span>
  </button>
);

interface SidebarProps {
  activeTab: ToolType;
  onTabChange: (tab: ToolType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="w-full md:w-72 flex-shrink-0 bg-white md:min-h-[calc(100vh-2rem)] rounded-2xl shadow-sm border border-slate-100 p-6 h-fit sticky top-4 md:top-8">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Layers size={24} />
        </div>
        <div>
           <h1 className="font-bold text-xl text-slate-800 tracking-tight">PDF 大师</h1>
           <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">专业版</span>
        </div>
      </div>
      
      <nav className="space-y-1.5">
        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">编辑与整理</p>
        <NavItem id={ToolType.EDIT} label="PDF 编辑器" icon={<Edit3 size={20} />} isActive={activeTab === ToolType.EDIT} onClick={onTabChange} />
        <NavItem id={ToolType.MERGE} label="合并 PDF" icon={<Files size={20} />} isActive={activeTab === ToolType.MERGE} onClick={onTabChange} />
        <NavItem id={ToolType.SPLIT} label="拆分 PDF" icon={<Scissors size={20} />} isActive={activeTab === ToolType.SPLIT} onClick={onTabChange} />
        
        <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">工具箱</p>
        <NavItem id={ToolType.IMG_TO_PDF} label="图片转 PDF" icon={<ImageIcon size={20} />} isActive={activeTab === ToolType.IMG_TO_PDF} onClick={onTabChange} />
        <NavItem id={ToolType.CONVERT} label="格式转换" icon={<RefreshCw size={20} />} isActive={activeTab === ToolType.CONVERT} onClick={onTabChange} />
      </nav>

      <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          由 Gemini AI 2.5 驱动<br/>
          安全且客户端处理
        </p>
      </div>
    </div>
  );
};

export default Sidebar;