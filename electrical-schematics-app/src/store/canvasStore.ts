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
  ConnectionPoint,
  TextElement,
  DimensionElement,
  MeasurementResult,
  ToolType,
  ValidationResult
} from '../types';
import { symbolCatalog } from '../symbols/catalog';

interface CanvasStore extends Omit<CanvasState, 'autoSave'> {
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
  
  // Text elements
  addTextElement: (textElement: Omit<TextElement, 'id'>) => void;
  updateTextElement: (id: string, updates: Partial<TextElement>) => void;
  deleteTextElement: (id: string) => void;
  
  // Dimension elements
  addDimensionElement: (dimensionElement: Omit<DimensionElement, 'id'>) => void;
  updateDimensionElement: (id: string, updates: Partial<DimensionElement>) => void;
  deleteDimensionElement: (id: string) => void;
  
  selectElement: (id: string) => void;
  selectMultipleElements: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  setGridSize: (size: number) => void;
  toggleSnapToGrid: () => void;
  setActiveTool: (tool: ToolType) => void;
  setMeasurementUnit: (unit: 'mm' | 'cm' | 'm' | 'in' | 'ft') => void;
  toggleShowMeasurements: () => void;
  toggleAutoSave: () => void;
  
  // Measurement tools
  measureDistance: (startPoint: Point, endPoint: Point) => MeasurementResult;
  measureAngle: (center: Point, point1: Point, point2: Point) => number;
  measureArea: (points: Point[]) => number;
  
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  
  // Canvas operations
  clearCanvas: () => void;
  duplicateSelected: () => void;
  alignElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeElements: (direction: 'horizontal' | 'vertical') => void;
  
  // Connection management
  connectElements: (startId: string, endId: string, startConnectionId: string, endConnectionId: string) => void;
  disconnectElements: (wireId: string) => void;
  
  // Import/Export
  loadProject: (state: CanvasState) => void;
  exportState: () => CanvasState;
  exportToPDF: () => void;
  exportToSVG: () => void;
  exportToPNG: () => void;
  
  // Auto-save functionality
  autoSaveAction: () => void;
  loadAutoSaveAction: () => void;
  
  // Validation
  validateSchematic: () => ValidationResult[];
  
  past: CanvasState[];
  future: CanvasState[];
  _getSnapshot: () => CanvasState;
  _pushToHistory: () => void;
  
