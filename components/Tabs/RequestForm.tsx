import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Copy, Image as ImageIcon, Check, X, Calendar } from 'lucide-react';
import { Organization, RequestDoc, RequestItem } from '../../types';
import { Button } from '../Button';
import { generateId, getTodayStr, cn } from '../../services/utils';
import { StorageService } from '../../services/storage';
import html2canvas from 'html2canvas';

interface RequestFormProps {
  currentOrg: Organization;
  initialData?: RequestDoc | null;
  onSave: () => void;
}

const DEFAULT_ITEM: RequestItem = {
  id: '',
  name: '',
  unit: '',
  qty: '',
  issueDate: '',
  details: '',
  invoiceNumbers: [],
};

const DateInput = ({ value, onChange, className }: { value: string, onChange: (val: string) => void, className?: string }) => {
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = val;
    if (val.length >= 2) {
      formatted = val.slice(0, 2) + '.' + val.slice(2);
    }
    if (val.length >= 4) {
      formatted = formatted.slice(0, 5) + '.' + formatted.slice(5);
    }
    onChange(formatted);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // e.target.value is YYYY-MM-DD
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-');
    onChange(`${d}.${m}.${y}`);
  };

  // Convert DD.MM.YYYY to YYYY-MM-DD for the date picker value
  const getPickerValue = () => {
    if (!value || value.length < 10) return '';
    const parts = value.split('.');
    if (parts.length !== 3) return '';
    // Basic validation to ensure we don't pass garbage to date input
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return '';
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <input 
        type="text" 
        className="w-full bg-zinc-900 border border-zinc-700 rounded-l px-2 py-1 text-sm focus:border-blue-500 outline-none print:border-black placeholder-zinc-600"
        placeholder="ДД.ММ.ГГГГ"
        value={value}
        onChange={handleTextChange}
        maxLength={10}
      />
      <div className="relative h-full">
        <input 
          type="date" 
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          onChange={handleDateSelect}
          value={getPickerValue()}
          tabIndex={-1}
        />
        <div className="bg-zinc-800 border-y border-r border-zinc-700 rounded-r px-2 h-[29.5px] flex items-center justify-center cursor-pointer hover:bg-zinc-700">
            <Calendar size={14} className="text-zinc-400" />
        </div>
      </div>
    </div>
  );
};

