import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  BarChart3,
  Loader2,
  AlertCircle,
  ChevronDown,
  Menu,
  ExternalLink,
  Calculator,
  FileSearch,
  Receipt,
  Server,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { fetchPrecioBolsa, getMonthRange, XmPriceData, listMetrics } from './services/xmService';
import PhasorCalculator from './components/PhasorCalculator';
import GenerationCalculator, { ExtractedData } from './components/GenerationCalculator';
import SolaxMonitoring from './components/SolaxMonitoring';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom Logo Component representing Growth and Energy
const Logo = ({ className }: { className?: string }) => (
  <div className={cn("relative flex items-center justify-center", className)}>
    <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-lg animate-pulse" />
    <Zap className="w-full h-full text-indigo-600 relative z-10" />
  </div>
);

const XmLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 32" className={cn("h-8 w-auto", className)} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="#FF6B00" strokeLinecap="round" strokeLinejoin="round">
      {/* 4 líneas finas de la izquierda (efecto de movimiento) */}
      <path d="M4 10L10 16L4 22" strokeWidth="0.8" opacity="0.8" />
      <path d="M8 10L14 16L8 22" strokeWidth="0.8" opacity="0.8" />
      <path d="M12 10L18 16L12 22" strokeWidth="0.8" opacity="0.8" />
      <path d="M16 10L22 16L16 22" strokeWidth="0.8" opacity="0.8" />
      
      {/* La X estilizada */}
      <path d="M28 10L40 22" strokeWidth="5.5" />
      <path d="M40 10L28 22" strokeWidth="5.5" />
      
      {/* La M redondeada */}
      <path d="M48 22V15C48 12 50 10 53 10C56 10 58 12 58 15V22M58 22V15C58 12 60 10 63 10C66 10 68 12 68 22" strokeWidth="5.5" />
    </g>
  </svg>
);

const NasaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 60" className={cn("h-10 w-auto", className)} xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="30" r="28" fill="#0B3D91" />
    <path d="M20 45 L50 15 L80 45" stroke="#FC3D21" strokeWidth="4" fill="none" strokeLinecap="round" />
    <text x="50" y="38" fontFamily="sans-serif" fontSize="18" fontWeight="900" fill="white" textAnchor="middle" style={{ letterSpacing: '1px' }}>NASA</text>
    <circle cx="35" cy="20" r="1" fill="white" />
    <circle cx="65" cy="25" r="1" fill="white" />
    <circle cx="45" cy="40" r="0.5" fill="white" />
    <circle cx="70" cy="35" r="0.5" fill="white" />
  </svg>
);

