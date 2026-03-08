import React, { useState, useMemo } from 'react';
import { 
  Zap, 
  Activity, 
  Settings2, 
  Info, 
  ArrowRight,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
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

const fromPhasor = (mag: number, angDeg: number): { real: number; imag: number } => {
  const angRad = (angDeg * Math.PI) / 180;
  return {
    real: mag * Math.cos(angRad),
    imag: mag * Math.sin(angRad),
  };
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
      // Z = R + j(XL - XC)
      const zReal = numR;
      const zImag = numXl - numXc;
      const zMag = Math.sqrt(zReal * zReal + zImag * zImag);
      const zAng = Math.atan2(zImag, zReal);
      
      // I = V / Z
      const iMag = numVMag / (zMag || 1e-9);
      const iAng = -zAng;
      const iReal = iMag * Math.cos(iAng);
      const iImag = iMag * Math.sin(iAng);
      
      // VR = I * R
      const vrReal = iReal * numR;
      const vrImag = iImag * numR;
      
      // VL = I * jXL
      const vlReal = -iImag * numXl;
      const vlImag = iReal * numXl;
      
      // VC = I * (-jXC)
      const vcReal = iImag * numXc;
      const vcImag = -iReal * numXc;
      
      // S = V * conj(I)
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
      // Parallel
      const yr = 1 / (numR || 1e-9);
      const yl = -1 / (numXl || 1e-9);
      const yc = 1 / (numXc || 1e-9);
      
      const yReal = yr;
      const yImag = yl + yc;
      const yMag = Math.sqrt(yReal * yReal + yImag * yImag);
      const yAng = Math.atan2(yImag, yReal);
      
      // Z = 1/Y
      const zMag = 1 / (yMag || 1e-9);
      const zAng = -yAng;
      
      // I_tot = V * Y
      const iReal = numVMag * yReal;
      const iImag = numVMag * yImag;
      
      // IR = V / R
      const irReal = numVMag / (numR || 1e-9);
      const irImag = 0;
      
      // IL = V / jXL
      const ilReal = 0;
      const ilImag = -numVMag / (numXl || 1e-9);
      
      // IC = V / -jXC
      const icReal = 0;
      const icImag = numVMag / (numXc || 1e-9);
      
      // S = V * conj(I)
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

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Ingeniería Eléctrica</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Cálculos de Diagramas Fasoriales</h2>
          <p className="text-gray-500 mt-2 max-w-2xl">
            Análisis avanzado de circuitos RLC en serie y paralelo. Visualización de fasores de tensión, corriente y triángulos de potencia con precisión vectorial.
          </p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setType('serie')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              type === 'serie' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Circuito Serie
          </button>
          <button 
            onClick={() => setType('paralelo')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              type === 'paralelo' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            Circuito Paralelo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Settings2 className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-gray-900">Parámetros del Sistema</h3>
            </div>
            
            <div className="space-y-5">
              <InputGroup label="Resistencia (R)" value={r} onChange={setR} unit="Ω" />
              <InputGroup label="Reactancia Inductiva (XL)" value={xl} onChange={setXl} unit="Ω" />
              <InputGroup label="Reactancia Capacitiva (XC)" value={xc} onChange={setXc} unit="Ω" />
              <InputGroup label="Voltaje de Fuente (V)" value={vMag} onChange={setVMag} unit="V" />
              <InputGroup label="Frecuencia (f)" value={freq} onChange={setFreq} unit="Hz" />
            </div>

            <div className="mt-8 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Los cálculos asumen un voltaje de referencia con ángulo 0°. 
                  La reactancia inductiva (XL) y capacitiva (XC) se utilizan directamente para determinar la impedancia compleja.
                </p>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl shadow-gray-200">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Resultados Clave</h3>
            <div className="space-y-6">
              <ResultItem label="Impedancia Total (Z)" value={`${results.Z.mag.toFixed(2)} ∠ ${results.Z.ang.toFixed(2)}° Ω`} />
              <ResultItem label="Corriente Total (I)" value={`${results.I.mag.toFixed(2)} ∠ ${results.I.ang.toFixed(2)}° A`} />
              <ResultItem label="Potencia Activa (P)" value={`${results.P.toFixed(2)} W`} />
              <ResultItem label="Potencia Reactiva (Q)" value={`${results.Q.toFixed(2)} var`} />
              <ResultItem label="Factor de Potencia (FP)" value={results.pf.toFixed(3)} />
            </div>
          </div>
        </div>

        {/* Visualizations Panel */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Phasor Diagram */}
            <VisualizationCard 
              title={type === 'serie' ? "Diagrama de Tensiones" : "Diagrama de Corrientes"}
              subtitle={type === 'serie' ? "Vectores VR, VL, VC y Vt" : "Vectores IR, IL, IC e It"}
            >
              <PhasorDiagram results={results} />
            </VisualizationCard>

            {/* Power Triangle */}
            <VisualizationCard 
              title="Triángulo de Potencias"
              subtitle="Relación entre P, Q y S"
            >
              <PowerTriangle results={results} />
            </VisualizationCard>
          </div>

          {/* Full System Phasor (V, I, S) */}
          <VisualizationCard 
            title="Fasores del Sistema (V, I, S)"
            subtitle="Escala relativa para comparación visual"
          >
            <SystemPhasors results={results} />
          </VisualizationCard>
        </div>
      </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, unit }: { label: string, value: string | number, onChange: (v: string | number) => void, unit: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-tight">{label}</label>
        <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{unit}</span>
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
        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
      />
    </div>
  );
}

function ResultItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-end border-b border-white/10 pb-3">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-sm font-mono font-bold text-indigo-400">{value}</span>
    </div>
  );
}

