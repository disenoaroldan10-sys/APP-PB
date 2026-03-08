import React from 'react';

interface PowerTriangleProps {
  results: any;
}

export const PowerTriangle: React.FC<PowerTriangleProps> = ({ results }) => {
  const { P, Q, S_abs, phi } = results;
  const maxVal = Math.max(Math.abs(P), Math.abs(Q), Math.abs(S_abs), 1);
  const scale = 120 / maxVal;

  const pX = P * scale;
  const qY = -Q * scale; // SVG y is up for negative values, down for positive

  // Dynamic Arc calculation
  const arcRadius = Math.min(Math.abs(pX), Math.abs(qY)) * 0.4;
  const safeArcRadius = Math.max(20, Math.min(arcRadius, 50));
  
  // Dynamic ViewBox calculation
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
      </defs>
      
      {/* Grid */}
      <line x1={minX} y1="0" x2={maxX} y2="0" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="0" y1={minY} x2="0" y2={maxY} stroke="#f1f5f9" strokeWidth="1" />

      {/* P Vector (Horizontal) */}
      <line x1="0" y1="0" x2={pX} y2="0" stroke="#6366f1" strokeWidth="1.5" markerEnd="url(#arrowhead-v)" className="text-indigo-500" />
      <text 
        x={pX / 2} 
        y={Q >= 0 ? 15 : -10} 
        fontSize="8" 
        fontWeight="black" 
        textAnchor="middle" 
        fill="#6366f1"
      >
        P = {P.toFixed(1)}W
      </text>

      {/* Q Vector (Vertical) - Upright text */}
      <line x1={pX} y1="0" x2={pX} y2={qY} stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrowhead-v)" className="text-red-500" />
      <text 
        x={pX + (pX >= 0 ? 8 : -8)} 
        y={qY / 2} 
        fontSize="8" 
        fontWeight="black" 
        textAnchor={pX >= 0 ? "start" : "end"} 
        dominantBaseline="middle"
        fill="#ef4444" 
      >
        Q = {Math.abs(Q).toFixed(1)}var
      </text>

      {/* S Vector (Hypotenuse) */}
      <line x1="0" y1="0" x2={pX} y2={qY} stroke="#10b981" strokeWidth="1.5" markerEnd="url(#arrowhead-v)" className="text-emerald-500" />
      <g transform={`translate(${pX / 2}, ${qY / 2}) rotate(${-phi}, 0, 0)`}>
        <text 
          y={Q >= 0 ? -10 : 15} 
          fontSize="8" 
          fontWeight="black" 
          textAnchor="middle" 
          fill="#10b981"
        >
          S = {S_abs.toFixed(1)}VA
        </text>
      </g>

      {/* Angle Arc - Dynamic Radius */}
      <path 
        d={`M ${safeArcRadius} 0 A ${safeArcRadius} ${safeArcRadius} 0 0 ${Q > 0 ? 0 : 1} ${safeArcRadius * Math.cos(phi * Math.PI / 180)} ${-safeArcRadius * Math.sin(phi * Math.PI / 180)}`} 
        fill="rgba(139, 92, 246, 0.1)" 
        stroke="#8b5cf6" 
        strokeWidth="1" 
        strokeDasharray="2 2"
      />
      
      {/* Angle Text - Inside or Outside the arc area */}
      {(() => {
        const isSmallAngle = Math.abs(phi) < 15;
        const textRadius = isSmallAngle ? safeArcRadius + 15 : safeArcRadius * 0.6;
        const tx = textRadius * Math.cos((phi/2) * Math.PI / 180);
        const ty = -textRadius * Math.sin((phi/2) * Math.PI / 180);
        
        return (
          <text 
            x={tx} 
            y={ty} 
            fontSize={isSmallAngle ? 8 : Math.max(5, Math.min(7, safeArcRadius / 6))} 
            fontWeight="black" 
            fill="#8b5cf6" 
            textAnchor={isSmallAngle ? (pX >= 0 ? "start" : "end") : "middle"}
            dominantBaseline="middle"
          >
            {phi.toFixed(1)}°
          </text>
        );
      })()}
    </svg>
  );
};
