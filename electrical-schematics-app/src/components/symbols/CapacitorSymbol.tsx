import React from 'react';

interface CapacitorSymbolProps {
  x: number;
  y: number;
}

const CapacitorSymbol: React.FC<CapacitorSymbolProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="-10" y1="-15" x2="-10" y2="15" stroke="black" />
      <line x1="10" y1="-15" x2="10" y2="15" stroke="black" />
      <text x="0" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="10">
        C
      </text>
    </g>
  );
};

export default CapacitorSymbol;
