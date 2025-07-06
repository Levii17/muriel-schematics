import React, { useState } from 'react';
import { Group, Path, Circle, Rect } from 'react-konva';
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
  const [isHovered, setIsHovered] = useState(false);
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

  // Get appearance properties with defaults
  const displaySize = catalogEntry.displaySize || { width: 20, height: 20 };
  const strokeWidth = catalogEntry.strokeWidth || 2;
  const connectionPointRadius = catalogEntry.connectionPointRadius || 3;
  const selectionStrokeWidth = catalogEntry.selectionStrokeWidth || 3;

  // Merge default and actual connection points
  const connectionPoints = catalogEntry.defaultConnectionPoints.map((cp, i) => {
    const actual = connections.find((c) => c.id === cp.id) || cp;
    return actual;
  });

  // Calculate visual states
  const isActive = selected || isHovered;
  const currentStrokeWidth = isActive ? selectionStrokeWidth : strokeWidth;
  const strokeColor = selected ? '#1976d2' : isHovered ? '#666' : '#222';

  // --- New: Support custom renderer ---
  if (catalogEntry.renderer) {
    const CustomRenderer = catalogEntry.renderer;
    return (
      <Group 
        x={position.x} 
        y={position.y} 
        rotation={rotation} 
        scaleX={scale} 
        scaleY={scale} 
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CustomRenderer selected={selected} isHovered={isHovered} {...properties} />
        {connectionPoints.map((cp) => (
          <Circle
            key={cp.id}
            x={cp.position.x}
            y={cp.position.y}
            radius={connectionPointRadius}
            fill="#fff"
            stroke="#43a047"
            strokeWidth={2}
            opacity={isActive ? 1 : 0.7}
          />
        ))}
      </Group>
    );
  }

  // --- SVG-based rendering ---
  // Prefer paths array if present
  if (catalogEntry.paths && Array.isArray(catalogEntry.paths)) {
    return (
      <Group 
        x={position.x} 
        y={position.y} 
        rotation={rotation} 
        scaleX={scale} 
        scaleY={scale} 
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Selection/hover background */}
        {isActive && (
          <Rect
            x={-5}
            y={-5}
            width={displaySize.width + 10}
            height={displaySize.height + 10}
            fill={selected ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
            stroke={selected ? '#1976d2' : '#666'}
            strokeWidth={selected ? 2 : 1}
            cornerRadius={4}
            listening={false}
          />
        )}
        
        {catalogEntry.paths.map((p, i) => (
          <Path
            key={i}
            data={p.d}
            stroke={p.stroke || strokeColor}
            strokeWidth={p.strokeWidth || currentStrokeWidth}
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
            radius={connectionPointRadius}
            fill="#fff"
            stroke="#43a047"
            strokeWidth={2}
            opacity={isActive ? 1 : 0.7}
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection/hover background */}
      {isActive && (
        <Rect
          x={-5}
          y={-5}
          width={displaySize.width + 10}
          height={displaySize.height + 10}
          fill={selected ? 'rgba(25, 118, 210, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
          stroke={selected ? '#1976d2' : '#666'}
          strokeWidth={selected ? 2 : 1}
          cornerRadius={4}
          listening={false}
        />
      )}
      
      {isPathValid ? (
        <Path
          data={catalogEntry.svgPath}
          stroke={strokeColor}
          strokeWidth={currentStrokeWidth}
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
          radius={connectionPointRadius}
          fill="#fff"
          stroke="#43a047"
          strokeWidth={2}
          opacity={isActive ? 1 : 0.7}
        />
      ))}
    </Group>
  );
};

export default SymbolElement; 