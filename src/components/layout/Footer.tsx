import React from 'react';

interface FooterProps {
  currentView: string;
}

export const Footer: React.FC<FooterProps> = ({ currentView }) => {
  return (
    <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-100 mt-12">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        {currentView !== 'fasoriales' && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-400 font-medium">
                Datos extraidos de XM "sinergox" (Operador del Mercado Eléctrico Colombiano)
              </p>
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                <div className="flex -space-x-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[9px] font-black text-gray-800 tracking-tighter">XM</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
              Copyright 2026 todos los derechos reservados al autor
            </p>
          </div>
        )}
        
        {currentView === 'fasoriales' && (
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
            Copyright 2026 todos los derechos reservados al autor
          </p>
        )}
      </div>
    </footer>
  );
};
