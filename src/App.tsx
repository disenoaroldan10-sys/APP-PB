import React, { useState, useMemo, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  TrendingUp, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft,
  ChevronsRight,
  Plus, 
  Trash2,
  BarChart3,
  Loader2,
  AlertCircle,
  ChevronDown,
  Menu,
  Newspaper,
  Zap,
  Globe,
  Clock,
  ArrowRight,
  Sun,
  Thermometer,
  MapPin,
  CloudSun
} from 'lucide-react';
import { getWeatherData, WeatherData } from './services/weatherService';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fetchPrecioBolsa, getMonthRange, XmPriceData, listMetrics } from './services/xmService';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom Logo Component representing Growth + Money
const Logo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={cn("w-full h-full", className)}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Coin Background */}
    <circle cx="45" cy="45" r="35" fill="#FBBF24" />
    <circle cx="45" cy="45" r="30" fill="#F59E0B" />
    
    {/* Dollar Sign */}
    <text 
      x="45" 
      y="58" 
      textAnchor="middle" 
      fill="white" 
      style={{ fontSize: '40px', fontWeight: 'bold', fontFamily: 'Arial' }}
    >
      $
    </text>
    
    {/* Trending Arrow */}
    <path 
      d="M20 80 L45 55 L60 70 L90 30" 
      stroke="#10B981" 
      strokeWidth="10" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M75 30 H90 V45" 
      stroke="#10B981" 
      strokeWidth="10" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
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
  const [currentView, setCurrentView] = useState<'home' | 'dashboard' | 'calculos' | 'analizador' | 'cu'>('home');
  const [selectedMonths, setSelectedMonths] = useState<SelectedMonth[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [showYearMatrix, setShowYearMatrix] = useState(false);

  useEffect(() => {
    listMetrics().then(data => {
      if (data && data.Items) {
        console.log('Available Metrics:', data.Items[0].Values);
      }
    });

    // Geolocation and Weather
    if (navigator.geolocation) {
      setWeatherLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const data = await getWeatherData(position.coords.latitude, position.coords.longitude);
            setWeather(data);
          } catch (err: any) {
            setWeatherError(err.message || 'Error al obtener datos del clima');
          } finally {
            setWeatherLoading(false);
          }
        },
        (err) => {
          setWeatherError('Permiso de ubicación denegado o no disponible');
          setWeatherLoading(false);
        }
      );
    }
  }, []);

  const monthsList = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleAddMonth = async (year: number, month: number) => {
    if (selectedMonths.length >= 12) {
      alert('Máximo 12 meses permitidos para análisis.');
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
      const errorMessage = err.response?.data?.details || err.response?.data?.error || 'Error al cargar datos';
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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E] font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => setCurrentView('home')}
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 overflow-hidden border border-gray-100 p-1.5">
                <Logo />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Sector Eléctrico Inteligente</h1>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">Gestión y Análisis Energético</p>
              </div>
            </div>
          
          <div className="flex items-center gap-4">
            {/* Navigation Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-all text-sm font-bold text-gray-700">
                <Menu className="w-4 h-4 text-indigo-500" />
                Módulos del Sistema
                <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </button>
              
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right scale-95 group-hover:scale-100 z-[100]">
                <div className="px-3 py-2 mb-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Navegación</p>
                </div>
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between group/item",
                    currentView === 'dashboard' ? "bg-indigo-50 text-indigo-600" : "hover:bg-indigo-50 text-gray-700"
                  )}
                >
                  <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'dashboard' && "text-indigo-600")}>Precio en bolsa</span>
                </button>
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
                  <span className={cn("text-sm font-bold group-hover/item:text-indigo-600", currentView === 'analizador' && "text-indigo-600")}>Datos analizador de redes</span>
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
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Conectado a Datos
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {currentView === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Hero Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <section className="lg:col-span-8 relative overflow-hidden bg-indigo-600 rounded-[48px] p-12 text-white shadow-2xl shadow-indigo-200">
                  <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold mb-6 border border-white/20">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Actualidad del Sector Energético
                    </div>
                    <h2 className="text-5xl font-black tracking-tight mb-6 leading-tight">
                      Impulsando la Eficiencia en el Mercado Eléctrico
                    </h2>
                    <p className="text-lg text-indigo-100 mb-8 leading-relaxed">
                      Accede a herramientas avanzadas de análisis, cálculos de generación y monitoreo en tiempo real para optimizar tu gestión energética.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => setCurrentView('dashboard')}
                        className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-lg"
                      >
                        Ver Precios en Bolsa
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                    <Logo className="w-full h-full transform translate-x-1/4 -translate-y-1/4 rotate-12" />
                  </div>
                </section>

                {/* Weather & Radiation Widget */}
                <section className="lg:col-span-4 bg-white rounded-[48px] p-8 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 text-indigo-600">
                        <CloudSun className="w-6 h-6" />
                        <span className="text-sm font-black uppercase tracking-widest">Estado Solar</span>
                      </div>
                      {weather && (
                        <div className="flex items-center gap-1 text-xs font-bold text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {weather.locationName}
                        </div>
                      )}
                    </div>

                    {weatherLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Consultando AccuWeather...</p>
                      </div>
                    ) : weatherError ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="text-xs font-bold text-red-400 uppercase tracking-widest leading-tight">
                          {weatherError.includes('API Key') ? 'Falta API Key de AccuWeather' : 'Error de Ubicación'}
                        </p>
                      </div>
                    ) : weather ? (
                      <div className="space-y-8">
                        {/* Current Temp */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Temp. Actual</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-4xl font-black text-gray-900">{weather.currentTemp}°</span>
                              <span className="text-sm font-bold text-gray-400">C</span>
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                            <Thermometer className="w-6 h-6 text-orange-500" />
                          </div>
                        </div>

                        {/* Radiation Today */}
                        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 relative overflow-hidden">
                          <div className="relative z-10">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Radiación Hoy (UV)</p>
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-black text-amber-700">{weather.uvToday}</span>
                              <div className="h-8 w-px bg-amber-200" />
                              <span className="text-xs font-bold text-amber-600 leading-tight">
                                Nivel {weather.uvTodayText}
                              </span>
                            </div>
                          </div>
                          <Sun className="absolute -right-4 -bottom-4 w-24 h-24 text-amber-200 opacity-30" />
                        </div>

                        {/* Forecast Tomorrow */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <Calendar className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pronóstico Mañana</p>
                              <p className="text-xs font-bold text-gray-700">UV: {weather.uvTomorrow} ({weather.uvTomorrowText})</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <MapPin className="w-10 h-10 text-gray-200" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Esperando ubicación...</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* News Section */}
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black flex items-center gap-3">
                    <Newspaper className="w-6 h-6 text-indigo-500" />
                    Noticias Recientes
                  </h3>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                    <Globe className="w-4 h-4" />
                    Fuentes: XM, CREG, MinEnergía
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    {
                      title: "Avances en la Subasta de Energías Renovables 2026",
                      source: "Ministerio de Energía",
                      time: "Hace 2 horas",
                      excerpt: "El gobierno anuncia nuevos incentivos para proyectos solares y eólicos que buscan fortalecer la matriz energética nacional.",
                      category: "Renovables"
                    },
                    {
                      title: "XM reporta estabilidad en el nivel de embalses",
                      source: "XM Sinergox",
                      time: "Hace 5 horas",
                      excerpt: "A pesar de las variaciones climáticas, los niveles de reserva hídrica se mantienen dentro de los rangos de seguridad operativa.",
                      category: "Mercado"
                    },
                    {
                      title: "Nuevas regulaciones de la CREG para Autogeneración",
                      source: "CREG",
                      time: "Ayer",
                      excerpt: "Se publican los lineamientos actualizados para la integración de sistemas de autogeneración a pequeña escala en zonas urbanas.",
                      category: "Regulación"
                    }
                  ].map((news, i) => (
                    <motion.article
                      key={i}
                      whileHover={{ y: -5 }}
                      className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {news.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                          <Clock className="w-3 h-3" />
                          {news.time}
                        </div>
                      </div>
                      <h4 className="text-lg font-bold mb-3 group-hover:text-indigo-600 transition-colors">
                        {news.title}
                      </h4>
                      <p className="text-sm text-gray-500 mb-6 line-clamp-3">
                        {news.excerpt}
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <span className="text-xs font-bold text-gray-400">{news.source}</span>
                        <button className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all">
                          Leer más
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </section>

              {/* Quick Access Grid */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-900 rounded-[40px] p-10 text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4">Analizador de Redes</h3>
                    <p className="text-gray-400 mb-8 max-w-xs">Visualiza y analiza los datos técnicos de tus redes eléctricas con precisión milimétrica.</p>
                    <button 
                      onClick={() => setCurrentView('analizador')}
                      className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-xl font-bold hover:bg-white/20 transition-all"
                    >
                      Acceder al Módulo
                    </button>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-20 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform">
                    <Zap className="w-48 h-48 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white rounded-[40px] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Valor del CU</h3>
                    <p className="text-gray-500 mb-8 max-w-xs">Consulta y proyecta el Costo Unitario de prestación del servicio de energía.</p>
                    <button 
                      onClick={() => setCurrentView('cu')}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                      Consultar CU
                    </button>
                  </div>
                  <div className="absolute bottom-0 right-0 opacity-10 transform translate-x-1/4 translate-y-1/4 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-48 h-48 text-indigo-600" />
                  </div>
                </div>
              </section>
            </motion.div>
          ) : currentView === 'dashboard' ? (
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
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-2">Meses en Análisis</h3>
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
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">{month.label}</p>
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
              <div className="lg:col-span-8 space-y-6">
                <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col">
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

                  <div className="flex-1 w-full min-h-[400px]">
                    {selectedMonths.some(m => !m.loading && !m.error && m.data.length > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-100 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-90">
            <div className="w-6 h-6">
              <Logo />
            </div>
            <span className="text-sm font-bold">Precios en bolsa mercado Eléctrico Colombiano</span>
          </div>
          <p className="text-xs text-gray-400">
            Datos extraidos de XM "sinergox" (Operador del Mercado Eléctrico Colombiano).
          </p>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-100" />
            <div className="w-8 h-8 rounded-full bg-gray-100" />
          </div>
        </div>
      </footer>
    </div>
  );
}
