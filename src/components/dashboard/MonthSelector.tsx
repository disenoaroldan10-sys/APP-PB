import React from 'react';
import { Calendar, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { YearSelector } from './YearSelector';

interface MonthSelectorProps {
  currentYear: number;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  showYearMatrix: boolean;
  setShowYearMatrix: React.Dispatch<React.SetStateAction<boolean>>;
  monthsList: string[];
  selectedMonths: any[];
  handleAddMonth: (year: number, month: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentYear,
  setCurrentYear,
  showYearMatrix,
  setShowYearMatrix,
  monthsList,
  selectedMonths,
  handleAddMonth
}) => {
  return (
    <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          Seleccionar Mes
        </h2>
        <YearSelector 
          currentYear={currentYear}
          setCurrentYear={setCurrentYear}
          showYearMatrix={showYearMatrix}
          setShowYearMatrix={setShowYearMatrix}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {monthsList.map((month, index) => {
          const isSelected = selectedMonths.some(m => m.year === currentYear && m.month === index);
          return (
            <button
              key={month}
              translate="no"
              onClick={() => handleAddMonth(currentYear, index)}
              disabled={isSelected}
              className={cn(
                "py-3 px-2 rounded-xl text-xs font-medium transition-all border",
                isSelected 
                  ? "bg-indigo-50 border-indigo-100 text-indigo-600 cursor-default"
                  : "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-gray-600"
              )}
            >
              {month}
            </button>
          );
        })}
      </div>
      
      <p className="mt-4 text-[11px] text-gray-400 italic flex items-center gap-1.5">
        <Info className="w-3 h-3" />
        Puedes seleccionar hasta 12 meses para comparar.
      </p>
    </section>
  );
};
