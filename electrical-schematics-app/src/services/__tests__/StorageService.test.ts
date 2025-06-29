import StorageService, { SchematicData } from '../StorageService';
import { CanvasElement, Wire } from '../../components/Canvas'; // Adjust path as necessary

describe('StorageService', () => {
  const mockElement: CanvasElement = { id: 'R1', type: 'resistor', x: 10, y: 20 };
  const mockWire: Wire = { id: 'W1', startElementId: 'R1', endElementId: 'C1', points: [10,20,30,40] };
  const mockSchematicData: SchematicData = {
    elements: [mockElement],
    wires: [mockWire],
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // jest.spyOn(console, 'log').mockImplementation(() => {}); // Optional: suppress console.log
    // jest.spyOn(console, 'error').mockImplementation(() => {}); // Optional: suppress console.error
  });

  afterEach(() => {
    // Restore console mocks if they were made
    // jest.restoreAllMocks();
  });

  test('should save schematic data to localStorage', () => {
    StorageService.saveSchematic(mockSchematicData);
    const storedData = localStorage.getItem('electricalSchematicData');
    expect(storedData).not.toBeNull();
    expect(JSON.parse(storedData!)).toEqual(mockSchematicData);
  });

  test('should load schematic data from localStorage if it exists', () => {
    localStorage.setItem('electricalSchematicData', JSON.stringify(mockSchematicData));
    const loadedData = StorageService.loadSchematic();
    expect(loadedData).toEqual(mockSchematicData);
  });

  test('should return null if no schematic data is in localStorage', () => {
    const loadedData = StorageService.loadSchematic();
    expect(loadedData).toBeNull();
  });

  test('should return null and log error if localStorage data is corrupted', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('electricalSchematicData', 'corrupted data');
    const loadedData = StorageService.loadSchematic();
    expect(loadedData).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('should clear schematic data from localStorage', () => {
    localStorage.setItem('electricalSchematicData', JSON.stringify(mockSchematicData));
    StorageService.clearSchematic();
    const storedData = localStorage.getItem('electricalSchematicData');
    expect(storedData).toBeNull();
  });

  test('saveSchematic should handle localStorage errors (e.g., quota exceeded)', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Mock localStorage.setItem to throw an error
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('Quota exceeded');
    });

    StorageService.saveSchematic(mockSchematicData);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving schematic to local storage:', expect.any(Error));

    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks(); // Restore setItem
  });
});
