import React from 'react';
import { motion } from 'motion/react';
import { BarChart3 } from 'lucide-react';

interface EmptyViewProps {
  currentView: string;
  setCurrentView: (view: any) => void;
}

export const EmptyView: React.FC<EmptyViewProps> = ({ currentView, setCurrentView }) => {
  return (
    <motion.div
      key="empty-view"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-white rounded-[40px] p-12 shadow-sm border border-gray-100 min-h-[600px] flex flex-col items-center justify-center text-center"
    >
      <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
        <BarChart3 className="w-12 h-12 text-indigo-500" />
      </div>
      <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-4">
        {currentView === 'calculos' && "Cálculos de Generación y Facturación"}
        {currentView === 'analizador' && "Datos Analizador de Redes"}
        {currentView === 'cu' && "Valor del CU"}
      </h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8">
        Este módulo se encuentra actualmente en desarrollo. Pronto podrás realizar cálculos avanzados y análisis detallados en esta sección.
      </p>
      <button 
        onClick={() => setCurrentView('dashboard')}
        className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
      >
        Volver al Dashboard
      </button>
    </motion.div>
  );
};
