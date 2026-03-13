import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Activity, 
  Settings2, 
  Info, 
  ArrowRight,
  Maximize2,
  RotateCcw,
  CircleDot,
  LayoutGrid,
  Layers,
  HelpCircle,
  CircuitBoard,
  ArrowUpRight,
  Triangle,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PhasorData {
  mag: number;
  ang: number; // in degrees
  real: number;
  imag: number;
}

const toPhasor = (real: number, imag: number): PhasorData => {
  const mag = Math.sqrt(real * real + imag * imag);
  const ang = (Math.atan2(imag, real) * 180) / Math.PI;
  return { mag, ang, real, imag };
};

export default function PhasorCalculator() {
  const [type, setType] = useState<'serie' | 'paralelo'>('serie');
  const [r, setR] = useState<string | number>('');
  const [xl, setXl] = useState<string | number>('');
  const [xc, setXc] = useState<string | number>('');
  const [vMag, setVMag] = useState<string | number>('');
  const [freq, setFreq] = useState<string | number>('');

  const results = useMemo(() => {
    const numR = Number(r) || 0;
    const numXl = Number(xl) || 0;
    const numXc = Number(xc) || 0;
    const numVMag = Number(vMag) || 0;

    const V = { real: numVMag, imag: 0 };
    
    if (type === 'serie') {
      const zReal = numR;
      const zImag = numXl - numXc;
      const zMag = Math.sqrt(zReal * zReal + zImag * zImag);
      const zAng = Math.atan2(zImag, zReal);
      
      const iMag = numVMag / (zMag || 1e-9);
      const iAng = -zAng;
      const iReal = iMag * Math.cos(iAng);
      const iImag = iMag * Math.sin(iAng);
      
      const vrReal = iReal * numR;
      const vrImag = iImag * numR;
      const vlReal = -iImag * numXl;
      const vlImag = iReal * numXl;
      const vcReal = iImag * numXc;
      const vcImag = -iReal * numXc;
      
      const sReal = numVMag * iReal;
      const sImag = -numVMag * iImag;
      const sMag = Math.sqrt(sReal * sReal + sImag * sImag);
      const pf = sReal / (sMag || 1);

      return {
        type,
        V: toPhasor(V.real, V.imag),
        I: toPhasor(iReal, iImag),
        Z: toPhasor(zReal, zImag),
        VR: toPhasor(vrReal, vrImag),
        VL: toPhasor(vlReal, vlImag),
        VC: toPhasor(vcReal, vcImag),
        S: toPhasor(sReal, sImag),
        P: sReal,
        Q: sImag,
        S_abs: sMag,
        pf,
        phi: (Math.atan2(sImag, sReal) * 180) / Math.PI
      };
    } else {
      const yr = 1 / (numR || 1e-9);
      const yl = -1 / (numXl || 1e-9);
      const yc = 1 / (numXc || 1e-9);
      
      const yReal = yr;
      const yImag = yl + yc;
      const yMag = Math.sqrt(yReal * yReal + yImag * yImag);
      const yAng = Math.atan2(yImag, yReal);
      
      const zMag = 1 / (yMag || 1e-9);
      const zAng = -yAng;
      
      const iReal = numVMag * yReal;
      const iImag = numVMag * yImag;
      
      const irReal = numVMag / (numR || 1e-9);
      const irImag = 0;
      const ilReal = 0;
      const ilImag = -numVMag / (numXl || 1e-9);
      const icReal = 0;
      const icImag = numVMag / (numXc || 1e-9);
      
      const sReal = numVMag * iReal;
      const sImag = -numVMag * iImag;
      const sMag = Math.sqrt(sReal * sReal + sImag * sImag);
      const pf = sReal / (sMag || 1);

      return {
        type,
        V: toPhasor(V.real, V.imag),
        I: toPhasor(iReal, iImag),
        Z: toPhasor(zMag * Math.cos(zAng), zMag * Math.sin(zAng)),
        Y: toPhasor(yReal, yImag),
        IR: toPhasor(irReal, irImag),
        IL: toPhasor(ilReal, ilImag),
        IC: toPhasor(icReal, icImag),
        S: toPhasor(sReal, sImag),
        P: sReal,
        Q: sImag,
        S_abs: sMag,
        pf,
        phi: (Math.atan2(sImag, sReal) * 180) / Math.PI
      };
    }
  }, [type, r, xl, xc, vMag]);

  const hasValues = r !== '' && xl !== '' && xc !== '' && vMag !== '';

  return (
    <div className="space-y-10 pb-24">
      {/* Hero Section - Compact */}
      <div className="relative overflow-hidden bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-60 h-60 bg-indigo-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <CircuitBoard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Análisis de Circuitos RLC</h2>
            </div>
          </div>
          
          <p className="hidden md:block text-gray-400 text-xs font-medium max-w-xs text-right">
            Cálculo y visualización profesional de diagramas fasoriales, impedancias y potencias.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Top Control Panel: Parameters & Results */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Parameters Section */}
          <section className="xl:col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Configuración del Sistema</h3>
              </div>
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                <button 
                  onClick={() => setType('serie')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    type === 'serie' ? "bg-white text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Serie
                </button>
                <button 
                  onClick={() => setType('paralelo')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                    type === 'paralelo' ? "bg-white text-indigo-600 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  Paralelo
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <ModernInput 
                label="Resistencia (R)" 
                value={r} 
                onChange={setR} 
                unit="Ω" 
                icon="R" 
                tooltip="Oposición al flujo de corriente que disipa energía en forma de calor (Parte real de la impedancia)."
              />
              <ModernInput 
                label="Reactancia Inductiva (XL)" 
                value={xl} 
                onChange={setXl} 
                unit="Ω" 
                icon="L" 
                tooltip="Oposición al cambio de corriente en un inductor. Aumenta proporcionalmente con la frecuencia."
              />
              <ModernInput 
                label="Reactancia Capacitiva (XC)" 
                value={xc} 
                onChange={setXc} 
                unit="Ω" 
                icon="C" 
                tooltip="Oposición al flujo de corriente en un capacitor. Disminuye inversamente con la frecuencia."
              />
              <ModernInput 
                label="Voltaje Fuente (V)" 
                value={vMag} 
                onChange={setVMag} 
                unit="V" 
                icon="V" 
                tooltip="Magnitud del voltaje eficaz (RMS) de la fuente. Se toma como referencia con ángulo de 0°."
              />
              <ModernInput 
                label="Frecuencia (f)" 
                value={freq} 
                onChange={setFreq} 
                unit="Hz" 
                icon="f" 
                tooltip="Número de ciclos por segundo de la señal de CA. Influye en el valor de las reactancias."
              />
            </div>
          </section>

          {/* Results Summary Section */}
          <section className="xl:col-span-4 bg-gray-900 rounded-[32px] p-6 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            
            <div className="relative z-10 mb-4 border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Variables eléctricas</h3>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-4">
              <div className="col-span-2">
                <ResultRow label="Impedancia (Z)" value={hasValues ? `${results.Z.mag.toFixed(2)} ∠ ${results.Z.ang.toFixed(2)}°` : '---'} unit="Ω" />
              </div>
              <div className="col-span-2">
                <ResultRow label="Corriente (I)" value={hasValues ? `${results.I.mag.toFixed(2)} ∠ ${results.I.ang.toFixed(2)}°` : '---'} unit="A" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <ResultRow label="P. Activa (P)" value={hasValues ? results.P.toFixed(1) : '---'} unit="W" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <ResultRow label="P. Reactiva (Q)" value={hasValues ? results.Q.toFixed(1) : '---'} unit="var" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <ResultRow label="Factor Potencia" value={hasValues ? results.pf.toFixed(3) : '---'} unit={results.phi > 0 ? 'Ind.' : 'Cap.'} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <ResultRow label="P. Aparente" value={hasValues ? results.S_abs.toFixed(1) : '---'} unit="VA" />
              </div>
            </div>
          </section>
        </div>

        {/* Main Visualization Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Phasor Diagram */}
          <VisualCard 
            title={type === 'serie' ? "Diagrama de Tensiones" : "Diagrama de Corrientes"}
            description={type === 'serie' ? "Vectores VR, VL, VC y VT" : "Vectores IR, IL, IC e IT"}
            icon={<ArrowUpRight className="w-5 h-5" />}
            contentClassName="min-h-[450px] lg:min-h-[500px] xl:min-h-[550px]"
          >
            {hasValues ? <PhasorDiagram results={results} /> : <EmptyVisualState />}
          </VisualCard>

          {/* Power Triangle */}
          <VisualCard 
            title="Triángulo de Potencias"
            description="RELACIÓN VECTORIAL P, Q Y S"
            icon={<Triangle className="w-5 h-5" />}
            contentClassName="min-h-[450px] lg:min-h-[500px] xl:min-h-[550px]"
          >
            {hasValues ? <PowerTriangle results={results} /> : <EmptyVisualState />}
          </VisualCard>

          {/* System Analysis */}
          <VisualCard 
            title="Análisis de Fasores"
            description="RELACIÓN NORMALIZADA V, I Y S"
            icon={<Compass className="w-5 h-5" />}
            contentClassName="min-h-[450px] lg:min-h-[500px] xl:min-h-[550px]"
            className="lg:col-span-2 xl:col-span-1"
          >
            {hasValues ? <SystemPhasors results={results} /> : <EmptyVisualState />}
          </VisualCard>
        </div>
      </div>
    </div>
  );
}

function ModernInput({ label, value, onChange, unit, icon, tooltip }: { label: string, value: string | number, onChange: (v: string | number) => void, unit: string, icon: string, tooltip?: string }) {
  return (
    <div className="group space-y-2">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
          {tooltip && (
            <div className="relative group/tooltip">
              <HelpCircle className="w-3 h-3 text-gray-300 hover:text-indigo-500 cursor-help transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-[10px] text-white rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 pointer-events-none shadow-xl">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold text-indigo-500">{unit}</span>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 group-focus-within:border-indigo-200 group-focus-within:text-indigo-500 transition-all">
          {icon}
        </div>
        <input 
          type="text" 
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
              onChange(val);
            }
          }}
          className="w-full bg-white border border-gray-100 rounded-[18px] pl-14 pr-4 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
        />
      </div>
    </div>
  );
}

