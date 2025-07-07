import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Image as KonvaImage, Circle } from 'react-konva';
import useImage from 'use-image';
import murielLogo from '../assets/muriel-logo.png';
import { useCanvasStore } from '../store/canvasStore';
import { SymbolType, WireType, Point } from '../types';
import { symbolCatalog } from '../symbols/catalog';
import SymbolElement from './SymbolElement';
import type { SymbolCatalogEntry } from '../symbols/catalog';

// A3 size at 72dpi: 420mm x 297mm ~ 1050 x 742 px
const PAPER_WIDTH = 1200;
const PAPER_HEIGHT = 742;
const BORDER_THICKNESS = 6;
const TITLE_BLOCK_HEIGHT = 110;
const TITLE_BLOCK_WIDTH = 500;
const TITLE_BLOCK_ROWS = [40, 35, 35]; // heights for each row
const TITLE_BLOCK_COLS = [70, 150, 150, 70, 60]; // widths for each col
const GRID_SPACING = 20;
const SNAP_RADIUS = 20;
const DRAG_THRESHOLD = 5;

const DEFAULT_TITLE_BLOCK = {
  logo: 'murielLogo', 
  organization: 'Organization',
  name: 'Name',
  details: 'Details',
  project: "Project Name",
  drawingTitle: "Drawing Title(s)",
  date: new Date().toLocaleDateString(),
  scale: '1:1',
  page: '1',
  pageTotal: '1',
};

const fieldDefs = [
  { key: 'logo', label: 'Logo', row: 0, col: 0, rowSpan: 3, colSpan: 1 },
  { key: 'organization', label: 'Organization', row: 0, col: 1, rowSpan: 1, colSpan: 1 },
  { key: 'name', label: 'Name', row: 1, col: 1, rowSpan: 1, colSpan: 1 },
  { key: 'details', label: 'Details', row: 2, col: 1, rowSpan: 1, colSpan: 1 },
  { key: 'project', label: 'Project Name', row: 0, col: 2, rowSpan: 1, colSpan: 2 },
  { key: 'drawingTitle', label: 'Drawing Title(s)', row: 1, col: 2, rowSpan: 2, colSpan: 2 },
  { key: 'date', label: 'Date', row: 0, col: 4, rowSpan: 1, colSpan: 1 },
  { key: 'scale', label: 'Scale', row: 1, col: 4, rowSpan: 1, colSpan: 1 },
  { key: 'page', label: 'Page', row: 2, col: 4, rowSpan: 1, colSpan: 1 },
  { key: 'pageTotal', label: 'Page Total', row: 2, col: 4, rowSpan: 1, colSpan: 1 },
];

