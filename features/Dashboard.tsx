import React from 'react';
import { Edit3, Files, Scissors, Image as ImageIcon, RefreshCw, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ToolType } from '../types';
import { useLanguage } from '../components/LanguageContext';

interface DashboardProps {
  onNavigate: (tool: ToolType) => void;
}

const ToolCard: React.FC<{
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  startText: string;
}> = ({ title, desc, icon, color, onClick, startText }) => (
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
      {startText} <ArrowRight size={16} className="ml-1" />
    </div>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {t('hero_title')}
          </h1>
          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            {t('hero_desc')}
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => onNavigate(ToolType.EDIT)}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg inline-flex items-center gap-2"
            >
              {t('start_edit')} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('popular_tools')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard 
            title={t('edit_pdf')}
            desc={t('tool_desc_edit')}
            icon={<Edit3 size={24} className="text-blue-600" />}
            color="bg-blue-50"
            onClick={() => onNavigate(ToolType.EDIT)}
            startText={t('start_using')}
          />
          <ToolCard 
            title={t('merge_pdf')}
            desc={t('tool_desc_merge')}
            icon={<Files size={24} className="text-purple-600" />}
            color="bg-purple-50"
            onClick={() => onNavigate(ToolType.MERGE)}
            startText={t('start_using')}
          />
          <ToolCard 
            title={t('split_pdf')}
            desc={t('tool_desc_split')}
            icon={<Scissors size={24} className="text-orange-600" />}
            color="bg-orange-50"
            onClick={() => onNavigate(ToolType.SPLIT)}
            startText={t('start_using')}
          />
          <ToolCard 
            title={t('img_to_pdf')}
            desc={t('tool_desc_img2pdf')}
            icon={<ImageIcon size={24} className="text-green-600" />}
            color="bg-green-50"
            onClick={() => onNavigate(ToolType.IMG_TO_PDF)}
            startText={t('start_using')}
          />
          <ToolCard 
            title={t('convert_pdf')}
            desc={t('tool_desc_convert')}
            icon={<RefreshCw size={24} className="text-indigo-600" />}
            color="bg-indigo-50"
            onClick={() => onNavigate(ToolType.CONVERT)}
            startText={t('start_using')}
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
        <div className="flex flex-col items-center text-center p-4">
          <div className="bg-slate-100 p-3 rounded-full text-slate-600 mb-3">
            <ShieldCheck size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">{t('feature_privacy')}</h4>
          <p className="text-sm text-slate-500">{t('feature_privacy_desc')}</p>
        </div>
        <div className="flex flex-col items-center text-center p-4">
           <div className="bg-slate-100 p-3 rounded-full text-slate-600 mb-3">
            <Zap size={24} />
          </div>
          <h4 className="font-bold text-slate-800 mb-1">{t('feature_speed')}</h4>
          <p className="text-sm text-slate-500">{t('feature_speed_desc')}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;