'use client';

import type { KonvaEventObject } from 'konva/lib/Node';
import { Ellipse, Group, Rect, Text } from 'react-konva';
import type { PlanObject } from '../domain/plan-document';

const categoryStyle = {
  seating: { fill: '#dbeafe', stroke: '#2563eb', detail: '#93c5fd' },
  table: { fill: '#e0e7ff', stroke: '#4f46e5', detail: '#a5b4fc' },
  device: { fill: '#e2e8f0', stroke: '#475569', detail: '#94a3b8' },
  custom: { fill: '#f1f5f9', stroke: '#64748b', detail: '#cbd5e1' },
} satisfies Record<PlanObject['category'], Record<string, string>>;

type ObjectFootprintProps = {
  object: PlanObject;
  selected: boolean;
  interactive: boolean;
  onSelect: (additive: boolean) => void;
  onMoveEnd: (position: { x: number; y: number }) => void;
};

export function ObjectFootprint({
  object,
  selected,
  interactive,
  onSelect,
  onMoveEnd,
}: ObjectFootprintProps) {
  const colors = categoryStyle[object.category];
  const selectionStroke = selected ? '#1d4ed8' : colors.stroke;
  const strokeWidth = selected ? 20 : 10;

  const handleSelect = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    onSelect('shiftKey' in event.evt && event.evt.shiftKey);
  };

  return (
    <Group
      id={object.id}
      x={object.positionMm.x}
      y={object.positionMm.y}
      rotation={object.rotationDeg}
      draggable={interactive && !object.locked}
      onMouseDown={handleSelect}
      onTap={handleSelect}
      onDragStart={(event) => {
        event.cancelBubble = true;
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        onMoveEnd({ x: event.target.x(), y: event.target.y() });
      }}
    >
      {object.shape === 'ellipse' ? (
        <Ellipse
          radiusX={object.widthMm / 2}
          radiusY={object.depthMm / 2}
          fill={colors.fill}
          stroke={selectionStroke}
          strokeWidth={strokeWidth}
          shadowColor="#16345f"
          shadowBlur={selected ? 45 : 18}
          shadowOpacity={selected ? 0.22 : 0.1}
        />
      ) : (
        <Rect
          x={-object.widthMm / 2}
          y={-object.depthMm / 2}
          width={object.widthMm}
          height={object.depthMm}
          cornerRadius={Math.min(70, object.depthMm / 8)}
          fill={colors.fill}
          stroke={selectionStroke}
          strokeWidth={strokeWidth}
          shadowColor="#16345f"
          shadowBlur={selected ? 45 : 18}
          shadowOpacity={selected ? 0.22 : 0.1}
        />
      )}

      {object.shape === 'rectangle' && (
        <Rect
          listening={false}
          x={-object.widthMm / 2 + 80}
          y={-object.depthMm / 2 + 80}
          width={Math.max(0, object.widthMm - 160)}
          height={Math.max(0, object.depthMm - 160)}
          cornerRadius={45}
          stroke={colors.detail}
          strokeWidth={8}
          dash={[35, 25]}
        />
      )}

      <Text
        listening={false}
        x={-object.widthMm / 2}
        y={-50}
        width={object.widthMm}
        height={100}
        align="center"
        verticalAlign="middle"
        text={object.name}
        fill="#17345f"
        fontFamily="Arial, sans-serif"
        fontSize={90}
        fontStyle="600"
      />
    </Group>
  );
}
