import React from 'react';
import { Layers, Edit3, Files, Scissors, Image as ImageIcon, RefreshCw, Home, X, Globe } from 'lucide-react';
import { ToolType, NavItemProps } from '../types';
import { useLanguage, languages, Language } from './LanguageContext';

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
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen = false, onClose }) => {
  const { language, setLanguage, t } = useLanguage();

  // Mobile overlay click handler
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const handleNavClick = (id: ToolType) => {
    onTabChange(id);
    if (window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleOverlayClick}
      />
      
      {/* Sidebar Content */}
      <div className={`
        fixed md:sticky top-0 left-0 h-full md:h-fit md:top-8 z-50 md:z-auto
        w-72 bg-white md:rounded-2xl shadow-xl md:shadow-sm border-r md:border border-slate-100 p-6 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:min-h-[calc(100vh-4rem)] flex flex-col
      `}>
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-200">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-800 tracking-tight">{t('app_name')}</h1>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{t('pro_badge')}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="md:hidden text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="space-y-1.5 flex-1 overflow-y-auto">
          <NavItem id={ToolType.HOME} label={t('home')} icon={<Home size={20} />} isActive={activeTab === ToolType.HOME} onClick={handleNavClick} />
          
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">{t('nav_edit_organize')}</p>
          <NavItem id={ToolType.EDIT} label={t('edit_pdf')} icon={<Edit3 size={20} />} isActive={activeTab === ToolType.EDIT} onClick={handleNavClick} />
          <NavItem id={ToolType.MERGE} label={t('merge_pdf')} icon={<Files size={20} />} isActive={activeTab === ToolType.MERGE} onClick={handleNavClick} />
          <NavItem id={ToolType.SPLIT} label={t('split_pdf')} icon={<Scissors size={20} />} isActive={activeTab === ToolType.SPLIT} onClick={handleNavClick} />
          
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">{t('nav_smart_tools')}</p>
          <NavItem id={ToolType.IMG_TO_PDF} label={t('img_to_pdf')} icon={<ImageIcon size={20} />} isActive={activeTab === ToolType.IMG_TO_PDF} onClick={handleNavClick} />
          <NavItem id={ToolType.CONVERT} label={t('convert_pdf')} icon={<RefreshCw size={20} />} isActive={activeTab === ToolType.CONVERT} onClick={handleNavClick} />
        </nav>

        {/* Language Switcher */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 px-2 text-sm text-slate-500 mb-2">
            <Globe size={16} />
            <span>{t('settings_language')}</span>
          </div>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(languages).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
};

export default Sidebar;