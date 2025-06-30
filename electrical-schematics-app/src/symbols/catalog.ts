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
    type: SymbolType.BATTERY,
    name: 'Battery',
    svgPath: 'M2 10 H22 M6 7 V13 M18 7 V13',
    defaultProperties: { label: 'BAT', rating: '12V' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 2, y: 10 }, type: 'input' },
      { id: 'cp2', position: { x: 22, y: 10 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.LIGHT,
    name: 'Light',
    svgPath: 'M12 2 A10 10 0 1 0 12 22 A10 10 0 1 0 12 2',
    defaultProperties: { label: 'LAMP', rating: '60W' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 2, y: 12 }, type: 'input' },
      { id: 'cp2', position: { x: 22, y: 12 }, type: 'output' },
    ],
  },
  {
    type: SymbolType.EARTH,
    name: 'Earth',
    svgPath: 'M12 2 V22 M7 17 H17 M9 19 H15',
    defaultProperties: { label: 'GND' },
    defaultConnectionPoints: [
      { id: 'cp1', position: { x: 12, y: 22 }, type: 'neutral' },
    ],
  },
]; 