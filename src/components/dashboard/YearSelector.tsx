import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronsLeft, ChevronLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../utils/cn';

interface YearSelectorProps {
  currentYear: number;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  showYearMatrix: boolean;
  setShowYearMatrix: React.Dispatch<React.SetStateAction<boolean>>;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  currentYear,
  setCurrentYear,
  showYearMatrix,
  setShowYearMatrix
}) => {
  return (
    <div className="relative">
      <button 
        onClick={() => setShowYearMatrix(!showYearMatrix)}
        className={cn(
          "px-4 py-1.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2",
          showYearMatrix 
            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200" 
            : "bg-gray-50 border-gray-100 text-gray-900 hover:border-indigo-200"
        )}
      >
        {currentYear}
        <ChevronRight className={cn("w-3 h-3 transition-transform", showYearMatrix ? "rotate-90" : "rotate-0")} />
      </button>

      <AnimatePresence>
        {showYearMatrix && (
          <>
            <div 
              className="fixed inset-0 z-[60]" 
              onClick={() => setShowYearMatrix(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-64 bg-white rounded-[24px] shadow-2xl border border-gray-100 p-4 z-[70] overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-2xl p-2">
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentYear(prev => prev - 5); }}
                    className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-indigo-600 hover:shadow-sm"
                    title="Retroceder 5 años"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentYear(prev => prev - 1); }}
                    className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-indigo-600 hover:shadow-sm"
                    title="Retroceder 1 año"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                
                <span className="text-sm font-black text-indigo-600">{currentYear}</span>
                
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentYear(prev => prev + 1); }}
                    className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-indigo-600 hover:shadow-sm"
                    title="Avanzar 1 año"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setCurrentYear(prev => prev + 5); }}
                    className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-indigo-600 hover:shadow-sm"
                    title="Avanzar 5 años"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => currentYear - 4 + i).map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setCurrentYear(year);
                      setShowYearMatrix(false);
                    }}
                    className={cn(
                      "py-3 rounded-xl text-xs font-bold transition-all border",
                      year === currentYear
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-inner"
                        : "bg-white border-gray-50 hover:border-indigo-100 hover:bg-indigo-50/30 text-gray-500 hover:text-indigo-600"
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-50 flex justify-center">
                <button 
                  onClick={() => {
                    setCurrentYear(new Date().getFullYear());
                    setShowYearMatrix(false);
                  }}
                  className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                >
                  Ir al año actual
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