interface SelectedMonth {
  id: string;
  year: number;
  month: number;
  label: string;
  data: XmPriceData[];
  average: number;
  loading: boolean;
  error: string | null;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'calculos' | 'analizador' | 'cu' | 'fasoriales' | 'solax'>('dashboard');
  const [selectedMonths, setSelectedMonths] = useState<SelectedMonth[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showYearMatrix, setShowYearMatrix] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [savedInvoiceData, setSavedInvoiceData] = useState<ExtractedData | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleAddMonth = async (year: number, month: number) => {
    if (selectedMonths.length >= 12) {
      setNotification('Máximo 12 meses permitidos para análisis.');
      return;
    }

    const monthLabel = `${monthsList[month]} ${year}`;
    const id = `${year}-${month}`;

    if (selectedMonths.find(m => m.id === id)) {
      return;
    }

    const newMonth: SelectedMonth = {
      id,
      year,
      month,
      label: monthLabel,
      data: [],
      average: 0,
      loading: true,
      error: null
    };

    setSelectedMonths(prev => [...prev, newMonth]);

    try {
      const { start, end } = getMonthRange(year, month);
      const data = await fetchPrecioBolsa(start, end);
      
      if (data.length === 0) {
        throw new Error('No se encontraron datos para este periodo.');
      }

      const average = data.reduce((acc, curr) => acc + curr.Value, 0) / data.length;

      setSelectedMonths(prev => prev.map(m => 
        m.id === id ? { ...m, data, average, loading: false } : m
      ));
    } catch (err: any) {
      let errorMessage = 'Error al cargar datos';
      if (err.response?.data) {
        const data = err.response.data;
        errorMessage = typeof data.details === 'string' ? data.details : 
                       typeof data.error === 'string' ? data.error : 
                       'Error en la respuesta del servidor';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setSelectedMonths(prev => prev.map(m => 
        m.id === id ? { ...m, loading: false, error: errorMessage } : m
      ));
    }
  };

  const handleRemoveMonth = (id: string) => {
    setSelectedMonths(prev => prev.filter(m => m.id !== id));
  };

  // Prepare chart data: Average hourly price for each selected month
  const chartData = useMemo(() => {
    const hourlyData: any[] = Array.from({ length: 24 }, (_, i) => ({ hour: `P${i}` }));

    selectedMonths.forEach(month => {
      if (month.loading || month.error || month.data.length === 0) return;

      // Group by hour and average
      const hourAverages: { [key: string]: number[] } = {};
      month.data.forEach(d => {
        if (!hourAverages[d.Hour]) hourAverages[d.Hour] = [];
        hourAverages[d.Hour].push(d.Value);
      });

      Object.keys(hourAverages).forEach(h => {
        const avg = hourAverages[h].reduce((a, b) => a + b, 0) / hourAverages[h].length;
        const hourIndex = parseInt(h.replace('P', ''));
        hourlyData[hourIndex][month.label] = parseFloat(avg.toFixed(2));
      });
    });

    return hourlyData;
  }, [selectedMonths]);

  const colors = [
    '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#ec4899', 
    '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#4ade80',
    '#fb7185', '#38bdf8'
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans selection:bg-indigo-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100/50 overflow-hidden border border-gray-100 p-2 cursor-pointer group"
              onClick={() => setCurrentView('dashboard')}
            >
              <Logo className="group-hover:rotate-12 transition-transform duration-300" />
            </motion.div>

            {/* Navigation Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isMenuOpen ? "bg-blue-100 text-blue-700" : "hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                )}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {isMenuOpen && (
                  <>
                    {/* Backdrop to close menu when clicking outside */}
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setIsMenuOpen(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[100] origin-top-left"
                    >
                      <button 
                        onClick={() => { setCurrentView('dashboard'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item",
                          currentView === 'dashboard' ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-blue-50 text-gray-700"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg transition-colors", currentView === 'dashboard' ? "bg-blue-100" : "bg-gray-50 group-hover/item:bg-blue-100")}>
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className={cn("text-sm font-bold group-hover/item:text-blue-600", currentView === 'dashboard' && "text-blue-600")}>Precios en bolsa</span>
                      </button>
                      <button 
                        onClick={() => { setCurrentView('calculos'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item",
                          currentView === 'calculos' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "hover:bg-indigo-50 text-gray-700"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg transition-colors", currentView === 'calculos' ? "bg-indigo-100" : "bg-gray-50 group-hover/item:bg-indigo-100")}>
                          <Calculator className="w-4 h-4" />
                        </div>
                        <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'calculos' && "text-indigo-600")}>Cálculos de generación y facturación</span>
                      </button>
                      <button 
                        onClick={() => { setCurrentView('analizador'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item",
                          currentView === 'analizador' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "hover:bg-indigo-50 text-gray-700"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg transition-colors", currentView === 'analizador' ? "bg-indigo-100" : "bg-gray-50 group-hover/item:bg-indigo-100")}>
                          <FileSearch className="w-4 h-4" />
                        </div>
                        <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'analizador' && "text-indigo-600")}>Datos analizador de redes</span>
                      </button>
                      <button 
                        onClick={() => { setCurrentView('cu'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item",
                          currentView === 'cu' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "hover:bg-indigo-50 text-gray-700"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg transition-colors", currentView === 'cu' ? "bg-indigo-100" : "bg-gray-50 group-hover/item:bg-indigo-100")}>
                          <Receipt className="w-4 h-4" />
                        </div>
                        <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'cu' && "text-indigo-600")}>Valor del CU</span>
                      </button>

                      <div className="px-3 py-2 mt-2 mb-1 border-t border-gray-50 pt-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monitoreo</p>
                      </div>
                      <button 
                        onClick={() => { setCurrentView('solax'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item",
                          currentView === 'solax' ? "bg-emerald-50 text-emerald-600 shadow-sm" : "hover:bg-emerald-50 text-gray-700"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg transition-colors", currentView === 'solax' ? "bg-emerald-100" : "bg-gray-50 group-hover/item:bg-emerald-100")}>
                          <Server className="w-4 h-4" />
                        </div>
                        <span className={cn("text-sm font-bold group-hover/item:text-emerald-600", currentView === 'solax' && "text-emerald-600")}>API'S SSFV</span>
                      </button>

                      <div className="px-3 py-2 mt-2 mb-1 border-t border-gray-50 pt-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cálculos eléctricos</p>
                      </div>
                      <button 
                        onClick={() => { setCurrentView('fasoriales'); setIsMenuOpen(false); }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/item",
                          currentView === 'fasoriales' ? "bg-indigo-50 text-indigo-600 shadow-sm" : "hover:bg-indigo-50 text-gray-700"
                        )}
                      >
                        <div className={cn("p-2 rounded-lg transition-colors", currentView === 'fasoriales' ? "bg-indigo-100" : "bg-gray-50 group-hover/item:bg-indigo-100")}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'fasoriales' && "text-indigo-600")}>Cálculos de diagramas fasoriales</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold tracking-tight text-gray-900">
                    {currentView === 'dashboard' && "Precio kW/H en Bolsa"}
                    {currentView === 'calculos' && "Generación y facturación"}
                    {currentView === 'analizador' && "Analizador"}
                    {currentView === 'cu' && "Cu kW/h"}
                    {currentView === 'fasoriales' && "Cálculos de diagramas fasoriales"}
                    {currentView === 'solax' && "Monitoreo de Plantas Solares"}
                  </h1>
                </div>
                {currentView === 'dashboard' && (
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">Consultor de Mercado XM</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {(() => {
              const configs: Record<string, { label: string; color: string }> = {
                dashboard: { label: 'Promedio en bolsa', color: 'bg-emerald-500' },
                calculos: { label: 'Generación', color: 'bg-amber-500' },
                analizador: { label: 'Calidad Energia', color: 'bg-blue-500' },
                cu: { label: 'Análisis Tarifario', color: 'bg-rose-500' },
                fasoriales: { label: 'Circuito RLC', color: 'bg-violet-500' },
                solax: { label: 'SolaX Cloud', color: 'bg-emerald-500' }
              };
              const config = configs[currentView] || configs.dashboard;
              return (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", config.color)} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{config.label}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Sidebar: Controls */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                      Seleccionar Mes
                    </h2>
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
                            {/* Backdrop to close */}
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
                              {/* Matrix Header with Arrows */}
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

                              {/* 3x3 Matrix */}
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

                {/* Selected Months List */}
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
              </div>

              {/* Right Content: Visualization */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex-1 min-h-[500px] lg:min-h-[700px] xl:min-h-[800px] flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Precio de Bolsa Horario</h2>
                      <p className="text-sm text-gray-500">Comparativa de precios promedio ponderados por hora [COP/kWh]</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Tendencia del Mercado
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full min-h-[400px] lg:min-h-[550px] xl:min-h-[650px] relative">
                    {isMounted && selectedMonths.some(m => !m.loading && !m.error && m.data.length > 0) ? (
                      <ResponsiveContainer key={`resp-cont-${selectedMonths.length}`} width="100%" height="100%" debounce={100}>
                        <LineChart 
                          key={`chart-${selectedMonths.length}`}
                          data={chartData} 
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="hour" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            dy={10}
                            label={{ value: 'Horas', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 600, fill: '#6366f1' }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            tickFormatter={(value) => `${value}`}
                            label={{ value: 'COP/kWh', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 600, fill: '#6366f1' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              padding: '12px'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: '600' }}
                          />
                          <Legend 
                            verticalAlign="top" 
                            align="right" 
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: '600' }}
                          />
                          {selectedMonths.map((month, idx) => (
                            !month.loading && !month.error && month.data.length > 0 && (
                              <Line
                                key={month.id}
                                type="monotone"
                                dataKey={month.label}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={3}
                                dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                                animationDuration={1500}
                              />
                            )
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                          <BarChart3 className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">Selecciona meses para visualizar la comparativa</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Promedio de Análisis</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">
                        {selectedMonths.filter(m => !m.loading && !m.error).length > 0
                          ? (selectedMonths.filter(m => !m.loading && !m.error).reduce((acc, m) => acc + m.average, 0) / selectedMonths.filter(m => !m.loading && !m.error).length).toFixed(2)
                          : '0.00'}
                      </span>
                      <span className="text-xs text-gray-500 mb-1">COP/kWh</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Variación Promedio</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">
                        {selectedMonths.filter(m => !m.loading && !m.error).length > 1
                          ? (Math.max(...selectedMonths.filter(m => !m.loading && !m.error).map(m => m.average)) - Math.min(...selectedMonths.filter(m => !m.loading && !m.error).map(m => m.average))).toFixed(2)
                          : '0.00'}
                      </span>
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
              </div>
            </motion.div>
          ) : currentView === 'fasoriales' ? (
            <motion.div
              key="fasoriales"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PhasorCalculator />
            </motion.div>
          ) : currentView === 'calculos' ? (
            <motion.div
              key="calculos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GenerationCalculator 
                savedInvoiceData={savedInvoiceData} 
                setSavedInvoiceData={setSavedInvoiceData} 
              />
            </motion.div>
          ) : currentView === 'solax' ? (
            <motion.div
              key="solax"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SolaxMonitoring />
            </motion.div>
          ) : (
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
          )}
        </AnimatePresence>
      </main>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-gray-200 mt-auto py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-6 text-center">
          {currentView === 'dashboard' && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-gray-400 font-medium">
                  datos extraidos de XM
                </p>
                <XmLogo className="h-6" />
              </div>
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed">
                Copyright 2026 <br /> todos los derechos reservados al autor
              </p>
            </div>
          )}

          {currentView === 'calculos' && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-gray-400 font-medium">
                  datos extraidos de la NASA
                </p>
                <NasaLogo className="h-10" />
              </div>
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed">
                Copyright 2026 <br /> todos los derechos reservados al autor
              </p>
            </div>
          )}
          
          {currentView !== 'dashboard' && currentView !== 'calculos' && (
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest leading-relaxed">
              Copyright 2026 <br /> todos los derechos reservados al autor
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
