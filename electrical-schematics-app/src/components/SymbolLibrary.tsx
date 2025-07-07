import React, { useState, useCallback } from 'react';
import Paper from '@mui/material/Paper';
import { symbolCatalog } from '../symbols/catalog';
import { SymbolType } from '../types';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import SymbolSVG from './SymbolSVG';

interface SymbolLibraryProps {
  draggedSymbolType: SymbolType | null;
  setDraggedSymbolType: (type: SymbolType | null) => void;
  setDragPreviewPosition: (pos: { x: number; y: number } | null) => void;
  search?: string;
}

const SymbolLibrary: React.FC<SymbolLibraryProps> = ({
  draggedSymbolType,
  setDraggedSymbolType,
  setDragPreviewPosition,
  search = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);

  const searchLower = search.trim().toLowerCase();
  const filteredCatalog = symbolCatalog.filter(entry =>
    (entry.name.toLowerCase().includes(searchLower) ||
      entry.type.toLowerCase().includes(searchLower)) &&
    (selectedCategory === 'All' || entry.category === selectedCategory)
  );

  const allCategories = Array.from(new Set(symbolCatalog.map(s => s.category))).sort();

  // Custom drag handlers using pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent, symbolType: SymbolType) => {
    if (draggedSymbolType) {
      e.preventDefault();
      return;
    }

    // Set initial drag state
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDraggedSymbolType(symbolType);
    setDragPreviewPosition({ x: e.clientX, y: e.clientY });

    // Add global pointer event listeners
    const handlePointerMove = (e: PointerEvent) => {
      setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = (e: PointerEvent) => {
      setIsDragging(false);
      setDragStartPos(null);
      setDraggedSymbolType(null);
      setDragPreviewPosition(null);
      
      // Remove global listeners
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    // Add global listeners
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    // Prevent text selection during drag
    e.preventDefault();
  }, [draggedSymbolType, setDraggedSymbolType, setDragPreviewPosition]);

  return (
    <Paper elevation={1} sx={{ p: 1 }}>
      <FormControl fullWidth size="small" sx={{ mb: 1 }}>
        <InputLabel id="symbol-category-label">Category</InputLabel>
        <Select
          labelId="symbol-category-label"
          value={selectedCategory}
          label="Category"
          onChange={e => setSelectedCategory(e.target.value)}
        >
          <MenuItem value="All">All</MenuItem>
          {allCategories.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 2,
          p: 1
        }}>
          {filteredCatalog.length === 0 && (
            <Box sx={{ 
              gridColumn: '1 / -1',
              textAlign: 'center', 
              color: 'text.secondary', 
              py: 4 
            }}>
              No symbols found.
            </Box>
          )}
          {filteredCatalog.map((entry) => (
            <Tooltip title={entry.name} arrow key={entry.type + entry.name}>
              <Paper
                elevation={draggedSymbolType === entry.type ? 6 : 2}
                onPointerDown={(e) => handlePointerDown(e, entry.type)}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: draggedSymbolType === entry.type ? 'grabbing' : 'grab',
                  userSelect: 'none',
                  opacity: draggedSymbolType && draggedSymbolType !== entry.type ? 0.5 : 1,
                  transition: 'box-shadow 0.2s, background 0.2s',
                  boxShadow: draggedSymbolType === entry.type ? 6 : 2,
                  borderRadius: 2,
                  '&:hover': {
                    boxShadow: 6,
                    background: '#f0f4ff',
                  },
                  // Prevent text selection during drag
                  '&:active': {
                    cursor: 'grabbing',
                  },
                }}
              >
                <SymbolSVG paths={entry.paths} viewBox={entry.viewBox || '0 0 24 24'} />
                <Box sx={{ mt: 1, fontSize: 14, textAlign: 'center', color: 'text.primary', fontWeight: 500, wordBreak: 'break-word' }}>
                  {entry.name}
                </Box>
              </Paper>
            </Tooltip>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};

export default SymbolLibrary; 