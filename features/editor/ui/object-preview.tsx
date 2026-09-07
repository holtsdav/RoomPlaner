import { getBlueprintProfile } from '../domain/catalog';
import type { BlueprintProfile } from '../domain/blueprint-profile';
import {
  officeBlueprint,
  type BlueprintKind,
} from '../domain/office-blueprints';
import { shapePoints } from '../domain/shape-points';
import type { FootprintShape, ObjectCategory } from '../domain/plan-document';

import { getObjectColors } from './object-colors';

export function ObjectPreview({
  blueprint,
  blueprintProfile,
  category,
  shape,
  name,
  widthMm,
  depthMm,
  className,
  color,
}: {
  blueprint?: BlueprintKind;
  blueprintProfile?: BlueprintProfile;
  category: ObjectCategory;
  shape: FootprintShape;
  name: string;
  widthMm: number;
  depthMm: number;
  className?: string;
  color?: string;
}) {
  const colors = getObjectColors({ blueprint, category, color });
  const scale = Math.min(92 / widthMm, 52 / depthMm);
  const width = widthMm * scale;
  const height = depthMm * scale;
  const x = (112 - width) / 2;
  const y = (72 - height) / 2;
  const text = name.length > 18 ? `${name.slice(0, 16)}…` : name;

  return (
    <svg
      viewBox="0 0 112 72"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {blueprint ? (
        <g transform="translate(56 36)">
          {officeBlueprint(
            blueprint,
            width,
            height,
            getBlueprintProfile({ name, blueprintProfile }),
          ).map((path, index) => (
            <path
              key={index}
              d={path.d}
              fill={
                path.solid ? colors.detail : path.detail ? 'none' : colors.fill
              }
              stroke={path.detail ? colors.detail : colors.stroke}
              strokeWidth={path.detail ? 0.8 : 1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      ) : shape === 'triangle' || shape === 'polygon' ? (
        <polygon
          points={shapePoints(shape, width, height)
            .map((point) => `${point.x + 56},${point.y + 36}`)
            .join(' ')}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
        />
      ) : shape === 'ellipse' ? (
        <ellipse
          cx="56"
          cy="36"
          rx={width / 2}
          ry={height / 2}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth="1.5"
        />
      ) : (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={category === 'custom' ? 0 : Math.min(6, height / 8)}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth="1.5"
          />
          {category !== 'custom' && (
            <rect
              x={x + 4}
              y={y + 4}
              width={Math.max(0, width - 8)}
              height={Math.max(0, height - 8)}
              rx={Math.min(4, height / 10)}
              fill="none"
              stroke={colors.detail}
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}
        </>
      )}
      {!blueprint && category !== 'custom' && (
        <text
          x="56"
          y={shape === 'triangle' ? 36 + height / 6 : 36}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#17345f"
          fontFamily="Arial, sans-serif"
          fontSize={Math.min(
            name.length > 12 ? 7 : 8,
            (width * (shape === 'triangle' ? 0.48 : 0.8)) /
              Math.max(text.length * 0.65, 1),
            height / 5,
          )}
          fontWeight="600"
        >
          {text}
        </text>
      )}
    </svg>
  );
}
