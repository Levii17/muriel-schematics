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
        <Typography variant="h6" gutterBottom>
          {isSymbol ? 'Symbol Properties' : 'Wire Properties'}
        </Typography>
        
        {/* Rotation controls for symbols */}
        {isSymbol && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Rotation: {item.rotation}°
            </Typography>
            <Slider
              value={item.rotation}
              onChange={(_, value) => updateSymbol(item.id, { rotation: value as number })}
              min={0}
              max={360}
              step={15}
              marks={[
                { value: 0, label: '0°' },
                { value: 90, label: '90°' },
                { value: 180, label: '180°' },
                { value: 270, label: '270°' },
                { value: 360, label: '360°' }
              ]}
              valueLabelDisplay="auto"
            />
            <TextField
              label="Rotation (degrees)"
              type="number"
              value={item.rotation}
              onChange={(e) => updateSymbol(item.id, { rotation: parseFloat(e.target.value) || 0 })}
              inputProps={{ min: 0, max: 360, step: 1 }}
              size="small"
              sx={{ mt: 1 }}
            />
            <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => updateSymbol(item.id, { rotation: (item.rotation + 90) % 360 })}
              >
                Rotate 90°
              </Button>
              <Button 
                size="small" 
                variant="outlined"
                onClick={() => updateSymbol(item.id, { rotation: (item.rotation - 90 + 360) % 360 })}
              >
                Rotate -90°
              </Button>
            </Box>
          </Box>
        )}

        {/* Scale controls for symbols */}
        {isSymbol && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Scale: {(item.scale * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={item.scale}
              onChange={(_, value) => updateSymbol(item.id, { scale: value as number })}
              min={0.1}
              max={3}
              step={0.1}
              marks={[
                { value: 0.5, label: '50%' },
                { value: 1, label: '100%' },
                { value: 2, label: '200%' }
              ]}
              valueLabelDisplay="auto"
            />
            <TextField
              label="Scale (%)"
              type="number"
              value={Math.round(item.scale * 100)}
              onChange={(e) => updateSymbol(item.id, { scale: (parseFloat(e.target.value) || 100) / 100 })}
              inputProps={{ min: 10, max: 300, step: 5 }}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
        )}

        {/* Wire-specific properties */}
        {!isSymbol && (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Color</InputLabel>
              <Select
                value={item.properties?.color || '#000000'}
                onChange={handleSelectChange('color')}
                label="Color"
              >
                <MenuItem value="#000000">Black</MenuItem>
                <MenuItem value="#ff0000">Red</MenuItem>
                <MenuItem value="#00ff00">Green</MenuItem>
                <MenuItem value="#0000ff">Blue</MenuItem>
                <MenuItem value="#ffff00">Yellow</MenuItem>
                <MenuItem value="#ff00ff">Magenta</MenuItem>
                <MenuItem value="#00ffff">Cyan</MenuItem>
                <MenuItem value="#808080">Gray</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Thickness</InputLabel>
              <Select
                value={item.properties?.thickness || 1}
                onChange={handleSelectChange('thickness')}
                label="Thickness"
                error={thicknessError}
              >
                {thicknessOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}px</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Material</InputLabel>
              <Select
                value={item.properties?.material || 'copper'}
                onChange={handleSelectChange('material')}
                label="Material"
              >
                <MenuItem value="copper">Copper</MenuItem>
                <MenuItem value="aluminum">Aluminum</MenuItem>
                <MenuItem value="steel">Steel</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Insulation</InputLabel>
              <Select
                value={item.properties?.insulation || 'PVC'}
                onChange={handleSelectChange('insulation')}
                label="Insulation"
              >
                <MenuItem value="PVC">PVC</MenuItem>
                <MenuItem value="XLPE">XLPE</MenuItem>
                <MenuItem value="rubber">Rubber</MenuItem>
                <MenuItem value="none">None</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {/* Symbol-specific properties */}
        {isSymbol && (
          <>
            <TextField
              label="Label"
              value={item.properties?.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Rating"
              value={item.properties?.rating || ''}
              onChange={(e) => handleChange('rating', e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Manufacturer"
              value={item.properties?.manufacturer || ''}
              onChange={(e) => handleChange('manufacturer', e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Part Number"
              value={item.properties?.partNumber || ''}
              onChange={(e) => handleChange('partNumber', e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Description"
              value={item.properties?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              sx={{ mb: 2 }}
            />
          </>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button variant="outlined" onClick={handleReset} size="small">
            Reset
          </Button>
          <Button variant="contained" onClick={handleApply} size="small">
            Apply
          </Button>
        </Box>
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