// Central catalog of SANS electrical symbols
import { SymbolType, ConnectionPoint } from '../types';
import { useState } from 'react';

export interface SymbolCatalogEntry {
  type: SymbolType;
  name: string;
  svgPath: string;
  defaultProperties: Record<string, any>;
  defaultConnectionPoints: Omit<ConnectionPoint, 'connected' | 'connectionId'>[];
}

export const symbolCatalog: SymbolCatalogEntry[] = [
  // Protection devices
  {
    type: SymbolType.CIRCUIT_BREAKER,
    name: 'Circuit Breaker (Double Pole)',
    svgPath: 'M4 6 H20 M4 18 H20 M8 6 V18 M16 6 V18',
    defaultProperties: { label: 'CB', poles: 2 },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 6 }, type: 'output' },
      { id: 'cp3', position: { x: 4, y: 18 }, type: 'input' },
      { id: 'cp4', position: { x: 20, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.CIRCUIT_BREAKER,
    name: 'Circuit Breaker (Triple Pole)',
    svgPath: 'M4 6 H20 M4 12 H20 M4 18 H20 M7 6 V18 M13 6 V18 M19 6 V18',
    defaultProperties: { label: 'CB', poles: 3 },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 6 }, type: 'output' },
      { id: 'cp3', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp4', position: { x: 20, y: 12 }, type: 'output' },
      { id: 'cp5', position: { x: 4, y: 18 }, type: 'input' },
      { id: 'cp6', position: { x: 20, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.SWITCH,
    name: 'Isolator (Double Pole)',
    svgPath: 'M4 6 H20 M4 18 H20 M8 6 L12 18 M16 6 L12 18',
    defaultProperties: { label: 'ISOL', poles: 2 },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 6 }, type: 'output' },
      { id: 'cp3', position: { x: 4, y: 18 }, type: 'input' },
      { id: 'cp4', position: { x: 20, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.PUSH_BUTTON,
    name: 'Push Button (Start)',
    svgPath: 'M12 4 V20 M8 12 H16',
    defaultProperties: { label: 'START' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 4 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.RELAY,
    name: 'Coil (Contactor)',
    svgPath: 'M8 8 Q12 16 16 8 M8 16 Q12 8 16 16',
    defaultProperties: { label: 'K', type: 'contactor' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },

  // Power sources
  {
    type: SymbolType.BATTERY,
    name: 'Battery',
    svgPath: 'M6 8 H18 M8 6 V18 M16 6 V18', // TODO: Improve SVG
    defaultProperties: { label: 'BAT' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 13 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 13 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.GENERATOR,
    name: 'Generator',
    svgPath: 'M6 12 A6 6 0 1 0 18 12 A6 6 0 1 0 6 12', // TODO: Improve SVG
    defaultProperties: { label: 'GEN' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.TRANSFORMER,
    name: 'Transformer',
    svgPath: 'M8 8 Q12 12 8 16 M16 8 Q12 12 16 16', // TODO: Improve SVG
    defaultProperties: { label: 'T' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 8 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 16 }, type: 'output' },
    ],
  },

  // More protection devices
  {
    type: SymbolType.FUSE,
    name: 'Fuse',
    svgPath: 'M6 12 H18 M10 10 L14 14 M10 14 L14 10', // TODO: Improve SVG
    defaultProperties: { label: 'F' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.RCD,
    name: 'RCD',
    svgPath: 'M6 6 H18 M6 18 H18 M8 6 V18 M16 6 V18 M12 6 V18', // TODO: Improve SVG
    defaultProperties: { label: 'RCD' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 6 }, type: 'output' },
      { id: 'cp3', position: { x: 6, y: 18 }, type: 'input' },
      { id: 'cp4', position: { x: 18, y: 18 }, type: 'output' },
    ],
  },

  // Switches and controls
  {
    type: SymbolType.CONTACTOR,
    name: 'Contactor',
    svgPath: 'M8 8 H16 M8 16 H16 M12 8 V16', // TODO: Improve SVG
    defaultProperties: { label: 'KM' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },

  // Loads
  {
    type: SymbolType.LIGHT,
    name: 'Light',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M12 12 L12 18', // TODO: Improve SVG
    defaultProperties: { label: 'L' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.MOTOR,
    name: 'Motor',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M8 12 H16', // TODO: Improve SVG
    defaultProperties: { label: 'M' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.HEATER,
    name: 'Heater',
    svgPath: 'M8 8 Q12 16 16 8', // TODO: Improve SVG
    defaultProperties: { label: 'H' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 8 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 8 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.SOCKET,
    name: 'Socket',
    svgPath: 'M8 8 H16 M8 16 H16 M10 8 V16 M14 8 V16', // TODO: Improve SVG
    defaultProperties: { label: 'S' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },

  // Measurement
  {
    type: SymbolType.AMMETER,
    name: 'Ammeter',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M12 12 L16 12', // TODO: Improve SVG
    defaultProperties: { label: 'A' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.VOLTMETER,
    name: 'Voltmeter',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M10 14 L14 10', // TODO: Improve SVG
    defaultProperties: { label: 'V' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.WATTMETER,
    name: 'Wattmeter',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M10 10 L14 14', // TODO: Improve SVG
    defaultProperties: { label: 'W' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },

  // Control and signaling
  {
    type: SymbolType.BELL,
    name: 'Bell',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M12 18 L12 20', // TODO: Improve SVG
    defaultProperties: { label: 'BELL' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.BUZZER,
    name: 'Buzzer',
    svgPath: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M10 18 Q12 20 14 18', // TODO: Improve SVG
    defaultProperties: { label: 'BUZ' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.INDICATOR_LIGHT,
    name: 'Indicator Light',
    svgPath: 'M12 12 A4 4 0 1 0 12 20 A4 4 0 1 0 12 12', // TODO: Improve SVG
    defaultProperties: { label: 'IND' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 8 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 16 }, type: 'output' },
    ],
  },

  // Grounding and bonding
  {
    type: SymbolType.EARTH,
    name: 'Earth',
    svgPath: 'M12 6 V18 M8 18 H16 M10 16 H14', // TODO: Improve SVG
    defaultProperties: { label: 'E' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.NEUTRAL,
    name: 'Neutral',
    svgPath: 'M12 6 V18 M8 18 H16', // TODO: Improve SVG
    defaultProperties: { label: 'N' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 18 }, type: 'output' },
    ],
  },

  // Junction boxes and panels
  {
    type: SymbolType.JUNCTION_BOX,
    name: 'Junction Box',
    svgPath: 'M8 8 H16 V16 H8 Z', // TODO: Improve SVG
    defaultProperties: { label: 'JB' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.DISTRIBUTION_BOARD,
    name: 'Distribution Board',
    svgPath: 'M8 8 H16 V16 H8 Z M10 10 H14 V14 H10 Z', // TODO: Improve SVG
    defaultProperties: { label: 'DB' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },

  // Placeholder for custom/user-defined symbols
  {
    type: SymbolType.CUSTOM,
    name: 'Custom Symbol',
    svgPath: 'M6 6 L18 18 M6 18 L18 6', // TODO: Allow user to define SVG
    defaultProperties: { label: 'CUSTOM' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' },
    ],
  },
];