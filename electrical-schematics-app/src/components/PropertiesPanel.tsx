import React, { useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { SymbolType, WireType, ElectricalSymbol, Wire } from '../types';
import { TextField, Typography, Divider, Box } from '@mui/material';

const PropertiesPanel: React.FC = () => {
  const symbols = useCanvasStore((s) => s.symbols);
  const wires = useCanvasStore((s) => s.wires);
  const selectedElements = useCanvasStore((s) => s.selectedElements);

  // Find selected items
  const selectedSymbols = useMemo(() => symbols.filter(s => selectedElements.includes(s.id)), [symbols, selectedElements]);
  const selectedWires = useMemo(() => wires.filter(w => selectedElements.includes(w.id)), [wires, selectedElements]);
  const totalSelected = selectedSymbols.length + selectedWires.length;

  if (totalSelected === 0) {
    return <Typography variant="body2" color="textSecondary">Select a symbol or wire to edit its properties.</Typography>;
  }

  // Single selection
  if (totalSelected === 1) {
    const item = selectedSymbols[0] || selectedWires[0];
    const isSymbol = !!selectedSymbols[0];
    return (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {isSymbol ? 'Symbol Properties' : 'Wire Properties'}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {/* Example: Show label and color for both, type for symbol, thickness for wire */}
        <TextField
          label="Label"
          value={item.properties?.label || ''}
          fullWidth
          margin="dense"
          // onChange={...} // To be implemented in next step
        />
        {isSymbol && (
          <TextField
            label="Type"
            value={item.type}
            fullWidth
            margin="dense"
            disabled
          />
        )}
        {!isSymbol && (
          <TextField
            label="Color"
            value={item.properties?.color || ''}
            fullWidth
            margin="dense"
            // onChange={...}
          />
        )}
        {/* Add more fields as needed */}
      </Box>
    );
  }

  // Multi-selection: show only batch-editable fields
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Batch Edit Properties
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <TextField
        label="Label"
        value={''}
        fullWidth
        margin="dense"
        // onChange={...}
        placeholder="Set label for all selected"
      />
      {/* Add more batch-editable fields as needed */}
    </Box>
  );
};

export default PropertiesPanel; 