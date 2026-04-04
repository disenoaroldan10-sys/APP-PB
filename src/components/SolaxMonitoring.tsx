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
  Search
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
  wifiSn: string;
}

export default function SolaxMonitoring() {
  const [plants, setPlants] = useState<Plant[]>(() => {
    const saved = localStorage.getItem('solax_plants');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(
    plants.length > 0 ? plants[0].id : null
  );
  
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSn, setNewPlantSn] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [plantData, setPlantData] = useState<SolaxData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchPlantData = async (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/solax/realtime', {
        wifiSn: plant.wifiSn
      });

      if (response.data && response.data.success) {
        setPlantData(response.data.result);
      } else {
        throw new Error(response.data?.exception || 'Error al obtener datos de la API');
      }
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

    const newPlant: Plant = {
      id: Date.now().toString(),
      name: newPlantName.trim(),
      wifiSn: newPlantSn.trim()
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
      setSelectedPlantId(updatedPlants.length > 0 ? updatedPlants[0].id : null);
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

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full">
      {/* Sidebar: Plant List */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-500" />
              Mis Plantas
            </h2>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence>
            {isAdding && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddPlant}
                className="mb-6 space-y-3 overflow-hidden"
              >
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Nombre de la Planta</label>
                  <input 
                    type="text" 
                    value={newPlantName}
                    onChange={e => setNewPlantName(e.target.value)}
                    placeholder="Ej. Planta Principal"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Registration No. (wifiSn)</label>
                  <input 
                    type="text" 
                    value={newPlantSn}
                    onChange={e => setNewPlantSn(e.target.value)}
                    placeholder="Ej. SW12345678"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Guardar
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            {plants.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium">No hay plantas configuradas</p>
                <p className="text-xs mt-1">Añade una para empezar a monitorear</p>
              </div>
            ) : (
              plants.map(plant => (
                <button
                  key={plant.id}
                  onClick={() => setSelectedPlantId(plant.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group",
                    selectedPlantId === plant.id 
                      ? "bg-indigo-50 border border-indigo-100 shadow-sm" 
                      : "bg-white border border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                  )}
                >
                  <div>
                    <p className={cn(
                      "font-bold text-sm",
                      selectedPlantId === plant.id ? "text-indigo-700" : "text-gray-700"
                    )}>
                      {plant.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{plant.wifiSn}</p>
                  </div>
                  <div 
                    onClick={(e) => handleRemovePlant(plant.id, e)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Dashboard */}
      <div className="flex-1">
        {!selectedPlantId ? (
          <div className="bg-white rounded-[32px] p-12 shadow-sm border border-gray-100 min-h-[500px] flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 mb-2">
              Selecciona una Planta
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Elige una planta de la lista lateral o añade una nueva usando su número de registro (wifiSn) para ver sus datos en tiempo real.
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
                  SN: {plants.find(p => p.id === selectedPlantId)?.wifiSn}
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
                      <span className="text-3xl font-black text-gray-900">{plantData.acpower}</span>
                      <span className="text-sm font-bold text-gray-500">W</span>
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
                      <span className="text-3xl font-black text-gray-900">{plantData.yieldtoday}</span>
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
                      <span className="text-3xl font-black text-gray-900">{plantData.feedinpower}</span>
                      <span className="text-sm font-bold text-gray-500">W</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <ArrowDownToLine className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consumo de Red</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">{plantData.consumeenergy}</span>
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
                        <span className="text-xl font-bold text-gray-900">{plantData.yieldtotal}</span>
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
                      <p className="text-[10px] text-gray-400 mt-1">Potencia: {plantData.batPower} W</p>
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
    </div>
  );
}
