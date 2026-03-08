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
  HelpCircle
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
  const [r, setR] = useState<string | number>(10);
  const [xl, setXl] = useState<string | number>(20);
  const [xc, setXc] = useState<string | number>(5);
  const [vMag, setVMag] = useState<string | number>(120);
  const [freq, setFreq] = useState<string | number>(60);

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
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white rounded-[40px] p-10 shadow-sm border border-gray-100">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Ingeniería de Sistemas de Potencia</span>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">Análisis de Fasores RLC</h2>
              </div>
            </div>
            <p className="text-gray-500 text-lg leading-relaxed">
              Herramienta profesional para el cálculo y visualización de diagramas fasoriales en circuitos de corriente alterna. 
              Analice impedancias, corrientes y potencias con precisión vectorial.
            </p>
          </div>
          
          <div className="flex bg-gray-50 p-2 rounded-[24px] border border-gray-100 shadow-inner">
            <button 
              onClick={() => setType('serie')}
              className={cn(
                "px-8 py-3 rounded-[18px] text-sm font-bold transition-all flex items-center gap-2",
                type === 'serie' 
                  ? "bg-white text-indigo-600 shadow-lg shadow-gray-200/50 border border-gray-100" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Layers className="w-4 h-4" />
              Circuito Serie
            </button>
            <button 
              onClick={() => setType('paralelo')}
              className={cn(
                "px-8 py-3 rounded-[18px] text-sm font-bold transition-all flex items-center gap-2",
                type === 'paralelo' 
                  ? "bg-white text-indigo-600 shadow-lg shadow-gray-200/50 border border-gray-100" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Circuito Paralelo
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls & Summary */}
        <div className="lg:col-span-4 space-y-8">
          {/* Parameters Card */}
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">Parámetros</h3>
              </div>
              <button className="text-gray-300 hover:text-indigo-500 transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <ModernInput label="Resistencia (R)" value={r} onChange={setR} unit="Ω" icon="R" />
              <ModernInput label="Reactancia Inductiva (XL)" value={xl} onChange={setXl} unit="Ω" icon="L" />
              <ModernInput label="Reactancia Capacitiva (XC)" value={xc} onChange={setXc} unit="Ω" icon="C" />
              <ModernInput label="Voltaje de Fuente (V)" value={vMag} onChange={setVMag} unit="V" icon="V" />
              <ModernInput label="Frecuencia (f)" value={freq} onChange={setFreq} unit="Hz" icon="f" />
            </div>

            <div className="mt-10 p-5 bg-indigo-50/30 rounded-[24px] border border-indigo-100/50">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                <p className="text-[11px] text-indigo-700/80 leading-relaxed font-medium">
                  Los cálculos asumen un voltaje de referencia con ángulo 0°. 
                  Las reactancias se procesan directamente para determinar la impedancia compleja del sistema.
                </p>
              </div>
            </div>
          </section>

          {/* Results Card */}
          <section className="bg-gray-900 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-100 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-8">Resumen de Resultados</h3>
            <div className="space-y-5">
              <ResultRow label="Impedancia (Z)" value={hasValues ? `${results.Z.mag.toFixed(2)} ∠ ${results.Z.ang.toFixed(2)}°` : '---'} unit="Ω" />
              <ResultRow label="Corriente (I)" value={hasValues ? `${results.I.mag.toFixed(2)} ∠ ${results.I.ang.toFixed(2)}°` : '---'} unit="A" />
              <ResultRow label="Potencia Activa (P)" value={hasValues ? results.P.toFixed(2) : '---'} unit="W" />
              <ResultRow label="Potencia Reactiva (Q)" value={hasValues ? results.Q.toFixed(2) : '---'} unit="var" />
              <ResultRow label="Factor de Potencia" value={hasValues ? results.pf.toFixed(3) : '---'} unit={results.phi > 0 ? 'Ind.' : 'Cap.'} />
            </div>
          </section>
        </div>

        {/* Right Column: Visualizations */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Phasor Diagram Card */}
            <VisualCard 
              title={type === 'serie' ? "Diagrama de Tensiones" : "Diagrama de Corrientes"}
              description={type === 'serie' ? "Vectores VR, VL, VC y Vt" : "Vectores IR, IL, IC e It"}
              icon={<CircleDot className="w-4 h-4" />}
            >
              {hasValues ? <PhasorDiagram results={results} /> : <EmptyVisualState />}
            </VisualCard>

            {/* Power Triangle Card */}
            <VisualCard 
              title="Triángulo de Potencias"
              description="Relación vectorial P, Q y S"
              icon={<Activity className="w-4 h-4" />}
            >
              {hasValues ? <PowerTriangle results={results} /> : <EmptyVisualState />}
            </VisualCard>
          </div>

          {/* Full System Card */}
          <VisualCard 
            title="Comparativa de Fasores del Sistema"
            description="Relación visual entre V, I y S (Escalas normalizadas)"
            icon={<RotateCcw className="w-4 h-4" />}
            className="md:col-span-2"
            contentClassName="min-h-[480px] lg:min-h-[520px]"
          >
            {hasValues ? <SystemPhasors results={results} /> : <EmptyVisualState />}
          </VisualCard>
        </div>
      </div>
    </div>
  );
}

function ModernInput({ label, value, onChange, unit, icon }: { label: string, value: string | number, onChange: (v: string | number) => void, unit: string, icon: string }) {
  return (
    <div className="group space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
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
    <div className="flex items-center justify-between group">
      <span className="text-xs text-gray-500 font-medium group-hover:text-gray-400 transition-colors">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-mono font-black text-white tracking-tight">{value}</span>
        <span className="text-[10px] font-black text-indigo-500 uppercase">{unit}</span>
      </div>
    </div>
  );
}

function VisualCard({ title, description, icon, children, className, contentClassName }: { title: string, description: string, icon: React.ReactNode, children: React.ReactNode, className?: string, contentClassName?: string }) {
  return (
    <div className={cn("bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col h-full group hover:shadow-xl hover:shadow-indigo-100/20 transition-all duration-500", className)}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-black text-gray-900 tracking-tight">{title}</h3>
          <p className="text-[11px] text-gray-400 font-medium mt-1">{description}</p>
        </div>
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
          {icon}
        </div>
      </div>
      <div className={cn("flex-1 flex items-center justify-center min-h-[320px] bg-gray-50/30 rounded-[24px] border border-gray-50 p-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

function EmptyVisualState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12">
      <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center mb-6 shadow-sm border border-gray-100">
        <Activity className="w-8 h-8 text-gray-200" />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Esperando Datos</p>
      <p className="text-xs text-gray-400 max-w-[180px] leading-relaxed">Complete los parámetros del sistema para generar la visualización vectorial</p>
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
        { label: 'Vt', val: results.V, color: '#f59e0b' }
      ]
    : [
        { label: 'IR', val: results.IR, color: '#6366f1' },
        { label: 'IL', val: results.IL, color: '#ef4444' },
        { label: 'IC', val: results.IC, color: '#10b981' },
        { label: 'It', val: results.I, color: '#f59e0b' }
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

  return <VectorSpace vectors={rotatedVectors} />;
}

function PowerTriangle({ results }: { results: any }) {
  const { P, Q, S_abs, phi } = results;
  const maxVal = Math.max(Math.abs(P), Math.abs(Q), Math.abs(S_abs), 1);
  const scale = 120 / maxVal;

  const pX = P * scale;
  const qY = -Q * scale; 

  const arcRadius = Math.min(Math.abs(pX), Math.abs(qY)) * 0.4;
  const safeArcRadius = Math.max(20, Math.min(arcRadius, 50));
  
  const margin = 60;
  const minX = Math.min(0, pX) - margin;
  const maxX = Math.max(0, pX) + margin;
  const minY = Math.min(0, qY) - margin;
  const maxY = Math.max(0, qY) + margin;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <svg 
      viewBox={`${minX} ${minY} ${width} ${height}`} 
      className="w-full h-full max-w-[350px]"
    >
      <defs>
        <marker id="arrowhead-v" markerWidth="4" markerHeight="3" refX="4" refY="1.5" orient="auto">
          <polygon points="0 0, 4 1.5, 0 3" fill="currentColor" />
        </marker>
        <linearGradient id="grad-p" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      
      {/* Grid */}
      <line x1={minX} y1="0" x2={maxX} y2="0" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="0" y1={minY} x2="0" y2={maxY} stroke="#f1f5f9" strokeWidth="1" />

      {/* P Vector */}
      <line x1="0" y1="0" x2={pX} y2="0" stroke="url(#grad-p)" strokeWidth="3" markerEnd="url(#arrowhead-v)" className="text-indigo-500" />
      <text 
        x={pX / 2} 
        y={Q >= 0 ? 18 : -12} 
        fontSize="10" 
        fontWeight="900" 
        textAnchor="middle" 
        fill="#6366f1"
        className="font-mono"
      >
        P: {P.toFixed(1)}W
      </text>

      {/* Q Vector */}
      <line x1={pX} y1="0" x2={pX} y2={qY} stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowhead-v)" className="text-red-500" />
      <text 
        x={pX + (pX >= 0 ? 12 : -12)} 
        y={qY / 2} 
        fontSize="10" 
        fontWeight="900" 
        textAnchor={pX >= 0 ? "start" : "end"} 
        dominantBaseline="middle"
        fill="#ef4444" 
        className="font-mono"
      >
        Q: {Math.abs(Q).toFixed(1)}var
      </text>

      {/* S Vector */}
      <line x1="0" y1="0" x2={pX} y2={qY} stroke="#10b981" strokeWidth="3" markerEnd="url(#arrowhead-v)" className="text-emerald-500" />
      <g transform={`translate(${pX / 2}, ${qY / 2}) rotate(${-phi}, 0, 0)`}>
        <text 
          y={Q >= 0 ? -12 : 18} 
          fontSize="10" 
          fontWeight="900" 
          textAnchor="middle" 
          fill="#10b981"
          className="font-mono"
        >
          S: {S_abs.toFixed(1)}VA
        </text>
      </g>

      {/* Angle Arc */}
      <path 
        d={`M ${safeArcRadius} 0 A ${safeArcRadius} ${safeArcRadius} 0 0 ${Q > 0 ? 0 : 1} ${safeArcRadius * Math.cos(phi * Math.PI / 180)} ${-safeArcRadius * Math.sin(phi * Math.PI / 180)}`} 
        fill="rgba(99, 102, 241, 0.05)" 
        stroke="#6366f1" 
        strokeWidth="1.5" 
        strokeDasharray="4 2"
      />
      
      <text 
        x={safeArcRadius + 10} 
        y={-safeArcRadius * Math.sin((phi/2) * Math.PI / 180)} 
        fontSize="10" 
        fontWeight="900" 
        fill="#6366f1" 
        textAnchor="start"
        dominantBaseline="middle"
        className="font-mono"
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

  return <VectorSpace vectors={vectors} showOriginalLabels />;
}

function VectorSpace({ vectors, showOriginalLabels = false }: { vectors: any[], showOriginalLabels?: boolean }) {
  const maxMag = Math.max(...vectors.map(v => v.val.mag), 1);
  const scale = 110 / maxMag; 

  return (
    <svg viewBox="-220 -220 440 440" className="w-full h-full max-w-full max-h-[500px]">
      <defs>
        <marker id="arrowhead-v" markerWidth="4" markerHeight="3" refX="4" refY="1.5" orient="auto">
          <polygon points="0 0, 4 1.5, 0 3" fill="currentColor" />
        </marker>
      </defs>
      
      {/* Polar Grid */}
      <circle cx="0" cy="0" r="120" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      <circle cx="0" cy="0" r="80" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      <circle cx="0" cy="0" r="40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      
      {/* Axes */}
      <line x1="-150" y1="0" x2="150" y2="0" stroke="#f1f5f9" strokeWidth="2" />
      <line x1="0" y1="-150" x2="0" y2="150" stroke="#f1f5f9" strokeWidth="2" />

      {vectors.map((v, i) => {
        const x = v.val.real * scale;
        const y = -v.val.imag * scale; 
        
        const mag = Math.sqrt(x*x + y*y);
        const labelDist = mag + 35; 
        const lx = (x / (mag || 1)) * labelDist;
        const ly = (y / (mag || 1)) * labelDist;
        
        return (
          <g key={i}>
            <line 
              x1="0" y1="0" x2={x} y2={y} 
              stroke={v.color} 
              strokeWidth="3" 
              markerEnd="url(#arrowhead-v)" 
              style={{ color: v.color }}
            />
            <g transform={`translate(${lx}, ${ly})`}>
              <rect 
                x="-45" y="-10" width="90" height="20" 
                rx="6" fill="white" 
                stroke={v.color} strokeOpacity="0.2" 
                className="shadow-sm"
              />
              <text 
                fontSize="9" 
                fontWeight="900" 
                textAnchor="middle" 
                fill={v.color}
                dominantBaseline="middle"
                className="font-mono"
              >
                {v.label}: {showOriginalLabels ? v.original.mag.toFixed(1) : v.val.mag.toFixed(1)}{showOriginalLabels ? v.unit : ''} ∠{v.val.ang.toFixed(1)}°
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
