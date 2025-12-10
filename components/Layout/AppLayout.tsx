import React from 'react';
import { Organization } from '../../types';
import { Building2, Layout, FileText, Settings } from 'lucide-react';

interface AppLayoutProps {
  currentOrg: Organization;
  onSwitchOrg: () => void;
  children: React.ReactNode;
  activeTab: number;
  onTabChange: (index: number) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  currentOrg, 
  onSwitchOrg, 
  children,
  activeTab,
  onTabChange 
}) => {
  const tabs = [
    { name: 'Форма заявки', icon: Layout },
    { name: 'Реестр заявок', icon: FileText },
    { name: 'Фактуры', icon: FileText }, // Reusing icon for simplicity
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Top Bar */}
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 justify-between select-none">
        <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
                GT
            </div>
            <h1 className="font-semibold text-zinc-200">Global Textile Requests</h1>
        </div>

        <div className="flex items-center bg-zinc-800 rounded-lg p-1">
            {tabs.map((tab, idx) => (
                <button
                    key={idx}
                    onClick={() => onTabChange(idx)}
                    className={`
                        flex items-center space-x-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                        ${activeTab === idx ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}
                    `}
                >
                    <tab.icon size={16} />
                    <span>{tab.name}</span>
                </button>
            ))}
        </div>

        <button 
            onClick={onSwitchOrg}
            className="flex items-center space-x-2 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-sm border border-zinc-700 transition-colors"
        >
            <Building2 size={16} className={currentOrg === 'FERGANA' ? 'text-green-500' : 'text-purple-500'} />
            <span className="font-medium">{currentOrg === 'FERGANA' ? 'Fergana' : 'Uchkuprik'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>

      {/* Status Bar */}
      <footer className="h-8 bg-zinc-900 border-t border-zinc-800 flex items-center px-4 text-xs text-zinc-500 justify-between select-none">
        <div>System Ready</div>
        <div className="flex space-x-4">
            <span>Org: {currentOrg}</span>
            <span>Version 1.0.0</span>
        </div>
      </footer>
    </div>
  );
};