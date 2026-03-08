import React from 'react';
import { cn } from '../../utils/cn';

interface InputGroupProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  unit: string;
  icon: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ 
  label, value, onChange, unit, icon, placeholder, className 
}) => (
  <div className={cn("space-y-2", className)}>
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
      {icon}
      {label}
    </label>
    <div className="relative group">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 group-focus-within:text-indigo-500 transition-colors">
        {unit}
      </span>
    </div>
  </div>
);

interface ResultItemProps {
  label: string;
  value: string | number;
  unit: string;
  color?: string;
}

export const ResultItem: React.FC<ResultItemProps> = ({ label, value, unit, color = "text-gray-900" }) => (
  <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 hover:border-indigo-100 transition-all group">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">{label}</p>
    <div className="flex items-baseline gap-1.5">
      <span className={cn("text-lg font-black tracking-tight", color)}>{value}</span>
      <span className="text-[10px] font-bold text-gray-400">{unit}</span>
    </div>
  </div>
);

interface VisualizationCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

export const VisualizationCard: React.FC<VisualizationCardProps> = ({ title, subtitle, children, icon }) => (
  <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center">
    <div className="w-full flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</p>
        </div>
      </div>
    </div>
    <div className="w-full flex-1 flex items-center justify-center min-h-[280px]">
      {children}
    </div>
  </div>
);

interface EmptyStateProps {
  title: string;
  icon: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center h-full py-12 text-gray-300 space-y-4">
    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</p>
  </div>
);