function ResultRow({ label, value, unit }: { label: string, value: string, unit: string }) {
  return (
    <div className="flex items-center justify-between group border-b border-white/5 pb-1">
      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-gray-300 transition-colors shrink-0">{label}</span>
      <div className="flex items-baseline gap-1 ml-4">
        <span className="text-sm font-mono font-black text-white tracking-tight whitespace-nowrap">{value}</span>
        <span className="text-[8px] font-black text-indigo-500 uppercase shrink-0">{unit}</span>
      </div>
    </div>
  );
}

function VisualCard({ title, description, icon, children, className, contentClassName }: { title: string, description: string, icon: React.ReactNode, children: React.ReactNode, className?: string, contentClassName?: string }) {
  return (
    <div className={cn("bg-white rounded-[32px] p-4 shadow-sm border border-gray-100 flex flex-col h-full group hover:shadow-xl hover:shadow-indigo-100/20 transition-all duration-500", className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-black text-gray-900 tracking-tight text-xs">{title}</h3>
          <p className="text-[9px] text-gray-400 font-medium mt-0.5">{description}</p>
        </div>
        <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
          {icon}
        </div>
      </div>
      <div className={cn("flex-1 flex items-center justify-center min-h-[320px] bg-gray-50/30 rounded-[24px] border border-gray-50 p-1", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

function EmptyVisualState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white/50 rounded-[24px] w-full h-full border-2 border-dashed border-gray-100">
      <div className="w-24 h-24 bg-indigo-50/50 rounded-[32px] flex items-center justify-center mb-8 shadow-inner">
        <Activity className="w-10 h-10 text-indigo-200" />
      </div>
      <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em] mb-3">Esperando Parámetros</p>
      <p className="text-sm text-gray-400 max-w-[240px] leading-relaxed font-medium">
        Ingrese los valores de R, XL, XC y Voltaje en el panel lateral para generar el análisis vectorial detallado.
      </p>
    </div>
  );
}

// --- SVG Visualization Components ---

function PhasorDiagram({ results }: { results: any }) {
  const vectors = results.type === 'serie' 
    ? [
        { label: 'VR', val: results.VR, color: '#6366f1' },
        { label: 'VL', val: results.VL, color: '#ef4444' },
        { label: 'VC', val: results.VC, color: '#10b981' },
        { label: 'VT', val: results.V, color: '#f59e0b' }
      ]
    : [
        { label: 'IR', val: results.IR, color: '#6366f1' },
        { label: 'IL', val: results.IL, color: '#ef4444' },
        { label: 'IC', val: results.IC, color: '#10b981' },
        { label: 'IT', val: results.I, color: '#f59e0b' }
      ];

  const refVector = results.type === 'serie' ? results.VR : results.IR;
  const rotationAngle = -refVector.ang;

  const rotatedVectors = vectors.map(v => {
    const newAng = v.val.ang + rotationAngle;
    const rad = (newAng * Math.PI) / 180;
    return {
      ...v,
      val: {
        ...v.val,
        ang: newAng,
        real: v.val.mag * Math.cos(rad),
        imag: v.val.mag * Math.sin(rad)
      }
    };
  });

  return <VectorSpace vectors={rotatedVectors} idPrefix="phasor-main" />;
}

function PowerTriangle({ results }: { results: any }) {
  const { P, Q, S_abs, phi } = results;
  const maxVal = Math.max(Math.abs(P), Math.abs(Q), Math.abs(S_abs), 1);
  const scale = 340 / maxVal;

  const pX = P * scale;
  const qY = -Q * scale; 

  const arcRadius = 80;
  
  return (
    <svg 
      viewBox="-400 -400 800 800" 
      className="w-full h-full drop-shadow-sm"
    >
      <defs>
        <marker id="arrowhead-power-tri" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
        </marker>
        <filter id="text-halo-tri">
          <feMorphology in="SourceAlpha" result="expanded" operator="dilate" radius="1"/>
          <feFlood floodColor="white" floodOpacity="0.9" result="white"/>
          <feComposite in="white" in2="expanded" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Polar Grid */}
      {[80, 160, 240, 320, 400].map(r => (
        <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="#f1f5f9" strokeWidth={r === 400 ? "1" : "0.5"} />
      ))}
      
      {/* Axes */}
      <line x1="-400" y1="0" x2="400" y2="0" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="0" y1="-400" x2="0" y2="400" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

      {/* P Vector */}
      <line x1="0" y1="0" x2={pX} y2="0" stroke="#6366f1" strokeWidth="3" markerEnd="url(#arrowhead-power-tri)" className="text-indigo-600" />
      <text 
        x={pX / 2} 
        y={Q >= 0 ? 25 : -15} 
        fontSize="12" 
        fontWeight="900" 
        textAnchor="middle" 
        fill="#6366f1"
        className="font-mono"
        filter="url(#text-halo-tri)"
      >
        P: {P.toFixed(1)}W
      </text>

      {/* Q Vector */}
      <line x1={pX} y1="0" x2={pX} y2={qY} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowhead-power-tri)" className="text-red-500" />
      <text 
        x={pX + (pX >= 0 ? 15 : -15)} 
        y={qY / 2} 
        fontSize="12" 
        fontWeight="900" 
        textAnchor={pX >= 0 ? "start" : "end"} 
        dominantBaseline="middle"
        fill="#ef4444" 
        className="font-mono"
        filter="url(#text-halo-tri)"
      >
        Q: {Math.abs(Q).toFixed(1)}var
      </text>

      {/* S Vector */}
      <line x1="0" y1="0" x2={pX} y2={qY} stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowhead-power-tri)" className="text-emerald-500" />
      <g transform={`translate(${pX / 2}, ${qY / 2}) rotate(${-phi}, 0, 0)`}>
        <text 
          y={Q >= 0 ? -15 : 25} 
          fontSize="12" 
          fontWeight="900" 
          textAnchor="middle" 
          fill="#10b981"
          className="font-mono"
          filter="url(#text-halo-tri)"
        >
          S: {S_abs.toFixed(1)}VA
        </text>
      </g>

      {/* Angle Arc */}
      <path 
        d={`M ${arcRadius} 0 A ${arcRadius} ${arcRadius} 0 0 ${Q > 0 ? 0 : 1} ${arcRadius * Math.cos(phi * Math.PI / 180)} ${-arcRadius * Math.sin(phi * Math.PI / 180)}`} 
        fill="none" 
        stroke="#6366f1" 
        strokeWidth="2" 
        strokeDasharray="4 2"
      />
      
      <text 
        x={arcRadius + 15} 
        y={-arcRadius * Math.sin((phi/2) * Math.PI / 180)} 
        fontSize="12" 
        fontWeight="900" 
        fill="#6366f1" 
        textAnchor="start"
        dominantBaseline="middle"
        className="font-mono"
        filter="url(#text-halo-tri)"
      >
        φ: {phi.toFixed(1)}°
      </text>
    </svg>
  );
}

