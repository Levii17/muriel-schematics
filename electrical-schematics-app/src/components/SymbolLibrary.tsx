import React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import { SymbolType } from '../types';

const symbolIcons: Record<SymbolType, React.ReactNode> = {
  [SymbolType.BATTERY]: <span role="img" aria-label="Battery">🔋</span>,
  [SymbolType.GENERATOR]: <span role="img" aria-label="Generator">⚡</span>,
  [SymbolType.TRANSFORMER]: <span role="img" aria-label="Transformer">🔌</span>,
  [SymbolType.CIRCUIT_BREAKER]: <span role="img" aria-label="Breaker">⏹️</span>,
  [SymbolType.FUSE]: <span role="img" aria-label="Fuse">🧯</span>,
  [SymbolType.RCD]: <span role="img" aria-label="RCD">🔲</span>,
  [SymbolType.SWITCH]: <span role="img" aria-label="Switch">🔀</span>,
  [SymbolType.PUSH_BUTTON]: <span role="img" aria-label="Button">🔘</span>,
  [SymbolType.RELAY]: <span role="img" aria-label="Relay">🔁</span>,
  [SymbolType.CONTACTOR]: <span role="img" aria-label="Contactor">🔗</span>,
  [SymbolType.LIGHT]: <span role="img" aria-label="Light">💡</span>,
  [SymbolType.MOTOR]: <span role="img" aria-label="Motor">⚙️</span>,
  [SymbolType.HEATER]: <span role="img" aria-label="Heater">🔥</span>,
  [SymbolType.SOCKET]: <span role="img" aria-label="Socket">🔲</span>,
  [SymbolType.AMMETER]: <span role="img" aria-label="Ammeter">🔄</span>,
  [SymbolType.VOLTMETER]: <span role="img" aria-label="Voltmeter">🔃</span>,
  [SymbolType.WATTMETER]: <span role="img" aria-label="Wattmeter">🔂</span>,
  [SymbolType.BELL]: <span role="img" aria-label="Bell">🔔</span>,
  [SymbolType.BUZZER]: <span role="img" aria-label="Buzzer">📢</span>,
  [SymbolType.INDICATOR_LIGHT]: <span role="img" aria-label="Indicator">🟢</span>,
  [SymbolType.EARTH]: <span role="img" aria-label="Earth">🌍</span>,
  [SymbolType.NEUTRAL]: <span role="img" aria-label="Neutral">⚪</span>,
  [SymbolType.JUNCTION_BOX]: <span role="img" aria-label="Junction Box">🗳️</span>,
  [SymbolType.DISTRIBUTION_BOARD]: <span role="img" aria-label="DB">🧰</span>,
  [SymbolType.CUSTOM]: <span role="img" aria-label="Custom">✨</span>,
};

const symbolLabels: Record<SymbolType, string> = {
  [SymbolType.BATTERY]: 'Battery',
  [SymbolType.GENERATOR]: 'Generator',
  [SymbolType.TRANSFORMER]: 'Transformer',
  [SymbolType.CIRCUIT_BREAKER]: 'Circuit Breaker',
  [SymbolType.FUSE]: 'Fuse',
  [SymbolType.RCD]: 'RCD',
  [SymbolType.SWITCH]: 'Switch',
  [SymbolType.PUSH_BUTTON]: 'Push Button',
  [SymbolType.RELAY]: 'Relay',
  [SymbolType.CONTACTOR]: 'Contactor',
  [SymbolType.LIGHT]: 'Light',
  [SymbolType.MOTOR]: 'Motor',
  [SymbolType.HEATER]: 'Heater',
  [SymbolType.SOCKET]: 'Socket',
  [SymbolType.AMMETER]: 'Ammeter',
  [SymbolType.VOLTMETER]: 'Voltmeter',
  [SymbolType.WATTMETER]: 'Wattmeter',
  [SymbolType.BELL]: 'Bell',
  [SymbolType.BUZZER]: 'Buzzer',
  [SymbolType.INDICATOR_LIGHT]: 'Indicator Light',
  [SymbolType.EARTH]: 'Earth',
  [SymbolType.NEUTRAL]: 'Neutral',
  [SymbolType.JUNCTION_BOX]: 'Junction Box',
  [SymbolType.DISTRIBUTION_BOARD]: 'Distribution Board',
  [SymbolType.CUSTOM]: 'Custom',
};

const SymbolLibrary: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, symbolType: SymbolType) => {
    e.dataTransfer.setData('application/x-symbol-type', symbolType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Paper elevation={1} sx={{ p: 1 }}>
      <List dense>
        {Object.values(SymbolType).map((type) => (
          <ListItem
            key={type}
            button
            draggable
            onDragStart={(e) => handleDragStart(e, type)}
            sx={{ cursor: 'grab', userSelect: 'none' }}
          >
            <ListItemIcon>{symbolIcons[type]}</ListItemIcon>
            <ListItemText primary={symbolLabels[type]} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default SymbolLibrary; 