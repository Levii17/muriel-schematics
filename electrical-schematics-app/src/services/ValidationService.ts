// Placeholder for South African electrical standards (SANS 10142, IEC 60617)
// This service will eventually implement validation rules based on these standards.

interface CanvasElement {
    id: string;
    x: number;
    y: number;
    type: string;
    connections?: string[]; // IDs of connected elements
  }

  interface Wire {
    id: string;
    startElementId: string;
    endElementId: string;
  }

  interface SchematicData {
    elements: CanvasElement[];
    wires: Wire[];
  }

  export interface ValidationError {
    elementId?: string; // ID of the element causing the error
    wireId?: string; // ID of the wire causing the error
    message: string;
    severity: 'error' | 'warning';
  }

  class ValidationService {
    // Example rule: Check for unconnected components (excluding power sources/grounds for simplicity here)
    private checkForUnconnectedComponents(elements: CanvasElement[], wires: Wire[]): ValidationError[] {
      const errors: ValidationError[] = [];
      const connectedElementIds = new Set<string>();

      wires.forEach(wire => {
        connectedElementIds.add(wire.startElementId);
        connectedElementIds.add(wire.endElementId);
      });

      elements.forEach(element => {
        // Simple check: if an element (not a conceptual 'port' or 'ground') has no connections
        // This would need to be much more sophisticated, knowing which components *must* be connected
        if (!['powerSource', 'ground'].includes(element.type) && !connectedElementIds.has(element.id)) {
          // A more robust check would be if element.connections is empty or doesn't meet minimum connection points
          let isConnected = false;
          wires.forEach(wire => {
            if (wire.startElementId === element.id || wire.endElementId === element.id) {
              isConnected = true;
            }
          });
          if (!isConnected) {
            errors.push({
              elementId: element.id,
              message: `Element ${element.type} (${element.id}) has no connections.`,
              severity: 'warning',
            });
          }
        }
      });
      return errors;
    }

    // Example rule: Basic short circuit check (very simplified)
    // A real short circuit check would involve graph traversal and understanding component properties
    private checkForBasicShortCircuits(elements: CanvasElement[], wires: Wire[]): ValidationError[] {
      const errors: ValidationError[] = [];
      // This is a naive example: if a wire directly connects two terminals of the same component
      // or connects a power source directly to ground without a load.
      // This would require a much more detailed understanding of the schematic.

      // Example: Find if any wire connects a component to itself (not typical but illustrative)
      wires.forEach(wire => {
        if (wire.startElementId === wire.endElementId) {
          errors.push({
            wireId: wire.id,
            message: `Wire ${wire.id} connects element ${wire.startElementId} to itself.`,
            severity: 'error',
          });
        }
      });

      // More complex: Power source directly to ground (needs identification of power/ground types)
      // elements.forEach(el => {
      //   if (el.type === 'powerSource') {
      //     wires.forEach(wire => {
      //       if (wire.startElementId === el.id) {
      //         const connectedEl = elements.find(e => e.id === wire.endElementId);
      //         if (connectedEl && connectedEl.type === 'ground') {
      //            errors.push({ message: `Potential short circuit between ${el.id} and ${connectedEl.id}.`, severity: 'error' });
      //         }
      //       } else if (wire.endElementId === el.id) {
      //         const connectedEl = elements.find(e => e.id === wire.startElementId);
      //         if (connectedEl && connectedEl.type === 'ground') {
      //            errors.push({ message: `Potential short circuit between ${el.id} and ${connectedEl.id}.`, severity: 'error' });
      //         }
      //       }
      //     });
      //   }
      // });
      return errors;
    }

    public validateSchematic(schematic: SchematicData): ValidationError[] {
      let errors: ValidationError[] = [];

      // TODO: Fetch and apply actual SANS/IEC rules when available
      console.warn("Validation is using placeholder rules. SANS/IEC standards need to be implemented.");

      errors = errors.concat(this.checkForUnconnectedComponents(schematic.elements, schematic.wires));
      errors = errors.concat(this.checkForBasicShortCircuits(schematic.elements, schematic.wires));

      // Add more validation rules here based on SANS/IEC standards
      // e.g., correct symbol usage, wire sizing, fuse ratings, earthing requirements etc.

      return errors;
    }
  }

  export default new ValidationService();

  // Example Usage (conceptual - will be integrated into the app)
  /*
  const schematicToValidate: SchematicData = {
    elements: [
      { id: 'R1', type: 'resistor', x: 50, y: 50 },
      { id: 'C1', type: 'capacitor', x: 150, y: 50 },
      { id: 'P1', type: 'powerSource', x: 50, y: 150 },
      { id: 'G1', type: 'ground', x: 150, y: 150 },
    ],
    wires: [
      { id: 'w1', startElementId: 'P1', endElementId: 'R1' },
      // { id: 'w2', startElementId: 'R1', endElementId: 'C1' }, // C1 is unconnected if this is commented
      { id: 'w3', startElementId: 'C1', endElementId: 'G1' }, // Comment out to test unconnected C1
      // { id: 'w4', startElementId: 'P1', endElementId: 'G1'} // Example direct short
    ],
  };

  const validationErrors = ValidationService.validateSchematic(schematicToValidate);
  if (validationErrors.length > 0) {
    console.log("Validation Errors Found:", validationErrors);
  } else {
    console.log("Schematic is valid (based on current placeholder rules).");
  }
  */
