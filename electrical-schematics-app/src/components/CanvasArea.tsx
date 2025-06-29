import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import murielLogo from '../assets/muriel-logo.png';
import { useCanvasStore } from '../store/canvasStore';
import { SymbolType } from '../types';

// A3 size at 72dpi: 420mm x 297mm ~ 1050 x 742 px
const PAPER_WIDTH = 1050;
const PAPER_HEIGHT = 742;
const BORDER_THICKNESS = 6;
const TITLE_BLOCK_HEIGHT = 110;
const TITLE_BLOCK_WIDTH = 500;
const TITLE_BLOCK_ROWS = [40, 35, 35]; // heights for each row
const TITLE_BLOCK_COLS = [70, 150, 150, 70, 60]; // widths for each col
const GRID_SPACING = 20;

const DEFAULT_TITLE_BLOCK = {
  logo: 'murielLogo', // Placeholder for logo
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

const CanvasArea: React.FC = () => {
  const stageRef = useRef<any>(null);
  const [titleBlock, setTitleBlock] = useState(DEFAULT_TITLE_BLOCK);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputPos, setInputPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const symbols = useCanvasStore((s) => s.symbols);
  const addSymbol = useCanvasStore((s) => s.addSymbol);
  const [logoImage] = useImage(murielLogo);
  const selectedElements = useCanvasStore((s) => s.selectedElements);
  const selectElement = useCanvasStore((s) => s.selectElement);
  const moveSymbol = useCanvasStore((s) => s.moveSymbol);

  // Handle drop from SymbolLibrary
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const symbolType = e.dataTransfer.getData('application/x-symbol-type') as SymbolType;
    if (!symbolType) return;
    const boundingRect = stageRef.current?.container().getBoundingClientRect();
    const x = e.clientX - boundingRect.left;
    const y = e.clientY - boundingRect.top;
    if (
      x > BORDER_THICKNESS &&
      y > BORDER_THICKNESS &&
      x < PAPER_WIDTH - BORDER_THICKNESS &&
      y < PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT
    ) {
      addSymbol({
        type: symbolType,
        position: { x, y },
        rotation: 0,
        scale: 1,
        properties: {},
        connections: [],
      });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Responsive scaling
  const [containerSize, setContainerSize] = useState({ width: PAPER_WIDTH, height: PAPER_HEIGHT });
  const containerRef = useRef<HTMLDivElement>(null);
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
    for (let x = BORDER_THICKNESS + GRID_SPACING; x < PAPER_WIDTH - BORDER_THICKNESS; x += GRID_SPACING) {
      lines.push(
        <Line
          key={`vgrid${x}`}
          points={[x, BORDER_THICKNESS, x, PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT]}
          stroke="#eee"
          strokeWidth={1}
        />
      );
    }
    for (let y = BORDER_THICKNESS + GRID_SPACING; y < PAPER_HEIGHT - BORDER_THICKNESS - TITLE_BLOCK_HEIGHT; y += GRID_SPACING) {
      lines.push(
        <Line
          key={`hgrid${y}`}
          points={[BORDER_THICKNESS, y, PAPER_WIDTH - BORDER_THICKNESS, y]}
          stroke="#eee"
          strokeWidth={1}
        />
      );
    }
    return lines;
  };

  // Render symbols (selectable and moveable)
  const renderSymbols = () =>
    symbols.map((symbol) => (
      <Group
        key={symbol.id}
        x={symbol.position.x}
        y={symbol.position.y}
        draggable
        onClick={() => selectElement(symbol.id)}
        onTap={() => selectElement(symbol.id)}
        onDragEnd={e => {
          moveSymbol(symbol.id, { x: e.target.x(), y: e.target.y() });
        }}
      >
        <Rect
          width={40}
          height={40}
          fill="#fff"
          stroke={selectedElements.includes(symbol.id) ? '#1976d2' : '#333'}
          strokeWidth={selectedElements.includes(symbol.id) ? 4 : 2}
          cornerRadius={8}
        />
        <Text
          text={symbol.type}
          fontSize={12}
          fill="#222"
          width={40}
          height={40}
          align="center"
          verticalAlign="middle"
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
          <Rect width={w} height={h} fill="#fff" />
          <Text
            text={value}
            fontSize={14}
            fill="#222"
            width={w}
            height={h}
            align="center"
            verticalAlign="middle"
            onClick={() => handleTextClick(def.key)}
            listening={true}
          />
        </Group>
      );
    });
  };

  // Main render
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', background: '#222' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
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
      <Stage
        ref={stageRef}
        width={containerSize.width}
        height={containerSize.height}
        scaleX={containerSize.width / PAPER_WIDTH}
        scaleY={containerSize.height / PAPER_HEIGHT}
        style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0003' }}
      >
        <Layer>
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
          {renderGrid()}
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
            {renderTitleBlockGrid()}
            {renderTitleBlockFields()}
          </Group>
          {/* Render symbols */}
          {renderSymbols()}
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasArea; 