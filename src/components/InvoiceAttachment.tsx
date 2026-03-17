import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  X,
  Receipt,
  Info,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface InvoiceAttachmentProps {
  onBack: () => void;
}

interface ExtractedData {
  cliente: string;
  capacidadInstalada: string;
  importoConsumo: string;
  excedentes: string;
  saldo: string;
  comercializacion: string;
  generacion: string;
  numeroContrato: string;
  totalAPagar: string;
}

export default function InvoiceAttachment({ onBack }: InvoiceAttachmentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setExtractedData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // Convert file to base64 for Gemini
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.split(',')[1]);
        };
        reader.onerror = error => reject(error);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: "Analiza esta factura de energía y extrae los siguientes campos en formato JSON. Si no encuentras un valor, pon 'No especificado'. Campos: Cliente, Capacidad instalada, Importo/consumo, Excedentes, Saldo, Comercialización, Generación, Numero de contrato, Total a pagar."
              },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cliente: { type: Type.STRING },
              capacidadInstalada: { type: Type.STRING },
              importoConsumo: { type: Type.STRING },
              excedentes: { type: Type.STRING },
              saldo: { type: Type.STRING },
              comercializacion: { type: Type.STRING },
              generacion: { type: Type.STRING },
              numeroContrato: { type: Type.STRING },
              totalAPagar: { type: Type.STRING }
            },
            required: ["cliente", "capacidadInstalada", "importoConsumo", "excedentes", "saldo", "comercializacion", "generacion", "numeroContrato", "totalAPagar"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setExtractedData(data);
      setUploadStatus('success');
    } catch (error) {
      console.error('Error extracting data:', error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-500"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Adjuntar Factura de Energía</h2>
          <p className="text-sm text-gray-500">Sube tu factura para un análisis más detallado de tu consumo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload Section */}
        <div className={extractedData ? "lg:col-span-5" : "lg:col-span-12"}>
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 h-full">
            <div 
              className={`
                border-2 border-dashed rounded-[24px] p-12 text-center transition-all h-full flex flex-col justify-center
                ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50'}
              `}
            >
              <input 
                type="file" 
                id="invoice-upload" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,image/*"
              />
              <label htmlFor="invoice-upload" className="cursor-pointer block space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                  <Receipt className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {file ? file.name : 'Selecciona tu factura'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Arrastra y suelta o haz clic para buscar (PDF o Imagen)
                  </p>
                </div>
              </label>

              {file && !extractedData && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <button 
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-8 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-3 mx-auto disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analizando Factura...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Analizar Factura
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {uploadStatus === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 justify-center"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-bold">Error al analizar la factura. Inténtalo de nuevo.</span>
                </motion.div>
              )}

              {uploadStatus === 'success' && !extractedData && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 justify-center"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">¡Factura analizada con éxito!</span>
                </motion.div>
              )}
            </div>
          </section>
        </div>

        {/* Results Section */}
        <AnimatePresence>
          {extractedData && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-7"
            >
              <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    Datos Extraídos
                  </h3>
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Análisis IA Completado
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Cliente', value: extractedData.cliente, key: 'cliente' },
                    { label: 'Número de Contrato', value: extractedData.numeroContrato, key: 'numeroContrato' },
                    { label: 'Capacidad Instalada', value: extractedData.capacidadInstalada, key: 'capacidadInstalada' },
                    { label: 'Importo / Consumo', value: extractedData.importoConsumo, key: 'importoConsumo' },
                    { label: 'Excedentes', value: extractedData.excedentes, key: 'excedentes' },
                    { label: 'Saldo', value: extractedData.saldo, key: 'saldo' },
                    { label: 'Comercialización', value: extractedData.comercializacion, key: 'comercializacion' },
                    { label: 'Generación', value: extractedData.generacion, key: 'generacion' },
                    { label: 'Total a Pagar', value: extractedData.totalAPagar, key: 'totalAPagar', highlight: true },
                  ].map((item) => (
                    <div 
                      key={item.key}
                      className={`p-4 rounded-2xl border transition-all group relative ${
                        item.highlight 
                          ? 'bg-emerald-50 border-emerald-100 md:col-span-2' 
                          : 'bg-gray-50 border-gray-100 hover:border-emerald-200'
                      }`}
                    >
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        {item.label}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-bold truncate ${item.highlight ? 'text-2xl text-emerald-700' : 'text-sm text-gray-900'}`}>
                          {item.value}
                        </p>
                        <button 
                          onClick={() => copyToClipboard(item.value, item.key)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          {copiedField === item.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                  <p className="text-[10px] text-gray-400 italic">
                    * Los valores fueron extraídos automáticamente mediante IA. Por favor verifique la información.
                  </p>
                  <button 
                    onClick={() => {
                      setExtractedData(null);
                      setFile(null);
                      setUploadStatus('idle');
                    }}
                    className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    Borrar y subir otra
                  </button>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!extractedData && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              ¿Por qué adjuntar?
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Al analizar tu factura real, podemos calcular con mayor precisión el ahorro potencial y el dimensionamiento óptimo de tu sistema solar.
            </p>
          </div>
          <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Privacidad
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Tus datos están protegidos y solo se utilizarán para realizar los cálculos técnicos necesarios para tu propuesta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
