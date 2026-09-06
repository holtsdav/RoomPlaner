'use client';

import { memo } from 'react';
import { getBlueprintProfile } from '../domain/catalog';
import { officeBlueprint } from '../domain/office-blueprints';
import { shapePoints } from '../domain/shape-points';

import type { KonvaEventObject } from 'konva/lib/Node';
import { Ellipse, Group, Line, Path, Rect, Text } from 'react-konva';
import type { PlanObject } from '../domain/plan-document';

import { getObjectColors } from './object-colors';

type ObjectFootprintProps = {
  object: PlanObject;
  selected: boolean;
  interactive: boolean;
  draggable?: boolean;
  onSelect: (additive: boolean) => void;
  onMove?: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  onMoveEnd: (position: { x: number; y: number }) => void;
};

export function ObjectFootprint({
  object,
  selected,
  interactive,
  draggable = true,
  onSelect,
  onMove,
  onMoveEnd,
}: ObjectFootprintProps) {
  const handleSelect = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    onSelect('shiftKey' in event.evt && event.evt.shiftKey);
  };

  return (
    <Group
      id={object.id}
      name="touch-object"
      x={object.positionMm.x}
      y={object.positionMm.y}
      rotation={object.rotationDeg}
      listening={interactive}
      draggable={interactive && draggable && !object.locked}
      onMouseDown={handleSelect}
      onTap={handleSelect}
      onDragStart={(event) => {
        event.cancelBubble = true;
      }}
      onDragMove={(event) => {
        event.cancelBubble = true;
        const position = { x: event.target.x(), y: event.target.y() };
        const nextPosition = onMove?.(position);
        if (nextPosition) event.target.position(nextPosition);
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        onMoveEnd({ x: event.target.x(), y: event.target.y() });
      }}
    >
      <ObjectDrawing object={object} selected={selected} />
    </Group>
  );
}

const ObjectDrawing = memo(
  function ObjectDrawing({
    object,
    selected,
  }: {
    object: PlanObject;
    selected: boolean;
  }) {
    const colors = getObjectColors(object);
    const selectionStroke = selected ? '#1d4ed8' : colors.stroke;
    const strokeWidth = Math.min(
      selected ? 20 : 10,
      Math.min(object.widthMm, object.depthMm) * 0.025,
    );
    const inset = Math.min(80, object.widthMm / 4, object.depthMm / 4);

    return (
      <>
        <Group
          scaleX={object.mirroredHorizontally ? -1 : 1}
          scaleY={object.mirroredVertically ? -1 : 1}
        >
          {object.blueprint ? (
            officeBlueprint(
              object.blueprint,
              object.widthMm,
              object.depthMm,
              getBlueprintProfile(object),
            ).map((path, index) => (
              <Path
                key={index}
                data={path.d}
                fill={
                  path.solid
                    ? colors.detail
                    : path.detail
                      ? undefined
                      : colors.fill
                }
                stroke={path.detail ? colors.detail : selectionStroke}
                strokeWidth={Math.min(
                  strokeWidth,
                  Math.min(object.widthMm, object.depthMm) * 0.025,
                )}
                lineCap="round"
                lineJoin="round"
              />
            ))
          ) : object.shape === 'triangle' || object.shape === 'polygon' ? (
            <Line
              points={shapePoints(
                object.shape,
                object.widthMm,
                object.depthMm,
              ).flatMap((point) => [point.x, point.y])}
              closed
              fill={colors.fill}
              stroke={selectionStroke}
              strokeWidth={strokeWidth}
            />
          ) : object.shape === 'ellipse' ? (
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
              cornerRadius={
                object.category === 'custom'
                  ? 0
                  : Math.min(70, object.widthMm / 8, object.depthMm / 8)
              }
              fill={colors.fill}
              stroke={selectionStroke}
              strokeWidth={strokeWidth}
              shadowColor="#16345f"
              shadowBlur={selected ? 45 : 18}
              shadowOpacity={selected ? 0.22 : 0.1}
            />
          )}

          {!object.blueprint &&
            object.shape === 'rectangle' &&
            object.category !== 'custom' && (
              <Rect
                listening={false}
                x={-object.widthMm / 2 + inset}
                y={-object.depthMm / 2 + inset}
                width={Math.max(0, object.widthMm - 2 * inset)}
                height={Math.max(0, object.depthMm - 2 * inset)}
                cornerRadius={Math.min(
                  45,
                  (object.widthMm - 2 * inset) / 2,
                  (object.depthMm - 2 * inset) / 2,
                )}
                stroke={colors.detail}
                strokeWidth={Math.min(8, strokeWidth)}
                dash={[35, 25]}
              />
            )}
        </Group>

        {!object.blueprint && object.category !== 'custom' && (
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
        )}
      </>
    );
  },
  (previous, next) =>
    previous.selected === next.selected &&
    previous.object.name === next.object.name &&
    previous.object.color === next.object.color &&
    previous.object.widthMm === next.object.widthMm &&
    previous.object.depthMm === next.object.depthMm &&
    previous.object.shape === next.object.shape &&
    previous.object.category === next.object.category &&
    previous.object.blueprint === next.object.blueprint &&
    previous.object.mirroredHorizontally === next.object.mirroredHorizontally &&
    previous.object.mirroredVertically === next.object.mirroredVertically &&
    JSON.stringify(previous.object.blueprintProfile) ===
      JSON.stringify(next.object.blueprintProfile),
);
