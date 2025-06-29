import { CanvasElement, Wire } from '../components/Canvas'; // Assuming types are exported from Canvas

export interface SchematicData {
  elements: CanvasElement[];
  wires: Wire[];
  // Add any other metadata you want to save, like viewport, zoom level, etc.
  // lastSaved?: string;
}

const LOCAL_STORAGE_KEY = 'electricalSchematicData';

class StorageService {
  saveSchematic(data: SchematicData): void {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedData);
      console.log('Schematic saved to local storage.');
    } catch (error) {
      console.error('Error saving schematic to local storage:', error);
      // Optionally, notify the user of the error
    }
  }

  loadSchematic(): SchematicData | null {
    try {
      const serializedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (serializedData === null) {
        console.log('No saved schematic found in local storage.');
        return null; // Or return a default/empty schematic structure
      }
      const data: SchematicData = JSON.parse(serializedData);
      console.log('Schematic loaded from local storage.');
      return data;
    } catch (error) {
      console.error('Error loading schematic from local storage:', error);
      // Optionally, notify the user or clear corrupted data
      // localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
  }

  clearSchematic(): void {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      console.log('Saved schematic cleared from local storage.');
    } catch (error) {
      console.error('Error clearing schematic from local storage:', error);
    }
  }
}

export default new StorageService();
