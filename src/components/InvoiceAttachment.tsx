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
  Check,
  Save,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Gemini is now handled on the server side to keep the API key secure

import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker using unpkg for better version matching
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface InvoiceAttachmentProps {
  onBack: () => void;
  onSave?: (data: ExtractedData) => void;
}

interface ExtractedData {
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

export default function InvoiceAttachment({ onBack, onSave }: InvoiceAttachmentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceType, setInvoiceType] = useState<'AGPE' | 'CONVENCIONAL'>('AGPE');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Increased limit to 10MB, but we'll process it on the client
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrorMessage('El archivo es demasiado grande (máx 10MB).');
        setUploadStatus('error');
        return;
      }

      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage(null);
      setExtractedData(null);
    }
  };

  const convertPdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    console.log(`Processing PDF with ${numPages} pages...`);
    
    const canvases: HTMLCanvasElement[] = [];
    let totalHeight = 0;
    let maxWidth = 0;

    // Render each page to a canvas
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      // Use scale 1.2 to balance quality and size for multi-page PDFs
      const viewport = page.getViewport({ scale: 1.2 }); 
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (!context) throw new Error('Could not create canvas context');
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      } as any).promise;
      
      canvases.push(canvas);
      totalHeight += canvas.height;
      maxWidth = Math.max(maxWidth, canvas.width);
    }

    // Combine all canvases into one vertical image
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = maxWidth;
    finalCanvas.height = totalHeight;
    const finalCtx = finalCanvas.getContext('2d');
    
    if (!finalCtx) throw new Error('Could not create final canvas context');

    let currentY = 0;
    for (const canvas of canvases) {
      finalCtx.drawImage(canvas, 0, currentY);
      currentY += canvas.height;
    }
    
    // Compress as JPEG with quality 0.5 to keep multi-page results under Vercel's 4.5MB limit
    return finalCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Reduced max dimensions to 1200px to be safer with Vercel's 4.5MB limit
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress as JPEG with 0.6 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl.split(',')[1]);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus('idle');

    try {
      let base64 = '';
      let mimeType = file.type;
      const fileName = file.name.toLowerCase();
      
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);

      if (file.type.startsWith('image/')) {
        console.log('Compressing image...');
        base64 = await compressImage(file);
        mimeType = 'image/jpeg';
      } else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
        console.log('Converting PDF to image...');
        try {
          base64 = await convertPdfToImage(file);
          mimeType = 'image/jpeg';
        } catch (pdfError: any) {
          console.error('PDF conversion failed:', pdfError);
          throw new Error('No se pudo procesar el PDF. Intenta subir una imagen de la factura.');
        }
      } else {
        console.log('Using raw file data (fallback)...');
        // For other files, just read as base64 (fallback)
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1]);
          };
          reader.onerror = error => reject(error);
        });
      }

      const payload = JSON.stringify({
        base64,
        mimeType,
        invoiceType
      });

      // Vercel has a 4.5MB limit for the entire request body
      // We check the payload size here to catch it before sending
      const payloadSizeInMB = new TextEncoder().encode(payload).length / (1024 * 1024);
      console.log(`Payload size: ${payloadSizeInMB.toFixed(2)} MB`);

      if (payloadSizeInMB > 4.4) {
        throw new Error('El archivo procesado sigue siendo demasiado grande para el servidor. Intenta con un archivo más pequeño o de menor resolución.');
      }

      const response = await fetch('/api/extract-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      if (!response.ok) {
        let errorMsg = 'Error en la extracción del servidor';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMsg = errorData.details || errorData.error || errorMsg;
          } catch (e) {
            console.error('Failed to parse error JSON:', e);
          }
        } else {
          // If not JSON, it might be a 413 error from Vercel (HTML)
          const text = await response.text();
          if (response.status === 413 || text.includes('Request Entity Too Large')) {
            errorMsg = 'El archivo es demasiado grande para el servidor de Vercel (límite 4.5MB). Intenta con una imagen o un PDF más pequeño.';
          } else {
            console.error('Server returned non-JSON error:', text);
          }
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setExtractedData(data);
      setUploadStatus('success');
    } catch (error: any) {
      console.error('Error extracting data:', error);
      setErrorMessage(error.message || 'Error al analizar la factura. Inténtalo de nuevo.');
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
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            {/* Invoice Type Selection */}
            <div className="mb-8">
              <label className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] px-1 block mb-4">Tipo de Factura</label>
              <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full sm:w-fit">
                <button 
                  onClick={() => setInvoiceType('AGPE')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all flex-1 sm:flex-none justify-center",
                    invoiceType === 'AGPE' ? "bg-white shadow-sm text-emerald-600" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Factura AGPE
                </button>
                <button 
                  onClick={() => setInvoiceType('CONVENCIONAL')}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all flex-1 sm:flex-none justify-center",
                    invoiceType === 'CONVENCIONAL' ? "bg-white shadow-sm text-emerald-600" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Factura Convencional
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500 px-1">
                {invoiceType === 'AGPE' 
                  ? "Para usuarios con autogeneración a pequeña escala (paneles solares)." 
                  : "Para usuarios con servicio de energía tradicional sin autogeneración."}
              </p>
            </div>

            <div 
              className={cn(
                "border-2 border-dashed rounded-[24px] p-8 text-center transition-all flex flex-col justify-center",
                extractedData ? "min-h-[200px]" : "min-h-[300px]",
                file ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50"
              )}
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
                  <p className="text-[10px] text-amber-600 font-medium mt-1">
                    Nota: Soporta archivos de hasta 10MB. Los PDFs grandes se procesan automáticamente.
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
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="font-bold text-sm">{errorMessage || 'Error al analizar la factura. Inténtalo de nuevo.'}</span>
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
                    { label: 'Contrato', value: extractedData.contrato, key: 'contrato' },
                    ...(invoiceType === 'AGPE' ? [
                      { label: 'Capacidad Instalada', value: extractedData.capacidadInstalada, key: 'capacidadInstalada' },
                      { label: 'Importó / Consumo', value: extractedData.importoConsumo, key: 'importoConsumo' },
                      { label: 'Excedentes', value: extractedData.excedentes, key: 'excedentes' },
                      { label: 'Saldo', value: extractedData.saldo, key: 'saldo' },
                    ] : [
                      { label: 'Energía (Consumo)', value: extractedData.energia, key: 'energia' },
                      { label: 'Energía PROM', value: extractedData.energiaProm, key: 'energiaProm' },
                    ]),
                    { label: 'Comercialización', value: extractedData.comercializacion, key: 'comercializacion' },
                    { label: 'Generación', value: extractedData.generacion, key: 'generacion' },
                    { label: 'Total Energía', value: extractedData.totalEnergia, key: 'totalEnergia', highlight: true },
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
                          {item.value || 'No especificado'}
                        </p>
                        <button 
                          onClick={() => copyToClipboard(item.value || '', item.key)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          {copiedField === item.key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <p className="text-[10px] text-gray-400 italic max-w-[200px]">
                    * Los valores fueron extraídos automáticamente mediante IA. Por favor verifique la información.
                  </p>
                  <div className="flex items-center gap-4">
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
                    {onSave && (
                      <button 
                        onClick={() => onSave(extractedData)}
                        className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Guardar Datos
                      </button>
                    )}
                  </div>
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
