import React, { useEffect } from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import ListSubheader from '@mui/material/ListSubheader';
import { symbolCatalog } from '../symbols/catalog';
import { SymbolType } from '../types';

interface SymbolLibraryProps {
  draggedSymbolType: SymbolType | null;
  setDraggedSymbolType: (type: SymbolType | null) => void;
  setDragPreviewPosition: (pos: { x: number; y: number } | null) => void;
  search?: string;
}

const SymbolSVG: React.FC<{ paths?: { d: string; stroke?: string; strokeWidth?: number; fill?: string }[]; viewBox?: string }> = ({ paths, viewBox = "0 0 24 24" }) => (
  <svg width={32} height={32} viewBox={viewBox} style={{ display: 'block' }}>
    {paths && paths.length > 0 ? (
      paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke || "#222"}
          strokeWidth={p.strokeWidth ?? 1.5}
          fill={p.fill || "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))
    ) : (
      // Fallback: render an X if no paths
      <path d="M4 4 L20 20 M20 4 L4 20" stroke="red" strokeWidth={2} />
    )}
  </svg>
);

const SymbolLibrary: React.FC<SymbolLibraryProps> = ({
  draggedSymbolType,
  setDraggedSymbolType,
  setDragPreviewPosition,
  search = '',
}) => {
  useEffect(() => {
    if (!draggedSymbolType) return;
    const handleMouseMove = (e: MouseEvent) => {
      setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      setDragPreviewPosition(null);
    };
  }, [draggedSymbolType, setDragPreviewPosition]);

  const searchLower = search.trim().toLowerCase();
  const filteredCatalog = symbolCatalog.filter(entry =>
    entry.name.toLowerCase().includes(searchLower) ||
    entry.type.toLowerCase().includes(searchLower)
  );

  // Group filtered symbols by category
  const symbolsByCategory: { [category: string]: typeof filteredCatalog } = {};
  filteredCatalog.forEach(entry => {
    if (!symbolsByCategory[entry.category]) symbolsByCategory[entry.category] = [];
    symbolsByCategory[entry.category].push(entry);
  });
  const sortedCategories = Object.keys(symbolsByCategory).sort();

  const handleDragStart = (e: React.DragEvent, symbolType: SymbolType) => {
    if (draggedSymbolType) {
      e.preventDefault();
      return;
    }
    setDraggedSymbolType(symbolType);
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    e.dataTransfer.setData('application/x-symbol-type', symbolType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedSymbolType(null);
    setDragPreviewPosition(null);
  };

  return (
    <Paper elevation={1} sx={{ p: 1 }}>
      <List dense>
        {sortedCategories.length === 0 && (
          <ListSubheader>No symbols found.</ListSubheader>
        )}
        {sortedCategories.map(category => (
          <React.Fragment key={category}>
            <ListSubheader>{category}</ListSubheader>
            {symbolsByCategory[category].map((entry) => (
              <ListItemButton
                key={entry.type + entry.name}
                draggable={!draggedSymbolType || draggedSymbolType === entry.type}
                onDragStart={(e) => handleDragStart(e, entry.type)}
                onDragEnd={handleDragEnd}
                sx={{
                  cursor: draggedSymbolType === entry.type ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  opacity: draggedSymbolType && draggedSymbolType !== entry.type ? 0.5 : 1,
                }}
              >
                <ListItemIcon>
                  <SymbolSVG paths={entry.paths} viewBox={entry.viewBox || '0 0 24 24'} />
                </ListItemIcon>
                <ListItemText primary={entry.name} />
              </ListItemButton>
            ))}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default SymbolLibrary; 