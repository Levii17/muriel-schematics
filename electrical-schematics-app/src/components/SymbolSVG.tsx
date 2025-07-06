import React from 'react';

interface SymbolSVGProps {
  paths?: { d: string; stroke?: string; strokeWidth?: number; fill?: string }[];
  viewBox?: string;
  size?: number;
}

const SymbolSVG: React.FC<SymbolSVGProps> = ({ 
  paths, 
  viewBox = "0 0 24 24",
  size = 48 
}) => (
  <svg 
    width={size} 
    height={size} 
    viewBox={viewBox} 
    style={{ display: 'block', margin: '0 auto' }}
  >
    {paths && paths.length > 0 ? (
      paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke || "#222"}
          strokeWidth={p.strokeWidth ?? 1.5}
          fill={p.fill || "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))
    ) : (
      <path d="M4 4 L20 20 M20 4 L4 20" stroke="red" strokeWidth={2} />
    )}
  </svg>
);

export default SymbolSVG; 