function SystemPhasors({ results }: { results: any }) {
  const { V, I, S } = results;
  
  const sAbs = S.mag || 1e-6;
  const vScale = 0.5 * sAbs / (V.mag || 1);
  const iScale = 0.4 * sAbs / (I.mag || 1);

  const vectors = [
    { label: 'V', val: { ...V, mag: V.mag * vScale }, color: '#6366f1', original: V, unit: 'V' },
    { label: 'I', val: { ...I, mag: I.mag * iScale }, color: '#ef4444', original: I, unit: 'A' },
    { label: 'S', val: S, color: '#10b981', original: S, unit: 'VA' }
  ];

  return <VectorSpace vectors={vectors} showOriginalLabels idPrefix="phasor-sys" />;
}

function VectorSpace({ vectors, showOriginalLabels = false, idPrefix = "vector" }: { vectors: any[], showOriginalLabels?: boolean, idPrefix?: string }) {
  const maxMag = Math.max(...vectors.map(v => v.val.mag), 1);
  const scale = 340 / maxMag; 

  const markerId = `arrowhead-${idPrefix}`;

  return (
    <svg viewBox="-400 -400 800 800" className="w-full h-full drop-shadow-sm">
      <defs>
        <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" />
        </marker>
        <filter id="text-halo">
          <feMorphology in="SourceAlpha" result="expanded" operator="dilate" radius="1.5"/>
          <feFlood floodColor="white" floodOpacity="0.9" result="white"/>
          <feComposite in="white" in2="expanded" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Polar Grid */}
      {[80, 160, 240, 320, 400].map(r => (
        <circle key={r} cx="0" cy="0" r={r} fill="none" stroke="#f1f5f9" strokeWidth={r === 400 ? "1" : "0.5"} />
      ))}
      
      {/* Axes */}
      <line x1="-400" y1="0" x2="400" y2="0" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
      <line x1="0" y1="-400" x2="0" y2="400" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

      {vectors.map((v, i) => {
        const x = v.val.real * scale;
        const y = -v.val.imag * scale; 
        
        // Label positioning logic
        const angleRad = Math.atan2(-y, x);
        const labelDist = 25;
        const lx = x + Math.cos(angleRad) * labelDist;
        const ly = y - Math.sin(angleRad) * labelDist;
        
        const textAnchor = x > 20 ? "start" : (x < -20 ? "end" : "middle");
        const dominantBaseline = y > 20 ? "hanging" : (y < -20 ? "baseline" : "middle");

        return (
          <g key={i} className="transition-all duration-500">
            <line 
              x1="0" y1="0" x2={x} y2={y} 
              stroke={v.color} 
              strokeWidth="3" 
              markerEnd={`url(#${markerId})`} 
              style={{ color: v.color }}
              className="drop-shadow-sm"
            />
            <text 
              x={lx}
              y={ly}
              fontSize="12" 
              fontWeight="900" 
              textAnchor={textAnchor}
              fill={v.color}
              dominantBaseline={dominantBaseline}
              className="font-mono"
              filter="url(#text-halo)"
            >
              {v.label}: {showOriginalLabels ? v.original.mag.toFixed(1) : v.val.mag.toFixed(1)}{showOriginalLabels ? v.unit : ''} ∠{v.val.ang.toFixed(1)}°
            </text>
          </g>
        );
      })}
    </svg>
  );
}
