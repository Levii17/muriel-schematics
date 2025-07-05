import React from 'react';
import { Group, Path, Circle } from 'react-konva';
import { SymbolType, ConnectionPoint } from '../types';
import { symbolCatalog } from '../symbols/catalog';

interface SymbolElementProps {
  type: SymbolType;
  position: { x: number; y: number };
  rotation: number;
  scale: number;
  selected?: boolean;
  properties?: Record<string, any>;
  connections?: ConnectionPoint[];
  onClick?: () => void;
}

const SymbolElement: React.FC<SymbolElementProps> = ({
  type,
  position,
  rotation,
  scale,
  selected = false,
  properties = {},
  connections = [],
  onClick,
}) => {
  const catalogEntry = symbolCatalog.find((s) => s.type === type);
  if (!catalogEntry) {
    console.warn(`Symbol type '${type}' not found in catalog.`);
    // Render a red X as a placeholder for unknown symbol types
    return (
      <Group x={position.x} y={position.y} rotation={rotation} scaleX={scale} scaleY={scale} onClick={onClick}>
        <Path data={'M0 0 L24 24 M24 0 L0 24'} stroke={'red'} strokeWidth={3} />
      </Group>
    );
  }

  // Merge default and actual connection points
  const connectionPoints = catalogEntry.defaultConnectionPoints.map((cp, i) => {
    const actual = connections.find((c) => c.id === cp.id) || cp;
    return actual;
  });

  // --- New: Support custom renderer ---
  if (catalogEntry.renderer) {
    const CustomRenderer = catalogEntry.renderer;
    return (
      <Group x={position.x} y={position.y} rotation={rotation} scaleX={scale} scaleY={scale} onClick={onClick}>
        <CustomRenderer selected={selected} {...properties} />
        {connectionPoints.map((cp) => (
          <Circle
            key={cp.id}
            x={cp.position.x}
            y={cp.position.y}
            radius={4}
            fill="#fff"
            stroke="#43a047"
            strokeWidth={2}
          />
        ))}
      </Group>
    );
  }

  // --- SVG-based rendering ---
  // Prefer paths array if present
  if (catalogEntry.paths && Array.isArray(catalogEntry.paths)) {
    return (
      <Group x={position.x} y={position.y} rotation={rotation} scaleX={scale} scaleY={scale} onClick={onClick}>
        {catalogEntry.paths.map((p, i) => (
          <Path
            key={i}
            data={p.d}
            stroke={p.stroke || (selected ? '#1976d2' : '#222')}
            strokeWidth={p.strokeWidth || 2}
            fill={p.fill || 'none'}
            lineCap="round"
            lineJoin="round"
          />
        ))}
        {connectionPoints.map((cp) => (
          <Circle
            key={cp.id}
            x={cp.position.x}
            y={cp.position.y}
            radius={4}
            fill="#fff"
            stroke="#43a047"
            strokeWidth={2}
          />
        ))}
      </Group>
    );
  }

  // Legacy svgPath support
  let isPathValid = true;
  if (!catalogEntry.svgPath || typeof catalogEntry.svgPath !== 'string' || catalogEntry.svgPath.trim() === '') {
    isPathValid = false;
    console.warn(`SVG path missing or invalid for symbol type '${type}'.`);
  }

  return (
    <Group
      x={position.x}
      y={position.y}
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      onClick={onClick}
    >
      {isPathValid ? (
        <Path
          data={catalogEntry.svgPath}
          stroke={selected ? '#1976d2' : '#222'}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      ) : (
        // Render a red X as a placeholder for malformed SVGs
        <Path data={'M0 0 L24 24 M24 0 L0 24'} stroke={'red'} strokeWidth={3} />
      )}
      {connectionPoints.map((cp) => (
        <Circle
          key={cp.id}
          x={cp.position.x}
          y={cp.position.y}
          radius={4}
          fill="#fff"
          stroke="#43a047"
          strokeWidth={2}
        />
      ))}
    </Group>
  );
};

export default SymbolElement; 