export const RequestForm: React.FC<RequestFormProps> = ({ currentOrg, initialData, onSave }) => {
  const [formData, setFormData] = useState<RequestDoc>({
    id: generateId(),
    number: '',
    date: getTodayStr(),
    department: '',
    applicant: '',
    objectName: '',
    org: currentOrg,
    items: [{ ...DEFAULT_ITEM, id: generateId() }],
    approved: null,
    approvedBy: currentOrg === 'FERGANA' ? 'Абдуллаев А' : 'Рахмонов М',
    checkedBy: currentOrg === 'FERGANA' ? 'Бобоев А' : 'Тошматов М',
    createdAt: Date.now(),
  });

  const [catalog, setCatalog] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ [key: string]: string[] }>({});
  const [shouldFocusNewRow, setShouldFocusNewRow] = useState(false);
  const nameInputsRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    setCatalog(StorageService.getCatalog());
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset form when org changes if not editing
      setFormData(prev => ({
        ...prev,
        org: currentOrg,
        id: generateId(),
        number: '',
        date: getTodayStr(),
        approved: null,
        approvedBy: currentOrg === 'FERGANA' ? 'Абдуллаев А' : 'Рахмонов М',
        checkedBy: currentOrg === 'FERGANA' ? 'Бобоев А' : 'Тошматов М',
      }));
    }
  }, [currentOrg, initialData]);

  // Effect to focus the new row
  useEffect(() => {
    if (shouldFocusNewRow && formData.items.length > 0) {
      const lastItem = formData.items[formData.items.length - 1];
      const input = nameInputsRef.current[lastItem.id];
      if (input) {
        input.focus();
      }
      setShouldFocusNewRow(false);
    }
  }, [formData.items.length, shouldFocusNewRow]);

  const handleInputChange = (field: keyof RequestDoc, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (id: string, field: keyof RequestItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      }),
    }));

    if (field === 'name') {
      const matches = catalog.filter(n => n.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
      setSuggestions(prev => ({ ...prev, [id]: matches }));
    }
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...DEFAULT_ITEM, id: generateId() }],
    }));
  };

  const addItemAndFocus = () => {
    addItem();
    setShouldFocusNewRow(true);
  };

  const removeItem = (id: string) => {
    if (formData.items.length === 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
    }));
  };

  const saveRequest = () => {
    if (!formData.number) return alert('Enter Request Number');
    if (!formData.department) return alert('Enter Department');
    if (!formData.applicant) return alert('Enter Applicant Name');

    // Update catalog
    const newNames = formData.items.map(i => i.name).filter(Boolean);
    StorageService.addToCatalog(newNames);
    
    // Save to storage
    const allRequests = StorageService.getRequests();
    const existingIndex = allRequests.findIndex(r => r.id === formData.id);
    
    if (existingIndex >= 0) {
      allRequests[existingIndex] = formData;
    } else {
      allRequests.push(formData);
    }
    
    StorageService.saveRequests(allRequests);
    onSave();
    alert('Request Saved!');
  };

  const copyToClipboard = () => {
    const lines = [
      `Заявка № ${formData.number}`,
      `Дата: ${formData.date}`,
      `Отдел: ${formData.department}`,
      `ФИО: ${formData.applicant}`,
      `Объект: ${formData.objectName}`,
      '',
      ...formData.items.map((it, i) => `${i + 1}. ${it.name} | ${it.qty} ${it.unit} | ${it.details}`),
      '',
      `Утвердил: ${formData.approvedBy}`,
      `Проверил: ${formData.checkedBy}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    alert('Copied to clipboard!');
  };

  const handleExportPng = async () => {
    if (!formData.number) return alert('Введите номер заявки');

    const orgName = formData.org === 'FERGANA' ? 'FERGANA GLOBAL TEXTILE' : 'UCHKUPRIK GLOBAL TEXTILE';
    const approvedText = formData.approved === true ? '✅ ОДОБРЕНО' : formData.approved === false ? '❌ ОТКАЗ' : '🔄 РАССМОТРЕНИЕ';
    const statusColor = formData.approved === true ? '#2E7D32' : formData.approved === false ? '#D32F2F' : '#F57C00';

    // Build items HTML
    const itemsHtml = formData.items.map((item, i) => `
      <tr style="background: ${i % 2 === 0 ? '#fff' : '#f5f5f5'};">
        <td style="padding: 12px; border: 1px solid #E0E0E0; text-align: center; font-weight: bold; color: #0D47A1;">${i + 1}</td>
        <td style="padding: 12px; border: 1px solid #E0E0E0; font-weight: 600;">${item.name}</td>
        <td style="padding: 12px; border: 1px solid #E0E0E0; text-align: center;">${item.unit}</td>
        <td style="padding: 12px; border: 1px solid #E0E0E0; text-align: center; font-weight: bold; color: #0D47A1;">${item.qty}</td>
        <td style="padding: 12px; border: 1px solid #E0E0E0; text-align: center;">${item.issueDate}</td>
        <td style="padding: 12px; border: 1px solid #E0E0E0;">${item.details}</td>
      </tr>
    `).join('');

    // Construct the full HTML for the image
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background: white; color: black; padding: 40px; border: 1px solid #ccc; width: 1200px;">
        <!-- Header -->
        <div style="border-bottom: 4px solid #0D47A1; margin-bottom: 20px;"></div>
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="color: #0D47A1; font-size: 24px; font-weight: bold; margin: 0;">${orgName}</h2>
          <h1 style="color: #000; font-size: 64px; font-weight: bold; margin: 10px 0;">ЗАЯВКА</h1>
          <div style="color: #333; font-size: 32px;">№ ${formData.number} • ${formData.date}</div>
        </div>

        <!-- Info Grid -->
        <div style="background: #E3F2FD; border: 2px solid #0D47A1; border-radius: 10px; padding: 20px; margin-bottom: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
              <div style="color: #333; font-size: 18px; font-weight: 600;">ОТДЕЛ</div>
              <div style="color: #000; font-size: 24px; font-weight: bold;">${formData.department}</div>
          </div>
          <div>
              <div style="color: #333; font-size: 18px; font-weight: 600;">ЗАЯВИТЕЛЬ</div>
              <div style="color: #000; font-size: 24px; font-weight: bold;">${formData.applicant}</div>
          </div>
          <div>
              <div style="color: #333; font-size: 18px; font-weight: 600;">ОБЪЕКТ</div>
              <div style="color: #000; font-size: 24px; font-weight: bold;">${formData.objectName || '-'}</div>
          </div>
          <div>
              <div style="color: #333; font-size: 18px; font-weight: 600;">СТАТУС</div>
              <div style="color: ${statusColor}; font-size: 24px; font-weight: bold;">${approvedText}</div>
          </div>
        </div>

        <!-- Table -->
        <div style="margin-bottom: 40px;">
           <div style="background: #0D47A1; color: white; padding: 15px; border-radius: 8px 8px 0 0; font-size: 24px; font-weight: bold;">
              📋 ПОЗИЦИИ: ${formData.items.length} шт.
           </div>
           <table style="width: 100%; border-collapse: collapse; border: 2px solid #0D47A1; font-size: 18px;">
             <thead>
               <tr style="background: #E8EAF6; color: #000;">
                 <th style="padding: 12px; border: 1px solid #0D47A1; width: 50px;">№</th>
                 <th style="padding: 12px; border: 1px solid #0D47A1; text-align: left;">НАИМЕНОВАНИЕ</th>
                 <th style="padding: 12px; border: 1px solid #0D47A1; width: 80px;">ЕД.</th>
                 <th style="padding: 12px; border: 1px solid #0D47A1; width: 100px;">КОЛ-ВО</th>
                 <th style="padding: 12px; border: 1px solid #0D47A1; width: 120px;">ВЫДАЧА</th>
                 <th style="padding: 12px; border: 1px solid #0D47A1; width: 250px; text-align: left;">ПРИМ.</th>
               </tr>
             </thead>
             <tbody>
               ${itemsHtml}
             </tbody>
           </table>
        </div>

        <!-- Signatures -->
        <div style="background: #F5F5F5; border: 3px solid #BDBDBD; border-radius: 10px; padding: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
           <div>
              <div style="color: #0D47A1; font-size: 24px; font-weight: bold; margin-bottom: 40px;">УТВЕРДИЛ</div>
              <div style="border-bottom: 3px solid #212121; margin-bottom: 10px;"></div>
              <div style="font-size: 20px;">Зам. директора: <b>${formData.approvedBy}</b></div>
           </div>
           <div>
              <div style="color: #0D47A1; font-size: 24px; font-weight: bold; margin-bottom: 40px;">ПРОВЕРИЛ</div>
              <div style="border-bottom: 3px solid #212121; margin-bottom: 10px;"></div>
              <div style="font-size: 20px;">Зав. складом: <b>${formData.checkedBy}</b></div>
           </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 14px;">
           Создано: ${new Date().toLocaleString('ru-RU')}
        </div>
      </div>
    `;

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2, // High resolution
        backgroundColor: '#ffffff',
        useCORS: true
      });
      
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Заявка_${formData.number}_${formData.date.replace(/\./g, '-')}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Ошибка при создании PNG');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4 overflow-y-auto print:p-0 print:overflow-visible">
      {/* Header Inputs */}
      <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 grid grid-cols-6 gap-4 print:bg-white print:text-black print:border-none">
        <div className="col-span-1">
          <label className="block text-xs text-zinc-400 mb-1">№</label>
          <input 
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none print:border-black"
            value={formData.number}
            onChange={e => handleInputChange('number', e.target.value)}
          />
        </div>
        <div className="col-span-1">
          <label className="block text-xs text-zinc-400 mb-1">Дата</label>
          <DateInput 
            value={formData.date} 
            onChange={val => handleInputChange('date', val)} 
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Отдел</label>
          <input 
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none print:border-black"
            value={formData.department}
            onChange={e => handleInputChange('department', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Объект</label>
          <input 
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none print:border-black"
            value={formData.objectName}
            onChange={e => handleInputChange('objectName', e.target.value)}
          />
        </div>
        <div className="col-span-6">
          <label className="block text-xs text-zinc-400 mb-1">ФИО Заявителя</label>
          <input 
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none print:border-black"
            value={formData.applicant}
            onChange={e => handleInputChange('applicant', e.target.value)}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="flex-1 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col print:bg-white print:text-black print:border-none">
        <div className="grid grid-cols-12 gap-2 p-3 bg-zinc-850 border-b border-zinc-700 text-xs font-medium text-zinc-400 print:bg-gray-100 print:text-black">
          <div className="col-span-1 text-center">№</div>
          <div className="col-span-4">Наименование</div>
          <div className="col-span-1">Ед.</div>
          <div className="col-span-1">Кол-во</div>
          <div className="col-span-2">Выдача</div>
          <div className="col-span-3">Детали</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 print:overflow-visible">
          {formData.items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-start text-sm group">
              <div className="col-span-1 flex items-center justify-center pt-1.5 text-zinc-500 font-mono">
                {index + 1}
              </div>
              <div className="col-span-4 relative">
                <input 
                  ref={el => { nameInputsRef.current[item.id] = el; }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-blue-500 outline-none print:border-none print:bg-transparent"
                  value={item.name}
                  onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                  placeholder="Название..."
                />
                {suggestions[item.id] && suggestions[item.id].length > 0 && (
                   <div className="absolute z-10 w-full bg-zinc-800 border border-zinc-600 rounded mt-1 shadow-lg no-print">
                     {suggestions[item.id].map(s => (
                       <div 
                        key={s} 
                        className="px-2 py-1 hover:bg-zinc-700 cursor-pointer text-xs"
                        onClick={() => {
                          handleItemChange(item.id, 'name', s);
                          setSuggestions(prev => ({ ...prev, [item.id]: [] }));
                        }}
                       >
                         {s}
                       </div>
                     ))}
                   </div>
                )}
              </div>
              <div className="col-span-1">
                 <input 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-blue-500 outline-none print:border-none print:bg-transparent"
                  value={item.unit}
                  onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                />
              </div>
              <div className="col-span-1">
                 <input 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-blue-500 outline-none print:border-none print:bg-transparent"
                  value={item.qty}
                  onChange={e => handleItemChange(item.id, 'qty', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                 <DateInput
                  value={item.issueDate}
                  onChange={val => handleItemChange(item.id, 'issueDate', val)}
                />
              </div>
              <div className="col-span-3 flex gap-2">
                 <input 
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-blue-500 outline-none print:border-none print:bg-transparent"
                  value={item.details}
                  onChange={e => handleItemChange(item.id, 'details', e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === 'Tab') && index === formData.items.length - 1) {
                      e.preventDefault(); // Prevent standard tab behavior to control focus manually
                      addItemAndFocus();
                    }
                  }}
                />
                <button 
                  onClick={() => removeItem(item.id)}
                  className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          <div className="pt-2 no-print">
            <Button variant="ghost" size="sm" onClick={addItem} className="text-blue-400 hover:text-blue-300">
              <Plus size={16} className="mr-1" /> Добавить строку
            </Button>
          </div>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="bg-zinc-800 p-4 rounded-lg border border-zinc-700 grid grid-cols-2 gap-8 print:bg-white print:text-black print:border-none print:mt-8">
        <div>
           <label className="block text-xs text-zinc-500 mb-1">Утвердил (Зам. Директор)</label>
           <input 
             className="w-full bg-transparent border-b border-zinc-600 px-0 py-1 focus:border-blue-500 outline-none print:border-black"
             value={formData.approvedBy}
             onChange={e => handleInputChange('approvedBy', e.target.value)}
           />
        </div>
        <div>
           <label className="block text-xs text-zinc-500 mb-1">Проверил (Зав. Склад)</label>
           <input 
             className="w-full bg-transparent border-b border-zinc-600 px-0 py-1 focus:border-blue-500 outline-none print:border-black"
             value={formData.checkedBy}
             onChange={e => handleInputChange('checkedBy', e.target.value)}
           />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center bg-zinc-800 p-3 rounded-lg border border-zinc-700 no-print">
        <div className="flex space-x-2">
           <Button 
             variant={formData.approved === true ? 'success' : 'secondary'}
             onClick={() => setFormData(p => ({ ...p, approved: true }))}
             className={formData.approved === true ? 'ring-2 ring-green-500' : ''}
           >
             <Check size={16} className="mr-2" /> Одобрить
           </Button>
           <Button 
             variant={formData.approved === false ? 'danger' : 'secondary'}
             onClick={() => setFormData(p => ({ ...p, approved: false }))}
             className={formData.approved === false ? 'ring-2 ring-red-500' : ''}
           >
             <X size={16} className="mr-2" /> Отклонить
           </Button>
        </div>

        <div className="flex space-x-2">
          <Button onClick={copyToClipboard}>
            <Copy size={16} className="mr-2" /> Копировать
          </Button>
          <Button onClick={handleExportPng}>
            <ImageIcon size={16} className="mr-2" /> Сохранить PNG
          </Button>
          <Button variant="primary" onClick={saveRequest}>
            <Save size={16} className="mr-2" /> Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
};