import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, BarChart3, Loader2, AlertCircle } from 'lucide-react';

interface SelectedMonthsListProps {
  selectedMonths: any[];
  setSelectedMonths: React.Dispatch<React.SetStateAction<any[]>>;
  handleRemoveMonth: (id: string) => void;
  colors: string[];
}

export const SelectedMonthsList: React.FC<SelectedMonthsListProps> = ({
  selectedMonths,
  setSelectedMonths,
  handleRemoveMonth,
  colors
}) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Meses en Análisis</h3>
        {selectedMonths.length > 0 && (
          <button 
            onClick={() => setSelectedMonths([])}
            className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-colors group/clear"
          >
            <Trash2 className="w-3 h-3 transition-transform group-hover/clear:scale-110" />
            Borrar todo
          </button>
        )}
      </div>
      <AnimatePresence mode="popLayout">
        {selectedMonths.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center"
          >
            <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400 font-medium">No hay meses seleccionados</p>
          </motion.div>
        ) : (
          selectedMonths.map((month, idx) => (
            <motion.div
              key={month.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-2 h-12 rounded-full" 
                    style={{ backgroundColor: colors[idx % colors.length] }} 
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight" translate="no">{month.label}</p>
                    {month.loading ? (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-500">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Cargando...
                      </div>
                    ) : month.error ? (
                      <div className="flex items-center gap-1 text-[10px] text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        {month.error}
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-gray-900">{month.average.toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-gray-400">COP/kWh</span>
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveMonth(month.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </section>
  );
};
