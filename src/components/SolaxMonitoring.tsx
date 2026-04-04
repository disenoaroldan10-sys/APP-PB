import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Sun, 
  Battery, 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  Plus,
  Trash2,
  Server,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Solax API response structure based on documentation
interface SolaxData {
  inverterSN: string;
  sn: string;
  acpower: number; // Potencia Actual (W)
  yieldtoday: number; // Generación Hoy (kWh)
  yieldtotal: number; // Generación Histórica (kWh)
  feedinpower: number; // Inyección a Red (W)
  feedinenergy: number; // Energía inyectada total (kWh)
  consumeenergy: number; // Consumo de Red total (kWh)
  soc: number; // Nivel de Batería (%)
  batPower: number; // Potencia de Batería (W)
  uploadTime: string; // Última Actualización
  inverterStatus: string; // Estado del Inversor
}

interface Plant {
  id: string;
  name: string;
  wifiSns: string[];
  wifiSn?: string; // For backward compatibility during migration
}

const defaultPlants: Plant[] = [
  { id: 'SSNZXEZLME', wifiSns: ['SSNZXEZLME'], name: 'SERVYCOM COMUNICACIONES' },
  { id: 'SR98YLJU8R', wifiSns: ['SR98YLJU8R', 'SS4PFGETPL'], name: 'Ricas tortas' },
  { id: 'SRH2A9GXTB', wifiSns: ['SRH2A9GXTB'], name: 'Fredy Perdomo Girardot' },
  { id: 'SRR8EANAQX', wifiSns: ['SRR8EANAQX', 'SRSM5ZJ8RC'], name: 'ApartaHotelAcapulco' },
  { id: 'SRLKKQTCLP', wifiSns: ['SRLKKQTCLP'], name: 'MRWAHS' },
  { id: 'SRSM8L3UUN', wifiSns: ['SRSM8L3UUN'], name: 'DELCO' },
  { id: 'SRZS5J2APG', wifiSns: ['SRZS5J2APG'], name: 'CDA URABA GRANDE' },
  { id: 'SKKDT9ZTZQ', wifiSns: ['SKKDT9ZTZQ'], name: 'Alejandro Falla' },
  { id: 'SRZCESACGB', wifiSns: ['SRZCESACGB'], name: 'HOTEL ROSA NEGRA' },
  { id: 'SRAGF2YQUP', wifiSns: ['SRAGF2YQUP'], name: 'MIRADOR DE TAHAMIES' },
  { id: 'SRJQJRB5NM', wifiSns: ['SRJQJRB5NM'], name: 'WILSON CICLASMANIA ARBOLETES' },
  { id: 'SR9QSBTEUX', wifiSns: ['SR9QSBTEUX'], name: 'WILSON COMPRAVENTA ARBOLETES' },
  { id: 'SS8FQRVRPT', wifiSns: ['SS8FQRVRPT', 'SSCEZDJJCA'], name: 'Juan Guillermo Zuluaga' },
  { id: 'SRWKJ9HTBP', wifiSns: ['SRWKJ9HTBP'], name: 'HENRY GAVIRIA' },
];

