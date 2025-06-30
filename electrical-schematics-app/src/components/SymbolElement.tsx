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
  if (!catalogEntry) return null;

  // Merge default and actual connection points
  const connectionPoints = catalogEntry.defaultConnectionPoints.map((cp, i) => {
    const actual = connections.find((c) => c.id === cp.id) || cp;
    return actual;
  });

  return (
    <Group
      x={position.x}
      y={position.y}
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      onClick={onClick}
    >
      <Path
        data={catalogEntry.svgPath}
        stroke={selected ? '#1976d2' : '#222'}
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
      />
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