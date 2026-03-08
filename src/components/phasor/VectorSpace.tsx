import React from 'react';

interface VectorSpaceProps {
  vectors: any[];
  showOriginalLabels?: boolean;
}

export const VectorSpace: React.FC<VectorSpaceProps> = ({ vectors, showOriginalLabels = false }) => {
  const maxMag = Math.max(...vectors.map(v => v.val.mag), 1);
  const scale = 110 / maxMag; // Reduced scale slightly to fit labels better

  return (
    <svg viewBox="-160 -160 320 320" className="w-full h-full max-w-[320px] max-h-[320px]">
      <defs>
        <marker id="arrowhead-v" markerWidth="4" markerHeight="3" refX="4" refY="1.5" orient="auto">
          <polygon points="0 0, 4 1.5, 0 3" fill="currentColor" />
        </marker>
      </defs>
      
      {/* Grid Lines */}
      <circle cx="0" cy="0" r="120" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      <circle cx="0" cy="0" r="80" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      <circle cx="0" cy="0" r="40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="-140" y1="0" x2="140" y2="0" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="0" y1="-140" x2="0" y2="140" stroke="#f1f5f9" strokeWidth="1" />

      {vectors.map((v, i) => {
        const x = v.val.real * scale;
        const y = -v.val.imag * scale; // SVG y is down
        
        // Calculate label position to avoid overlap
        const mag = Math.sqrt(x*x + y*y);
        const labelDist = mag + 25; // Increased distance
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
                className="drop-shadow-sm"
              >
                {v.label}: {showOriginalLabels ? v.original.mag.toFixed(1) : v.val.mag.toFixed(1)}{showOriginalLabels ? v.unit : ''} ∠{v.val.ang.toFixed(1)}°
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};
