// src/components/allocation-donut.tsx
import { formatCompactAmount } from '@wealthfolio/ui';
import { Sector } from '@wealthfolio/ui/chart';
import { allocationColorFor } from '../lib/allocation-colors';
import type { AllocationRow } from '../lib/allocation-summary';

export interface AllocationDonutProps {
  rows: AllocationRow[];
  colorMap: Record<string, string>;
  totalValue: number;
  currency: string;
  size?: number;
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  reducedMotion?: boolean;
}

const PADDING_ANGLE = 3;
const CORNER_RADIUS = 6;
const POP_DISTANCE = 5;

export function AllocationDonut({
  rows,
  colorMap,
  totalValue,
  currency,
  size = 240,
  hoveredId,
  onHoverChange,
  reducedMotion = false,
}: AllocationDonutProps) {
  const thickness = Math.round(size * 0.11);
  const outerR = size / 2 - 8;
  const innerR = outerR - thickness;
  const cx = size / 2;
  const cy = size / 2;

  const visibleRows = rows.filter((r) => r.currentPct > 0);
  const total = visibleRows.reduce((s, r) => s + r.currentPct, 0) || 100;

  let accDeg = 0;
  const segments = visibleRows.map((row, index) => {
    const span = (row.currentPct / total) * 360;
    const gap = visibleRows.length > 1 ? Math.min(PADDING_ANGLE, span * 0.35) : 0;
    const rawStart = accDeg;
    const rawEnd = accDeg + span;
    const startAngle = 90 - rawStart - gap / 2;
    const endAngle = 90 - rawEnd + gap / 2;
    accDeg = rawEnd;
    const midAngle = 90 - (rawStart + span / 2);
    const midRad = (-midAngle * Math.PI) / 180;
    return {
      row,
      color: allocationColorFor(row.id, colorMap, index),
      startAngle,
      endAngle,
      midRad,
    };
  });

  const hoveredRow = hoveredId ? (rows.find((r) => r.id === hoveredId) ?? null) : null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        <title>Current allocation</title>
        {segments.map((s) => {
          const isHovered = hoveredId === s.row.id;
          const dimmed = hoveredId !== null && !isHovered;
          const tx =
            isHovered && !reducedMotion ? (POP_DISTANCE * Math.cos(s.midRad)).toFixed(2) : '0';
          const ty =
            isHovered && !reducedMotion ? (POP_DISTANCE * Math.sin(s.midRad)).toFixed(2) : '0';
          return (
            <Sector
              key={s.row.id}
              cx={cx}
              cy={cy}
              innerRadius={innerR}
              outerRadius={outerR}
              startAngle={s.startAngle}
              endAngle={s.endAngle}
              fill={s.color}
              cornerRadius={CORNER_RADIUS}
              opacity={dimmed ? 0.3 : 1}
              transform={`translate(${tx}, ${ty})`}
              style={{
                fill: s.color,
                transition: 'opacity 0.15s ease, transform 0.12s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={() => onHoverChange(s.row.id)}
              onMouseLeave={() => onHoverChange(null)}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hoveredRow ? (
          <>
            <div
              className="text-muted-foreground truncate uppercase tracking-wider"
              style={{ fontSize: Math.round(size * 0.042), maxWidth: '75%' }}
              title={hoveredRow.name}
            >
              {hoveredRow.symbol}
            </div>
            <div
              className="text-foreground mt-0.5 font-semibold tabular-nums"
              style={{ fontSize: Math.round(size * 0.1) }}
            >
              {hoveredRow.currentPct.toFixed(1)}%
            </div>
            <div
              className="text-muted-foreground mt-0.5 tabular-nums"
              style={{ fontSize: Math.round(size * 0.052) }}
            >
              {formatCompactAmount(hoveredRow.value, currency)}
            </div>
          </>
        ) : (
          <>
            <div
              className="text-muted-foreground uppercase tracking-wider"
              style={{ fontSize: Math.round(size * 0.042) }}
            >
              Portfolio
            </div>
            <div
              className="text-foreground mt-0.5 font-semibold tabular-nums"
              style={{ fontSize: Math.round(size * 0.09) }}
            >
              {formatCompactAmount(totalValue, currency)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
