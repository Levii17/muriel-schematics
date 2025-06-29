import React from 'react';

interface InductorSymbolProps {
  x: number;
  y: number;
}

const InductorSymbol: React.FC<InductorSymbolProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <path d="M -20 0 Q -15 -10 -10 0 Q -5 10 0 0 Q 5 -10 10 0 Q 15 10 20 0" stroke="black" fill="transparent" />
      <text x="0" y="15" textAnchor="middle" dominantBaseline="middle" fontSize="10">
        L
      </text>
    </g>
  );
};

export default InductorSymbol;
