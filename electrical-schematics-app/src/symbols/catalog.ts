// Central catalog of SANS electrical symbols
import { SymbolType, ConnectionPoint } from '../types';

export interface SymbolCatalogEntry {
  type: SymbolType;
  name: string;
  svgPath: string;
  defaultProperties: Record<string, any>;
  defaultConnectionPoints: Omit<ConnectionPoint, 'connected' | 'connectionId'>[];
}

export const symbolCatalog: SymbolCatalogEntry[] = [
  {
    type: SymbolType.CIRCUIT_BREAKER,
    name: 'Circuit Breaker (Double Pole)',
    svgPath: 'M4 6 H20 M4 18 H20 M8 6 V18 M16 6 V18', // Simple representation
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
]; 