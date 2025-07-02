import React, { useEffect } from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import { symbolCatalog } from '../symbols/catalog';
import { SymbolType } from '../types';

interface SymbolLibraryProps {
  draggedSymbolType: SymbolType | null;
  setDraggedSymbolType: (type: SymbolType | null) => void;
  setDragPreviewPosition: (pos: { x: number; y: number } | null) => void;
  search?: string;
}

const SymbolSVG: React.FC<{ svgPath: string }> = ({ svgPath }) => (
  <svg width={32} height={32} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <path d={svgPath} stroke="#222" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
        {filteredCatalog.map((entry) => (
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
              <SymbolSVG svgPath={entry.svgPath} />
            </ListItemIcon>
            <ListItemText primary={entry.name} />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};

export default SymbolLibrary; 