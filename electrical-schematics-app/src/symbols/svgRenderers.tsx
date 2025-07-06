import React from 'react';

// Custom SVG renderers for symbols with text
export const AmmeterSVG: React.FC<any> = (props) => (
  <svg width={props.size || 48} height={props.size || 48} viewBox="0 0 200 100">
    <line x1="20" y1="50" x2="65" y2="50" stroke="black" strokeWidth="2" />
    <path d="M100 50 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0" stroke="black" strokeWidth="2" fill="none" />
    <line x1="135" y1="50" x2="180" y2="50" stroke="black" strokeWidth="2" />
    <text x="100" y="65" textAnchor="middle" fontSize="32" fontFamily="Arial" fill="black">A</text>
  </svg>
);

export const VoltmeterSVG: React.FC<any> = (props) => (
  <svg width={props.size || 48} height={props.size || 48} viewBox="0 0 200 100">
    <line x1="20" y1="50" x2="65" y2="50" stroke="black" strokeWidth="2" />
    <path d="M100 50 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0" stroke="black" strokeWidth="2" fill="none" />
    <line x1="135" y1="50" x2="180" y2="50" stroke="black" strokeWidth="2" />
    <text x="100" y="65" textAnchor="middle" fontSize="32" fontFamily="Arial" fill="black">V</text>
  </svg>
);

export const WattmeterSVG: React.FC<any> = (props) => (
  <svg width={props.size || 48} height={props.size || 48} viewBox="0 0 200 200">
    <path d="M100 50 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0" stroke="black" strokeWidth="2" fill="none" />
    <line x1="20" y1="100" x2="60" y2="100" stroke="black" strokeWidth="2" />
    <line x1="140" y1="100" x2="180" y2="100" stroke="black" strokeWidth="2" />
    <line x1="100" y1="50" x2="100" y2="90" stroke="black" strokeWidth="2" />
    <line x1="100" y1="110" x2="100" y2="150" stroke="black" strokeWidth="2" />
    <line x1="85" y1="100" x2="115" y2="100" stroke="black" strokeWidth="2" />
    <text x="100" y="120" textAnchor="middle" fontSize="32" fontFamily="Arial" fill="black">W</text>
  </svg>
);

export const MotorSVG: React.FC<any> = (props) => (
  <svg width={props.size || 48} height={props.size || 48} viewBox="0 0 200 100">
    <line x1="20" y1="50" x2="60" y2="50" stroke="black" strokeWidth="2" />
    <line x1="140" y1="50" x2="180" y2="50" stroke="black" strokeWidth="2" />
    <ellipse cx="100" cy="50" rx="40" ry="40" stroke="black" strokeWidth="2" fill="none" />
    <text x="100" y="65" textAnchor="middle" fontSize="32" fontFamily="Arial" fill="black">M</text>
  </svg>
);

export const EnergyMeterSVG: React.FC<any> = (props) => (
  <svg width={props.size || 48} height={props.size || 48} viewBox="0 0 200 200">
    <rect x="40" y="40" width="120" height="120" stroke="#000" strokeWidth="2" fill="none" />
    <line x1="40" y1="80" x2="160" y2="80" stroke="#000" strokeWidth="2" />
    <text x="100" y="130" textAnchor="middle" fontSize="28" fontFamily="Arial" fill="black">kWh</text>
  </svg>
); 