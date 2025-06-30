import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  CanvasState, 
  ElectricalSymbol, 
  Wire, 
  Point, 
  SymbolType, 
  WireType,
  SymbolProperties,
  WireProperties,
  ConnectionPoint
} from '../types';

interface CanvasStore extends CanvasState {
  // Actions
  addSymbol: (symbol: Omit<ElectricalSymbol, 'id'>) => void;
  updateSymbol: (id: string, updates: Partial<ElectricalSymbol>) => void;
  deleteSymbol: (id: string) => void;
  moveSymbol: (id: string, position: Point) => void;
  rotateSymbol: (id: string, rotation: number) => void;
  scaleSymbol: (id: string, scale: number) => void;
  
  addWire: (wire: Omit<Wire, 'id'>) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  deleteWire: (id: string) => void;
  
  selectElement: (id: string) => void;
  selectMultipleElements: (ids: string[]) => void;
  clearSelection: () => void;
  
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // Canvas operations
  clearCanvas: () => void;
  duplicateSelected: () => void;
  alignElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  
  // Connection management
  connectElements: (startId: string, endId: string, startConnectionId: string, endConnectionId: string) => void;
  disconnectElements: (wireId: string) => void;
  
  // Import/Export
  loadProject: (state: CanvasState) => void;
  exportState: () => CanvasState;

