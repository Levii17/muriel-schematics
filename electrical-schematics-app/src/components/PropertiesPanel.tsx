import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const PropertiesPanel: React.FC = () => {
  const symbols = useCanvasStore((s) => s.symbols);
  const wires = useCanvasStore((s) => s.wires);
  const selected = useCanvasStore((s) => s.selectedElements);
  const updateSymbol = useCanvasStore((s) => s.updateSymbol);
  const updateWire = useCanvasStore((s) => s.updateWire);
  const deleteSymbol = useCanvasStore((s) => s.deleteSymbol);
  const deleteWire = useCanvasStore((s) => s.deleteWire);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);

  const selectedSymbol = symbols.find((s) => selected.length === 1 && s.id === selected[0]);
  const selectedWire = wires.find((w) => selected.length === 1 && w.id === selected[0]);

  const handleDelete = () => {
    if (selectedSymbol) deleteSymbol(selectedSymbol.id);
    if (selectedWire) deleteWire(selectedWire.id);
  };

  const handleDuplicate = () => {
    duplicateSelected();
  };

  if (!selectedSymbol && !selectedWire) {
    return <div style={{ color: '#888', fontStyle: 'italic' }}>Select a symbol or wire to view its properties.</div>;
  }

  return (
    <div>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={handleDuplicate}
        >
          Duplicate
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Stack>
      {selectedSymbol && (
        <>
          <h3>Symbol Properties</h3>
          <div style={{ marginBottom: 8 }}>
            <strong>Type:</strong> {selectedSymbol.type}
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Label:<br />
              <input
                type="text"
                value={selectedSymbol.properties.label || ''}
                onChange={(e) => updateSymbol(selectedSymbol.id, { properties: { ...selectedSymbol.properties, label: e.target.value } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Rating:<br />
              <input
                type="text"
                value={selectedSymbol.properties.rating || ''}
                onChange={(e) => updateSymbol(selectedSymbol.id, { properties: { ...selectedSymbol.properties, rating: e.target.value } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Manufacturer:<br />
              <input
                type="text"
                value={selectedSymbol.properties.manufacturer || ''}
                onChange={(e) => updateSymbol(selectedSymbol.id, { properties: { ...selectedSymbol.properties, manufacturer: e.target.value } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Part Number:<br />
              <input
                type="text"
                value={selectedSymbol.properties.partNumber || ''}
                onChange={(e) => updateSymbol(selectedSymbol.id, { properties: { ...selectedSymbol.properties, partNumber: e.target.value } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Description:<br />
              <textarea
                value={selectedSymbol.properties.description || ''}
                onChange={(e) => updateSymbol(selectedSymbol.id, { properties: { ...selectedSymbol.properties, description: e.target.value } })}
                style={{ width: '100%' }}
                rows={3}
              />
            </label>
          </div>
        </>
      )}
      {selectedWire && (
        <>
          <h3>Wire Properties</h3>
          <div style={{ marginBottom: 8 }}>
            <label>
              Color:<br />
              <input
                type="color"
                value={selectedWire.properties.color || '#000000'}
                onChange={(e) => updateWire(selectedWire.id, { properties: { ...selectedWire.properties, color: e.target.value } })}
                style={{ width: 40, height: 24, border: 'none', background: 'none' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Thickness (px):<br />
              <input
                type="number"
                min={1}
                max={10}
                value={selectedWire.properties.thickness || 2}
                onChange={(e) => updateWire(selectedWire.id, { properties: { ...selectedWire.properties, thickness: Number(e.target.value) } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Material:<br />
              <input
                type="text"
                value={selectedWire.properties.material || ''}
                onChange={(e) => updateWire(selectedWire.id, { properties: { ...selectedWire.properties, material: e.target.value } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Insulation:<br />
              <input
                type="text"
                value={selectedWire.properties.insulation || ''}
                onChange={(e) => updateWire(selectedWire.id, { properties: { ...selectedWire.properties, insulation: e.target.value } })}
                style={{ width: '100%' }}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default PropertiesPanel; 