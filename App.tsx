import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MergePDF from './features/MergePDF';
import SplitPDF from './features/SplitPDF';
import ImageToPDF from './features/ImageToPDF';
import ConvertPDF from './features/ConvertPDF';
import EditPDF from './features/EditPDF';
import ExtractImages from './features/ExtractImages';
import RemoveWatermark from './features/RemoveWatermark';
import Dashboard from './features/Dashboard';
import { ToolType } from './types';
import { LanguageProvider, useLanguage } from './components/LanguageContext';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolType>(ToolType.HOME);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();

  const renderContent = () => {
    switch (activeTab) {
      case ToolType.HOME:
        return <Dashboard onNavigate={setActiveTab} />;
      case ToolType.MERGE:
        return <MergePDF />;
      case ToolType.SPLIT:
        return <SplitPDF />;
      case ToolType.IMG_TO_PDF:
        return <ImageToPDF />;
      case ToolType.CONVERT:
        return <ConvertPDF />;
      case ToolType.EDIT:
        return <EditPDF />;
      case ToolType.EXTRACT_IMAGES:
        return <ExtractImages />;
      case ToolType.REMOVE_WATERMARK:
        return <RemoveWatermark />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row max-w-7xl mx-auto md:p-4 gap-6">
      {/* Mobile Header */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-30">
        <h1 className="font-bold text-xl text-slate-800">{t('app_name')}</h1>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          <Menu size={24} />
        </button>
      </div>

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      
      <main className="flex-1 min-w-0 p-4 md:p-0 md:h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl scroll-smooth">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AppContent />
  </LanguageProvider>
);

export default App;