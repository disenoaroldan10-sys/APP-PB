import React from 'react';
import { VectorSpace } from './VectorSpace';

interface PhasorDiagramProps {
  results: any;
}

export const PhasorDiagram: React.FC<PhasorDiagramProps> = ({ results }) => {
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

  // Rotate vectors so VR or IR is at 0 degrees
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
};
