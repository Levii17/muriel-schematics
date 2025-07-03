// Core types for electrical schematics application

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ElectricalSymbol {
  id: string;
  type: SymbolType;
  position: Point;
  rotation: number;
  scale: number;
  properties: SymbolProperties;
  connections: ConnectionPoint[];
}

export interface ConnectionPoint {
  id: string;
  position: Point;
  type: 'input' | 'output' | 'neutral' | 'ground';
  connected: boolean;
  connectionId?: string;
}

export interface Wire {
  id: string;
  startPoint: Point;
  endPoint: Point;
  startConnectionId?: string;
  endConnectionId?: string;
  wireType: WireType;
  properties: WireProperties;
}

export interface SymbolProperties {
  label?: string;
  rating?: string;
  manufacturer?: string;
  partNumber?: string;
  description?: string;
  [key: string]: any;
}

export interface WireProperties {
  color: string;
  thickness: number;
  material: string;
  insulation: string;
  [key: string]: any;
}

export enum SymbolType {
  // Power sources
  BATTERY = 'battery',
  GENERATOR = 'generator',
  TRANSFORMER = 'transformer',
  
  // Protection devices
  CIRCUIT_BREAKER = 'circuit_breaker',
  FUSE = 'fuse',
  RCD = 'rcd',
  
  // Switches and controls
  SWITCH = 'switch',
  PUSH_BUTTON = 'push_button',
  RELAY = 'relay',
  CONTACTOR = 'contactor',
  
  // Loads
  LIGHT = 'light',
  MOTOR = 'motor',
  HEATER = 'heater',
  SOCKET = 'socket',
  
  // Measurement
  AMMETER = 'ammeter',
  VOLTMETER = 'voltmeter',
  WATTMETER = 'wattmeter',
  
  // Control and signaling
  BELL = 'bell',
  BUZZER = 'buzzer',
  INDICATOR_LIGHT = 'indicator_light',
  
  // Grounding and bonding
  EARTH = 'earth',
  NEUTRAL = 'neutral',
  
  // Junction boxes and panels
  JUNCTION_BOX = 'junction_box',
  DISTRIBUTION_BOARD = 'distribution_board',
  
  // Custom symbols
  CUSTOM = 'custom',

  // --- New symbols from reference images ---
  PHASE_L1 = 'phase_l1', // L1
  PHASE_L2 = 'phase_l2', // L2
  PHASE_L3 = 'phase_l3', // L3
  PHASE_NEUTRAL = 'phase_neutral', // N
  ENERGY_METER = 'energy_meter', // kWh
  AC = 'ac', // Alternating current
  THREE_PHASE = 'three_phase',
  CONNECTIONS_SUPPLY = 'connections_supply',
  CONDUCTOR = 'conductor',
  CONDUCTOR_CROSS_CONNECTED = 'conductor_cross_connected',
  CONDUCTOR_CROSS_NOT_CONNECTED = 'conductor_cross_not_connected',
  CIRCUIT_MAIN = 'circuit_main',
  CIRCUIT_CONTROL = 'circuit_control',
  LAMP_INCANDESCENT = 'lamp_incandescent',
  LAMP_INDICATION = 'lamp_indication',
  RESISTOR = 'resistor',
  CAPACITOR = 'capacitor',
}

export enum WireType {
  PHASE_L1 = 'phase_l1',
  PHASE_L2 = 'phase_l2',
  PHASE_L3 = 'phase_l3',
  NEUTRAL = 'neutral',
  EARTH = 'earth',
  CONTROL = 'control',
  SIGNAL = 'signal',
  DATA = 'data'
}

export interface CanvasState {
  symbols: ElectricalSymbol[];
  wires: Wire[];
  selectedElements: string[];
  zoom: number;
  pan: Point;
  gridSize: number;
  snapToGrid: boolean;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (state: CanvasState) => ValidationResult[];
}

export interface ValidationResult {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  elementIds: string[];
  suggestions?: string[];
}

export interface SANS10142Rule {
  section: string;
  ruleNumber: string;
  description: string;
  requirements: string[];
}

export interface ExportOptions {
  format: 'pdf' | 'png' | 'svg';
  resolution: number;
  includeGrid: boolean;
  includeLabels: boolean;
  pageSize: 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
  orientation: 'portrait' | 'landscape';
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  author: string;
  canvasState: CanvasState;
  metadata: ProjectMetadata;
}

export interface ProjectMetadata {
  client: string;
  projectNumber: string;
  drawingNumber: string;
  revision: string;
  engineer: string;
  date: Date;
  standards: string[];
  notes: string;
} 