export default function SolaxMonitoring() {
  const [plants, setPlants] = useState<Plant[]>(() => {
    const saved = localStorage.getItem('solax_plants');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = [...defaultPlants];
        for (const p of parsed) {
          const pSns = p.wifiSns || (p.wifiSn ? [p.wifiSn] : []);
          if (pSns.length === 0) continue;
          
          const exists = merged.some(m => m.wifiSns.some(sn => pSns.includes(sn)));
          if (!exists) {
            merged.push({ id: p.id, name: p.name, wifiSns: pSns });
          }
        }
        return merged;
      } catch (e) {
        return defaultPlants;
      }
    }
    return defaultPlants;
  });
  
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSn, setNewPlantSn] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [plantData, setPlantData] = useState<SolaxData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Range data state
  const getFirstDayOfMonth = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  };
  const getLastDayOfMonth = (date: Date) => {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState<string>(() => getFirstDayOfMonth(new Date()));
  const [endDate, setEndDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  
  const [rangeData, setRangeData] = useState<{
    generation: number;
    feedin: number;
    consumption: number;
  } | null>(null);
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Brand selection state
  const [activeBrand, setActiveBrand] = useState<'solax' | 'growatt' | 'deye' | 'huawei'>('solax');

  // Save plants to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('solax_plants', JSON.stringify(plants));
  }, [plants]);

  // Fetch data when selected plant changes
  useEffect(() => {
    if (selectedPlantId) {
      fetchPlantData(selectedPlantId);
    } else {
      setPlantData(null);
    }
  }, [selectedPlantId]);

  // Clear range data when plant changes (require manual search)
  useEffect(() => {
    setRangeData(null);
    setRangeError(null);
  }, [selectedPlantId]);

  const handlePrevMonth = () => {
    if (!startDate) return;
    const [y, m] = startDate.split('-').map(Number);
    const prevMonth = new Date(y, m - 2, 1);
    setStartDate(getFirstDayOfMonth(prevMonth));
    setEndDate(getLastDayOfMonth(prevMonth));
  };

  const handleNextMonth = () => {
    if (!startDate) return;
    const [y, m] = startDate.split('-').map(Number);
    const nextMonth = new Date(y, m, 1);
    setStartDate(getFirstDayOfMonth(nextMonth));
    
    const today = new Date();
    if (nextMonth.getFullYear() === today.getFullYear() && nextMonth.getMonth() === today.getMonth()) {
      setEndDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    } else {
      setEndDate(getLastDayOfMonth(nextMonth));
    }
  };

  const fetchRangeData = async (plantId: string, start: string, end: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant || !plant.wifiSns || plant.wifiSns.length === 0) return;

    setIsRangeLoading(true);
    setRangeError(null);

    try {
      const [y, m, d] = start.split('-').map(Number);
      const startObj = new Date(y, m - 1, d);
      startObj.setDate(startObj.getDate() - 1); // Get the day before the start date as baseline
      const baselineDateStr = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`;

      let totalGeneration = 0;
      let totalFeedin = 0;
      let totalConsumption = 0;
      let hasValidData = false;

      await Promise.all(plant.wifiSns.map(async (sn) => {
        try {
          const [startRes, endRes] = await Promise.all([
            axios.post('/api/solax/history', { wifiSn: sn.trim(), date: baselineDateStr }),
            axios.post('/api/solax/history', { wifiSn: sn.trim(), date: end })
          ]);

          const startData = startRes.data?.result?.[0];
          const endData = endRes.data?.result?.[0];

          if (endData) {
            hasValidData = true;
            const startYield = startData?.yieldtotal || 0;
            const startFeedin = startData?.feedinenergy || 0;
            const startConsume = startData?.consumeenergy || 0;

            totalGeneration += Math.max(0, (endData.yieldtotal || 0) - startYield);
            totalFeedin += Math.max(0, (endData.feedinenergy || 0) - startFeedin);
            totalConsumption += Math.max(0, (endData.consumeenergy || 0) - startConsume);
          }
        } catch (e) {
          console.error(`Error fetching range for SN ${sn}`, e);
        }
      }));

      if (hasValidData) {
        setRangeData({ generation: totalGeneration, feedin: totalFeedin, consumption: totalConsumption });
      } else {
        throw new Error("No se encontraron datos para el período seleccionado");
      }
    } catch (err: any) {
      console.error("Error fetching range data:", err);
      setRangeError(err.message || "Error al obtener datos del período");
      setRangeData(null);
    } finally {
      setIsRangeLoading(false);
    }
  };

  const fetchPlantData = async (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant || !plant.wifiSns || plant.wifiSns.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const responses = await Promise.all(
        plant.wifiSns.map(sn => axios.post('/api/solax/realtime', { wifiSn: sn.trim() }).catch(e => e))
      );

      const validResults = responses
        .filter(r => r && r.data && r.data.success)
        .map(r => r.data.result);

      if (validResults.length === 0) {
        const firstError = responses.find(r => r instanceof Error || (r && r.data && !r.data.success));
        if (firstError instanceof Error) throw firstError;
        throw new Error(firstError?.data?.exception || 'Error al obtener datos de la API');
      }

      const aggregatedData: SolaxData = {
        inverterSN: validResults.map(r => r.inverterSn || r.sn).join(', '),
        sn: validResults.map(r => r.sn).join(', '),
        acpower: validResults.reduce((sum, r) => sum + (Number(r.acpower) || 0), 0),
        yieldtoday: validResults.reduce((sum, r) => sum + (Number(r.yieldtoday) || 0), 0),
        yieldtotal: validResults.reduce((sum, r) => sum + (Number(r.yieldtotal) || 0), 0),
        feedinpower: validResults.reduce((sum, r) => sum + (Number(r.feedinpower) || 0), 0),
        feedinenergy: validResults.reduce((sum, r) => sum + (Number(r.feedinenergy) || 0), 0),
        consumeenergy: validResults.reduce((sum, r) => sum + (Number(r.consumeenergy) || 0), 0),
        batPower: validResults.reduce((sum, r) => sum + (Number(r.batPower) || 0), 0),
        soc: Math.round(validResults.reduce((sum, r) => sum + (Number(r.soc) || 0), 0) / validResults.length),
        uploadTime: validResults[0].uploadTime,
        inverterStatus: validResults.some(r => r.inverterStatus === '103' || r.inverterStatus === '104') 
          ? '103' 
          : validResults[0].inverterStatus
      };

      setPlantData(aggregatedData);
    } catch (err: any) {
      console.error("Error fetching SolaX data:", err);
      
      let errorMessage = 'Error de conexión con SolaX Cloud';
      if (err.response?.data) {
        const data = err.response.data;
        errorMessage = typeof data.error === 'string' ? data.error : 
                       typeof data.details === 'string' ? data.details : 
                       typeof data === 'string' ? data : err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setPlantData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlantName.trim() || !newPlantSn.trim()) return;

    const sns = newPlantSn.split(',').map(s => s.trim()).filter(s => s);

    const newPlant: Plant = {
      id: Date.now().toString(),
      name: newPlantName.trim(),
      wifiSns: sns
    };

    setPlants([...plants, newPlant]);
    setNewPlantName('');
    setNewPlantSn('');
    setIsAdding(false);
    
    if (!selectedPlantId) {
      setSelectedPlantId(newPlant.id);
    }
  };

  const handleRemovePlant = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPlants = plants.filter(p => p.id !== id);
    setPlants(updatedPlants);
    if (selectedPlantId === id) {
      setSelectedPlantId(null);
    }
  };

  const getStatusInfo = (status: string) => {
    // SolaX status codes mapping
    const statusMap: Record<string, { label: string, color: string, icon: any }> = {
      '100': { label: 'Esperando', color: 'text-amber-500 bg-amber-50 border-amber-200', icon: Clock },
      '101': { label: 'Chequeando', color: 'text-blue-500 bg-blue-50 border-blue-200', icon: Activity },
      '102': { label: 'Normal', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
      '103': { label: 'Falla', color: 'text-red-500 bg-red-50 border-red-200', icon: AlertCircle },
      '104': { label: 'Permanente Falla', color: 'text-red-600 bg-red-100 border-red-300', icon: AlertCircle },
      '105': { label: 'Actualizando', color: 'text-indigo-500 bg-indigo-50 border-indigo-200', icon: RefreshCw },
      '106': { label: 'EPS Check', color: 'text-blue-500 bg-blue-50 border-blue-200', icon: Activity },
      '107': { label: 'EPS', color: 'text-emerald-500 bg-emerald-50 border-emerald-200', icon: Zap },
      '108': { label: 'Autoprueba', color: 'text-purple-500 bg-purple-50 border-purple-200', icon: Activity },
      '109': { label: 'Inactivo', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: Clock },
      '110': { label: 'Standby', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: Clock },
      '111': { label: 'Apagado', color: 'text-gray-400 bg-gray-100 border-gray-200', icon: AlertCircle },
      '112': { label: 'Cargando', color: 'text-blue-500 bg-blue-50 border-blue-200', icon: Battery },
      '113': { label: 'Descargando', color: 'text-amber-500 bg-amber-50 border-amber-200', icon: Battery },
    };

    return statusMap[status] || { label: `Desconocido (${status})`, color: 'text-gray-500 bg-gray-50 border-gray-200', icon: AlertCircle };
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'Mas Light solar' && loginPassword === '12345678L') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[600px] w-full">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Acceso a Monitoreo</h2>
          <p className="text-center text-gray-500 text-sm mb-8">Ingresa tus credenciales para ver los datos de SolaX</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Usuario</label>
              <input 
                type="text" 
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="Ingresa tu usuario"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Contraseña</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            {loginError && (
              <p className="text-sm text-red-500 font-medium text-center">{loginError}</p>
            )}
            
            <button 
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors mt-4"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Brand Tabs */}
      <div className="bg-white rounded-[24px] p-2 shadow-sm border border-gray-100 flex gap-2 overflow-x-auto">
        {(['solax', 'growatt', 'deye', 'huawei'] as const).map((brand) => (
          <button
            key={brand}
            onClick={() => setActiveBrand(brand)}
            className={cn(
              "px-6 py-3 rounded-xl text-sm font-bold transition-all capitalize flex-1 min-w-[120px]",
              activeBrand === brand
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            {brand}
          </button>
        ))}
      </div>

      {activeBrand === 'solax' && (
        <>
          {/* Top Controls: Dropdown & Add Button */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-end gap-4">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            Seleccionar Planta SolaX
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPlantId || ''}
              onChange={(e) => setSelectedPlantId(e.target.value || null)}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
            >
              <option value="">-- Despliega para seleccionar una planta --</option>
              {plants.map(plant => (
                <option key={plant.id} value={plant.id}>
                  {plant.name} (SN: {plant.wifiSns?.join(', ')})
                </option>
              ))}
            </select>
            
            {selectedPlantId && (
              <button 
                onClick={(e) => handleRemovePlant(selectedPlantId, e)}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all"
                title="Eliminar planta seleccionada"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border",
                isAdding 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Añadir Planta</span>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100"
          >
            <h3 className="text-lg font-bold mb-4">Añadir Nueva Planta</h3>
            <form onSubmit={handleAddPlant} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nombre de la Planta</label>
                <input 
                  type="text" 
                  value={newPlantName}
                  onChange={e => setNewPlantName(e.target.value)}
                  placeholder="Ej. Planta Principal"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Registration No. (wifiSn)</label>
                <input 
                  type="text" 
                  value={newPlantSn}
                  onChange={e => setNewPlantSn(e.target.value)}
                  placeholder="Ej. SW12345678, SW87654321"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">Separa múltiples SN con comas si hay inversores en paralelo.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 md:flex-none px-6 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content: Dashboard */}
      <div className="flex-1">
        {!selectedPlantId ? (
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <ArrowDownToLine className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2">
              Selecciona una Planta
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Despliega la lista en la parte superior para elegir una planta y visualizar sus métricas de energía en tiempo real.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 min-h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                  {plants.find(p => p.id === selectedPlantId)?.name}
                  {isLoading && <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />}
                </h2>
                <p className="text-sm text-gray-500 font-mono mt-1">
                  SN: {plants.find(p => p.id === selectedPlantId)?.wifiSns?.join(', ')}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                {plantData && (
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border",
                    getStatusInfo(plantData.inverterStatus).color
                  )}>
                    {React.createElement(getStatusInfo(plantData.inverterStatus).icon, { className: "w-4 h-4" })}
                    {getStatusInfo(plantData.inverterStatus).label}
                  </div>
                )}
                <button 
                  onClick={() => fetchPlantData(selectedPlantId)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  Actualizar
                </button>
              </div>
            </div>

            {error ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4 text-red-600">
                <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold">Error de Conexión</h3>
                  <p className="text-sm mt-1 opacity-90">{error}</p>
                  <p className="text-xs mt-3 opacity-75">
                    Verifica que el número de registro (wifiSn) sea correcto y que el token de la API esté configurado en el servidor.
                  </p>
                </div>
              </div>
            ) : !plantData && !isLoading ? (
              <div className="text-center py-12 text-gray-400">
                <p>No hay datos disponibles</p>
              </div>
            ) : plantData ? (
              <div className="space-y-8">
                {/* Primary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                        <Zap className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Potencia Actual</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">{(plantData.acpower / 1000).toFixed(2)}</span>
                      <span className="text-sm font-bold text-gray-500">kWh</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Sun className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Generación Hoy</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">{Number(plantData.yieldtoday).toFixed(2)}</span>
                      <span className="text-sm font-bold text-gray-500">kWh</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <ArrowUpFromLine className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inyección a Red</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">{(plantData.feedinpower / 1000).toFixed(2)}</span>
                      <span className="text-sm font-bold text-gray-500">kWh</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <ArrowDownToLine className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consumo en Sitio</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">{((plantData.acpower - plantData.feedinpower) / 1000).toFixed(2)}</span>
                      <span className="text-sm font-bold text-gray-500">kWh</span>
                    </div>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Generación Histórica</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900">{Number(plantData.yieldtotal).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
                        <span className="text-xs font-medium text-gray-500">kWh</span>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nivel de Batería (SOC)</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-900">{plantData.soc}</span>
                        <span className="text-xs font-medium text-gray-500">%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Potencia: {Number(plantData.batPower).toFixed(0)} W</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                      <Battery className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Última Actualización</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{plantData.uploadTime}</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </div>
                
                {/* Range Data Section */}
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Resumen por Período</h3>
                      <p className="text-sm text-gray-500">Generación y consumo en el rango seleccionado</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-200 w-fit">
                      <button 
                        onClick={handlePrevMonth} 
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="Mes anterior"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <div className="flex items-center gap-2 px-2">
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer"
                        />
                        <span className="text-gray-400 font-medium">a</span>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer"
                        />
                      </div>

                      <button 
                        onClick={handleNextMonth} 
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="Mes siguiente"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>

                      <button 
                        onClick={() => {
                          if (selectedPlantId) {
                            fetchRangeData(selectedPlantId, startDate, endDate);
                          }
                        }}
                        disabled={isRangeLoading || !selectedPlantId}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 font-bold text-sm"
                        title="Buscar datos del período"
                      >
                        {isRangeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Buscar
                      </button>
                    </div>
                  </div>

                  {rangeError ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium">
                      {rangeError}
                    </div>
                  ) : isRangeLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                  ) : rangeData ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Sun className="w-4 h-4" />
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Generación del Período</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">{rangeData.generation.toFixed(2)}</span>
                          <span className="text-sm font-bold text-gray-500">kWh</span>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <ArrowUpFromLine className="w-4 h-4" />
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inyección a Red</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">{rangeData.feedin.toFixed(2)}</span>
                          <span className="text-sm font-bold text-gray-500">kWh</span>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                            <ArrowDownToLine className="w-4 h-4" />
                          </div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumo de Red</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-gray-900">{rangeData.consumption.toFixed(2)}</span>
                          <span className="text-sm font-bold text-gray-500">kWh</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      No hay datos disponibles para este período.
                    </div>
                  )}
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">
                    Datos obtenidos directamente desde SolaX Cloud API V2.0
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
        </>
      )}

      {activeBrand !== 'solax' && (
        <div className="bg-white rounded-[32px] p-12 shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Server className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2 capitalize">
            Monitoreo {activeBrand}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            El módulo de integración para la API de {activeBrand.charAt(0).toUpperCase() + activeBrand.slice(1)} se encuentra actualmente en desarrollo.
          </p>
        </div>
      )}
    </div>
  );
}
