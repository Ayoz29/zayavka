import React, { useState, useEffect } from 'react';
import { FileText, Search, RefreshCw, Eye } from 'lucide-react';
import { InvoiceFile } from '../../types';
import { StorageService } from '../../services/storage';
import { Button } from '../Button';
import { formatFileSize } from '../../services/utils';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceFile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceFile | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    setInvoices(StorageService.getInvoices().sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)));
  };

  const filtered = invoices.filter(inv => 
    inv.number.toLowerCase().includes(search.toLowerCase()) || 
    inv.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full gap-4 p-4">
      {/* List */}
      <div className="w-1/3 flex flex-col space-y-4">
        <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-zinc-900 rounded border border-zinc-700 px-3 py-2">
                <Search size={16} className="text-zinc-500 mr-2" />
                <input 
                    className="bg-transparent border-none outline-none text-sm w-full placeholder-zinc-500"
                    placeholder="Поиск №..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <Button onClick={loadInvoices} variant="secondary" className="px-3">
                <RefreshCw size={16} />
            </Button>
        </div>

        <div className="flex-1 bg-zinc-800 rounded-lg border border-zinc-700 overflow-y-auto">
            {filtered.map(inv => (
                <div 
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-3 border-b border-zinc-700 cursor-pointer hover:bg-zinc-700/50 transition-colors ${selectedInvoice?.id === inv.id ? 'bg-zinc-700 border-l-4 border-l-blue-500' : ''}`}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-zinc-200">Фактура №{inv.number}</span>
                        <span className="text-xs text-zinc-500">{inv.uploadDate}</span>
                    </div>
                    <div className="text-sm text-zinc-400 truncate">{inv.name}</div>
                    <div className="flex justify-between mt-2 text-xs text-zinc-500">
                        <span>{inv.type.toUpperCase()}</span>
                        <span>{formatFileSize(inv.size)}</span>
                    </div>
                </div>
            ))}
            {filtered.length === 0 && (
                <div className="p-8 text-center text-zinc-500">Нет фактур</div>
            )}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col items-center justify-center p-8">
        {selectedInvoice ? (
            <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-700 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                    <FileText size={40} />
                </div>
                <div>
                    <h3 className="text-xl font-medium text-zinc-200">Фактура №{selectedInvoice.number}</h3>
                    <p className="text-zinc-400">{selectedInvoice.name}</p>
                </div>
                <div className="bg-zinc-900 p-4 rounded text-left text-sm font-mono text-zinc-400 max-w-md mx-auto">
                    <p>Type: {selectedInvoice.type}</p>
                    <p>Size: {formatFileSize(selectedInvoice.size)}</p>
                    <p>ID: {selectedInvoice.id}</p>
                    <p className="mt-4 text-xs italic text-zinc-600 text-center">
                        (Preview not available for demo - simulated file)
                    </p>
                </div>
                <Button>
                    <Eye size={16} className="mr-2" /> Открыть оригинал
                </Button>
            </div>
        ) : (
            <div className="text-zinc-500 text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Выберите фактуру для просмотра</p>
            </div>
        )}
      </div>
    </div>
  );
};