  past: CanvasState[];
  future: CanvasState[];
  _getSnapshot: () => CanvasState;
  _pushToHistory: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultSymbol = (type: SymbolType, position: Point): ElectricalSymbol => ({
  id: generateId(),
  type,
  position,
  rotation: 0,
  scale: 1,
  properties: {},
  connections: []
});

const createDefaultWire = (startPoint: Point, endPoint: Point, wireType: WireType): Wire => ({
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

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      symbols: [],
      wires: [],
      selectedElements: [],
      zoom: 1,
      pan: { x: 0, y: 0 },
      gridSize: 20,
      snapToGrid: true,
      past: [],
      future: [],

      _getSnapshot() {
        const state = get();
        const { symbols, wires, selectedElements, zoom, pan, gridSize, snapToGrid } = state;
        return { symbols, wires, selectedElements, zoom, pan, gridSize, snapToGrid };
      },
      _pushToHistory() {
        const snapshot = get()._getSnapshot();
        set((state) => ({ past: [...(state.past || []), snapshot], future: [] }));
      },

      // Symbol actions
      addSymbol: (symbolData) => { get()._pushToHistory(); set((state) => ({ symbols: [...state.symbols, { ...symbolData, id: generateId() }] })); },
      updateSymbol: (id, updates) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, ...updates } : symbol) })); },
      deleteSymbol: (id) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.filter(symbol => symbol.id !== id), wires: state.wires.filter(wire => wire.startConnectionId !== id && wire.endConnectionId !== id), selectedElements: state.selectedElements.filter(elementId => elementId !== id) })); },
      moveSymbol: (id, position) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, position } : symbol) })); },
      rotateSymbol: (id, rotation) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, rotation } : symbol) })); },
      scaleSymbol: (id, scale) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, scale } : symbol) })); },

      // Wire actions
      addWire: (wireData) => { get()._pushToHistory(); set((state) => ({ wires: [...state.wires, { ...wireData, id: generateId() }] })); },
      updateWire: (id, updates) => { get()._pushToHistory(); set((state) => ({ wires: state.wires.map(wire => wire.id === id ? { ...wire, ...updates } : wire) })); },
      deleteWire: (id) => { get()._pushToHistory(); set((state) => ({ wires: state.wires.filter(wire => wire.id !== id), selectedElements: state.selectedElements.filter(elementId => elementId !== id) })); },

      // Selection actions (do not push to history)
      selectElement: (id) => set((state) => ({ selectedElements: state.selectedElements.includes(id) ? state.selectedElements : [...state.selectedElements, id] })),
      selectMultipleElements: (ids) => set({ selectedElements: ids }),
      clearSelection: () => set({ selectedElements: [] }),

      // Canvas view actions
      setZoom: (zoom) => { get()._pushToHistory(); set({ zoom }); },
      setPan: (pan) => { get()._pushToHistory(); set({ pan }); },
      setGridSize: (gridSize) => { get()._pushToHistory(); set({ gridSize }); },
      toggleSnapToGrid: () => { get()._pushToHistory(); set((state) => ({ snapToGrid: !state.snapToGrid })); },

      // Undo/Redo
      undo: () => {
        const state = get();
        if (!state.past || state.past.length === 0) return;
        const prev = state.past[state.past.length - 1];
        const newPast = state.past.slice(0, -1);
        const snapshot = state._getSnapshot();
        set({ ...prev, past: newPast, future: [...(state.future || []), snapshot] });
      },
      redo: () => {
        const state = get();
        if (!state.future || state.future.length === 0) return;
        const next = state.future[state.future.length - 1];
        const newFuture = state.future.slice(0, -1);
        const snapshot = state._getSnapshot();
        set({ ...next, past: [...(state.past || []), snapshot], future: newFuture });
      },

      // Canvas operations
      clearCanvas: () => { get()._pushToHistory(); set({ symbols: [], wires: [], selectedElements: [] }); },
      duplicateSelected: () => { get()._pushToHistory(); set((state) => {
        const newSymbols = state.selectedElements.filter(id => state.symbols.find(s => s.id === id)).map(id => {
          const original = state.symbols.find(s => s.id === id)!;
          return { ...original, id: generateId(), position: { x: original.position.x + 50, y: original.position.y + 50 } };
        });
        return { symbols: [...state.symbols, ...newSymbols], selectedElements: newSymbols.map(s => s.id) };
      }); },
      alignElements: (alignment) => { get()._pushToHistory(); set((state) => {
        if (state.selectedElements.length < 2) return state;
        const selectedSymbols = state.symbols.filter(s => state.selectedElements.includes(s.id));
        if (selectedSymbols.length < 2) return state;
        let alignedSymbols = [...state.symbols];
        switch (alignment) {
          case 'left':
            const leftmostX = Math.min(...selectedSymbols.map(s => s.position.x));
            alignedSymbols = alignedSymbols.map(symbol => state.selectedElements.includes(symbol.id) ? { ...symbol, position: { ...symbol.position, x: leftmostX } } : symbol);
            break;
          case 'center':
            const centerX = selectedSymbols.reduce((sum, s) => sum + s.position.x, 0) / selectedSymbols.length;
            alignedSymbols = alignedSymbols.map(symbol => state.selectedElements.includes(symbol.id) ? { ...symbol, position: { ...symbol.position, x: centerX } } : symbol);
            break;
          case 'right':
            const rightmostX = Math.max(...selectedSymbols.map(s => s.position.x));
            alignedSymbols = alignedSymbols.map(symbol => state.selectedElements.includes(symbol.id) ? { ...symbol, position: { ...symbol.position, x: rightmostX } } : symbol);
            break;
          case 'top':
            const topmostY = Math.min(...selectedSymbols.map(s => s.position.y));
            alignedSymbols = alignedSymbols.map(symbol => state.selectedElements.includes(symbol.id) ? { ...symbol, position: { ...symbol.position, y: topmostY } } : symbol);
            break;
          case 'middle':
            const centerY = selectedSymbols.reduce((sum, s) => sum + s.position.y, 0) / selectedSymbols.length;
            alignedSymbols = alignedSymbols.map(symbol => state.selectedElements.includes(symbol.id) ? { ...symbol, position: { ...symbol.position, y: centerY } } : symbol);
            break;
          case 'bottom':
            const bottommostY = Math.max(...selectedSymbols.map(s => s.position.y));
            alignedSymbols = alignedSymbols.map(symbol => state.selectedElements.includes(symbol.id) ? { ...symbol, position: { ...symbol.position, y: bottommostY } } : symbol);
            break;
        }
        return { symbols: alignedSymbols };
      }); },
      // Connection management
      connectElements: (startId, endId, startConnectionId, endConnectionId) => { get()._pushToHistory(); set((state) => {
        const startSymbol = state.symbols.find(s => s.id === startId);
        const endSymbol = state.symbols.find(s => s.id === endId);
        if (!startSymbol || !endSymbol) return state;
        const newWire: Wire = { id: generateId(), startPoint: startSymbol.position, endPoint: endSymbol.position, startConnectionId, endConnectionId, wireType: WireType.CONTROL, properties: { color: '#000000', thickness: 1, material: 'copper', insulation: 'PVC' } };
        return { wires: [...state.wires, newWire], symbols: state.symbols.map(symbol => { if (symbol.id === startId || symbol.id === endId) { return { ...symbol, connections: symbol.connections.map(conn => { if (conn.id === startConnectionId || conn.id === endConnectionId) { return { ...conn, connected: true }; } return conn; }) }; } return symbol; }) };
      }); },
      disconnectElements: (wireId) => { get()._pushToHistory(); set((state) => {
        const wire = state.wires.find(w => w.id === wireId);
        if (!wire) return state;
        return { wires: state.wires.filter(w => w.id !== wireId), symbols: state.symbols.map(symbol => ({ ...symbol, connections: symbol.connections.map(conn => { if (conn.id === wire.startConnectionId || conn.id === wire.endConnectionId) { return { ...conn, connected: false, connectionId: undefined }; } return conn; }) })) };
      }); },
      // Import/Export
      loadProject: (state) => { get()._pushToHistory(); set(state); },
      exportState: () => {
        const state = get();
        return { symbols: state.symbols, wires: state.wires, selectedElements: state.selectedElements, zoom: state.zoom, pan: state.pan, gridSize: state.gridSize, snapToGrid: state.snapToGrid };
      }
    }),
    {
      name: 'canvas-store'
    }
  )
); 