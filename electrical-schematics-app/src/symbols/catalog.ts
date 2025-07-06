// Central catalog of SANS electrical symbols
import { SymbolType, ConnectionPoint } from '../types';
import React from 'react';
import { AmmeterSVG, VoltmeterSVG, WattmeterSVG, MotorSVG, EnergyMeterSVG } from './svgRenderers';

export interface SymbolCatalogEntry {
  type: SymbolType;
  name: string;
  category: string;
  viewBox?: string;
  paths?: { d: string; stroke?: string; strokeWidth?: number; fill?: string }[];
  svgPath?: string;
  renderer?: React.FC<any>;
  defaultProperties: Record<string, any>;
  defaultConnectionPoints: Omit<ConnectionPoint, 'connected' | 'connectionId'>[];
  // New fields for better appearance control
  displaySize?: { width: number; height: number };
  strokeWidth?: number;
  connectionPointRadius?: number;
  selectionStrokeWidth?: number;
}

export const symbolCatalog: SymbolCatalogEntry[] = [
  // Power
  {
    type: SymbolType.PHASE_L1,
    name: 'Phase 1 (L1)',
    category: 'Power',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'red', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'L1' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.PHASE_L2,
    name: 'Phase 2 (L2)',
    category: 'Power',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'yellow', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'L2' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.PHASE_L3,
    name: 'Phase 3 (L3)',
    category: 'Power',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'blue', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'L3' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.PHASE_NEUTRAL,
    name: 'Neutral (N)',
    category: 'Power',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'N' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.AC,
    name: 'Alternating Current (AC)',
    category: 'Power',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 Q8 4 12 12 Q16 20 20 12', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'AC' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // Wiring
  {
    type: SymbolType.CONDUCTOR,
    name: 'Conductor (connection)',
    category: 'Wiring',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 4 V20', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M12 12 H12', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M12 12', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'cp2', position: { x: 10, y: 20 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.CONDUCTOR_CROSS_CONNECTED,
    name: 'Conductors Crossing (connected)',
    category: 'Wiring',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M12 4 V20', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M12 12', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' },
      { id: 'cp3', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'cp4', position: { x: 10, y: 20 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.CONDUCTOR_CROSS_NOT_CONNECTED,
    name: 'Conductors Crossing (not connected)',
    category: 'Wiring',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M12 4 V20', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' },
      { id: 'cp3', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'cp4', position: { x: 10, y: 20 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.CIRCUIT_MAIN,
    name: 'Circuit (main)',
    category: 'Wiring',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.CIRCUIT_CONTROL,
    name: 'Circuit (control)',
    category: 'Wiring',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H20', stroke: 'gray', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 10 }, type: 'output' }
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.CIRCUIT_BREAKER_SINGLE_POLE,
    name: 'Circuit Breaker (single pole)',
    category: 'Protection',
    viewBox: '0 0 200 300',
    paths: [
      { d: 'M100 20 V80', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M60 80 H140 V220 H60 Z', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M100 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: '#000' },
      { d: 'M100 180 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: '#000' },
      { d: 'M125 119 L100 180', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M100 220 V280', stroke: '#000', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'bottom', position: { x: 10, y: 40 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 40 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.CIRCUIT_BREAKER_DOUBLE_POLE,
    name: 'Circuit Breaker (double pole)',
    category: 'Protection',
    viewBox: '0 0 200 200',
    paths: [
      { d: 'M50 60 H150 V140 H50 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 20 V74', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M125 20 V74', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 126 V180', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M125 126 V180', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M125 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M125 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 114 L95.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M125 114 L145.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M85.3 96 L135.3 96', stroke: 'black', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left_top', position: { x: 75, y: 20 }, type: 'input' },
      { id: 'right_top', position: { x: 125, y: 20 }, type: 'input' },
      { id: 'left_bottom', position: { x: 75, y: 180 }, type: 'output' },
      { id: 'right_bottom', position: { x: 125, y: 180 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CIRCUIT_BREAKER_TRIPLE_POLE,
    name: 'Circuit Breaker (triple pole)',
    category: 'Protection',
    viewBox: '0 0 300 200',
    paths: [
      { d: 'M30 60 H270 V140 H30 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 20 V74', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M75 126 V180', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M150 20 V74', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M150 126 V180', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M225 20 V74', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M225 126 V180', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M75 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M150 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M225 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M150 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M225 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 114 L95.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M150 114 L170.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M225 114 L245.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M85.3 96 L160.3 96', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M160.3 96 L235.3 96', stroke: 'black', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left_top', position: { x: 75, y: 20 }, type: 'input' },
      { id: 'middle_top', position: { x: 150, y: 20 }, type: 'input' },
      { id: 'right_top', position: { x: 225, y: 20 }, type: 'input' },
      { id: 'left_bottom', position: { x: 75, y: 180 }, type: 'output' },
      { id: 'middle_bottom', position: { x: 150, y: 180 }, type: 'output' },
      { id: 'right_bottom', position: { x: 225, y: 180 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.ISOLATOR_DOUBLE_POLE,
    name: 'Isolator (double pole)',
    category: 'Protection',
    viewBox: '0 0 200 200',
    paths: [
      { d: 'M75 20 V74', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M125 20 V74', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 126 V180', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M125 126 V180', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M125 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M125 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 114 L95.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M125 114 L145.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M85.3 96 L135.3 96', stroke: 'black', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left_top', position: { x: 75, y: 20 }, type: 'input' },
      { id: 'right_top', position: { x: 125, y: 20 }, type: 'input' },
      { id: 'left_bottom', position: { x: 75, y: 180 }, type: 'output' },
      { id: 'right_bottom', position: { x: 125, y: 180 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.ISOLATOR_TRIPLE_POLE,
    name: 'Isolator (triple pole)',
    category: 'Protection',
    viewBox: '0 0 300 200',
    paths: [
      { d: 'M75 20 V74', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M75 126 V180', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M150 20 V74', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M150 126 V180', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M225 20 V74', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M225 126 V180', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M75 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M150 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M225 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M150 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M225 120 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M75 114 L95.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M150 114 L170.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M225 114 L245.6 78', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M85.3 96 L160.3 96', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M160.3 96 L235.3 96', stroke: 'black', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left_top', position: { x: 75, y: 20 }, type: 'input' },
      { id: 'middle_top', position: { x: 150, y: 20 }, type: 'input' },
      { id: 'right_top', position: { x: 225, y: 20 }, type: 'input' },
      { id: 'left_bottom', position: { x: 75, y: 180 }, type: 'output' },
      { id: 'middle_bottom', position: { x: 150, y: 180 }, type: 'output' },
      { id: 'right_bottom', position: { x: 225, y: 180 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.PUSH_BUTTON_START,
    name: 'Push button (start)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 200',
    paths: [
      { d: 'M80 70 V85', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M80 70 H120', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M120 70 V85', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M100 70 V110', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 110 H130', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M20 140 H80', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M120 140 H180', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M80 140 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M120 140 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 140 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 140 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.PUSH_BUTTON_STOP,
    name: 'Push button (stop)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 200',
    paths: [
      { d: 'M80 69 V85', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M80 70 H120', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M120 69 V85', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M100 70 V130', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 130 H130', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M20 125 H80', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M120 125 H180', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M80 125 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M120 125 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 125 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 125 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.PUSH_BUTTON_EMERGENCY_STOP,
    name: 'Push button (emergency stop)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 200',
    paths: [
      { d: 'M80 69 V85', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M80 70 H120', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M120 69 V85', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M100 70 V130', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 130 H130', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M20 125 H80', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M120 125 H180', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M80 125 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M120 125 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 125 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 125 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.COIL_CONTACTOR,
    name: 'Coil (contactor)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 260',
    paths: [
      { d: 'M100 50 V100', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M70 100 H130 V180 H70 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M71 180 L130 100', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M100 180 V220', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M100 50 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M100 220 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 100, y: 50 }, type: 'input' },
      { id: 'bottom', position: { x: 100, y: 220 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CONTACTOR_TRIPLE,
    name: 'Contactor (triple)',
    category: 'Switches & Relays',
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M50 20 V110', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M50 110 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M70 100 V170', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M50 160 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M50 160 V240', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M130 20 V110', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M130 110 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M150 100 V170', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M130 160 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M130 160 V240', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M210 20 V110', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M210 110 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M230 100 V170', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M210 160 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M210 160 V240', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M70 130 H280', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M250 130 H280', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M280 100 H340 V160 H280 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M280 160 L340 100', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M310 100 V60', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M310 160 V200', stroke: 'black', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: '1', position: { x: 50, y: 20 }, type: 'input' },
      { id: '2', position: { x: 50, y: 240 }, type: 'output' },
      { id: '3', position: { x: 130, y: 20 }, type: 'input' },
      { id: '4', position: { x: 130, y: 240 }, type: 'output' },
      { id: '5', position: { x: 210, y: 20 }, type: 'input' },
      { id: '6', position: { x: 210, y: 240 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.COIL_TIME_RELAY,
    name: 'Coil (time relay)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 260',
    paths: [
      { d: 'M100 50 V100', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M70 100 H130 V180 H70 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M71 180 L130 100', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M100 180 V220', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M100 50 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
      { d: 'M100 220 m-4,0 a4,4 0 1,0 8,0 a4,4 0 1,0 -8,0', fill: 'black' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 100, y: 50 }, type: 'input' },
      { id: 'bottom', position: { x: 100, y: 220 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CONTACT_CONTACTOR_NO,
    name: 'Contact of contactor (n/o - normally open)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 120',
    paths: [
      { d: 'M20 70 H70', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M130 70 H185', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M130 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M65 55 H135', stroke: 'black', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 70 }, type: 'input' },
      { id: 'right', position: { x: 185, y: 70 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CONTACT_CONTACTOR_NC,
    name: 'Contact of contactor (n/c - normally close)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 120',
    paths: [
      { d: 'M20 70 H70', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M130 70 H185', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M130 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M65 63 H135', stroke: 'black', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 70 }, type: 'input' },
      { id: 'right', position: { x: 185, y: 70 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CONTACT_TIME_RELAY_NO,
    name: 'Contact of time relay (n/o - normally open)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 120',
    paths: [
      { d: 'M20 70 H70', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M130 70 H185', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M130 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M65 55 H135', stroke: 'black', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 70 }, type: 'input' },
      { id: 'right', position: { x: 185, y: 70 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CONTACT_TIME_RELAY_NC,
    name: 'Contact of time relay (n/c - normally close)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 120',
    paths: [
      { d: 'M20 70 H70', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M130 70 H185', stroke: 'black', strokeWidth: 3, fill: 'none' },
      { d: 'M70 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M130 70 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: 'black' },
      { d: 'M65 63 H135', stroke: 'black', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 70 }, type: 'input' },
      { id: 'right', position: { x: 185, y: 70 }, type: 'output' },
    ],
  },

  // OVERLOAD RELAYS
    {
    type: SymbolType.OVERLOAD_RELAY_TRIPLE_POLE,
    name: 'Overload relay (triple pole)',
    category: 'Protection',
    viewBox: '0 0 250 200',
    paths: [
      { d: 'M80 25 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M125 25 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M170 25 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M80 175 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M125 175 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M170 175 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M60 50 H210 V150 H60 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M80 33 V50', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M125 33 V50', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M170 33 V50', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M80 150 V167', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M125 150 V167', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M170 150 V167', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M80 50 V80', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M80 80 H100', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 80 V120', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M80 120 H100', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M80 120 V150', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M125 50 V80', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M125 80 H145', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M145 80 V120', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M125 120 H145', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M125 120 V150', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M170 50 V80', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M170 80 H185', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M185 80 V120', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M170 120 H185', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M170 120 V150', stroke: 'blue', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top1', position: { x: 80, y: 25 }, type: 'input' },
      { id: 'top2', position: { x: 125, y: 25 }, type: 'input' },
      { id: 'top3', position: { x: 170, y: 25 }, type: 'input' },
      { id: 'bottom1', position: { x: 80, y: 175 }, type: 'output' },
      { id: 'bottom2', position: { x: 125, y: 175 }, type: 'output' },
      { id: 'bottom3', position: { x: 170, y: 175 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.OVERLOAD_RELAY,
    name: 'Overload relay',
    category: 'Protection',
    viewBox: '0 0 150 200',
    paths: [
      { d: 'M75 25 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M75 175 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0', fill: 'black' },
      { d: 'M45 50 H105 V150 H45 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 33 V50', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 150 V167', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 50 V80', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 80 H90', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M90 80 V120', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 120 H90', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M75 120 V150', stroke: 'black', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 75, y: 25 }, type: 'input' },
      { id: 'bottom', position: { x: 75, y: 175 }, type: 'output' },
    ],
  },

  // MOTORS
    {
    type: SymbolType.MOTOR_AC,
    name: 'Motor (A.C.)',
    category: 'Motors & Loads',
    viewBox: '0 0 200 100',
    renderer: MotorSVG,
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 50 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 50 }, type: 'output' },
    ],
    displaySize: { width: 80, height: 40 },
    strokeWidth: 2,
    connectionPointRadius: 6,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.MOTOR_THREE_PHASE_DOL,
    name: 'Motor Three-phase induction (direct on line)',
    category: 'Motors & Loads',
    viewBox: '0 0 200 250',
    paths: [
      { d: 'M60 34 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M100 34 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M140 34 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M60 38 V120', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 38 V120', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M140 38 V120', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M100 160 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M60 120 L75 130', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 120 V120', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M140 120 L125 130', stroke: 'blue', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'A', position: { x: 60, y: 34 }, type: 'input' },
      { id: 'B', position: { x: 100, y: 34 }, type: 'input' },
      { id: 'C', position: { x: 140, y: 34 }, type: 'input' },
    ],
  },
  {
    type: SymbolType.MOTOR_THREE_PHASE_STAR_DELTA,
    name: 'Motor Three-phase induction (star-delta)',
    category: 'Motors & Loads',
    viewBox: '0 0 250 300',
    paths: [
      { d: 'M80 43 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M125 43 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M170 43 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M78 256 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M125 257 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M172 256 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M125 150 m-45,0 a45,45 0 1,0 90,0 a45,45 0 1,0 -90,0', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M80 48 L95 115', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M125 48 V105', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M170 48 L155 115', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M95 185 L80 252', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M125 195 V252', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M155 185 L170 252', stroke: 'red', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'A1', position: { x: 80, y: 43 }, type: 'input' },
      { id: 'B1', position: { x: 125, y: 43 }, type: 'input' },
      { id: 'C1', position: { x: 170, y: 43 }, type: 'input' },
      { id: 'A2', position: { x: 78, y: 256 }, type: 'output' },
      { id: 'B2', position: { x: 125, y: 257 }, type: 'output' },
      { id: 'C2', position: { x: 172, y: 256 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.MOTOR_THREE_PHASE_SLIP_RING,
    name: 'Motor Three-phase induction (slip ring)',
    category: 'Motors & Loads',
    viewBox: '0 0 200 300',
    paths: [
      { d: 'M70 34 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M100 34 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M130 34 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M80 267 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M100 267 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M120 267 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: 'black' },
      { d: 'M70 38 V90', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 38 V90', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M130 38 V90', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M80 210 V262', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 210 V262', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M120 210 V262', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M100 150 m-50,0 a50,50 0 1,0 100,0 a50,50 0 1,0 -100,0', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M100 150 m-30,0 a30,30 0 1,0 60,0 a30,30 0 1,0 -60,0', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M70 90 L70 110', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 90 V100', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M130 90 L130 110', stroke: 'blue', strokeWidth: 2, fill: 'none' },
      { d: 'M80 173 V210', stroke: 'red', strokeWidth: 2, fill: 'none' },
      { d: 'M100 180 V210', stroke: 'yellow', strokeWidth: 2, fill: 'none' },
      { d: 'M120 173 V210', stroke: 'blue', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'A', position: { x: 70, y: 34 }, type: 'input' },
      { id: 'B', position: { x: 100, y: 34 }, type: 'input' },
      { id: 'C', position: { x: 130, y: 34 }, type: 'input' },
      { id: 'K', position: { x: 80, y: 267 }, type: 'output' },
      { id: 'L', position: { x: 100, y: 267 }, type: 'output' },
      { id: 'M', position: { x: 120, y: 267 }, type: 'output' },
    ],
  },

  // MEASUREMENT DEVICES
  {
    type: SymbolType.AMMETER,
    name: 'Ammeter',
    category: 'Meters & Indicators',
    viewBox: '0 0 200 100',
    renderer: AmmeterSVG,
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 50 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 50 }, type: 'output' },
    ],
    displaySize: { width: 200, height: 100 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.VOLTMETER,
    name: 'Voltmeter',
    category: 'Meters & Indicators',
    viewBox: '0 0 200 100',
    renderer: VoltmeterSVG,
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 50 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 50 }, type: 'output' },
    ],
    displaySize: { width: 200, height: 100 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
  {
    type: SymbolType.WATTMETER,
    name: 'Wattmeter',
    category: 'Meters & Indicators',
    viewBox: '0 0 200 200',
    renderer: WattmeterSVG,
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 20, y: 100 }, type: 'input' },
      { id: 'right', position: { x: 180, y: 100 }, type: 'output' },
    ],
    displaySize: { width: 200, height: 200 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // Add these to your catalog.ts file after the existing symbols

  // CONNECTIONS TO SUPPLY
  {
    type: SymbolType.CONNECTIONS_TO_SUPPLY,
    name: 'Connections to supply',
    category: 'Power',
    viewBox: '0 0 400 200',
    paths: [
      { d: 'M50 30 H300', stroke: '#cc0000', strokeWidth: 3, fill: 'none' },
      { d: 'M50 60 H300', stroke: '#ff8800', strokeWidth: 3, fill: 'none' },
      { d: 'M50 90 H300', stroke: '#0066cc', strokeWidth: 3, fill: 'none' },
      { d: 'M50 120 H300', stroke: '#000000', strokeWidth: 3, fill: 'none' },
      { d: 'M70 30 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: '#000' },
      { d: 'M110 60 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: '#000' },
      { d: 'M150 90 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: '#000' },
      { d: 'M220 120 m-5,0 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0', fill: '#000' },
      { d: 'M70 35 V190', stroke: '#cc0000', strokeWidth: 2, fill: 'none' },
      { d: 'M110 65 V190', stroke: '#ff8800', strokeWidth: 2, fill: 'none' },
      { d: 'M150 95 V190', stroke: '#0066cc', strokeWidth: 2, fill: 'none' },
      { d: 'M220 120 V190', stroke: '#000000', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'L1', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'L2', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'L3', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'N', position: { x: 0, y: 10 }, type: 'input' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // ENERGY METER
  {
    type: SymbolType.ENERGY_METER_KWH,
    name: 'Energy meter (kilo Watt hour meter)',
    category: 'Meters & Indicators',
    viewBox: '0 0 200 200',
    renderer: EnergyMeterSVG,
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'input', position: { x: 0, y: 10 }, type: 'input' },
    ],
    displaySize: { width: 120, height: 120 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // EARTH CONNECTION
  {
    type: SymbolType.EARTH_CONNECTION,
    name: 'Earth connection',
    category: 'Ground & Reference',
    viewBox: '0 0 200 150',
    paths: [
      { d: 'M100 30 V90', stroke: '#006600', strokeWidth: 3, fill: 'none' },
      { d: 'M70 90 H130', stroke: '#006600', strokeWidth: 3, fill: 'none' },
      { d: 'M80 105 H120', stroke: '#006600', strokeWidth: 3, fill: 'none' },
      { d: 'M90 120 H110', stroke: '#006600', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 10, y: 0 }, type: 'input' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // LAMP INCANDESCENT
  {
    type: SymbolType.LAMP_INCANDESCENT_SYMBOL,
    name: 'Lamp (incandescent)',
    category: 'Meters & Indicators',
    viewBox: '0 0 200 100',
    paths: [
      { d: 'M20 50 H65', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M135 50 H180', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M100 50 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M75 25 L125 75', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M125 25 L75 75', stroke: '#000', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'right', position: { x: 20, y: 10 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // LAMP INDICATION
  {
    type: SymbolType.LAMP_INDICATION_SYMBOL,
    name: 'Lamp (indication)',
    category: 'Meters & Indicators',
    viewBox: '0 0 200 120',
    paths: [
      { d: 'M20 65 H65', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M135 65 H180', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M100 65 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M75 40 L125 90', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M125 40 L75 90', stroke: '#000', strokeWidth: 2, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'right', position: { x: 20, y: 10 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // RESISTOR
  {
    type: SymbolType.RESISTOR_SYMBOL,
    name: 'Resistor',
    category: 'Passive Components',
    viewBox: '0 0 300 80',
    paths: [
      { d: 'M30 40 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: '#000' },
      { d: 'M36 40 H60', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M60 40 L75 25 L90 55 L105 25 L120 55 L135 25 L150 55 L165 25 L180 40', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M180 40 H204', stroke: '#000', strokeWidth: 2, fill: 'none' },
      { d: 'M210 40 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: '#000' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'left', position: { x: 0, y: 10 }, type: 'input' },
      { id: 'right', position: { x: 20, y: 10 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // CAPACITOR
  {
    type: SymbolType.CAPACITOR_SYMBOL,
    name: 'Capacitor',
    category: 'Passive Components',
    viewBox: '0 0 200 200',
    paths: [
      { d: 'M100 30 V80', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M60 80 H140', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M60 100 H140', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M100 100 V150', stroke: '#000', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'bottom', position: { x: 10, y: 20 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // FUSE
  {
    type: SymbolType.FUSE_SYMBOL,
    name: 'Fuse',
    category: 'Protection',
    viewBox: '0 0 200 250',
    paths: [
      { d: 'M100 30 V80', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M80 80 H120 V170 H80 Z', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M100 80 V170', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M100 170 V220', stroke: '#000', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'bottom', position: { x: 10, y: 20 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },

  // SWITCH SINGLE POLE
  {
    type: SymbolType.SWITCH_SINGLE_POLE,
    name: 'Switch (single pole)',
    category: 'Switches & Relays',
    viewBox: '0 0 200 250',
    paths: [
      { d: 'M100 30 V80', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M100 80 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: '#000' },
      { d: 'M125 75 L100 160', stroke: '#000', strokeWidth: 3, fill: 'none' },
      { d: 'M100 160 m-6,0 a6,6 0 1,0 12,0 a6,6 0 1,0 -12,0', fill: '#000' },
      { d: 'M100 160 V220', stroke: '#000', strokeWidth: 3, fill: 'none' },
    ],
    defaultProperties: {},
    defaultConnectionPoints: [
      { id: 'top', position: { x: 10, y: 0 }, type: 'input' },
      { id: 'bottom', position: { x: 10, y: 20 }, type: 'output' },
    ],
    displaySize: { width: 20, height: 20 },
    strokeWidth: 2,
    connectionPointRadius: 3,
    selectionStrokeWidth: 3
  },
];

// For each symbol in symbolCatalog, ensure displaySize, connectionPointRadius, strokeWidth, selectionStrokeWidth, and grid-aligned connection points
const DEFAULT_SIZE = 10;
symbolCatalog.forEach(symbol => {
  // Set displaySize: scale down all symbols
  if (!symbol.displaySize) {
    symbol.displaySize = { width: DEFAULT_SIZE, height: DEFAULT_SIZE };
  } else {
    // If the symbol is much larger, scale down proportionally
    const maxDim = Math.max(symbol.displaySize.width, symbol.displaySize.height);
    if (maxDim > 2 * DEFAULT_SIZE) {
      const scale = DEFAULT_SIZE / 20; // original default was 20
      symbol.displaySize.width = Math.round(symbol.displaySize.width * scale);
      symbol.displaySize.height = Math.round(symbol.displaySize.height * scale);
    } else {
      symbol.displaySize.width = DEFAULT_SIZE;
      symbol.displaySize.height = DEFAULT_SIZE;
    }
  }
  // Set connectionPointRadius, strokeWidth, selectionStrokeWidth
  symbol.connectionPointRadius = 2;
  symbol.strokeWidth = 1.5;
  symbol.selectionStrokeWidth = 2.5;
  // Snap connection points to edges (0 or width/height)
  if (symbol.defaultConnectionPoints) {
    const w = symbol.displaySize.width;
    const h = symbol.displaySize.height;
    symbol.defaultConnectionPoints = symbol.defaultConnectionPoints.map(cp => {
      let x = cp.position.x;
      let y = cp.position.y;
      // Snap to 0 or w for x, 0 or h for y
      x = (Math.abs(x - w) < Math.abs(x - 0)) ? w : 0;
      y = (Math.abs(y - h) < Math.abs(y - 0)) ? h : 0;
      return { ...cp, position: { x, y } };
    });
  }
});