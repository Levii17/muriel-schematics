// Central catalog of SANS electrical symbols
import { SymbolType, ConnectionPoint } from '../types';
import { useState } from 'react';

export interface SymbolCatalogEntry {
  type: SymbolType;
  name: string;
  category: string;
  // SVG-based rendering (data-driven)
  viewBox?: string;
  paths?: { d: string; stroke?: string; strokeWidth?: number; fill?: string }[];
  // Legacy support
  svgPath?: string;
  // Custom React renderer (for complex symbols)
  renderer?: React.FC<any>;
  defaultProperties: Record<string, any>;
  defaultConnectionPoints: Omit<ConnectionPoint, 'connected' | 'connectionId'>[];
}

export const symbolCatalog: SymbolCatalogEntry[] = [
  // Protection devices
  {
    type: SymbolType.CIRCUIT_BREAKER,
    name: 'Circuit Breaker (Double Pole)',
    category: 'Protection Devices',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 6 H20 M4 18 H20 M8 6 V18 M16 6 V18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Protection Devices',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 6 H20 M4 12 H20 M4 18 H20 M7 6 V18 M13 6 V18 M19 6 V18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Switches and Controls',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 6 H20 M4 18 H20 M8 6 L12 18 M16 6 L12 18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Switches and Controls',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 4 V20 M8 12 H16', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'START' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 4 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.RELAY,
    name: 'Coil (Contactor)',
    category: 'Switches and Controls',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 Q12 16 16 8 M8 16 Q12 8 16 16', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Power Sources',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 8 H18 M8 6 V18 M16 6 V18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'BAT' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 13 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 13 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.GENERATOR,
    name: 'Generator',
    category: 'Power Sources',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 12 A6 6 0 1 0 18 12 A6 6 0 1 0 6 12', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'GEN' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.TRANSFORMER,
    name: 'Transformer',
    category: 'Power Sources',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 Q12 12 8 16 M16 8 Q12 12 16 16', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Protection Devices',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 12 H18 M10 10 L14 14 M10 14 L14 10', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'F' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.RCD,
    name: 'RCD',
    category: 'Protection Devices',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 6 H18 M6 18 H18 M8 6 V18 M16 6 V18 M12 6 V18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Switches and Controls',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 H16 M8 16 H16 M12 8 V16', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Loads',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M12 12 L12 18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'L' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.MOTOR,
    name: 'Motor',
    category: 'Loads',
    viewBox: '0 0 24 24',
    renderer: undefined, // Replace with actual component if available
    defaultProperties: { label: 'M' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.HEATER,
    name: 'Heater',
    category: 'Loads',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 Q12 16 16 8', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'H' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 8 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 8 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.SOCKET,
    name: 'Socket',
    category: 'Loads',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 H16 M8 16 H16 M10 8 V16 M14 8 V16', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Measurement',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4', stroke: 'black', strokeWidth: 2.5, fill: 'none' },
      { d: 'M10 15 L12 10 L14 15 M11 13 H13', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'A' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.VOLTMETER,
    name: 'Voltmeter',
    category: 'Measurement',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 4 A8 8 0 1 0 12 20 A8 8 0 1 0 12 4', stroke: 'black', strokeWidth: 2.5, fill: 'none' },
      { d: 'M10 10 L12 15 L14 10', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'V' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.WATTMETER,
    name: 'Wattmeter',
    category: 'Measurement',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M10 10 L14 14', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Control and Signaling',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M12 18 L12 20', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'BELL' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.BUZZER,
    name: 'Buzzer',
    category: 'Control and Signaling',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6 M10 18 Q12 20 14 18', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'BUZ' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.INDICATOR_LIGHT,
    name: 'Indicator Light',
    category: 'Control and Signaling',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 12 A4 4 0 1 0 12 20 A4 4 0 1 0 12 12', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Grounding and Bonding',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 V18 M8 18 H16 M10 16 H14', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'E' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 6 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 18 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.NEUTRAL,
    name: 'Neutral',
    category: 'Grounding and Bonding',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 V18 M8 18 H16', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Junction Boxes and Panels',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 H16 V16 H8 Z', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'JB' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.DISTRIBUTION_BOARD,
    name: 'Distribution Board',
    category: 'Junction Boxes and Panels',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 8 H16 V16 H8 Z M10 10 H14 V14 H10 Z', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
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
    category: 'Custom',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 6 L18 18 M6 18 L18 6', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: 'CUSTOM' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' },
    ],
  },

  // --- New symbols from reference images ---
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.ENERGY_METER,
    name: 'Energy Meter (kWh)',
    category: 'Measurement',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M6 8 H18 V16 H6 Z', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M10 12 H14', stroke: 'black', strokeWidth: 1, fill: 'none' },
      { d: 'M9 15 H15', stroke: 'black', strokeWidth: 1, fill: 'none' }
    ],
    defaultProperties: { label: 'kWh' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 6, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 18, y: 12 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.THREE_PHASE,
    name: 'Three Phase (AC)',
    category: 'Power',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 10 H20', stroke: 'red', strokeWidth: 1.5, fill: 'none' },
      { d: 'M4 12 H20', stroke: 'yellow', strokeWidth: 1.5, fill: 'none' },
      { d: 'M4 14 H20', stroke: 'blue', strokeWidth: 1.5, fill: 'none' }
    ],
    defaultProperties: { label: '3~' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 14 }, type: 'output' }
    ]
  },
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
      { id: 'cp1', position: { x: 12, y: 4 }, type: 'input' },
      { id: 'cp2', position: { x: 12, y: 20 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' },
      { id: 'cp3', position: { x: 12, y: 4 }, type: 'input' },
      { id: 'cp4', position: { x: 12, y: 20 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' },
      { id: 'cp3', position: { x: 12, y: 4 }, type: 'input' },
      { id: 'cp4', position: { x: 12, y: 20 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
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
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.LAMP_INCANDESCENT,
    name: 'Lamp (incandescent)',
    category: 'Loads',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M8 12 L16 12', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.LAMP_INDICATION,
    name: 'Lamp (indication)',
    category: 'Loads',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M12 6 A6 6 0 1 0 12 18 A6 6 0 1 0 12 6', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M8 12 L16 12', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M12 6 L12 18', stroke: 'black', strokeWidth: 1, fill: 'none' }
    ],
    defaultProperties: { label: 'P' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 8, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 16, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.RESISTOR,
    name: 'Resistor',
    category: 'Passive',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M4 12 H8 L10 8 L14 16 L16 12 H20', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
  {
    type: SymbolType.CAPACITOR,
    name: 'Capacitor',
    category: 'Passive',
    viewBox: '0 0 24 24',
    paths: [
      { d: 'M8 6 V18', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M16 6 V18', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M4 12 H8', stroke: 'black', strokeWidth: 2, fill: 'none' },
      { d: 'M16 12 H20', stroke: 'black', strokeWidth: 2, fill: 'none' }
    ],
    defaultProperties: { label: '' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 4, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 20, y: 12 }, type: 'output' }
    ]
  },
];