function VisualizationCard({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-[11px] text-gray-400 font-medium">{subtitle}</p>
      </div>
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        {children}
      </div>
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

  return <VectorSpace vectors={vectors} />;
}

function PowerTriangle({ results }: { results: any }) {
  const { P, Q, S_abs } = results;
  const maxVal = Math.max(Math.abs(P), Math.abs(Q), Math.abs(S_abs), 1);
  const scale = 120 / maxVal;

  const pX = P * scale;
  const qY = -Q * scale; // SVG y is down

  return (
    <svg viewBox="-20 -150 180 180" className="w-full h-full max-w-[300px]">
      <defs>
        <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="currentColor" />
        </marker>
      </defs>
      
      {/* Grid */}
      <line x1="-20" y1="0" x2="160" y2="0" stroke="#f0f0f0" strokeWidth="1" />
      <line x1="0" y1="30" x2="0" y2="-150" stroke="#f0f0f0" strokeWidth="1" />

      {/* P Vector */}
      <line x1="0" y1="0" x2={pX} y2="0" stroke="#6366f1" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-indigo-500" />
      <text x={pX / 2} y="15" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#6366f1">P = {P.toFixed(1)}W</text>

      {/* Q Vector */}
      <line x1={pX} y1="0" x2={pX} y2={qY} stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-red-500" />
      <text x={pX + 8} y={qY / 2} fontSize="8" fontWeight="bold" textAnchor="start" fill="#ef4444" transform={`rotate(90, ${pX + 8}, ${qY / 2})`}>Q = {Math.abs(Q).toFixed(1)}var</text>

      {/* S Vector */}
      <line x1="0" y1="0" x2={pX} y2={qY} stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowhead)" className="text-emerald-500" />
      <text x={pX / 2 - 5} y={qY / 2 - 5} fontSize="8" fontWeight="bold" textAnchor="middle" fill="#10b981" transform={`rotate(${results.phi}, ${pX / 2 - 5}, ${qY / 2 - 5})`}>S = {S_abs.toFixed(1)}VA</text>

      {/* Angle Arc */}
      <path 
        d={`M 25 0 A 25 25 0 0 ${Q > 0 ? 0 : 1} ${25 * Math.cos(results.phi * Math.PI / 180)} ${-25 * Math.sin(results.phi * Math.PI / 180)}`} 
        fill="none" 
        stroke="#8b5cf6" 
        strokeWidth="1" 
        strokeDasharray="2 2"
      />
      <text x="30" y="-5" fontSize="7" fontWeight="bold" fill="#8b5cf6">φ={results.phi.toFixed(1)}°</text>
    </svg>
  );
}

function SystemPhasors({ results }: { results: any }) {
  const { V, I, S } = results;
  
  // Relative scaling
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
  const scale = 120 / maxMag;

  return (
    <svg viewBox="-150 -150 300 300" className="w-full h-full max-w-[350px]">
      <defs>
        <marker id="arrowhead-v" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill="currentColor" />
        </marker>
      </defs>
      
      {/* Grid Lines */}
      <circle cx="0" cy="0" r="120" fill="none" stroke="#f8fafc" strokeWidth="1" />
      <circle cx="0" cy="0" r="80" fill="none" stroke="#f8fafc" strokeWidth="1" />
      <circle cx="0" cy="0" r="40" fill="none" stroke="#f8fafc" strokeWidth="1" />
      <line x1="-140" y1="0" x2="140" y2="0" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="0" y1="-140" x2="0" y2="140" stroke="#f1f5f9" strokeWidth="1" />

      {vectors.map((v, i) => {
        const x = v.val.real * scale;
        const y = -v.val.imag * scale; // SVG y is down
        
        // Calculate label position
        const mag = Math.sqrt(x*x + y*y);
        const labelDist = mag + 15;
        const lx = (x / (mag || 1)) * labelDist;
        const ly = (y / (mag || 1)) * labelDist;
        
        return (
          <g key={i}>
            <line 
              x1="0" y1="0" x2={x} y2={y} 
              stroke={v.color} 
              strokeWidth="2" 
              markerEnd="url(#arrowhead-v)" 
              style={{ color: v.color }}
            />
            <g transform={`translate(${lx}, ${ly})`}>
              <text 
                fontSize="8" 
                fontWeight="black" 
                textAnchor="middle" 
                fill={v.color}
                dominantBaseline="middle"
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
