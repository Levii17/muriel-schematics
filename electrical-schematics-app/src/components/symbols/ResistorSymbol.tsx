import React from 'react';

interface ResistorSymbolProps {
  x: number;
  y: number;
}

const ResistorSymbol: React.FC<ResistorSymbolProps> = ({ x, y }) => {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="-20" y="-5" width="40" height="10" stroke="black" fill="white" />
      <text x="0" y="3" textAnchor="middle" dominantBaseline="middle" fontSize="10">
        R
      </text>
    </g>
  );
};

export default ResistorSymbol;
