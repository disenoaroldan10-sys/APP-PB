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
  Eraser,
  TrendingUp,
  Grid3X3,
  ArrowDownRight,
  Info,
  X,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { nasaService, GeocodingResult, IrradianceResult } from '../services/nasaService';
import { countriesData } from '../constants/locationData';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InvoiceAttachment from './InvoiceAttachment';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Tooltip = ({ text }: { text: string }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block ml-1 align-middle">
      <div 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="cursor-help text-gray-400 hover:text-amber-500 transition-colors"
      >
        <Info className="w-3 h-3" />
      </div>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            className="absolute z-[110] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-[10px] font-medium rounded-xl shadow-2xl pointer-events-none leading-relaxed"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface ExtractedData {
  cliente: string;
  contrato: string;
  capacidadInstalada?: string;
  importoConsumo?: string;
  excedentes?: string;
  saldo?: string;
  comercializacion: string;
  generacion: string;
  totalEnergia: string;
  energia?: string;
  energiaProm?: string;
}

interface GenerationCalculatorProps {
  savedInvoiceData: ExtractedData | null;
  setSavedInvoiceData: (data: ExtractedData | null) => void;
}

export default function GenerationCalculator({ savedInvoiceData, setSavedInvoiceData }: GenerationCalculatorProps) {
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

  // Adjustment Modal States
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentFactor, setAdjustmentFactor] = useState<string>('0.90');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [pendingResults, setPendingResults] = useState<{
    geo: GeocodingResult;
    irradiance: IrradianceResult;
  } | null>(null);

  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [projectType, setProjectType] = useState<'new' | 'existing' | null>(null);
  const [attachedInvoice, setAttachedInvoice] = useState<boolean>(false);
  const [showInvoicePromptModal, setShowInvoicePromptModal] = useState(false);

  // States to store the parameters of the last successful search
  const [lastSearchedParams, setLastSearchedParams] = useState<{
    mode: 'monthly' | 'annual';
    month: number | null;
    startYear: number;
    endYear: number;
    kwp: number;
    pr: number;
    isAutoKwp?: boolean;
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

    const isAutoKwp = projectType === 'new' && attachedInvoice;
    if ((!kwp && !isAutoKwp) || !powerRatio) {
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

      setPendingResults({ geo, irradiance });
      setShowAdjustmentModal(true);
      setIsAdjusting(false);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      // We don't set loading false here because we do it inside try or catch
    }
  };

  const handleFinalizeCalculation = (factor: number) => {
    if (!pendingResults) return;

    const adjustedIrradiance = {
      ...pendingResults.irradiance,
      average: pendingResults.irradiance.average * factor
    };

    let finalKwp = parseFloat(kwp);
    if (isNaN(finalKwp) && projectType === 'new' && attachedInvoice && savedInvoiceData?.energiaProm) {
      const consumoProm = parseFloat(savedInvoiceData.energiaProm.replace(/[^0-9.]/g, ''));
      const pr = parseFloat(powerRatio);
      finalKwp = (consumoProm / 30) / (pr * adjustedIrradiance.average);
    }

    setGeoResult(pendingResults.geo);
    setIrradianceResult(adjustedIrradiance);
    setLastSearchedParams({
      mode: analysisMode as 'monthly' | 'annual',
      month: selectedMonth,
      startYear: startYear!,
      endYear: endYear!,
      kwp: finalKwp,
      pr: parseFloat(powerRatio),
      isAutoKwp: isNaN(parseFloat(kwp)),
    });
    setShowAdjustmentModal(false);
    setPendingResults(null);
  };

  const handleClearInputs = () => {
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
    setProjectType(null);
    setAttachedInvoice(false);
    setError(null);
  };

  const handleClearResults = () => {
    setGeoResult(null);
    setIrradianceResult(null);
    setLastSearchedParams(null);
    setError(null);
  };

  const handleClear = () => {
    handleClearInputs();
    handleClearResults();
    setSavedInvoiceData(null);
  };

  if (showInvoiceView) {
    return (
      <InvoiceAttachment 
        onBack={() => setShowInvoiceView(false)} 
        onSave={(data) => {
          setSavedInvoiceData(data);
          setShowInvoiceView(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Saved Invoice Data Section */}
      <AnimatePresence mode="wait">
        {savedInvoiceData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Datos de Facturación Guardados</h3>
                  <p className="text-sm text-gray-500">Información extraída de la última factura cargada</p>
                </div>
              </div>
              <button 
                onClick={() => setSavedInvoiceData(null)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Eliminar datos guardados"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[
                { label: 'Cliente', value: savedInvoiceData.cliente },
                { label: 'Contrato', value: savedInvoiceData.contrato },
                ...(savedInvoiceData.capacidadInstalada ? [
                  { label: 'Capacidad Instalada', value: savedInvoiceData.capacidadInstalada },
                  { label: 'Importó / Consumo', value: savedInvoiceData.importoConsumo },
                  { label: 'Excedentes', value: savedInvoiceData.excedentes },
                  { label: 'Saldo', value: savedInvoiceData.saldo },
                ] : [
                  { label: 'Energía (Consumo)', value: savedInvoiceData.energia },
                  { label: 'Energía PROM', value: savedInvoiceData.energiaProm },
                ]),
                { label: 'Comercialización', value: savedInvoiceData.comercializacion },
                { label: 'Generación', value: savedInvoiceData.generacion },
                { label: 'Total Energía', value: savedInvoiceData.totalEnergia, highlight: true },
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-5 rounded-2xl border transition-all",
                    item.highlight 
                      ? "bg-emerald-50 border-emerald-100 md:col-span-2 lg:col-span-1" 
                      : "bg-gray-50 border-gray-100"
                  )}
                >
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{item.label}</p>
                  <p className={cn(
                    "font-bold truncate",
                    item.highlight ? "text-emerald-700 text-lg" : "text-gray-900"
                  )}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Section */}
      <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        {/* Step 1: Analysis Mode */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-2">
                {projectType && (
                  <button 
                    onClick={() => {
                      setProjectType(null);
                      setAnalysisMode(null);
                      setInputMode(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-all"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-400" />
                  </button>
                )}
                <h2 className="text-2xl font-black tracking-tight text-gray-900">Pronóstico de Generación Solar</h2>
              </div>
              {projectType && (
                <button 
                  onClick={handleClear}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center gap-2 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar registro
                </button>
              )}
            </div>
          </div>

          {!projectType && (
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] px-1">Tipo de Proyecto</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    setProjectType('new');
                    setShowInvoicePromptModal(true);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all border-2",
                    projectType === 'new' 
                      ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md shadow-amber-100" 
                      : "bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500"
                  )}
                >
                  <Sun className="w-5 h-5" />
                  Instalación nueva
                </button>
                <button 
                  onClick={() => {
                    setProjectType('existing');
                    setShowInvoicePromptModal(true);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all border-2",
                    projectType === 'existing' 
                      ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md shadow-amber-100" 
                      : "bg-gray-50 border-gray-100 text-gray-400 hover:border-amber-200 hover:text-amber-500"
                  )}
                >
                  <TrendingUp className="w-5 h-5" />
                  Validación de rendimiento existente
                </button>
              </div>
            </div>
          )}
        </div>

        {projectType && (
          <>
            <div className="mb-10">
              <div className="space-y-4">
                <label className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] px-1">Seleccione Tipo de Análisis</label>
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
            <label className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] px-1">Método de Ubicación</label>
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
            <label className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] px-1 block">Ingrese los Datos</label>
            
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
          {!(projectType === 'new' && attachedInvoice) && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">kWp Instalados</label>
              <div className="relative">
                <Grid3X3 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="number" 
                  value={kwp}
                  onChange={(e) => setKwp(e.target.value)}
                  placeholder="Ingrese kWp"
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
              Power Ratio (PR)
              <Tooltip text="Ajuste porcentual que disminuye la generación del sistema por factores de sombras, días nublados, suciedad, caída de tensión, perdidas de potencia, los rangos van desde 0.8 a 0.9 segun consideraciones tecnicas." />
            </label>
            <div className="relative">
              <ArrowDownRight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

        <div className="mt-6 flex justify-end gap-3 flex-wrap">
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
          </>
        )}
  </section>

      {/* Invoice Prompt Modal */}
      <AnimatePresence>
        {showInvoicePromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl border border-gray-100 p-8 max-w-md w-full space-y-6 relative"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => {
                    setShowInvoicePromptModal(false);
                    setProjectType(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-2 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">¿Desea adjuntar Factura de servicios?</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Adjuntar una factura nos permite extraer automáticamente los datos necesarios para un análisis más preciso.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setShowInvoicePromptModal(false);
                    setAttachedInvoice(false);
                  }}
                  className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
                >
                  No
                </button>
                <button
                  onClick={() => {
                    setShowInvoicePromptModal(false);
                    setShowInvoiceView(true);
                    setAttachedInvoice(true);
                  }}
                  className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                >
                  Sí
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adjustment Modal */}
      <AnimatePresence>
        {showAdjustmentModal && pendingResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl border border-gray-100 p-8 max-w-md w-full space-y-6 relative"
            >
              <button 
                onClick={() => setShowAdjustmentModal(false)}
                className="absolute top-4 right-4 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Ajuste de Irradiancia</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Para la selección de ubicación ingresada se tiene{' '}
                  <span className="font-bold text-amber-600">
                    {pendingResults.irradiance.average.toFixed(2)} kW/m² {analysisMode === 'monthly' ? 'Mensual' : 'Anual'}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  ¿Desea castigar este valor para ser más conservador?
                </p>
              </div>

              {!isAdjusting ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsAdjusting(true)}
                    className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    Ajustar
                  </button>
                  <button
                    onClick={() => handleFinalizeCalculation(1)}
                    className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
                  >
                    Conservar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-900 uppercase tracking-widest px-1">
                      Factor de Ajuste
                      <Tooltip text="Este ajuste no es necesario, ya se tuvieron en cuenta los ajustes por PR (power ratio)" />
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={adjustmentFactor}
                      onChange={(e) => setAdjustmentFactor(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                      placeholder="Ej: 0.90"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setIsAdjusting(false)}
                      className="px-6 py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={() => handleFinalizeCalculation(parseFloat(adjustmentFactor) || 1)}
                      className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="space-y-6">
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

                  {/* kWp Required */}
                  {lastSearchedParams?.isAutoKwp && (
                    <div className="bg-indigo-50/30 rounded-3xl p-6 border border-indigo-100/50">
                      <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-2">
                        kWp requeridos para el sistema
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-indigo-600 tracking-tight">
                          {(lastSearchedParams?.kwp ?? 0).toFixed(2)}
                        </span>
                        <span className="text-lg font-bold text-indigo-500">
                          kWp
                        </span>
                      </div>
                    </div>
                  )}

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

                  {savedInvoiceData?.energiaProm && irradianceResult?.average && powerRatio && (
                    <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                        Requerimiento según Factura
                      </p>
                      <p className="text-sm text-emerald-800 leading-relaxed">
                        Para cubrir un consumo promedio de <span className="font-bold">{parseFloat(savedInvoiceData.energiaProm.replace(/[^0-9.]/g, ''))} kWh/mes</span>, se requiere instalar aproximadamente{' '}
                        <span className="font-black text-emerald-600 text-lg">
                          {((parseFloat(savedInvoiceData.energiaProm.replace(/[^0-9.]/g, '')) / 30) / (parseFloat(powerRatio) * irradianceResult.average)).toFixed(2)} kWp
                        </span>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