  // State properties
  autoSave: boolean;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultSymbol = (type: SymbolType, position: Point): ElectricalSymbol => {
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
      textElements: [],
      dimensionElements: [],
      selectedElements: [],
      zoom: 1,
      pan: { x: 0, y: 0 },
      gridSize: 20,
      snapToGrid: true,
      activeTool: ToolType.SELECT,
      measurementUnit: 'mm',
      showMeasurements: false,
      autoSave: true,
      lastSaved: null,
      past: [],
      future: [],

      _getSnapshot() {
        const state = get();
        const { symbols, wires, textElements, dimensionElements, selectedElements, zoom, pan, gridSize, snapToGrid, activeTool, measurementUnit, showMeasurements } = state;
        return { symbols, wires, textElements, dimensionElements, selectedElements, zoom, pan, gridSize, snapToGrid, activeTool, measurementUnit, showMeasurements };
      },
      _pushToHistory() {
        const snapshot = get()._getSnapshot();
        set((state) => ({ past: [...(state.past || []), snapshot], future: [] }));
      },

      // Symbol actions
      addSymbol: (symbolData) => {
        get()._pushToHistory();
        // Validate and auto-correct symbol data
        const catalogEntry = symbolCatalog.find((s) => s.type === symbolData.type);
        if (!catalogEntry) {
          console.warn(`Symbol type '${symbolData.type}' not found in catalog. Adding as-is.`);
          set((state) => ({ symbols: [...state.symbols, { ...symbolData, id: generateId() }] }));
          return;
        }
        // Merge properties with catalog defaults
        const mergedProperties = { ...catalogEntry.defaultProperties, ...symbolData.properties };
        // Ensure all connection points have required fields
        const mergedConnections = (catalogEntry.defaultConnectionPoints || []).map((cp) => {
          const userCp: Partial<ConnectionPoint> = (symbolData.connections || []).find((c) => c.id === cp.id) || {};
          return {
            ...cp,
            ...userCp,
            connected: typeof userCp.connected === 'boolean' ? userCp.connected : false,
            connectionId: userCp.connectionId || undefined,
          };
        });
        set((state) => ({
          symbols: [
            ...state.symbols,
            {
              ...symbolData,
              id: generateId(),
              properties: mergedProperties,
              connections: mergedConnections,
            },
          ],
        }));
      },
      updateSymbol: (id, updates) => {
        get()._pushToHistory();
        set((state) => ({
          symbols: state.symbols.map(symbol => {
            if (symbol.id !== id) return symbol;
            const catalogEntry = symbolCatalog.find((s) => s.type === (updates.type || symbol.type));
            if (!catalogEntry) {
              console.warn(`Symbol type '${updates.type || symbol.type}' not found in catalog. Updating as-is.`);
              return { ...symbol, ...updates };
            }
            // Merge properties
            const mergedProperties = { ...catalogEntry.defaultProperties, ...symbol.properties, ...updates.properties };
            // Merge connections
            const mergedConnections = (catalogEntry.defaultConnectionPoints || []).map((cp) => {
              const userCp: Partial<ConnectionPoint> = ((updates.connections || symbol.connections) || []).find((c) => c.id === cp.id) || {};
              return {
                ...cp,
                ...userCp,
                connected: typeof userCp.connected === 'boolean' ? userCp.connected : false,
                connectionId: userCp.connectionId || undefined,
              };
            });
            return {
              ...symbol,
              ...updates,
              properties: mergedProperties,
              connections: mergedConnections,
            };
          }),
        }));
      },
      deleteSymbol: (id) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.filter(symbol => symbol.id !== id), wires: state.wires.filter(wire => wire.startConnectionId !== id && wire.endConnectionId !== id), selectedElements: state.selectedElements.filter(elementId => elementId !== id) })); },
      moveSymbol: (id, position) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, position } : symbol) })); },
      rotateSymbol: (id, rotation) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, rotation } : symbol) })); },
      scaleSymbol: (id, scale) => { get()._pushToHistory(); set((state) => ({ symbols: state.symbols.map(symbol => symbol.id === id ? { ...symbol, scale } : symbol) })); },

      // Wire actions
      addWire: (wireData) => {
        get()._pushToHistory();
        const state = get();
        // Validate endpoints
        const validStartSymbol = wireData.startConnectionId
          ? state.symbols.some(s => s.connections.some(c => c.id === wireData.startConnectionId))
          : true;
        const validEndSymbol = wireData.endConnectionId
          ? state.symbols.some(s => s.connections.some(c => c.id === wireData.endConnectionId))
          : true;
        if (!validStartSymbol || !validEndSymbol) {
          console.warn('Wire endpoints are invalid. Wire not added.', wireData);
          return;
        }
        // Ensure wire properties are present
        const defaultWireProps = { color: '#000000', thickness: 1, material: 'copper', insulation: 'PVC' };
        const mergedProperties = { ...defaultWireProps, ...wireData.properties };
        set((state) => ({
          wires: [...state.wires, { ...wireData, id: generateId(), properties: mergedProperties }]
        }));
      },
      updateWire: (id, updates) => {
        get()._pushToHistory();
        set((state) => ({
          wires: state.wires.map(wire => {
            if (wire.id !== id) return wire;
            // Validate endpoints if being updated
            let valid = true;
            if (updates.startConnectionId) {
              valid = state.symbols.some(s => s.connections.some(c => c.id === updates.startConnectionId));
            }
            if (updates.endConnectionId) {
              valid = valid && state.symbols.some(s => s.connections.some(c => c.id === updates.endConnectionId));
            }
            if (!valid) {
              console.warn('Wire endpoints are invalid. Wire not updated.', updates);
              return wire;
            }
            // Ensure wire properties are present
            const defaultWireProps = { color: '#000000', thickness: 1, material: 'copper', insulation: 'PVC' };
            const mergedProperties = { ...defaultWireProps, ...wire.properties, ...updates.properties };
            return { ...wire, ...updates, properties: mergedProperties };
          })
        }));
      },
      deleteWire: (id) => { get()._pushToHistory(); set((state) => ({ wires: state.wires.filter(wire => wire.id !== id), selectedElements: state.selectedElements.filter(elementId => elementId !== id) })); },

      // Text element actions
      addTextElement: (textElement) => {
        get()._pushToHistory();
        set((state) => ({
          textElements: [...state.textElements, { ...textElement, id: generateId() }]
        }));
      },

      updateTextElement: (id, updates) => {
        get()._pushToHistory();
        set((state) => ({
          textElements: state.textElements.map(el => 
            el.id === id ? { ...el, ...updates } : el
          )
        }));
      },

      deleteTextElement: (id) => {
        get()._pushToHistory();
        set((state) => ({
          textElements: state.textElements.filter(el => el.id !== id),
          selectedElements: state.selectedElements.filter(selectedId => selectedId !== id)
        }));
      },

      // Dimension element actions
      addDimensionElement: (dimensionElement) => {
        get()._pushToHistory();
        set((state) => ({
          dimensionElements: [...state.dimensionElements, { ...dimensionElement, id: generateId() }]
        }));
      },

      updateDimensionElement: (id, updates) => {
        get()._pushToHistory();
        set((state) => ({
          dimensionElements: state.dimensionElements.map(el => 
            el.id === id ? { ...el, ...updates } : el
          )
        }));
      },

      deleteDimensionElement: (id) => {
        get()._pushToHistory();
        set((state) => ({
          dimensionElements: state.dimensionElements.filter(el => el.id !== id),
          selectedElements: state.selectedElements.filter(selectedId => selectedId !== id)
        }));
      },

      // Selection actions
      selectElement: (id: string) => {
        set((state) => ({
          selectedElements: [id]
        }));
      },

      selectMultipleElements: (ids: string[]) => {
        set((state) => ({
          selectedElements: ids
        }));
      },

      selectAll: () => {
        set((state) => ({
          selectedElements: [
            ...state.symbols.map(s => s.id),
            ...state.wires.map(w => w.id),
            ...state.textElements.map(t => t.id),
            ...state.dimensionElements.map(d => d.id)
          ]
        }));
      },

      clearSelection: () => {
        set((state) => ({
          selectedElements: []
        }));
      },

      // Zoom and pan actions
      setZoom: (zoom: number) => {
        set({ zoom });
      },

      setPan: (pan: Point) => {
        set({ pan });
      },

      setGridSize: (size: number) => {
        set({ gridSize: size });
      },

      toggleSnapToGrid: () => {
        set((state) => ({ snapToGrid: !state.snapToGrid }));
      },

      setActiveTool: (tool: ToolType) => {
        set({ activeTool: tool });
      },

      setMeasurementUnit: (unit: 'mm' | 'cm' | 'm' | 'in' | 'ft') => {
        set({ measurementUnit: unit });
      },

      toggleShowMeasurements: () => {
        set((state) => ({ showMeasurements: !state.showMeasurements }));
      },

      toggleAutoSave: () => {
        set((state) => ({ autoSave: !state.autoSave }));
      },

      // Measurement tools
      measureDistance: (startPoint: Point, endPoint: Point): MeasurementResult => {
        const distance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);
        return {
          distance,
          unit: 'mm'
        };
      },

      measureAngle: (center: Point, point1: Point, point2: Point): number => {
        const angle1 = Math.atan2(point1.y - center.y, point1.x - center.x);
        const angle2 = Math.atan2(point2.y - center.y, point2.x - center.x);
        let angle = (angle2 - angle1) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        return angle;
      },

      measureArea: (points: Point[]): number => {
        if (points.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < points.length; i++) {
          const j = (i + 1) % points.length;
          area += points[i].x * points[j].y;
          area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
      },

      // Undo/Redo
      undo: () => {
        const state = get();
        if (state.past.length > 0) {
          const previous = state.past[state.past.length - 1];
          const newPast = state.past.slice(0, -1);
          set({
            ...previous,
            past: newPast,
            future: [state._getSnapshot(), ...state.future]
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.future.length > 0) {
          const next = state.future[0];
          const newFuture = state.future.slice(1);
          set({
            ...next,
            past: [...state.past, state._getSnapshot()],
            future: newFuture
          });
        }
      },

      // Auto-save functionality
      autoSaveAction: () => {
        const state = get();
        if (state.autoSave) {
          const snapshot = state._getSnapshot();
          localStorage.setItem('electrical-schematic-autosave', JSON.stringify({
            ...snapshot,
            timestamp: new Date().toISOString()
          }));
          set({ lastSaved: new Date() });
        }
      },

      loadAutoSaveAction: () => {
        const saved = localStorage.getItem('electrical-schematic-autosave');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            delete parsed.timestamp;
            set(parsed);
            return true;
          } catch (error) {
            console.error('Failed to load auto-save:', error);
            return false;
          }
        }
        return false;
      },

      // Export functions
      exportToPDF: () => {
        // Implementation for PDF export
        console.log('Exporting to PDF...');
      },

      exportToSVG: () => {
        // Implementation for SVG export
        console.log('Exporting to SVG...');
      },

      exportToPNG: () => {
        // Implementation for PNG export
        console.log('Exporting to PNG...');
      },

      // Validation
      validateSchematic: () => {
        const state = get();
        const results: ValidationResult[] = [];
        
        // Check for disconnected symbols
        const connectedSymbolIds = new Set();
        state.wires.forEach(wire => {
          if (wire.startConnectionId) connectedSymbolIds.add(wire.startConnectionId);
          if (wire.endConnectionId) connectedSymbolIds.add(wire.endConnectionId);
        });
        
        state.symbols.forEach(symbol => {
          symbol.connections.forEach(conn => {
            if (conn.connected && !connectedSymbolIds.has(conn.connectionId!)) {
              results.push({
                ruleId: 'disconnected-connection',
                message: `Symbol ${symbol.id} has disconnected connection ${conn.id}`,
                severity: 'warning' as const,
                elementIds: [symbol.id]
              });
            }
          });
        });
        
        return results;
      },

      // Canvas operations
      clearCanvas: () => {
        set((state) => ({
          symbols: [],
          wires: [],
          textElements: [],
          dimensionElements: [],
          selectedElements: []
        }));
        get()._pushToHistory();
      },

      duplicateSelected: () => {
        const state = get();
        const newSymbols: ElectricalSymbol[] = [];
        const newWires: Wire[] = [];
        const newTextElements: TextElement[] = [];
        const newDimensionElements: DimensionElement[] = [];
        const newSelectedElements: string[] = [];

        // Duplicate selected symbols
        state.selectedElements.forEach(id => {
          const symbol = state.symbols.find(s => s.id === id);
          if (symbol) {
            const newSymbol = {
              ...symbol,
              id: generateId(),
              position: { x: symbol.position.x + 50, y: symbol.position.y + 50 }
            };
            newSymbols.push(newSymbol);
            newSelectedElements.push(newSymbol.id);
          }

          const wire = state.wires.find(w => w.id === id);
          if (wire) {
            const newWire = {
              ...wire,
              id: generateId(),
              startPoint: { x: wire.startPoint.x + 50, y: wire.startPoint.y + 50 },
              endPoint: { x: wire.endPoint.x + 50, y: wire.endPoint.y + 50 }
            };
            newWires.push(newWire);
            newSelectedElements.push(newWire.id);
          }

          const textElement = state.textElements.find(t => t.id === id);
          if (textElement) {
            const newTextElement = {
              ...textElement,
              id: generateId(),
              position: { x: textElement.position.x + 50, y: textElement.position.y + 50 }
            };
            newTextElements.push(newTextElement);
            newSelectedElements.push(newTextElement.id);
          }

          const dimensionElement = state.dimensionElements.find(d => d.id === id);
          if (dimensionElement) {
            const newDimensionElement = {
              ...dimensionElement,
              id: generateId(),
              startPoint: { x: dimensionElement.startPoint.x + 50, y: dimensionElement.startPoint.y + 50 },
              endPoint: { x: dimensionElement.endPoint.x + 50, y: dimensionElement.endPoint.y + 50 }
            };
            newDimensionElements.push(newDimensionElement);
            newSelectedElements.push(newDimensionElement.id);
          }
        });

        set((state) => ({
          symbols: [...state.symbols, ...newSymbols],
          wires: [...state.wires, ...newWires],
          textElements: [...state.textElements, ...newTextElements],
          dimensionElements: [...state.dimensionElements, ...newDimensionElements],
          selectedElements: newSelectedElements
        }));

        get()._pushToHistory();
      },

      alignElements: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const state = get();
        if (state.selectedElements.length < 2) return;

        const selectedSymbols = state.symbols.filter(s => state.selectedElements.includes(s.id));
        if (selectedSymbols.length < 2) return;

        let referenceValue: number;
        const updatedSymbols = [...state.symbols];

        switch (alignment) {
          case 'left':
            referenceValue = Math.min(...selectedSymbols.map(s => s.position.x));
            selectedSymbols.forEach(symbol => {
              const index = updatedSymbols.findIndex(s => s.id === symbol.id);
              if (index !== -1) {
                updatedSymbols[index] = { ...symbol, position: { ...symbol.position, x: referenceValue } };
              }
            });
            break;
          case 'center':
            referenceValue = selectedSymbols.reduce((sum, s) => sum + s.position.x, 0) / selectedSymbols.length;
            selectedSymbols.forEach(symbol => {
              const index = updatedSymbols.findIndex(s => s.id === symbol.id);
              if (index !== -1) {
                updatedSymbols[index] = { ...symbol, position: { ...symbol.position, x: referenceValue } };
              }
            });
            break;
          case 'right':
            referenceValue = Math.max(...selectedSymbols.map(s => s.position.x));
            selectedSymbols.forEach(symbol => {
              const index = updatedSymbols.findIndex(s => s.id === symbol.id);
              if (index !== -1) {
                updatedSymbols[index] = { ...symbol, position: { ...symbol.position, x: referenceValue } };
              }
            });
            break;
          case 'top':
            referenceValue = Math.min(...selectedSymbols.map(s => s.position.y));
            selectedSymbols.forEach(symbol => {
              const index = updatedSymbols.findIndex(s => s.id === symbol.id);
              if (index !== -1) {
                updatedSymbols[index] = { ...symbol, position: { ...symbol.position, y: referenceValue } };
              }
            });
            break;
          case 'middle':
            referenceValue = selectedSymbols.reduce((sum, s) => sum + s.position.y, 0) / selectedSymbols.length;
            selectedSymbols.forEach(symbol => {
              const index = updatedSymbols.findIndex(s => s.id === symbol.id);
              if (index !== -1) {
                updatedSymbols[index] = { ...symbol, position: { ...symbol.position, y: referenceValue } };
              }
            });
            break;
          case 'bottom':
            referenceValue = Math.max(...selectedSymbols.map(s => s.position.y));
            selectedSymbols.forEach(symbol => {
              const index = updatedSymbols.findIndex(s => s.id === symbol.id);
              if (index !== -1) {
                updatedSymbols[index] = { ...symbol, position: { ...symbol.position, y: referenceValue } };
              }
            });
            break;
        }

        set({ symbols: updatedSymbols });
        get()._pushToHistory();
      },

      distributeElements: (direction: 'horizontal' | 'vertical') => {
        const state = get();
        if (state.selectedElements.length < 3) return;

        const selectedSymbols = state.symbols.filter(s => state.selectedElements.includes(s.id));
        if (selectedSymbols.length < 3) return;

        const sortedSymbols = direction === 'horizontal' 
          ? selectedSymbols.sort((a, b) => a.position.x - b.position.x)
          : selectedSymbols.sort((a, b) => a.position.y - b.position.y);

        const first = sortedSymbols[0];
        const last = sortedSymbols[sortedSymbols.length - 1];
        const totalDistance = direction === 'horizontal' 
          ? last.position.x - first.position.x
          : last.position.y - first.position.y;
        const spacing = totalDistance / (sortedSymbols.length - 1);

        const updatedSymbols = [...state.symbols];
        sortedSymbols.forEach((symbol, symbolIndex) => {
          if (symbolIndex === 0 || symbolIndex === sortedSymbols.length - 1) return;
          
          const index = updatedSymbols.findIndex(s => s.id === symbol.id);
          if (index !== -1) {
            const newPosition = direction === 'horizontal'
              ? { ...symbol.position, x: first.position.x + spacing * symbolIndex }
              : { ...symbol.position, y: first.position.y + spacing * symbolIndex };
            updatedSymbols[index] = { ...symbol, position: newPosition };
          }
        });

        set({ symbols: updatedSymbols });
        get()._pushToHistory();
      },

      // Connection management
      connectElements: (startId: string, endId: string, startConnectionId: string, endConnectionId: string) => {
        const state = get();
        const startSymbol = state.symbols.find(s => s.id === startId);
        const endSymbol = state.symbols.find(s => s.id === endId);
        
        if (!startSymbol || !endSymbol) return;

        // Update connection points
        const updatedSymbols = state.symbols.map(symbol => {
          if (symbol.id === startId) {
            return {
              ...symbol,
              connections: symbol.connections.map(conn => 
                conn.id === startConnectionId 
                  ? { ...conn, connected: true, connectionId: `${startId}-${endId}` }
                  : conn
              )
            };
          }
          if (symbol.id === endId) {
            return {
              ...symbol,
              connections: symbol.connections.map(conn => 
                conn.id === endConnectionId 
                  ? { ...conn, connected: true, connectionId: `${startId}-${endId}` }
                  : conn
              )
            };
          }
          return symbol;
        });

        set({ symbols: updatedSymbols });
        get()._pushToHistory();
      },

      disconnectElements: (wireId: string) => {
        const state = get();
        const wire = state.wires.find(w => w.id === wireId);
        
        if (!wire) return;

        // Disconnect connection points
        const updatedSymbols = state.symbols.map(symbol => ({
          ...symbol,
          connections: symbol.connections.map(conn => 
            conn.connectionId === wireId 
              ? { ...conn, connected: false, connectionId: undefined }
              : conn
          )
        }));

        set({ symbols: updatedSymbols });
        get()._pushToHistory();
      },

      // Import/Export
      loadProject: (state: CanvasState) => {
        set(state);
        get()._pushToHistory();
      },

      exportState: () => {
        const state = get();
        return { 
          symbols: state.symbols, 
          wires: state.wires, 
          selectedElements: state.selectedElements, 
          zoom: state.zoom, 
          pan: state.pan, 
          gridSize: state.gridSize, 
          snapToGrid: state.snapToGrid 
        };
      },
    }),
    {
      name: 'canvas-store'
    }
  )
); 