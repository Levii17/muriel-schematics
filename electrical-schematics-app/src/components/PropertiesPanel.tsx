import React, { useMemo, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { SymbolType, WireType, ElectricalSymbol, Wire, WireProperties } from '../types';
import { TextField, Typography, Divider, Box, Button, MenuItem, InputLabel, FormControl, Select, Slider } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

const thicknessOptions = [1, 2, 3, 4, 5];

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const getWireProperties = (props: Partial<WireProperties> = {}): WireProperties => ({
  color: props.color ?? '#000000',
  thickness: props.thickness ?? 1,
  material: props.material ?? 'copper',
  insulation: props.insulation ?? 'PVC',
  ...props,
});

const PropertiesPanel: React.FC = React.memo(() => {
  const symbols = useCanvasStore((s) => s.symbols);
  const wires = useCanvasStore((s) => s.wires);
  const selectedElements = useCanvasStore((s) => s.selectedElements);
  const updateSymbol = useCanvasStore((s) => s.updateSymbol);
  const updateWire = useCanvasStore((s) => s.updateWire);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  // Find selected items
  const selectedSymbols = useMemo(() => symbols.filter(s => selectedElements.includes(s.id)), [symbols, selectedElements]);
  const selectedWires = useMemo(() => wires.filter(w => selectedElements.includes(w.id)), [wires, selectedElements]);
  const totalSelected = selectedSymbols.length + selectedWires.length;

  // Debounced update for text fields
  const debouncedUpdateSymbol = useMemo(() => debounce(updateSymbol, 200), [updateSymbol]);
  const debouncedUpdateWire = useMemo(() => debounce(updateWire, 200), [updateWire]);

  if (totalSelected === 0) {
    return <Typography variant="body2" color="textSecondary">Select a symbol or wire to edit its properties.</Typography>;
  }

  // Single selection
  if (totalSelected === 1) {
    const item = selectedSymbols[0] || selectedWires[0];
    const isSymbol = !!selectedSymbols[0];
    const handleChange = (field: string, value: any) => {
      if (isSymbol) {
        debouncedUpdateSymbol(item.id, { properties: { ...item.properties, [field]: value } });
      } else {
        debouncedUpdateWire(item.id, { properties: getWireProperties({ ...item.properties, [field]: value }) });
      }
    };
    const handleSelectChange = (field: string) => (e: SelectChangeEvent) => {
      handleChange(field, e.target.value);
    };
    const handleReset = () => {
      if (isSymbol) {
        updateSymbol(item.id, { properties: {} });
      } else {
        updateWire(item.id, { properties: getWireProperties() });
      }
    };
    const handleApply = () => {
      if (isSymbol) {
        updateSymbol(item.id, { properties: { ...item.properties } });
      } else {
        updateWire(item.id, { properties: getWireProperties({ ...item.properties }) });
      }
      clearSelection();
    };
    
    // Validation for thickness
    const thickness = item.properties?.thickness || 1;
    const thicknessError = isNaN(Number(thickness)) || Number(thickness) < 1 || Number(thickness) > 5;
    
    return (
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {isSymbol ? 'Symbol Properties' : 'Wire Properties'}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {/* Symbol-specific controls */}
        {isSymbol && (
          <>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Size & Scale</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                Scale: {Math.round((item as ElectricalSymbol).scale * 100)}%
              </Typography>
              <Slider
                value={(item as ElectricalSymbol).scale}
                onChange={(_, value) => updateSymbol(item.id, { scale: value as number })}
                min={0.1}
                max={3}
                step={0.1}
                marks={[
                  { value: 0.1, label: '10%' },
                  { value: 1, label: '100%' },
                  { value: 3, label: '300%' }
                ]}
                valueLabelDisplay="auto"
                sx={{ mt: 1 }}
              />
              <Button 
                size="small" 
                onClick={() => updateSymbol(item.id, { scale: 1 })}
                sx={{ mt: 1 }}
              >
                Reset Scale
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
          </>
        )}
        
        {/* Appearance group */}
        <Typography variant="caption" sx={{ fontWeight: 600 }}>Appearance</Typography>
        <Box sx={{ mb: 2 }}>
          <TextField
            label="Label"
            value={item.properties?.label || ''}
            fullWidth
            margin="dense"
            onChange={e => handleChange('label', e.target.value)}
          />
          {!isSymbol && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <TextField
                label="Color"
                type="color"
                value={item.properties?.color || '#000000'}
                fullWidth={false}
                margin="dense"
                sx={{ width: 60, minWidth: 60, p: 0, bgcolor: 'transparent' }}
                InputLabelProps={{ shrink: true }}
                onChange={e => handleChange('color', e.target.value)}
              />
              <FormControl margin="dense" sx={{ minWidth: 80 }}>
                <InputLabel id="thickness-label">Thickness</InputLabel>
                <Select
                  labelId="thickness-label"
                  value={thickness}
                  label="Thickness"
                  onChange={handleSelectChange('thickness')}
                  error={thicknessError}
                >
                  {thicknessOptions.map(opt => (
                    <MenuItem key={opt} value={opt}>{opt} px</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
        
        {/* Electrical group */}
        <Typography variant="caption" sx={{ fontWeight: 600 }}>Electrical</Typography>
        <Box sx={{ mb: 2 }}>
          {isSymbol && (
            <TextField
              label="Type"
              value={item.type}
              fullWidth
              margin="dense"
              disabled
            />
          )}
          <TextField
            label="Rating"
            value={item.properties?.rating || ''}
            fullWidth
            margin="dense"
            onChange={e => handleChange('rating', e.target.value)}
          />
        </Box>
        
        <Button variant="outlined" size="small" color="secondary" sx={{ mt: 1, mr: 1 }} onClick={handleReset}>
          Reset to Default
        </Button>
        <Button variant="contained" size="small" color="primary" sx={{ mt: 1 }} onClick={handleApply}>
          Apply
        </Button>
      </Box>
    );
  }

  // Multi-selection: show only batch-editable fields
  const handleBatchChange = (field: string, value: any) => {
    selectedSymbols.forEach(symbol => updateSymbol(symbol.id, { properties: { ...symbol.properties, [field]: value } }));
    selectedWires.forEach(wire => updateWire(wire.id, { properties: getWireProperties({ ...wire.properties, [field]: value }) }));
  };
  
  const handleBatchScale = (scale: number) => {
    selectedSymbols.forEach(symbol => updateSymbol(symbol.id, { scale }));
  };
  
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Batch Edit Properties ({totalSelected} items)
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* Batch scale control for symbols */}
      {selectedSymbols.length > 0 && (
        <>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>Size & Scale</Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Scale: {Math.round(selectedSymbols[0].scale * 100)}%
            </Typography>
            <Slider
              value={selectedSymbols[0].scale}
              onChange={(_, value) => handleBatchScale(value as number)}
              min={0.1}
              max={3}
              step={0.1}
              marks={[
                { value: 0.1, label: '10%' },
                { value: 1, label: '100%' },
                { value: 3, label: '300%' }
              ]}
              valueLabelDisplay="auto"
              sx={{ mt: 1 }}
            />
            <Button 
              size="small" 
              onClick={() => handleBatchScale(1)}
              sx={{ mt: 1 }}
            >
              Reset All Scales
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
        </>
      )}
      
      <Typography variant="caption" sx={{ fontWeight: 600 }}>Appearance</Typography>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="Label"
          value={''}
          fullWidth
          margin="dense"
          placeholder="Set label for all selected"
          onChange={e => handleBatchChange('label', e.target.value)}
        />
        <TextField
          label="Color"
          type="color"
          value={'#000000'}
          fullWidth={false}
          margin="dense"
          sx={{ width: 60, minWidth: 60, p: 0, bgcolor: 'transparent' }}
          InputLabelProps={{ shrink: true }}
          onChange={e => handleBatchChange('color', e.target.value)}
        />
      </Box>
      {/* Add more batch-editable fields as needed */}
    </Box>
  );
});

export default PropertiesPanel; 