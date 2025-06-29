import React from 'react';
import { render, screen } from '@testing-library/react';
import ResistorSymbol from '../ResistorSymbol';

// Mocking react-konva components used by ResistorSymbol if it were more complex
// For this simple SVG output, direct rendering into <svg> is fine.
// If ResistorSymbol used Konva components like <Rect>, <Text> from 'react-konva',
// you would mock them like this:
// jest.mock('react-konva', () => ({
//   ...jest.requireActual('react-konva'),
//   Group: ({ children, ...props }) => <g {...props}>{children}</g>,
//   Rect: (props) => <rect {...props} />,
//   Text: ({ text, ...props }) => <text {...props}>{text}</text>,
// }));

describe('ResistorSymbol', () => {
  test('renders the resistor symbol with correct elements and initial position', () => {
    const { container } = render(
      <svg>
        <ResistorSymbol x={50} y={50} />
      </svg>
    );

    // The ResistorSymbol component directly returns a <g> element.
    const groupElement = container.querySelector('g');
    expect(groupElement).toBeInTheDocument();
    expect(groupElement).toHaveAttribute('transform', 'translate(50,50)');

    const rectElement = groupElement?.querySelector('rect');
    expect(rectElement).toBeInTheDocument();
    expect(rectElement).toHaveAttribute('x', '-20');
    expect(rectElement).toHaveAttribute('y', '-5');
    expect(rectElement).toHaveAttribute('width', '40');
    expect(rectElement).toHaveAttribute('height', '10');
    expect(rectElement).toHaveAttribute('stroke', 'black');
    expect(rectElement).toHaveAttribute('fill', 'white');

    const textElement = screen.getByText('R');
    expect(textElement).toBeInTheDocument();
    expect(textElement.tagName).toBe('text'); // Ensure it's an SVG text element
    expect(textElement).toHaveAttribute('x', '0');
    expect(textElement).toHaveAttribute('y', '3');
  });

  test('applies updated x and y coordinates to the group transform', () => {
    const { container } = render(
      <svg>
        <ResistorSymbol x={100} y={120} />
      </svg>
    );
    const groupElement = container.querySelector('g');
    expect(groupElement).toBeInTheDocument();
    expect(groupElement).toHaveAttribute('transform', 'translate(100,120)');
  });
});
