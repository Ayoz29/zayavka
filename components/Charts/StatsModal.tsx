import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { X } from 'lucide-react';
import { RequestDoc } from '../../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: RequestDoc[];
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, requests }) => {
  if (!isOpen) return null;

  const approved = requests.filter(r => r.approved === true).length;
  const rejected = requests.filter(r => r.approved === false).length;
  const pending = requests.filter(r => r.approved === null).length;

  const data = [
    { name: 'Approved', value: approved },
    { name: 'Rejected', value: rejected },
    { name: 'Pending', value: pending },
  ].filter(d => d.value > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-96 border border-zinc-700 relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-zinc-500 hover:text-white">
            <X size={20} />
        </button>
        <h3 className="text-lg font-semibold mb-4 text-zinc-200">Request Statistics</h3>
        
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '4px' }}
                        itemStyle={{ color: '#e4e4e7' }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-zinc-900 p-2 rounded">
                <div className="text-xl font-bold text-green-500">{approved}</div>
                <div className="text-xs text-zinc-500">Approved</div>
            </div>
            <div className="bg-zinc-900 p-2 rounded">
                <div className="text-xl font-bold text-red-500">{rejected}</div>
                <div className="text-xs text-zinc-500">Rejected</div>
            </div>
            <div className="bg-zinc-900 p-2 rounded">
                <div className="text-xl font-bold text-amber-500">{pending}</div>
                <div className="text-xs text-zinc-500">Pending</div>
            </div>
        </div>
      </div>
    </div>
  );
};