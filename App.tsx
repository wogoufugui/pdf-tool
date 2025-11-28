import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import MergePDF from './features/MergePDF';
import SplitPDF from './features/SplitPDF';
import ImageToPDF from './features/ImageToPDF';
import ConvertPDF from './features/ConvertPDF';
import EditPDF from './features/EditPDF';
import { ToolType } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ToolType>(ToolType.EDIT);

  const renderContent = () => {
    switch (activeTab) {
      case ToolType.MERGE:
        return <MergePDF />;
      case ToolType.SPLIT:
        return <SplitPDF />;
      case ToolType.IMG_TO_PDF:
        return <ImageToPDF />;
      case ToolType.CONVERT:
        return <ConvertPDF />;
      case ToolType.EDIT:
      default:
        return <EditPDF />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen max-w-7xl mx-auto p-4 gap-6">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 min-w-0 h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;