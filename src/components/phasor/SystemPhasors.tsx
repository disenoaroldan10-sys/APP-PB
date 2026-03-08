import React from 'react';
import { VectorSpace } from './VectorSpace';

interface SystemPhasorsProps {
  results: any;
}

export const SystemPhasors: React.FC<SystemPhasorsProps> = ({ results }) => {
  const vectors = [
    { label: 'V', val: results.V, original: results.V, unit: 'V', color: '#6366f1' },
    { label: 'I', val: results.I, original: results.I, unit: 'A', color: '#ef4444' },
    { label: 'S', val: { mag: results.S_abs, ang: results.phi, real: results.P, imag: results.Q }, original: { mag: results.S_abs, ang: results.phi }, unit: 'VA', color: '#10b981' }
  ];

  // Normalize for visualization
  const maxMag = Math.max(...vectors.map(v => v.val.mag), 1);
  const normalizedVectors = vectors.map(v => ({
    ...v,
    val: {
      ...v.val,
      mag: (v.val.mag / maxMag) * 100,
      real: (v.val.real / maxMag) * 100,
      imag: (v.val.imag / maxMag) * 100
    }
  }));

  return <VectorSpace vectors={normalizedVectors} showOriginalLabels={true} />;
};
