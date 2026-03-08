import React from 'react';

interface SummaryStatsProps {
  selectedMonths: any[];
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ selectedMonths }) => {
  const filteredMonths = selectedMonths.filter(m => !m.loading && !m.error);
  
  const averageAnalysis = filteredMonths.length > 0
    ? (filteredMonths.reduce((acc, m) => acc + m.average, 0) / filteredMonths.length).toFixed(2)
    : '0.00';

  const averageVariation = filteredMonths.length > 1
    ? (Math.max(...filteredMonths.map(m => m.average)) - Math.min(...filteredMonths.map(m => m.average))).toFixed(2)
    : '0.00';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Promedio de Análisis</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{averageAnalysis}</span>
          <span className="text-xs text-gray-500 mb-1">COP/kWh</span>
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Variación Promedio</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{averageVariation}</span>
          <span className="text-xs text-gray-500 mb-1">COP/kWh</span>
        </div>
      </div>
      <div className="bg-indigo-600 rounded-3xl p-6 shadow-lg shadow-indigo-200 text-white">
        <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-200 mb-1">Meses Analizados</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold">{selectedMonths.length}</span>
          <span className="text-xs text-indigo-200 mb-1">de 12</span>
        </div>
      </div>
    </div>
  );
};