interface CanvasAreaProps {
  wireToolActive?: boolean;
  selectToolActive?: boolean;
  handToolActive?: boolean;
  textToolActive?: boolean;
  showGrid?: boolean;
  snapToGrid?: boolean;
  draggedSymbolType?: SymbolType | null;
  dragPreviewPosition?: { x: number; y: number } | null;
  setDragPreviewPosition?: (pos: { x: number; y: number } | null) => void;
  setDraggedSymbolType?: (type: SymbolType | null) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ 
  wireToolActive, 
  selectToolActive, 
  handToolActive, 
  textToolActive,
  showGrid, 
  snapToGrid, 
  draggedSymbolType, 
  dragPreviewPosition, 
  setDragPreviewPosition,
  setDraggedSymbolType
}) => {
  const stageRef = useRef<any>(null);
  const [titleBlock, setTitleBlock] = useState(DEFAULT_TITLE_BLOCK);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputPos, setInputPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  
  // Responsive scaling - moved to top so it's available to all functions
  const [containerSize, setContainerSize] = useState({ width: PAPER_WIDTH, height: PAPER_HEIGHT });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const symbols = useCanvasStore((s) => s.symbols);
  const addSymbol = useCanvasStore((s) => s.addSymbol);
  const [logoImage] = useImage(murielLogo);
  const selectedElements = useCanvasStore((s) => s.selectedElements);
  const selectElement = useCanvasStore((s) => s.selectElement);
  const moveSymbol = useCanvasStore((s) => s.moveSymbol);
  const wires = useCanvasStore((s) => s.wires);
  const updateWire = useCanvasStore((s) => s.updateWire);
  const addWire = useCanvasStore((s) => s.addWire);
  const [drawingWire, setDrawingWire] = useState<{ start: { x: number; y: number } | null; mouse: { x: number; y: number } | null }>({ start: null, mouse: null });
  const zoom = useCanvasStore((s) => s.zoom);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const pan = useCanvasStore((s) => s.pan);
  const setPan = useCanvasStore((s) => s.setPan);
  // Pan state for drag
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState<{ x: number; y: number } | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);
  const [pendingPan, setPendingPan] = useState<{ x: number; y: number } | null>(null);

  // Drop zone highlight state
  const [isDragOver, setIsDragOver] = useState(false);

  // New state for enhanced tools
  const [textInputMode, setTextInputMode] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<Point | null>(null);
  
  // New store selectors
  const textElements = useCanvasStore((s) => s.textElements);
  const addTextElement = useCanvasStore((s) => s.addTextElement);

  // Find nearest symbol center to a point
  const getNearestSymbolCenter = useCallback((point: { x: number; y: number }) => {
    let minDist = Infinity;
    let nearest = null;
    symbols.forEach((symbol) => {
      const catalogEntry = symbolCatalog.find(s => s.type === symbol.type);
      const displaySize = catalogEntry?.displaySize || { width: 20, height: 20 };
      const center = {
        x: symbol.position.x + displaySize.width / 2,
        y: symbol.position.y + displaySize.height / 2,
      };
      const dist = Math.hypot(center.x - point.x, center.y - point.y);
      if (dist < minDist && dist <= SNAP_RADIUS) {
        minDist = dist;
        nearest = center;
      }
    });
    return nearest;
  }, [symbols]);

  // Utility functions for coordinate transformation
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    
    const stageContainer = stage.container();
    const boundingRect = stageContainer.getBoundingClientRect();
    
    const relativeX = screenX - boundingRect.left;
    const relativeY = screenY - boundingRect.top;
    
    // Account for the centered grid position and zoom/pan
    const gridOffsetX = (containerSize.width - PAPER_WIDTH) / 2;
    const gridOffsetY = (containerSize.height - PAPER_HEIGHT) / 2;
    
    return {
      x: (relativeX - gridOffsetX - pan.x) / zoom,
      y: (relativeY - gridOffsetY - pan.y) / zoom
    };
  }, [pan, zoom, containerSize]);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    // Account for the centered grid position and zoom/pan
    const gridOffsetX = (containerSize.width - PAPER_WIDTH) / 2;
    const gridOffsetY = (containerSize.height - PAPER_HEIGHT) / 2;
    
    return {
      x: canvasX * zoom + pan.x + gridOffsetX,
      y: canvasY * zoom + pan.y + gridOffsetY
    };
  }, [pan, zoom, containerSize]);

  // Utility: Clamp symbol position to drawable area
  function clampSymbolPosition(x: number, y: number, displaySize: { width: number; height: number }): { x: number; y: number } {
    const minX = BORDER_THICKNESS;
    const minY = BORDER_THICKNESS;
    const maxX = PAPER_WIDTH - BORDER_THICKNESS - displaySize.width;
    const maxY = PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT - displaySize.height;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  // Utility: Check for overlap with existing symbols
  function isOverlapping(x: number, y: number, displaySize: { width: number; height: number }): boolean {
    const symbolBounds = { x, y, width: displaySize.width, height: displaySize.height };
    return symbols.some(symbol => {
      const existingCatalogEntry = symbolCatalog.find(s => s.type === symbol.type);
      const existingDisplaySize = existingCatalogEntry?.displaySize || { width: 20, height: 20 };
      const existingBounds = {
        x: symbol.position.x,
        y: symbol.position.y,
        width: existingDisplaySize.width,
        height: existingDisplaySize.height
      };
      return (
        symbolBounds.x < existingBounds.x + existingBounds.width &&
        symbolBounds.x + symbolBounds.width > existingBounds.x &&
        symbolBounds.y < existingBounds.y + existingBounds.height &&
        symbolBounds.y + symbolBounds.height > existingBounds.y
      );
    });
  }

  // Utility: Snap symbol so nearest connection point (or center) lands on grid
  function snapSymbolToGrid(x: number, y: number, entry: SymbolCatalogEntry): { x: number; y: number } {
    const grid = 20;
    const displaySize = entry.displaySize || { width: 20, height: 20 };
    const connectionPoints = entry.defaultConnectionPoints || [];
    let bestSnap = { x, y };
    let minDist = Infinity;
    if (connectionPoints.length > 0) {
      for (const cp of connectionPoints) {
        const cpAbsX = x + cp.position.x;
        const cpAbsY = y + cp.position.y;
        const gridX = Math.round(cpAbsX / grid) * grid;
        const gridY = Math.round(cpAbsY / grid) * grid;
        const dist = Math.abs(cpAbsX - gridX) + Math.abs(cpAbsY - gridY);
        if (dist < minDist) {
          minDist = dist;
          bestSnap = { x: gridX - cp.position.x, y: gridY - cp.position.y };
        }
      }
    } else {
      // Snap center to grid
      const centerX = x + displaySize.width / 2;
      const centerY = y + displaySize.height / 2;
      const gridX = Math.round(centerX / grid) * grid;
      const gridY = Math.round(centerY / grid) * grid;
      bestSnap = { x: gridX - displaySize.width / 2, y: gridY - displaySize.height / 2 };
    }
    return bestSnap;
  }

  // Utility: Try to nudge to a nearby grid point if overlapping
  function findNonOverlappingPosition(x: number, y: number, displaySize: { width: number; height: number }, entry: SymbolCatalogEntry): { x: number; y: number } | null {
    if (!isOverlapping(x, y, displaySize)) return { x, y };
    // Try 8 neighbors (N, NE, E, SE, S, SW, W, NW)
    const grid = 20;
    const directions = [
      [0, -grid], [grid, -grid], [grid, 0], [grid, grid],
      [0, grid], [-grid, grid], [-grid, 0], [-grid, -grid]
    ];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const clamped = clampSymbolPosition(nx, ny, displaySize);
      if (!isOverlapping(clamped.x, clamped.y, displaySize)) {
        return clamped;
      }
    }
    // Still overlapping
    return null;
  }

  // --- Improved drop logic ---
  const handleContainerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedSymbolType || !dragPreviewPosition) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
    const screenX = x - rect.left;
    const screenY = y - rect.top;
    const gridOffsetX = (containerSize.width - PAPER_WIDTH) / 2;
    const gridOffsetY = (containerSize.height - PAPER_HEIGHT) / 2;
    const entry = symbolCatalog.find(s => s.type === draggedSymbolType);
    if (!entry) return;
    const displaySize = entry.displaySize || { width: 20, height: 20 };
    // Initial position (centered on cursor)
    let symbolX = (screenX - gridOffsetX - pan.x) / zoom - displaySize.width / 2;
    let symbolY = (screenY - gridOffsetY - pan.y) / zoom - displaySize.height / 2;
    // Snap
    const snapped = snapSymbolToGrid(symbolX, symbolY, entry);
    // Clamp
    const clamped = clampSymbolPosition(snapped.x, snapped.y, displaySize);
    // Overlap check and nudge
    const finalPos = findNonOverlappingPosition(clamped.x, clamped.y, displaySize, entry);
    if (!finalPos) {
      // Placement invalid, show feedback (handled in preview)
      setIsDragOver(false);
      if (setDraggedSymbolType) setDraggedSymbolType(null);
      if (setDragPreviewPosition) setDragPreviewPosition(null);
      return;
    }
    // Add the symbol
    addSymbol({
      type: draggedSymbolType,
      position: finalPos,
      rotation: 0,
      scale: 1,
      properties: {},
      connections: []
    });
    if (setDraggedSymbolType) setDraggedSymbolType(null);
    if (setDragPreviewPosition) setDragPreviewPosition(null);
    setIsDragOver(false);
  }, [draggedSymbolType, dragPreviewPosition, containerSize, pan, zoom, snapToGrid, symbols, addSymbol, setDraggedSymbolType, setDragPreviewPosition]);

  // Handle drag over for visual feedback
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedSymbolType) {
      setIsDragOver(true);
    }
  }, [draggedSymbolType]);

  // Handle drag leave
  const handlePointerLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  // Responsive scaling
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const scale = Math.min(clientWidth / PAPER_WIDTH, clientHeight / PAPER_HEIGHT);
        setContainerSize({
          width: PAPER_WIDTH * scale,
          height: PAPER_HEIGHT * scale,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Title block grid calculations
  const getCellRect = (row: number, col: number, rowSpan = 1, colSpan = 1) => {
    const x = PAPER_WIDTH - BORDER_THICKNESS - TITLE_BLOCK_WIDTH + TITLE_BLOCK_COLS.slice(0, col).reduce((a, b) => a + b, 0);
    const y = PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT + TITLE_BLOCK_ROWS.slice(0, row).reduce((a, b) => a + b, 0);
    const w = TITLE_BLOCK_COLS.slice(col, col + colSpan).reduce((a, b) => a + b, 0);
    const h = TITLE_BLOCK_ROWS.slice(row, row + rowSpan).reduce((a, b) => a + b, 0);
    return { x, y, w, h };
  };

  // Editable field logic
  const handleTextClick = (key: string) => {
    if (key === 'logo') return; // Don't edit logo
    const def = fieldDefs.find((f) => f.key === key);
    if (!def) return;
    const { x, y, w, h } = getCellRect(def.row, def.col, def.rowSpan, def.colSpan);
    setEditingField(key);
    setInputValue(titleBlock[key as keyof typeof titleBlock] || '');
    setInputPos({ x, y, w, h });
  };
  const handleInputBlur = () => {
    if (editingField) {
      setTitleBlock((prev) => ({ ...prev, [editingField]: inputValue }));
      setEditingField(null);
      setInputPos(null);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // Render grid lines inside the drawing area
  const renderGrid = () => {
    const lines = [];
    // Vertical grid lines - inside the border, full height
    for (let x = BORDER_THICKNESS; x <= PAPER_WIDTH - BORDER_THICKNESS; x += GRID_SPACING) {
      lines.push(
        <Line
          key={`vgrid${x}`}
          points={[x, BORDER_THICKNESS, x, PAPER_HEIGHT - BORDER_THICKNESS]}
          stroke="#eee"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    // Horizontal grid lines - inside the border, full height
    for (let y = BORDER_THICKNESS; y <= PAPER_HEIGHT - BORDER_THICKNESS; y += GRID_SPACING) {
      lines.push(
        <Line
          key={`hgrid${y}`}
          points={[BORDER_THICKNESS, y, PAPER_WIDTH - BORDER_THICKNESS, y]}
          stroke="#eee"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    return lines;
  };

  // Add viewport culling utility
  const isInViewport = (element: { x: number; y: number; width?: number; height?: number }, viewport: { x: number; y: number; width: number; height: number }) => {
    const elementWidth = element.width || 40;
    const elementHeight = element.height || 40;
    return (
      element.x + elementWidth >= viewport.x &&
      element.x <= viewport.x + viewport.width &&
      element.y + elementHeight >= viewport.y &&
      element.y <= viewport.y + viewport.height
    );
  };

  // Calculate viewport for culling
  const viewport = useMemo(() => {
    const padding = 100; // Extra padding to prevent pop-in
    return {
      x: -pan.x / zoom - padding,
      y: -pan.y / zoom - padding,
      width: containerSize.width / zoom + padding * 2,
      height: containerSize.height / zoom + padding * 2,
    };
  }, [pan, zoom, containerSize]);

  // Filter symbols and wires for viewport culling
  const visibleSymbols = useMemo(() => 
    symbols.filter(symbol => 
      isInViewport(symbol.position, viewport)
    ), [symbols, viewport]
  );

  const visibleWires = useMemo(() => 
    wires.filter(wire => {
      const wireBounds = {
        x: Math.min(wire.startPoint.x, wire.endPoint.x),
        y: Math.min(wire.startPoint.y, wire.endPoint.y),
        width: Math.abs(wire.endPoint.x - wire.startPoint.x),
        height: Math.abs(wire.endPoint.y - wire.startPoint.y),
      };
      return isInViewport(wireBounds, viewport);
    }), [wires, viewport]
  );

  // Render wires (selectable and moveable)
  const renderWires = () =>
    visibleWires.map((wire) => {
      const isSelected = selectedElements.includes(wire.id);
      return (
        <Group
          key={wire.id}
          draggable={selectToolActive || handToolActive}
          onDragEnd={(selectToolActive || handToolActive) ? e => {
            const group = e.target;
            const dx = group.x();
            const dy = group.y();

            updateWire(wire.id, {
              startPoint: { x: wire.startPoint.x + dx, y: wire.startPoint.y + dy },
              endPoint: { x: wire.endPoint.x + dx, y: wire.endPoint.y + dy }
            });

            group.x(0);
            group.y(0);
            e.cancelBubble = true;
          } : undefined}
          onDragStart={e => { e.cancelBubble = true; }}
        >
          <Line
            points={[
              wire.startPoint.x,
              wire.startPoint.y,
              wire.endPoint.x,
              wire.endPoint.y,
            ]}
            stroke={isSelected ? '#1976d2' : wire.properties.color || '#333'}
            strokeWidth={isSelected ? (wire.properties.thickness || 2) + 2 : wire.properties.thickness || 2}
            onClick={selectToolActive ? () => selectElement(wire.id) : undefined}
            onTap={selectToolActive ? () => selectElement(wire.id) : undefined}
            lineCap="round"
            lineJoin="round"
            shadowForStrokeEnabled={isSelected}
            shadowColor={isSelected ? '#1976d2' : undefined}
            shadowBlur={isSelected ? 6 : 0}
          />
          {/* Draggable handles for selected wire */}
          {isSelected && (
            <>
              <Circle
                x={wire.startPoint.x}
                y={wire.startPoint.y}
                radius={8}
                fill="#1976d2"
                opacity={0.7}
                draggable={selectToolActive || handToolActive}
                onDragStart={e => { e.cancelBubble = true; }}
                onDragEnd={(selectToolActive || handToolActive) ? e => {
                  updateWire(wire.id, {
                    startPoint: { x: e.target.x(), y: e.target.y() },
                  });
                  e.cancelBubble = true;
                } : undefined}
                onClick={selectToolActive ? e => { e.cancelBubble = true; selectElement(wire.id); } : undefined}
                onTap={selectToolActive ? e => { e.cancelBubble = true; selectElement(wire.id); } : undefined}
              />
              <Circle
                x={wire.endPoint.x}
                y={wire.endPoint.y}
                radius={8}
                fill="#1976d2"
                opacity={0.7}
                draggable={selectToolActive || handToolActive}
                onDragStart={e => { e.cancelBubble = true; }}
                onDragEnd={(selectToolActive || handToolActive) ? e => {
                  updateWire(wire.id, {
                    endPoint: { x: e.target.x(), y: e.target.y() },
                  });
                  e.cancelBubble = true;
                } : undefined}
                onClick={selectToolActive ? e => { e.cancelBubble = true; selectElement(wire.id); } : undefined}
                onTap={selectToolActive ? e => { e.cancelBubble = true; selectElement(wire.id); } : undefined}
              />
            </>
          )}
        </Group>
      );
    });

  // Render symbols (selectable and moveable)
  const handleSymbolClick = useCallback((symbolId: string) => {
    if (selectToolActive && !isPanning && !pendingPan) {
      selectElement(symbolId);
    }
  }, [selectToolActive, isPanning, pendingPan, selectElement]);

  const renderSymbols = () =>
    visibleSymbols.map((symbol) => (
      <Group
        key={symbol.id}
        draggable={selectToolActive || handToolActive}
        onDragStart={(e) => {
          // Store original position for potential undo
          e.target.setAttr('originalPosition', { x: symbol.position.x, y: symbol.position.y });
        }}
        onDragMove={(e) => {
          // Provide real-time visual feedback during drag
          const group = e.target;
          const pos = group.position();
          
          // Show grid snapping preview if enabled
          if (snapToGrid) {
            const grid = useCanvasStore.getState().gridSize || GRID_SPACING;
            const catalogEntry = symbolCatalog.find(s => s.type === symbol.type);
            const displaySize = catalogEntry?.displaySize || { width: 20, height: 20 };
            
            // Snap to grid during drag
            const snappedX = Math.round(pos.x / grid) * grid;
            const snappedY = Math.round(pos.y / grid) * grid;
            
            // Update position with snapping
            group.position({ x: snappedX, y: snappedY });
          }
        }}
        onDragEnd={e => {
          const group = e.target;
          let { x, y } = group.position();
          
          // Get symbol info for bounds checking
          const catalogEntry = symbolCatalog.find(s => s.type === symbol.type);
          const displaySize = catalogEntry?.displaySize || { width: 20, height: 20 };
          
          // Snap to grid if enabled
          if (snapToGrid) {
            const grid = useCanvasStore.getState().gridSize || GRID_SPACING;
            
            // Snap based on connection points for better alignment
            const connectionPoints = catalogEntry?.defaultConnectionPoints || [];
            if (connectionPoints.length > 0) {
              const primaryCP = connectionPoints[0];
              const cpX = primaryCP.position.x;
              const cpY = primaryCP.position.y;
              
              const targetCPX = Math.round((x + cpX) / grid) * grid;
              const targetCPY = Math.round((y + cpY) / grid) * grid;
              
              x = targetCPX - cpX;
              y = targetCPY - cpY;
            } else {
              x = Math.round(x / grid) * grid;
              y = Math.round(y / grid) * grid;
            }
          }
          
          // Check bounds and constrain to drawing area
          const minX = BORDER_THICKNESS;
          const minY = BORDER_THICKNESS;
          const maxX = PAPER_WIDTH - BORDER_THICKNESS - displaySize.width;
          const maxY = PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT - displaySize.height;
          
          x = Math.max(minX, Math.min(maxX, x));
          y = Math.max(minY, Math.min(maxY, y));
          
          // Check for collisions with other symbols (excluding self)
          const collisionMargin = 2;
          const hasCollision = symbols.some(otherSymbol => {
            if (otherSymbol.id === symbol.id) return false;
            
            const otherEntry = symbolCatalog.find(s => s.type === otherSymbol.type);
            const otherSize = otherEntry?.displaySize || { width: 20, height: 20 };
            
            return (
              x < otherSymbol.position.x + otherSize.width + collisionMargin &&
              x + displaySize.width + collisionMargin > otherSymbol.position.x &&
              y < otherSymbol.position.y + otherSize.height + collisionMargin &&
              y + displaySize.height + collisionMargin > otherSymbol.position.y
            );
          });
          
          if (hasCollision) {
            // Revert to original position if collision detected
            const originalPos = group.getAttr('originalPosition');
            if (originalPos) {
              x = originalPos.x;
              y = originalPos.y;
            }
          }
          
          // Update symbol position
          moveSymbol(symbol.id, { x, y });
          
          // Reset group position to 0 since we're using absolute positioning
          group.position({ x: 0, y: 0 });
        }}
        onClick={() => handleSymbolClick(symbol.id)}
      >
        <SymbolElement
          type={symbol.type}
          position={symbol.position}
          rotation={symbol.rotation}
          scale={symbol.scale}
          selected={selectedElements.includes(symbol.id)}
          properties={symbol.properties}
          connections={symbol.connections}
        />
      </Group>
    ));

  // Draw title block grid lines
  const renderTitleBlockGrid = () => {
    const lines = [];
    let x = PAPER_WIDTH - BORDER_THICKNESS - TITLE_BLOCK_WIDTH;
    let y = PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT;
    // Vertical lines
    let xPos = x;
    for (let i = 0; i <= TITLE_BLOCK_COLS.length; i++) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[
            xPos,
            y,
            xPos,
            y + TITLE_BLOCK_HEIGHT,
          ]}
          stroke="#111"
          strokeWidth={1}
        />
      );
      xPos += TITLE_BLOCK_COLS[i] || 0;
    }
    // Horizontal lines
    let yPos = y;
    for (let i = 0; i <= TITLE_BLOCK_ROWS.length; i++) {
      lines.push(
        <Line
          key={`h${i}`}
          points={[
            x,
            yPos,
            x + TITLE_BLOCK_WIDTH,
            yPos,
          ]}
          stroke="#111"
          strokeWidth={1}
        />
      );
      yPos += TITLE_BLOCK_ROWS[i] || 0;
    }
    return lines;
  };

  // Render title block fields
  const renderTitleBlockFields = () => {
    return fieldDefs.map((def) => {
      const { x, y, w, h } = getCellRect(def.row, def.col, def.rowSpan, def.colSpan);
      let value = titleBlock[def.key as keyof typeof titleBlock] || '';
      // Special case for page/total
      if (def.key === 'page') value = `${titleBlock.page} / ${titleBlock.pageTotal}`;
      if (def.key === 'pageTotal') return null;
      // Logo cell
      if (def.key === 'logo') {
        return (
          <Group key={def.key} x={x} y={y}>
            <Rect width={w} height={h} fill="#fff" />
            {logoImage && (
              <KonvaImage
                image={logoImage}
                width={w - 10}
                height={h - 10}
                x={5}
                y={5}
                listening={false}
              />
            )}
          </Group>
        );
      }
      return (
        <Group key={def.key} x={x} y={y}>
          <Rect
            width={w}
            height={h}
            fill="#fff"
            onClick={() => handleTextClick(def.key)}
            listening={true}
          />
          <Text
            text={value}
            fontSize={14}
            fill="#222"
            width={w}
            height={h}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      );
    });
  };

  // ESC to cancel wire drawing
  useEffect(() => {
    if (!wireToolActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingWire({ start: null, mouse: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wireToolActive]);

  // Mouse wheel zoom (centered on cursor)
  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.2, Math.min(2, newScale));
    // Calculate new pan so zoom is centered on pointer
    const mousePointTo = {
      x: (pointer.x - pan.x) / oldScale,
      y: (pointer.y - pan.y) / oldScale,
    };
    const newPan = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setZoom(newScale);
    setPan(newPan);
  }, [zoom, pan, setZoom, setPan]);

  // Listen for spacebar keydown/up
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pan with hand tool, spacebar, or middle mouse only
  const shouldStartPan = useCallback((e: any) => {
    return handToolActive || spacePressed || e.evt.button === 1;
  }, [handToolActive, spacePressed]);

  const handleStageMouseDown = useCallback((e: any) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert stage coordinates to canvas coordinates
    const canvasPointer = {
      x: (pointer.x - (containerSize.width - PAPER_WIDTH) / 2 - pan.x) / zoom,
      y: (pointer.y - (containerSize.height - PAPER_HEIGHT) / 2 - pan.y) / zoom
    };

    // Check if click is in drawing area
    const inDrawingArea = (
      canvasPointer.x >= 0 &&
      canvasPointer.y >= 0 &&
      canvasPointer.x <= PAPER_WIDTH &&
      canvasPointer.y <= PAPER_HEIGHT - TITLE_BLOCK_HEIGHT
    );

    if (!inDrawingArea) return;

    // Text tool
    if (textToolActive) {
      // Convert back to screen coordinates for text input positioning
      const screenPos = canvasToScreen(canvasPointer.x, canvasPointer.y);
      setTextInputPosition(screenPos);
      setTextInputMode(true);
      return;
    }

    // If wire tool is active, always process wire drawing logic first
    if (wireToolActive) {
      let snap = getNearestSymbolCenter(canvasPointer) || canvasPointer;
      if (snapToGrid) {
        const grid = useCanvasStore.getState().gridSize || GRID_SPACING;
        snap = {
          x: Math.round(snap.x / grid) * grid,
          y: Math.round(snap.y / grid) * grid,
        };
      }
      if (!drawingWire.start) {
        setDrawingWire({ start: snap, mouse: snap });
      } else {
        // Finish wire
        let startPoint = drawingWire.start;
        if (snapToGrid) {
          const grid = useCanvasStore.getState().gridSize || GRID_SPACING;
          startPoint = {
            x: Math.round(startPoint.x / grid) * grid,
            y: Math.round(startPoint.y / grid) * grid,
          };
        }
        addWire({
          startPoint,
          endPoint: snap,
          wireType: WireType.CONTROL,
          properties: {
            color: '#000000',
            thickness: 2,
            material: 'copper',
            insulation: 'PVC',
          },
        });
        setDrawingWire({ start: null, mouse: null });
      }
      return;
    }
    // Only use pan/drag threshold logic for Hand tool, Spacebar, or middle mouse
    if (shouldStartPan(e)) {
      setPendingPan(pointer);
      setLastPointer(pointer);
      return;
    }
  }, [textToolActive, wireToolActive, drawingWire, addWire, getNearestSymbolCenter, shouldStartPan, setPendingPan, setLastPointer, snapToGrid, pan, zoom, containerSize, canvasToScreen]);

  const handleStageMouseMove = useCallback((e: any) => {
    const pointer = e.target.getStage().getPointerPosition();
    if (pendingPan && pointer) {
      const dx = pointer.x - pendingPan.x;
      const dy = pointer.y - pendingPan.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        setIsPanning(true);
        setPendingPan(null);
        document.body.style.cursor = 'grabbing';
      }
    }
    if (isPanning && lastPointer && pointer) {
      const dx = pointer.x - lastPointer.x;
      const dy = pointer.y - lastPointer.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      setLastPointer(pointer);
      return;
    }
    if (!wireToolActive) return;
    if (!drawingWire.start) return;
    if (!pointer) return;
    
    // Convert stage coordinates to canvas coordinates
    const canvasPointer = {
      x: (pointer.x - (containerSize.width - PAPER_WIDTH) / 2 - pan.x) / zoom,
      y: (pointer.y - (containerSize.height - PAPER_HEIGHT) / 2 - pan.y) / zoom
    };
    
    let snap = getNearestSymbolCenter(canvasPointer) || canvasPointer;
    if (snapToGrid) {
      const grid = useCanvasStore.getState().gridSize || GRID_SPACING;
      snap = {
        x: Math.round(snap.x / grid) * grid,
        y: Math.round(snap.y / grid) * grid,
      };
    }
    setDrawingWire((dw) => ({ ...dw, mouse: snap }));
  }, [pendingPan, isPanning, lastPointer, pan, setPan, wireToolActive, snapToGrid, drawingWire.start, getNearestSymbolCenter, zoom, containerSize]);

  const handleStageMouseUp = useCallback((e?: any) => {
    if (pendingPan) {
      // If mouseup before drag threshold, treat as click (for selection)
      setPendingPan(null);
      setIsPanning(false);
      setLastPointer(null);
      document.body.style.cursor = '';
      return;
    }
    setIsPanning(false);
    setLastPointer(null);
    document.body.style.cursor = '';
  }, [pendingPan]);

  // Always reset pan state on window blur
  useEffect(() => {
    const resetPan = () => {
      setIsPanning(false);
      setPendingPan(null);
      setLastPointer(null);
      document.body.style.cursor = '';
    };
    window.addEventListener('blur', resetPan);
    return () => window.removeEventListener('blur', resetPan);
  }, []);

  // Attach mouseup to window for pan end
  useEffect(() => {
    if (!isPanning && !pendingPan) return;
    const up = (e: any) => handleStageMouseUp(e);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [isPanning, pendingPan, handleStageMouseUp]);

  // Double-click to reset zoom/pan
  const handleStageDblClick = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [setZoom, setPan]);

  // Memoize grid lines
  const gridLines = useMemo(() => renderGrid(), [renderGrid]);
  // Memoize wires
  const wiresMemo = useMemo(() => renderWires(), [renderWires]);
  // Memoize symbols
  const symbolsMemo = useMemo(() => renderSymbols(), [renderSymbols]);
  // Memoize title block grid and fields
  const titleBlockGridMemo = useMemo(() => renderTitleBlockGrid(), [renderTitleBlockGrid]);
  const titleBlockFieldsMemo = useMemo(() => renderTitleBlockFields(), [renderTitleBlockFields]);
  // Memoize event handlers

  const handleStageMouseDownMemo = useCallback(handleStageMouseDown, [handleStageMouseDown]);
  const handleStageMouseMoveMemo = useCallback(handleStageMouseMove, [handleStageMouseMove]);

  // Render text elements
  const renderTextElements = () =>
    textElements.map((textElement) => (
      <Group
        key={textElement.id}
        draggable={selectToolActive}
        onDragEnd={e => {
          const { x, y } = e.target.position();
          // Update text element position
        }}
        onClick={selectToolActive ? () => selectElement(textElement.id) : undefined}
      >
        <Text
          x={textElement.position.x}
          y={textElement.position.y}
          text={textElement.text}
          fontSize={textElement.fontSize}
          fontFamily={textElement.fontFamily}
          fill={textElement.color}
          rotation={textElement.rotation}
          align={textElement.alignment}
          selected={selectedElements.includes(textElement.id)}
        />
      </Group>
    ));

  // Main render
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#222',
        cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : selectToolActive ? 'pointer' : handToolActive ? 'grab' : wireToolActive ? 'crosshair' : textToolActive ? 'text' : 'default',
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handleContainerPointerUp}
    >
      {/* Drop zone highlight */}
      {draggedSymbolType && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: isDragOver ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
            border: isDragOver ? '2px dashed #1976d2' : '2px dashed transparent',
            zIndex: 10,
            transition: 'background 0.2s, border 0.2s',
          }}
        />
      )}
      {/* Symbol drag preview */}
      {draggedSymbolType && dragPreviewPosition && (() => {
        const entry = symbolCatalog.find(s => s.type === draggedSymbolType);
        if (!entry) return null;
        const displaySize = entry.displaySize || { width: 20, height: 20 };
        const connectionPoints = entry.defaultConnectionPoints || [];
        const container = containerRef.current;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        const x = dragPreviewPosition.x - rect.left;
        const y = dragPreviewPosition.y - rect.top;
        const gridOffsetX = (containerSize.width - PAPER_WIDTH) / 2;
        const gridOffsetY = (containerSize.height - PAPER_HEIGHT) / 2;
        // Initial position (centered on cursor)
        let symbolX = (x - gridOffsetX - pan.x) / zoom - displaySize.width / 2;
        let symbolY = (y - gridOffsetY - pan.y) / zoom - displaySize.height / 2;
        // Snap
        const snapped = snapSymbolToGrid(symbolX, symbolY, entry);
        // Clamp
        const clamped = clampSymbolPosition(snapped.x, snapped.y, displaySize);
        // Overlap check
        const overlapping = isOverlapping(clamped.x, clamped.y, displaySize);
        // Show red border if invalid
        const borderColor = overlapping ? '#d32f2f' : '#1976d2';
        const backgroundColor = overlapping ? 'rgba(211,47,47,0.08)' : 'rgba(25,118,210,0.1)';
        // Transform back to screen coordinates for preview
        const previewX = clamped.x * zoom + pan.x + gridOffsetX;
        const previewY = clamped.y * zoom + pan.y + gridOffsetY;
        return (
          <div
            style={{
              position: 'fixed',
              left: previewX,
              top: previewY,
              width: displaySize.width * zoom,
              height: displaySize.height * zoom,
              border: `2px dashed ${borderColor}`,
              borderRadius: '4px',
              backgroundColor,
              pointerEvents: 'none',
              zIndex: 1000,
              transform: 'translate(-50%, -50%)',
              transition: 'all 0.1s ease-out',
            }}
          >
            {/* Connection point indicators */}
            {connectionPoints.map((cp, index) => {
              const cpScreenX = previewX + (cp.position.x - displaySize.width / 2) * zoom;
              const cpScreenY = previewY + (cp.position.y - displaySize.height / 2) * zoom;
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: cpScreenX,
                    top: cpScreenY,
                    width: 6 * zoom,
                    height: 6 * zoom,
                    backgroundColor: '#43a047',
                    border: '1px solid #fff',
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}
          </div>
        );
      })()}
      {/* Editable input overlay */}
      {editingField && inputPos && (
        <input
          type="text"
          value={inputValue}
          autoFocus
          style={{
            position: 'absolute',
            left: `${(inputPos.x * containerSize.width) / PAPER_WIDTH}px`,
            top: `${(inputPos.y * containerSize.height) / PAPER_HEIGHT}px`,
            width: `${(inputPos.w * containerSize.width) / PAPER_WIDTH}px`,
            height: `${(inputPos.h * containerSize.height) / PAPER_HEIGHT}px`,
            fontSize: '1rem',
            zIndex: 10,
            padding: 2,
          }}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
        />
      )}
      {/* Text input overlay */}
      {textInputMode && textInputPosition && (
        <input
          type="text"
          autoFocus
          style={{
            position: 'absolute',
            left: `${textInputPosition.x}px`,
            top: `${textInputPosition.y}px`,
            fontSize: '14px',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            padding: '4px 8px',
            zIndex: 1000,
          }}
          onBlur={(e) => {
            if (e.target.value.trim()) {
              addTextElement({
                text: e.target.value,
                position: textInputPosition!,
                fontSize: 14,
                fontFamily: 'Arial',
                color: '#333',
                rotation: 0,
                alignment: 'left'
              });
            }
            setTextInputMode(false);
            setTextInputPosition(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              setTextInputMode(false);
              setTextInputPosition(null);
            }
          }}
        />
      )}
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0003' }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDownMemo}
        onMouseMove={handleStageMouseMoveMemo}
        onDblClick={handleStageDblClick}
      >
        {/* Single layer with zoom and pan applied to everything */}
        <Layer
          x={(containerSize.width - PAPER_WIDTH) / 2 + pan.x}
          y={(containerSize.height - PAPER_HEIGHT) / 2 + pan.y}
          scaleX={zoom}
          scaleY={zoom}
        >
          {/* EGD Border */}
          <Rect
            x={0}
            y={0}
            width={PAPER_WIDTH}
            height={PAPER_HEIGHT}
            stroke="#111"
            strokeWidth={BORDER_THICKNESS}
            listening={false}
          />
          {/* Grid */}
          {showGrid !== false && gridLines}
          {/* Title Block */}
          <Group>
            <Rect
              x={PAPER_WIDTH - BORDER_THICKNESS - TITLE_BLOCK_WIDTH}
              y={PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT}
              width={TITLE_BLOCK_WIDTH}
              height={TITLE_BLOCK_HEIGHT}
              fill="#fff"
              stroke="#111"
              strokeWidth={2}
            />
            {titleBlockGridMemo}
            {titleBlockFieldsMemo}
          </Group>
          
          {/* Render symbols */}
          {symbolsMemo}
          {/* Render wires above symbols */}
          {wiresMemo}
          {/* Preview wire while drawing above symbols */}
          {wireToolActive && drawingWire.start && drawingWire.mouse && (
            <>
              <Line
                points={[
                  drawingWire.start.x,
                  drawingWire.start.y,
                  drawingWire.mouse.x,
                  drawingWire.mouse.y,
                ]}
                stroke="#1976d2"
                strokeWidth={3}
                dash={[8, 8]}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
              {/* Snap highlight at end */}
              <Rect
                x={drawingWire.mouse.x - 6}
                y={drawingWire.mouse.y - 6}
                width={12}
                height={12}
                fill="#1976d2"
                opacity={0.2}
                cornerRadius={6}
                listening={false}
              />
            </>
          )}
          {/* Snap highlight at start */}
          {wireToolActive && drawingWire.start && (
            <Rect
              x={drawingWire.start.x - 6}
              y={drawingWire.start.y - 6}
              width={12}
              height={12}
              fill="#1976d2"
              opacity={0.2}
              cornerRadius={6}
              listening={false}
            />
          )}
          {/* Render text elements */}
          {renderTextElements()}
        </Layer>
      </Stage>
    </div>
  );
};

export default React.memo(CanvasArea); 