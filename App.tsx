import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { RequestForm } from './components/Tabs/RequestForm';
import { Registry } from './components/Tabs/Registry';
import { Invoices } from './components/Tabs/Invoices';
import { StatsModal } from './components/Charts/StatsModal';
import { Organization, RequestDoc } from './types';
import { StorageService } from './services/storage';
import { PieChart as PieChartIcon } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [currentOrg, setCurrentOrg] = useState<Organization>('FERGANA');
  const [activeTab, setActiveTab] = useState(0);
  const [editingRequest, setEditingRequest] = useState<RequestDoc | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Load initial org logic or preferences could go here
  useEffect(() => {
    // maybe load last used org from storage
  }, []);

  const handleSwitchOrg = () => {
    setCurrentOrg(prev => prev === 'FERGANA' ? 'UCHKUPRIK' : 'FERGANA');
    // Also reset form if switching? Usually keeping it is better UX unless explicitly cleared
  };

  const handleOpenRequest = (request: RequestDoc) => {
    setEditingRequest(request);
    setActiveTab(0); // Switch to Form tab
  };

  const handleSaveRequest = () => {
    setEditingRequest(null); // Reset editing state
    // We could stay on tab 0 or switch to registry?
    // Let's stay on tab 0 but maybe clear form?
    // The RequestForm component handles clearing/resetting ID on save for new entries.
  };

  return (
    <>
      <AppLayout
        currentOrg={currentOrg}
        onSwitchOrg={handleSwitchOrg}
        activeTab={activeTab}
        onTabChange={(idx) => {
            setActiveTab(idx);
            if (idx === 0) setEditingRequest(null); // Clear editing if manually clicking Form tab
        }}
      >
        <div className="absolute inset-0">
            {activeTab === 0 && (
                <RequestForm 
                    currentOrg={currentOrg} 
                    initialData={editingRequest}
                    onSave={handleSaveRequest}
                />
            )}
            {activeTab === 1 && (
                <Registry 
                    currentOrg={currentOrg} 
                    onOpenRequest={handleOpenRequest}
                />
            )}
            {activeTab === 2 && (
                <Invoices />
            )}
        </div>

        {/* Floating Stats Button */}
        <div className="absolute bottom-6 right-6 z-10">
            <Button 
                onClick={() => setShowStats(true)} 
                className="rounded-full w-12 h-12 p-0 shadow-lg bg-blue-600 hover:bg-blue-500"
            >
                <PieChartIcon size={20} />
            </Button>
        </div>
      </AppLayout>

      <StatsModal 
        isOpen={showStats} 
        onClose={() => setShowStats(false)} 
        requests={StorageService.getRequests().filter(r => r.org === currentOrg)}
      />
    </>
  );
};

export default App;