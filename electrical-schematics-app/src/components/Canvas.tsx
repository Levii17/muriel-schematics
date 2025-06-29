import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Line as KonvaLine } from 'react-konva';
import Konva from 'konva';
import ResistorSymbol from './symbols/ResistorSymbol';
import CapacitorSymbol from './symbols/CapacitorSymbol';
import InductorSymbol from './symbols/InductorSymbol';

export interface CanvasElement {
  id: string;
  x: number;
  y: number;
  type: string;
}

export interface Wire {
  id: string;
  points: number[];
  startElementId: string;
  endElementId: string;
}

interface CanvasProps {
  initialElements: CanvasElement[];
  initialWires: Wire[];
  onElementsChange: (elements: CanvasElement[]) => void;
  onWiresChange: (wires: Wire[]) => void;
}

const Canvas: React.FC<CanvasProps> = ({ initialElements, initialWires, onElementsChange, onWiresChange }) => {
  const [elements, setElements] = useState<CanvasElement[]>(initialElements);
  const [wires, setWires] = useState<Wire[]>(initialWires);
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageDimensions, setStageDimensions] = useState({ width: 0, height: 0 });
  const [firstElementForWire, setFirstElementForWire] = useState<CanvasElement | null>(null);

  // Update internal state if initial props change (e.g. loading from storage AFTER initial mount)
  useEffect(() => {
    setElements(initialElements);
  }, [initialElements]);

  useEffect(() => {
    setWires(initialWires);
  }, [initialWires]);

  // Notify App.tsx of internal changes
  useEffect(() => {
    onElementsChange(elements);
  }, [elements, onElementsChange]);

  useEffect(() => {
    onWiresChange(wires);
  }, [wires, onWiresChange]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const symbolId = event.dataTransfer.getData('symbolId');
    if (!stageRef.current || !symbolId) return;

    const stage = stageRef.current;
    const containerRect = stage.container().getBoundingClientRect();
    const x = event.clientX - containerRect.left;
    const y = event.clientY - containerRect.top;

    const newElement: CanvasElement = { id: `${symbolId}-${Date.now()}`, x, y, type: symbolId };
    setElements(prevElements => [...prevElements, newElement]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => event.preventDefault();

  const handleElementDragEnd = (elementId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = e.target.x();
    const newY = e.target.y();
    setElements(currentElements =>
      currentElements.map(el =>
        el.id === elementId ? { ...el, x: newX, y: newY } : el
      )
    );
    // Update wires connected to the dragged element
    setWires(currentWires => currentWires.map(wire => {
        if (wire.startElementId === elementId) {
            return { ...wire, points: [newX, newY, wire.points[2], wire.points[3]] };
        } else if (wire.endElementId === elementId) {
            return { ...wire, points: [wire.points[0], wire.points[1], newX, newY] };
        }
        return wire;
    }));
  };

  const handleElementClick = (element: CanvasElement) => {
    if (!firstElementForWire) {
      setFirstElementForWire(element);
    } else if (firstElementForWire.id !== element.id) {
      // Ensure we use the latest positions of elements for wiring
      const firstElCurrentPos = elements.find(el => el.id === firstElementForWire.id) || firstElementForWire;
      const secondElCurrentPos = elements.find(el => el.id === element.id) || element;

      const newWire: Wire = {
        id: `wire-${Date.now()}`,
        points: [firstElCurrentPos.x, firstElCurrentPos.y, secondElCurrentPos.x, secondElCurrentPos.y],
        startElementId: firstElCurrentPos.id,
        endElementId: secondElCurrentPos.id,
      };
      setWires(prevWires => [...prevWires, newWire]);
      setFirstElementForWire(null);
    }
  };

  const renderElement = (element: CanvasElement) => {
    let symbolComponent;
    switch (element.type) {
      case 'resistor': symbolComponent = <ResistorSymbol x={0} y={0} />; break;
      case 'capacitor': symbolComponent = <CapacitorSymbol x={0} y={0} />; break;
      case 'inductor': symbolComponent = <InductorSymbol x={0} y={0} />; break;
      default: symbolComponent = <Rect x={0} y={0} width={50} height={50} fill="grey" />;
    }
    return (
      <Group
        key={element.id}
        x={element.x}
        y={element.y}
        draggable
        onDragEnd={(e) => handleElementDragEnd(element.id, e)}
        onClick={() => handleElementClick(element)}
        onTap={() => handleElementClick(element)}
      >
        {symbolComponent}
      </Group>
    );
  };

  return (
    <div ref={containerRef} onDrop={handleDrop} onDragOver={handleDragOver} style={{ flexGrow: 1, border: '1px solid #ccc', overflow: 'hidden' }}>
      <Stage width={stageDimensions.width} height={stageDimensions.height} ref={stageRef} style={{ backgroundColor: '#f0f0f0' }}>
        <Layer>
          <Text text={firstElementForWire ? `Connecting from ${firstElementForWire.id}. Click another element.` : "Drop symbols. Click elements to wire."} x={10} y={10} />
          {elements.map(el => renderElement(el))}
          {wires.map(wire => <KonvaLine key={wire.id} points={wire.points} stroke="black" strokeWidth={2} />)}
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;
