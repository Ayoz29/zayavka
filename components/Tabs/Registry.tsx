import React, { useState, useEffect, useRef } from 'react';
import { Search, FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { RequestDoc, Organization } from '../../types';
import { Button } from '../Button';
import { StorageService } from '../../services/storage';
import { softMatch, cn } from '../../services/utils';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

interface RegistryProps {
  currentOrg: Organization;
  onOpenRequest: (request: RequestDoc) => void;
}

export const Registry: React.FC<RegistryProps> = ({ currentOrg, onOpenRequest }) => {
  const [requests, setRequests] = useState<RequestDoc[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  const loadData = () => {
    const all = StorageService.getRequests();
    const orgRequests = all.filter(r => r.org === currentOrg);
    setRequests(orgRequests);
    
    const depts = Array.from(new Set(orgRequests.map(r => r.department).filter(Boolean)));
    setDepartments(depts.sort());
  };

  const parsePdfInvoice = async (file: File): Promise<{ number: string, items: string[] }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const textItems: string[] = [];
    
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // Filter empty strings and trim
        const strings = content.items.map((item: any) => item.str.trim()).filter(Boolean);
        textItems.push(...strings);
    }

    // 1. Extract Invoice Number
    // Look for patterns like "№ 25" or "СЧЁТ-ФАКТУРА № 25"
    const fullText = textItems.join(' ');
    let invoiceNum = '';
    const numMatch = fullText.match(/(?:№|No)\s*(\d+)/i);
    
    if (numMatch) {
        invoiceNum = numMatch[1];
    } else {
        // Fallback to filename if not found in text
        const fnameMatch = file.name.match(/(\d+)/);
        if (fnameMatch) invoiceNum = fnameMatch[0];
    }

    // 2. Extract Items based on table heuristic for this specific invoice format
    // Pattern: Index (digit) -> Name (text) -> Code (long digits)
    // The name might be spread across 1-2 items in the array depending on PDF layout
    const items: string[] = [];

    for (let i = 0; i < textItems.length - 1; i++) {
        const current = textItems[i];
        
        // Is this a row index? (1, 2, 3...)
        if (/^\d{1,3}$/.test(current)) {
            // Look ahead for the code (within next 4 items)
            // The code in the example starts with 0 and is long (e.g., 07312001...)
            for (let k = 1; k <= 4; k++) {
                if (i + k >= textItems.length) break;
                const candidateCode = textItems[i + k];
                
                // Check for the long code pattern (starts with 9+ digits)
                if (/^\d{9,}/.test(candidateCode)) {
                    // Everything between i and i+k is likely the name parts
                    // e.g. "Сальник 12 мм" " (Аркон)"
                    const nameParts = textItems.slice(i + 1, i + k);
                    const name = nameParts.join(' ');
                    
                    // Simple filter to avoid capturing noise
                    if (name.length > 2) { 
                        items.push(name);
                    }
                    
                    i += k; // Advance outer loop to avoid reprocessing
                    break;
                }
            }
        }
    }

    return { number: invoiceNum || '???', items };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
        let invoiceNum = '';
        let items: string[] = [];

        if (file.name.toLowerCase().endsWith('.pdf')) {
            const result = await parsePdfInvoice(file);
            invoiceNum = result.number;
            items = result.items;
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // Attempt to read with XLSX
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
            
            // Try to find invoice number in cells if filename doesn't have it
            const fnameMatch = file.name.match(/(\d+)/);
            invoiceNum = fnameMatch ? fnameMatch[0] : '???';
            
            // Flatten and find text that looks like item names
            // Simple heuristic: strings longer than 3 chars
            items = json.flat().filter(cell => typeof cell === 'string' && cell.length > 3 && !cell.toLowerCase().includes('total'));
        } else {
             // Fallback for CSV/Text
             const fnameMatch = file.name.match(/(\d+)/);
             invoiceNum = fnameMatch ? fnameMatch[0] : '???';
             const text = await file.text();
             items = text.split(/[\n,;]+/).filter(s => s.length > 3);
        }

        if (items.length === 0) {
            alert('Could not extract any items from the file.');
            setIsLoading(false);
            e.target.value = '';
            return;
        }

        // Apply matching
        let matchesFound = 0;
        const updatedRequests = StorageService.getRequests().map(req => {
            if (req.org !== currentOrg) return req;
            
            let reqChanged = false;
            const newItems = req.items.map(item => {
                const isMatch = items.some(imported => softMatch(item.name, imported));
                if (isMatch && !item.invoiceNumbers.includes(invoiceNum)) {
                    reqChanged = true;
                    matchesFound++;
                    return { ...item, invoiceNumbers: [...item.invoiceNumbers, invoiceNum] };
                }
                return item;
            });
            
            return reqChanged ? { ...req, items: newItems } : req;
        });

        StorageService.saveRequests(updatedRequests);
        
        // Save invoice record
        StorageService.addInvoice({
            id: Date.now().toString(),
            name: file.name,
            number: invoiceNum,
            size: file.size,
            type: file.name.split('.').pop() || 'unknown',
            uploadDate: new Date().toLocaleDateString()
        });

        alert(`Processed Invoice #${invoiceNum}. Found ${matchesFound} matches.`);
        loadData();

    } catch (err) {
        console.error(err);
        alert('Error processing file. Please ensure it is a valid format.');
    } finally {
        setIsLoading(false);
        e.target.value = ''; // reset input
    }
  };

  const exportToExcel = () => {
    // Simple HTML table export simulation
    let csv = 'No,Applicant,Date,Item,Unit,Qty,Details,Object,Invoice\n';
    filteredRequests.forEach(req => {
        req.items.forEach(item => {
            csv += `"${req.number}","${req.applicant}","${req.date}","${item.name}","${item.unit}","${item.qty}","${item.details}","${req.objectName}","${item.invoiceNumbers.join(', ')}"\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Registry_${currentOrg}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredRequests = requests.filter(req => {
    if (filterDept && req.department !== filterDept) return false;
    if (filterText) {
        const txt = filterText.toLowerCase();
        const inHeader = req.applicant.toLowerCase().includes(txt) || req.number.includes(txt);
        const inItems = req.items.some(i => i.name.toLowerCase().includes(txt));
        return inHeader || inItems;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 items-center bg-zinc-800 p-4 rounded-lg border border-zinc-700">
        <div className="flex items-center bg-zinc-900 rounded border border-zinc-600 px-3 py-1.5 w-64">
            <Search size={16} className="text-zinc-500 mr-2" />
            <input 
                className="bg-transparent border-none outline-none text-sm w-full placeholder-zinc-500"
                placeholder="Поиск..."
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
            />
        </div>

        <select 
            className="bg-zinc-900 border border-zinc-600 rounded px-3 py-1.5 text-sm outline-none"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
        >
            <option value="">Все отделы</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className="flex-1" />

        <div className="relative">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv,.txt,.pdf"
            />
            <Button 
                variant="secondary" 
                className="cursor-pointer" 
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
            >
                {isLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <FileSpreadsheet size={16} className="mr-2" />}
                {isLoading ? 'Обработка...' : 'Загрузить фактуру'}
            </Button>
        </div>

        <Button onClick={exportToExcel}>
            <Download size={16} className="mr-2" /> Excel
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-zinc-900 text-zinc-400 font-medium">
                    <tr>
                        <th className="p-3">№</th>
                        <th className="p-3">ФИО</th>
                        <th className="p-3">Дата</th>
                        <th className="p-3">Наименование</th>
                        <th className="p-3">Ед.</th>
                        <th className="p-3">Кол-во</th>
                        <th className="p-3">Детали</th>
                        <th className="p-3">Объект</th>
                        <th className="p-3">Факт</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                    {filteredRequests.map(req => (
                        <React.Fragment key={req.id}>
                            {req.items.map((item, idx) => {
                                const hasInvoice = item.invoiceNumbers.length > 0;
                                const isRejected = req.approved === false;
                                
                                return (
                                    <tr 
                                        key={item.id} 
                                        className={cn(
                                            "hover:bg-zinc-700/50 transition-colors",
                                            hasInvoice ? "bg-blue-900/20 text-blue-100" : "",
                                            isRejected ? "bg-red-900/20 text-red-200" : ""
                                        )}
                                    >
                                        <td className="p-3">
                                            {idx === 0 && (
                                                <button 
                                                    onClick={() => onOpenRequest(req)}
                                                    className="text-blue-400 hover:underline font-mono"
                                                >
                                                    {req.number}
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-3 text-zinc-400">{idx === 0 ? req.applicant : ''}</td>
                                        <td className="p-3 text-zinc-400">{idx === 0 ? req.date : ''}</td>
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 text-zinc-400">{item.unit}</td>
                                        <td className="p-3">{item.qty}</td>
                                        <td className="p-3 text-zinc-400 truncate max-w-[150px]" title={item.details}>{item.details}</td>
                                        <td className="p-3 text-zinc-400">{idx === 0 ? req.objectName : ''}</td>
                                        <td className="p-3">
                                            {hasInvoice && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-800 text-blue-200">
                                                    {item.invoiceNumbers.join(', ')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    ))}
                    {filteredRequests.length === 0 && (
                        <tr>
                            <td colSpan={9} className="p-8 text-center text-zinc-500">
                                Нет заявок для отображения
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};