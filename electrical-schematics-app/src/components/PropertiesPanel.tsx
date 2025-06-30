import React, { useState, useEffect } from 'react';
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

  // Local state for symbol property edits
  const [symbolDraft, setSymbolDraft] = useState<any>(null);

  useEffect(() => {
    if (selectedSymbol) {
      setSymbolDraft({ ...selectedSymbol.properties });
    } else {
      setSymbolDraft(null);
    }
  }, [selectedSymbol]);

  const handleSymbolDraftChange = (key: string, value: any) => {
    setSymbolDraft((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    if (selectedSymbol && symbolDraft) {
      updateSymbol(selectedSymbol.id, { properties: symbolDraft });
    }
  };

  const isSymbolChanged = selectedSymbol && symbolDraft && JSON.stringify(selectedSymbol.properties) !== JSON.stringify(symbolDraft);

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
                value={symbolDraft?.label || ''}
                onChange={(e) => handleSymbolDraftChange('label', e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Rating:<br />
              <input
                type="text"
                value={symbolDraft?.rating || ''}
                onChange={(e) => handleSymbolDraftChange('rating', e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Manufacturer:<br />
              <input
                type="text"
                value={symbolDraft?.manufacturer || ''}
                onChange={(e) => handleSymbolDraftChange('manufacturer', e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Part Number:<br />
              <input
                type="text"
                value={symbolDraft?.partNumber || ''}
                onChange={(e) => handleSymbolDraftChange('partNumber', e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>
              Description:<br />
              <textarea
                value={symbolDraft?.description || ''}
                onChange={(e) => handleSymbolDraftChange('description', e.target.value)}
                style={{ width: '100%' }}
                rows={3}
              />
            </label>
          </div>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleApply}
            disabled={!isSymbolChanged}
            sx={{ mt: 1 }}
          >
            Apply
          </Button>
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