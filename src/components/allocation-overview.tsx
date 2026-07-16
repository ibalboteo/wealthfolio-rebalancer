// src/components/allocation-overview.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  formatCompactAmount,
  ToggleGroup,
  ToggleGroupItem,
} from '@wealthfolio/ui';
import { useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { PlannedHolding } from '../hooks/use-holdings';
import { allocationColorFor, buildAllocationColorMap } from '../lib/allocation-colors';
import {
  type AllocationStatus,
  buildAllocationSummary,
  selectAllocationGaps,
} from '../lib/allocation-summary';
import { AllocationDonut } from './allocation-donut';

export interface AllocationOverviewProps {
  holdings: PlannedHolding[];
  previewHoldings: PlannedHolding[];
  totalEnabledValue: number;
  totalPreviewValue: number;
  tolerancePp: number;
  currency: string;
}

type Mode = 'current' | 'projected';

function driftColor(status: AllocationStatus): string {
  if (status === 'in_band') return 'text-muted-foreground';
  if (status === 'overweight') return 'text-destructive';
  return 'text-blue-600 dark:text-blue-400';
}

function formatDrift(driftPp: number): string {
  const sign = driftPp > 0 ? '+' : '';
  return `${sign}${driftPp.toFixed(1)}pp`;
}

export function AllocationOverview({
  holdings,
  previewHoldings,
  totalEnabledValue,
  totalPreviewValue,
  tolerancePp,
  currency,
}: AllocationOverviewProps) {
  const [mode, setMode] = useState<Mode>('current');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  const sourceHoldings = mode === 'current' ? holdings : previewHoldings;
  const totalValue = mode === 'current' ? totalEnabledValue : totalPreviewValue;

  const rows = useMemo(
    () => buildAllocationSummary(sourceHoldings, totalValue, tolerancePp),
    [sourceHoldings, totalValue, tolerancePp]
  );
  const colorMap = useMemo(() => buildAllocationColorMap(rows.map((r) => r.id)), [rows]);
  const gaps = useMemo(() => selectAllocationGaps(rows), [rows]);

  // Scale so both current bar and target marker fit; +8% headroom.
  const maxScale = Math.max(1, ...rows.flatMap((r) => [r.currentPct, r.targetPct])) * 1.08;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="current">Current</ToggleGroupItem>
          <ToggleGroupItem value="projected">After rebalance</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Allocation vs target</CardTitle>
            <CardDescription>
              {mode === 'current'
                ? 'Current allocation of each fund versus its target.'
                : 'Projected allocation after applying the suggested transfers.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid items-center gap-6 pt-2 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div className="mx-auto shrink-0">
                <AllocationDonut
                  rows={rows}
                  colorMap={colorMap}
                  totalValue={totalValue}
                  currency={currency}
                  size={240}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  reducedMotion={reducedMotion}
                />
              </div>

              <div className="min-w-0">
                <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem_4rem] gap-x-3 px-2 pb-2 text-[10px] font-medium uppercase tracking-wider">
                  <span>Fund</span>
                  <span className="text-right">Now</span>
                  <span className="text-right">Target</span>
                  <span className="text-right">Drift</span>
                </div>

                <div>
                  {rows.map((row, i) => {
                    const isHovered = hoveredId === row.id;
                    const rowColor = allocationColorFor(row.id, colorMap, i);
                    return (
                      <button
                        type="button"
                        key={row.id}
                        className="grid w-full cursor-default grid-cols-[minmax(0,1fr)_3.25rem_3.25rem_4rem] items-center gap-x-3 gap-y-2 rounded-sm px-2 py-2.5 text-left transition-colors"
                        style={{ backgroundColor: isHovered ? `${rowColor}22` : undefined }}
                        onMouseEnter={() => setHoveredId(row.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div className="col-span-4 flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: rowColor }}
                          />
                          <span className="text-foreground truncate text-[12.5px] font-semibold">
                            {row.symbol}
                          </span>
                        </div>

                        <div className="col-span-4 h-2">
                          <div className="bg-muted relative h-2 rounded-full">
                            <span
                              className="absolute top-0 h-full rounded-full opacity-70"
                              style={{
                                width: `${Math.min(100, (row.currentPct / maxScale) * 100)}%`,
                                background: rowColor,
                              }}
                            />
                            <span
                              className="bg-foreground absolute -top-1 h-4 rounded-sm"
                              style={{
                                width: '2.5px',
                                left: `calc(${Math.min(100, (row.targetPct / maxScale) * 100)}% - 1px)`,
                              }}
                            />
                          </div>
                        </div>

                        <span className="text-foreground text-right text-[12px] font-semibold tabular-nums">
                          {row.currentPct.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground text-right text-[12px] font-medium tabular-nums">
                          {row.targetPct.toFixed(0)}%
                        </span>
                        <span
                          className={cn(
                            'text-right text-[12px] font-semibold tabular-nums',
                            driftColor(row.status)
                          )}
                        >
                          {formatDrift(row.driftPp)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Biggest gaps</CardTitle>
            <CardDescription>
              {tolerancePp === 0
                ? 'Funds off target, largest deviation first.'
                : `Funds beyond the ${tolerancePp.toFixed(1)}pp threshold.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {gaps.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-[13px]">
                Everything is within target. No action required.
              </p>
            ) : (
              <ul className="space-y-3">
                {gaps.slice(0, 3).map((row, index) => (
                  <li key={row.id} className="bg-muted/35 rounded-lg px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums text-background"
                          style={{ backgroundColor: allocationColorFor(row.id, colorMap, index) }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-foreground truncate text-[13px] font-semibold">
                          {row.symbol}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-[12.5px] font-bold tabular-nums',
                          driftColor(row.status)
                        )}
                      >
                        {formatDrift(row.driftPp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 pl-7 text-[12px]">
                      {row.status === 'overweight' ? 'Above target' : 'Below target'} ·{' '}
                      {row.currentPct.toFixed(1)}% vs {row.targetPct.toFixed(0)}% ·{' '}
                      {formatCompactAmount(row.value, currency)}
                    </p>
                  </li>
                ))}
                {gaps.length > 3 && (
                  <li className="bg-muted/20 text-muted-foreground rounded-lg px-3.5 py-2.5 text-[11.5px]">
                    <span className="text-foreground font-medium">
                      +{gaps.length - 3} more off target
                    </span>
                    <span className="px-1.5">·</span>
                    {gaps
                      .slice(3)
                      .map((r) => `${r.symbol} ${formatDrift(r.driftPp)}`)
                      .join(' · ')}
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
