import React from 'react';
import ResistorSymbol from './symbols/ResistorSymbol';
import CapacitorSymbol from './symbols/CapacitorSymbol';
import InductorSymbol from './symbols/InductorSymbol';
import { List, ListItem, ListItemIcon, ListItemText, Paper, Typography, Box } from '@mui/material';
import { SquareFoot, DeveloperBoard, Cable } from '@mui/icons-material'; // Example icons

// Define a type for our symbols
interface SymbolListItem {
  id: string;
  name: string;
  icon?: React.ReactElement; // MUI icon
  component: React.ReactElement; // The actual SVG/Konva symbol for drag preview
}


const SymbolLibrary: React.FC = () => {
  const symbols: SymbolListItem[] = [
    {
      id: 'resistor',
      name: 'Resistor',
      icon: <DeveloperBoard />, // Placeholder icon
      component: <ResistorSymbol x={30} y={30} />
    },
    {
      id: 'capacitor',
      name: 'Capacitor',
      icon: <SquareFoot />, // Placeholder icon
      component: <CapacitorSymbol x={30} y={30} />
    },
    {
      id: 'inductor',
      name: 'Inductor',
      icon: <Cable />, // Placeholder icon
      component: <InductorSymbol x={30} y={30} />
    },
  ];

  const handleDragStart = (event: React.DragEvent<HTMLElement>, symbolId: string) => {
    event.dataTransfer.setData('symbolId', symbolId);
  };

  return (
    <Paper elevation={3} sx={{ padding: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Symbol Library
      </Typography>
      <List dense>
        {symbols.map((symbol) => (
          <ListItem
            key={symbol.id}
            draggable
            onDragStart={(event) => handleDragStart(event, symbol.id)}
            sx={{
              marginBottom: 1,
              cursor: 'grab',
              border: '1px dashed grey',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <ListItemIcon sx={{minWidth: 'auto', marginRight: 1}}>
              {symbol.icon || <DeveloperBoard />} {/* Fallback icon */}
            </ListItemIcon>
            {/* Optional: Tiny SVG preview directly in the list item if desired, or rely on name + icon */}
            {/* <Box sx={{ width: 30, height: 30, marginRight: 1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                 <svg width="24" height="24" viewBox="0 0 60 60">{symbol.component}</svg>
            </Box> */}
            <ListItemText primary={symbol.name} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default SymbolLibrary;
