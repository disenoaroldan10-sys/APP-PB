import React from 'react';
import { TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';

interface HeaderProps {
  currentView: string;
  setCurrentView: (view: any) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView }) => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-md bg-white/80">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tighter text-gray-900">ENERGI<span className="text-indigo-600">APP</span></span>
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">v2.0</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Market Intelligence</span>
              </div>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 bg-gray-50 p-1 rounded-2xl border border-gray-100">
            <div className="relative group/nav">
              <button 
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  currentView === 'dashboard' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
                onClick={() => setCurrentView('dashboard')}
              >
                Precio de Bolsa
              </button>
            </div>
            
            <div className="relative group/nav">
              <button 
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                  ['calculos', 'analizador', 'cu', 'fasoriales'].includes(currentView) ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                )}
              >
                Herramientas
              </button>
              
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 translate-y-2 group-hover/nav:translate-y-0 z-[100]">
                <div className="px-3 py-2 mb-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gestión Energética</p>
                </div>
                <button 
                  onClick={() => setCurrentView('calculos')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group/item",
                    currentView === 'calculos' ? "bg-indigo-50 text-indigo-600" : "hover:bg-indigo-50 text-gray-700"
                  )}
                >
                  <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'calculos' && "text-indigo-600")}>Cálculos de generación</span>
                </button>
                <button 
                  onClick={() => setCurrentView('analizador')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group/item",
                    currentView === 'analizador' ? "bg-indigo-50 text-indigo-600" : "hover:bg-indigo-50 text-gray-700"
                  )}
                >
                  <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'analizador' && "text-indigo-600")}>Analizador de redes</span>
                </button>
                <button 
                  onClick={() => setCurrentView('cu')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group/item",
                    currentView === 'cu' ? "bg-indigo-50 text-indigo-600" : "hover:bg-indigo-50 text-gray-700"
                  )}
                >
                  <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'cu' && "text-indigo-600")}>Valor del CU</span>
                </button>
                
                <div className="px-3 py-2 mt-2 mb-1 border-t border-gray-50 pt-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cálculos eléctricos</p>
                </div>
                <button 
                  onClick={() => setCurrentView('fasoriales')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group/item",
                    currentView === 'fasoriales' ? "bg-indigo-50 text-indigo-600" : "hover:bg-indigo-50 text-gray-700"
                  )}
                >
                  <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'fasoriales' && "text-indigo-600")}>Cálculos de diagramas fasoriales</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="hidden lg:flex flex-col items-end">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              {currentView === 'dashboard' && "Precios en bolsa mercado Eléctrico Colombiano"}
              {currentView === 'calculos' && "Cálculos de generación y facturación"}
              {currentView === 'analizador' && "Datos analizador de redes"}
              {currentView === 'cu' && "Valor del CU"}
              {currentView === 'fasoriales' && "Cálculos de diagramas fasoriales"}
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">Consultor de Mercado XM</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Conectado a Datos</span>
          </div>
        </div>
      </div>
    </header>
  );
};
