import { ElectricalSymbol, Wire, Point, SymbolType, WireType } from '../types';
import { symbolCatalog } from '../symbols/catalog';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const createDefaultSymbol = (type: SymbolType, position: Point): ElectricalSymbol => {
  const catalogEntry = symbolCatalog.find((s) => s.type === type);
  let defaultScale = 1;
  
  // Calculate appropriate scale based on display size
  if (catalogEntry?.displaySize) {
    const { width, height } = catalogEntry.displaySize;
    // Scale to fit within a reasonable size (40-80px range)
    const targetSize = Math.max(width, height);
    if (targetSize > 80) {
      defaultScale = 80 / targetSize;
    } else if (targetSize < 40) {
      defaultScale = 40 / targetSize;
    }
  }
  
  return {
    id: generateId(),
    type,
    position,
    rotation: 0,
    scale: defaultScale,
    properties: {},
    connections: []
  };
};

export const createDefaultWire = (startPoint: Point, endPoint: Point, wireType: WireType): Wire => ({
  id: generateId(),
  startPoint,
  endPoint,
  wireType,
  properties: {
    color: '#000000',
    thickness: 1,
    material: 'copper',
    insulation: 'PVC'
  }
}); 