import React from 'react';
import { Group, Line, Path, Text } from 'react-konva';

// Custom Konva renderers for symbols with text
export const AmmeterSVG: React.FC<any> = (props) => (
  <Group>
    <Line points={[20, 50, 65, 50]} stroke="black" strokeWidth={2} />
    <Path 
      data="M100 50 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0" 
      stroke="black" 
      strokeWidth={2} 
      fill="none" 
    />
    <Line points={[135, 50, 180, 50]} stroke="black" strokeWidth={2} />
    <Text 
      x={65} 
      y={35} 
      text="A" 
      fontSize={32} 
      fontFamily="Arial" 
      fill="black" 
      align="center"
    />
  </Group>
);

export const VoltmeterSVG: React.FC<any> = (props) => (
  <Group>
    <Line points={[20, 50, 65, 50]} stroke="black" strokeWidth={2} />
    <Path 
      data="M100 50 m-35,0 a35,35 0 1,0 70,0 a35,35 0 1,0 -70,0" 
      stroke="black" 
      strokeWidth={2} 
      fill="none" 
    />
    <Line points={[135, 50, 180, 50]} stroke="black" strokeWidth={2} />
    <Text 
      x={65} 
      y={35} 
      text="V" 
      fontSize={32} 
      fontFamily="Arial" 
      fill="black" 
      align="center"
    />
  </Group>
);

export const WattmeterSVG: React.FC<any> = (props) => (
  <Group>
    <Path 
      data="M100 50 m-40,0 a40,40 0 1,0 80,0 a40,40 0 1,0 -80,0" 
      stroke="black" 
      strokeWidth={2} 
      fill="none" 
    />
    <Line points={[20, 100, 60, 100]} stroke="black" strokeWidth={2} />
    <Line points={[140, 100, 180, 100]} stroke="black" strokeWidth={2} />
    <Line points={[100, 50, 100, 90]} stroke="black" strokeWidth={2} />
    <Line points={[100, 110, 100, 150]} stroke="black" strokeWidth={2} />
    <Line points={[85, 100, 115, 100]} stroke="black" strokeWidth={2} />
    <Text 
      x={60} 
      y={80} 
      text="W" 
      fontSize={32} 
      fontFamily="Arial" 
      fill="black" 
      align="center"
    />
  </Group>
);

export const MotorSVG: React.FC<any> = (props) => (
  <Group>
    <Line points={[20, 50, 60, 50]} stroke="black" strokeWidth={2} />
    <Line points={[140, 50, 180, 50]} stroke="black" strokeWidth={2} />
    <Path 
      data="M100 10 a40,40 0 1,0 0,80 a40,40 0 1,0 0,-80" 
      stroke="black" 
      strokeWidth={2} 
      fill="none" 
    />
    <Text 
      x={60} 
      y={35} 
      text="M" 
      fontSize={32} 
      fontFamily="Arial" 
      fill="black" 
      align="center"
    />
  </Group>
);

export const EnergyMeterSVG: React.FC<any> = (props) => (
  <Group>
    <Path 
      data="M40 40 L160 40 L160 160 L40 160 Z" 
      stroke="black" 
      strokeWidth={2} 
      fill="none" 
    />
    <Line points={[40, 80, 160, 80]} stroke="black" strokeWidth={2} />
    <Text 
      x={80} 
      y={100} 
      text="kWh" 
      fontSize={28} 
      fontFamily="Arial" 
      fill="black" 
      align="center"
    />
  </Group>
); 