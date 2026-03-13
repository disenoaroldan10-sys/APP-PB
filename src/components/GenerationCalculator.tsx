import React, { useState, useMemo } from 'react';
import { 
  MapPin, 
  Sun, 
  Search, 
  Loader2, 
  AlertCircle, 
  Globe, 
  Navigation,
  Calendar,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Keyboard,
  List,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { nasaService, GeocodingResult, IrradianceResult } from '../services/nasaService';
import { countriesData } from '../constants/locationData';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function GenerationCalculator() {
  const [analysisMode, setAnalysisMode] = useState<'monthly' | 'annual' | null>(null);
  const [inputMode, setInputMode] = useState<'manual' | 'city' | null>(null);
  const [lat, setLat] = useState<string>('');
  const [lon, setLon] = useState<string>('');
  
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [startYear, setStartYear] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  
  const [startYearPivot, setStartYearPivot] = useState<number>(new Date().getFullYear());
  const [endYearPivot, setEndYearPivot] = useState<number>(new Date().getFullYear());

  const [kwp, setKwp] = useState<string>('');
  const [powerRatio, setPowerRatio] = useState<string>('');

  const [showMonthMatrix, setShowMonthMatrix] = useState(false);
  const [showStartYearMatrix, setShowStartYearMatrix] = useState(false);
  const [showEndYearMatrix, setShowEndYearMatrix] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoResult, setGeoResult] = useState<GeocodingResult | null>(null);
  const [irradianceResult, setIrradianceResult] = useState<IrradianceResult | null>(null);

  // States to store the parameters of the last successful search
  const [lastSearchedParams, setLastSearchedParams] = useState<{
    mode: 'monthly' | 'annual';
    month: number | null;
    startYear: number;
    endYear: number;
    kwp: number;
    pr: number;
  } | null>(null);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentCountry = useMemo(() => 
    countriesData.find(c => c.name === selectedCountry) || null
  , [selectedCountry]);

  const handleCalculate = async () => {
    let latitude: number;
    let longitude: number;

    if (!analysisMode) {
      setError('Por favor seleccione el tipo de análisis.');
      return;
    }

    if (!inputMode) {
      setError('Por favor seleccione el método de ubicación.');
      return;
    }

    if (inputMode === 'manual') {
      if (!lat || !lon) {
        setError('Por favor ingrese latitud y longitud.');
        return;
      }
      latitude = parseFloat(lat);
      longitude = parseFloat(lon);
    } else {
      if (!selectedCountry || !selectedCityName) {
        setError('Por favor seleccione país y ciudad.');
        return;
      }
      const city = currentCountry?.cities.find(c => c.name === selectedCityName);
      if (!city) {
        setError('Ciudad no encontrada.');
        return;
      }
      latitude = city.lat;
      longitude = city.lon;
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Coordenadas inválidas.');
      return;
    }

    if ((analysisMode === 'monthly' && selectedMonth === null) || startYear === null || endYear === null) {
      setError('Por favor seleccione mes y rango de años.');
      return;
    }

    if (startYear > endYear) {
      setError('El año inicial no puede ser mayor al final.');
      return;
    }

    if (!kwp || !powerRatio) {
      setError('Por favor ingrese kWp y Power Ratio.');
      return;
    }

    setLoading(true);
    setError(null);
    setGeoResult(null);
    setIrradianceResult(null);

    try {
      const [geo, irradiance] = await Promise.all([
        nasaService.reverseGeocode(latitude, longitude),
        nasaService.fetchNasaIrradiance(latitude, longitude, startYear, endYear, analysisMode === 'monthly' ? selectedMonth : null)
      ]);

      setGeoResult(geo);
      setIrradianceResult(irradiance);
      setLastSearchedParams({
        mode: analysisMode,
        month: analysisMode === 'monthly' ? selectedMonth : null,
        startYear: startYear,
        endYear: endYear,
        kwp: parseFloat(kwp) || 0,
        pr: parseFloat(powerRatio) || 0
      });
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAnalysisMode(null);
    setInputMode(null);
    setLat('');
    setLon('');
    setSelectedCountry(null);
    setSelectedCityName(null);
    setKwp('');
    setPowerRatio('');
    setSelectedMonth(null);
    setStartYear(null);
    setEndYear(null);
    setStartYearPivot(new Date().getFullYear());
    setEndYearPivot(new Date().getFullYear());
    setGeoResult(null);
    setIrradianceResult(null);
    setLastSearchedParams(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        {/* Step 1: Analysis Mode */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-gray-900">Pronóstico de Generación Solar</h2>
              <p className="text-sm text-gray-500 font-medium">Siga los pasos para realizar su consulta técnica</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Paso 1: Seleccione Tipo de Análisis</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => setAnalysisMode('monthly')}
                className={cn(
                  "flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all border-2",
                  analysisMode === 'monthly' 
                    ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md shadow-amber-100" 
                    : "bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500"
                )}
              >
                <Calendar className="w-5 h-5" />
                Mensual Promedio
              </button>
              <button 
                onClick={() => setAnalysisMode('annual')}
                className={cn(
                  "flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all border-2",
                  analysisMode === 'annual' 
                    ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md shadow-amber-100" 
                    : "bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500"
                )}
              >
                <TrendingUp className="w-5 h-5" />
                Anual Promedio
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: Input Mode */}
        <div className={cn("mb-10 transition-all duration-500", !analysisMode && "opacity-30 pointer-events-none grayscale")}>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Paso 2: Método de Ubicación</label>
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-fit">
              <button 
                onClick={() => setInputMode('city')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all",
                  inputMode === 'city' ? "bg-white shadow-sm text-amber-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <List className="w-4 h-4" />
                Por Ciudad
              </button>
              <button 
                onClick={() => setInputMode('manual')}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all",
                  inputMode === 'manual' ? "bg-white shadow-sm text-amber-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Navigation className="w-4 h-4" />
                Coordenadas
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Data Entry */}
        <div className={cn("transition-all duration-500", (!analysisMode || !inputMode) && "opacity-30 pointer-events-none grayscale")}>
          <div className="space-y-6">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 block">Paso 3: Ingrese los Datos</label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location Inputs */}
              <AnimatePresence mode="wait">
                {inputMode === 'manual' ? (
              <motion.div 
                key="manual-inputs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="lg:col-span-2 grid grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Latitud</label>
                  <div className="relative">
                    <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="number" 
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="Ej: 6.2442"
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Longitud</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="number" 
                      value={lon}
                      onChange={(e) => setLon(e.target.value)}
                      placeholder="Ej: -75.5812"
                      className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="city-inputs"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="lg:col-span-2 grid grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">País</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select 
                      value={selectedCountry || ''}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        const country = countriesData.find(c => c.name === e.target.value);
                        if (country) setSelectedCityName(country.cities[0].name);
                        else setSelectedCityName(null);
                      }}
                      className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all appearance-none"
                    >
                      <option value="" disabled>Seleccione país</option>
                      {countriesData.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ciudad</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select 
                      value={selectedCityName || ''}
                      onChange={(e) => setSelectedCityName(e.target.value)}
                      disabled={!selectedCountry}
                      className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all appearance-none disabled:opacity-50"
                    >
                      <option value="" disabled>{selectedCountry ? 'Seleccione ciudad' : 'Primero elija país'}</option>
                      {currentCountry?.cities.map(city => (
                        <option key={city.name} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Month & Years */}
          {analysisMode === 'monthly' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mes de Análisis</label>
              <div className="relative">
                <button 
                  onClick={() => setShowMonthMatrix(!showMonthMatrix)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <span className={cn(!selectedMonth && selectedMonth !== 0 && "text-gray-400")}>
                      {selectedMonth !== null ? months[selectedMonth] : 'Seleccione mes'}
                    </span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showMonthMatrix ? "rotate-180" : "rotate-0")} />
                </button>

                <AnimatePresence>
                  {showMonthMatrix && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowMonthMatrix(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 mt-2 w-72 bg-white rounded-[24px] shadow-2xl border border-gray-100 p-4 z-[70]"
                      >
                        <div className="grid grid-cols-3 gap-2">
                          {months.map((m, i) => (
                            <button
                              key={m}
                              onClick={() => {
                                setSelectedMonth(i);
                                setShowMonthMatrix(false);
                              }}
                              className={cn(
                                "py-2.5 rounded-xl text-xs font-medium transition-all border",
                                i === selectedMonth
                                  ? "bg-amber-50 border-amber-200 text-amber-600 shadow-inner"
                                  : "bg-white border-gray-50 hover:border-amber-100 hover:bg-amber-50/30 text-gray-500 hover:text-amber-600"
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className={cn("space-y-2", analysisMode === 'annual' ? "lg:col-span-2" : "")}>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Rango de Años</label>
            <div className="flex items-center gap-2">
              {/* Start Year Selector */}
              <div className="relative flex-1">
                <button 
                  onClick={() => setShowStartYearMatrix(!showStartYearMatrix)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all flex items-center justify-between"
                >
                  <span className={cn(!startYear && "text-gray-400")}>
                    {startYear || 'Año inicial'}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showStartYearMatrix ? "rotate-180" : "rotate-0")} />
                </button>
                
                <AnimatePresence>
                  {showStartYearMatrix && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowStartYearMatrix(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 mt-2 w-64 bg-white rounded-[24px] shadow-2xl border border-gray-100 p-4 z-[70]"
                      >
                        {/* Matrix Header with Arrows */}
                        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-2xl p-2">
                          <div className="flex items-center gap-0.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setStartYearPivot(prev => prev - 5); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setStartYearPivot(prev => prev - 1); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <span className="text-sm font-black text-amber-600">{startYearPivot}</span>
                          
                          <div className="flex items-center gap-0.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setStartYearPivot(prev => prev + 1); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setStartYearPivot(prev => prev + 5); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 9 }, (_, i) => startYearPivot - 4 + i).map((year) => (
                            <button
                              key={year}
                              onClick={() => {
                                setStartYear(year);
                                setShowStartYearMatrix(false);
                              }}
                              className={cn(
                                "py-3 rounded-xl text-xs font-medium transition-all border",
                                year === startYear
                                  ? "bg-amber-50 border-amber-200 text-amber-600 shadow-inner"
                                  : "bg-white border-gray-50 hover:border-amber-100 hover:bg-amber-50/30 text-gray-500 hover:text-amber-600"
                              )}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-center">
                          <button 
                            onClick={() => {
                              setStartYearPivot(new Date().getFullYear());
                            }}
                            className="text-[10px] font-bold text-gray-400 hover:text-amber-600 uppercase tracking-widest transition-colors"
                          >
                            Ir al año actual
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />

              {/* End Year Selector */}
              <div className="relative flex-1">
                <button 
                  onClick={() => setShowEndYearMatrix(!showEndYearMatrix)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all flex items-center justify-between"
                >
                  <span className={cn(!endYear && "text-gray-400")}>
                    {endYear || 'Año final'}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", showEndYearMatrix ? "rotate-180" : "rotate-0")} />
                </button>

                <AnimatePresence>
                  {showEndYearMatrix && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowEndYearMatrix(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-[24px] shadow-2xl border border-gray-100 p-4 z-[70]"
                      >
                        {/* Matrix Header with Arrows */}
                        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-2xl p-2">
                          <div className="flex items-center gap-0.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEndYearPivot(prev => prev - 5); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEndYearPivot(prev => prev - 1); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <span className="text-sm font-black text-amber-600">{endYearPivot}</span>
                          
                          <div className="flex items-center gap-0.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEndYearPivot(prev => prev + 1); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEndYearPivot(prev => prev + 5); }}
                              className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-400 hover:text-amber-600 hover:shadow-sm"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 9 }, (_, i) => endYearPivot - 4 + i).map((year) => (
                            <button
                              key={year}
                              onClick={() => {
                                setEndYear(year);
                                setShowEndYearMatrix(false);
                              }}
                              className={cn(
                                "py-3 rounded-xl text-xs font-medium transition-all border",
                                year === endYear
                                  ? "bg-amber-50 border-amber-200 text-amber-600 shadow-inner"
                                  : "bg-white border-gray-50 hover:border-amber-100 hover:bg-amber-50/30 text-gray-500 hover:text-amber-600"
                              )}
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-center">
                          <button 
                            onClick={() => {
                              setEndYearPivot(new Date().getFullYear());
                            }}
                            className="text-[10px] font-bold text-gray-400 hover:text-amber-600 uppercase tracking-widest transition-colors"
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
          </div>
        </div>

        {/* System Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-50">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">kWp Instalados</label>
            <div className="relative">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="number" 
                value={kwp}
                onChange={(e) => setKwp(e.target.value)}
                placeholder="Ingrese kWp"
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Power Ratio (PR)</label>
            <div className="relative">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="number" 
                step="0.01"
                value={powerRatio}
                onChange={(e) => setPowerRatio(e.target.value)}
                placeholder="Ingrese PR"
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {(geoResult || irradianceResult || error) && (
            <button 
              onClick={handleClear}
              className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2 group/clear"
            >
              <Trash2 className="w-4 h-4 transition-transform group-hover/clear:scale-110" />
              Borrar
            </button>
          )}
          <button 
            onClick={handleCalculate}
            disabled={loading}
            className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Consultando NASA...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Analizar Ubicación
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </section>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-600"
          >
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {(geoResult || irradianceResult) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Location Card */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-bold">Ubicación Geográfica</h3>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">País</p>
                      <p className="text-sm font-medium text-gray-900">{geoResult?.country || '...'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Departamento</p>
                      <p className="text-sm font-medium text-gray-900">{geoResult?.state || '...'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ciudad / Municipio</p>
                    <p className="text-sm font-medium text-gray-900">{geoResult?.city || '...'}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dirección Aproximada</p>
                    <p className="text-xs font-medium text-gray-600 leading-relaxed">
                      {geoResult?.address || 'No se pudo determinar la dirección exacta.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Irradiance Card */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold">Análisis de irradiancia y generación mensual</h3>
                </div>

                <div className="flex-1 space-y-8">
                  {/* HSP Result */}
                  <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Irradiancia Promedio {lastSearchedParams?.mode === 'monthly' ? months[lastSearchedParams?.month ?? 0] : 'Anual'} ({lastSearchedParams?.startYear ?? startYear} - {lastSearchedParams?.endYear ?? endYear})
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-gray-900 tracking-tight">
                        {irradianceResult?.average.toFixed(2)}
                      </span>
                      <span className="text-sm font-bold text-amber-500">
                        HSP (Horas Solar Pico)
                      </span>
                    </div>
                  </div>

                  {/* Generation Result */}
                  <div className="bg-amber-50/30 rounded-3xl p-6 border border-amber-100/50">
                    <p className="text-[10px] font-black text-amber-600/60 uppercase tracking-widest mb-2">
                      Generación estimada {lastSearchedParams?.mode === 'monthly' ? months[lastSearchedParams?.month ?? 0] : 'Anual'}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-amber-600 tracking-tight">
                        {((lastSearchedParams?.kwp ?? parseFloat(kwp)) * 
                          (irradianceResult?.average ?? 0) * 
                          (lastSearchedParams?.pr ?? parseFloat(powerRatio)) * 
                          30).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-lg font-bold text-amber-500">
                        kWh / {lastSearchedParams?.mode === 'monthly' ? 'mes' : 'mes anual'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fuente: NASA POWER API</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comunidad: Renewable Energy (RE)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
