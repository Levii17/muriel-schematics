import React from 'react';
import { useCanvasStore } from '../store/canvasStore';

const PropertiesPanel: React.FC = () => {
  const symbols = useCanvasStore((s) => s.symbols);
  const selected = useCanvasStore((s) => s.selectedElements);
  const updateSymbol = useCanvasStore((s) => s.updateSymbol);

  const selectedSymbol = symbols.find((s) => selected.length === 1 && s.id === selected[0]);

  if (!selectedSymbol) {
    return <div style={{ color: '#888', fontStyle: 'italic' }}>Select a symbol to view its properties.</div>;
  }

  const handleChange = (field: string, value: string) => {
    updateSymbol(selectedSymbol.id, {
      properties: {
        ...selectedSymbol.properties,
        [field]: value,
      },
    });
  };

  return (
    <div>
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
            onChange={(e) => handleChange('label', e.target.value)}
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
            onChange={(e) => handleChange('rating', e.target.value)}
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
            onChange={(e) => handleChange('manufacturer', e.target.value)}
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
            onChange={(e) => handleChange('partNumber', e.target.value)}
            style={{ width: '100%' }}
          />
        </label>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>
          Description:<br />
          <textarea
            value={selectedSymbol.properties.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            style={{ width: '100%' }}
            rows={3}
          />
        </label>
      </div>
    </div>
  );
};

export default PropertiesPanel; 