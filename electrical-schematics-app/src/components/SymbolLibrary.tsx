import React, { useState } from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import { symbolCatalog } from '../symbols/catalog';
import { SymbolType } from '../types';

const SymbolSVG: React.FC<{ svgPath: string }> = ({ svgPath }) => (
  <svg width={32} height={32} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <path d={svgPath} stroke="#222" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SymbolLibrary: React.FC = () => {
  const [isDragging, setIsDragging] = useState<SymbolType | null>(null);

  const handleDragStart = (e: React.DragEvent, symbolType: SymbolType) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    setIsDragging(symbolType);
    e.dataTransfer.setData('application/x-symbol-type', symbolType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(null);
  };

  return (
    <Paper elevation={1} sx={{ p: 1 }}>
      <List dense>
        {symbolCatalog.map((entry) => (
          <ListItemButton
            key={entry.type + entry.name}
            draggable={!isDragging || isDragging === entry.type}
            onDragStart={(e) => handleDragStart(e, entry.type)}
            onDragEnd={handleDragEnd}
            sx={{ cursor: isDragging === entry.type ? 'grabbing' : 'grab', userSelect: 'none', opacity: isDragging && isDragging !== entry.type ? 0.5 : 1 }}
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