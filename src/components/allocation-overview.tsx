// src/components/allocation-overview.tsx
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  formatCompactAmount,
  Icons,
} from '@wealthfolio/ui';
import { useMemo, useState } from 'react';
import type { PlannedHolding } from '../hooks/use-holdings';
import { usePrefersReducedMotion } from '../hooks/use-prefers-reduced-motion';
import { allocationColorFor, buildAllocationColorMap } from '../lib/allocation-colors';
import {
  type AllocationStatus,
  buildAllocationSummary,
  selectAllocationGaps,
} from '../lib/allocation-summary';
import { AllocationDonut } from './allocation-donut';

export type AllocationMode = 'current' | 'projected';

export interface AllocationOverviewProps {
  holdings: PlannedHolding[];
  previewHoldings: PlannedHolding[];
  totalEnabledValue: number;
  totalPreviewValue: number;
  tolerancePp: number;
  currency: string;
  mode: AllocationMode;
  onNavigateToTransfers?: () => void;
}

function driftColor(status: AllocationStatus): string {
  if (status === 'in_band') return 'text-muted-foreground';
  if (status === 'overweight') return 'text-destructive';
  return 'text-blue-600 dark:text-blue-400';
}

function formatDrift(driftPp: number): string {
  const rounded = Math.round(driftPp * 10) / 10;
  if (rounded === 0) return '0.0pp';
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}pp`;
}

// Self-contained responsive rules for the allocation table. Injected via a
// <style> tag (not Tailwind breakpoint classes) because the host stylesheet
// only ships the utility variants the host app itself uses, so `md:`/`xl:`
// variants can silently no-op inside the addon. Below 768px each fund stacks:
// name (+drift) on its own line, full-width bar, then a Now/Target line.
const ALLOCATION_TABLE_CSS = `
.rb-ao-row { display: flex; align-items: center; gap: 0.75rem; }
.rb-ao-name { display: flex; min-width: 0; flex: 1 1 0%; align-items: center; gap: 0.5rem; }
.rb-ao-bar { flex: 1 1 0%; }
.rb-ao-drift-m, .rb-ao-values-m { display: none; }
@media (max-width: 767px) {
  .rb-ao-header { display: none; }
  .rb-ao-row { flex-direction: column; align-items: stretch; gap: 0.5rem; }
  .rb-ao-name { flex: 1 1 auto; }
  .rb-ao-bar { flex: none; width: 100%; }
  .rb-ao-cell { display: none; }
  .rb-ao-drift-m { display: block; }
  .rb-ao-values-m { display: flex; }
}`;

export function AllocationOverview({
  holdings,
  previewHoldings,
  totalEnabledValue,
  totalPreviewValue,
  tolerancePp,
  currency,
  mode,
  onNavigateToTransfers,
}: AllocationOverviewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

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
      <div className="grid gap-6">
        <Card className="h-full min-w-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Allocation vs target</CardTitle>
            <CardDescription>
              {mode === 'current'
                ? 'Current allocation of each fund versus its target.'
                : 'Projected allocation after applying the suggested transfers.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 pt-2">
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
                <style>{ALLOCATION_TABLE_CSS}</style>
                <div className="rb-ao-header rb-ao-row text-muted-foreground px-2 pb-2 text-xs font-medium uppercase tracking-wider">
                  <span className="rb-ao-name">Fund</span>
                  <span className="rb-ao-bar">Allocation</span>
                  <span className="rb-ao-cell w-16 text-right">Current</span>
                  <span className="rb-ao-cell w-12 text-right">Target</span>
                  <span className="rb-ao-cell w-14 text-right">Drift</span>
                </div>

                <div>
                  {rows.map((row, i) => {
                    const isHovered = hoveredId === row.id;
                    const rowColor = allocationColorFor(row.id, colorMap, i);
                    return (
                      <button
                        type="button"
                        key={row.id}
                        className="rb-ao-row w-full cursor-default rounded-sm px-2 py-2.5 text-left transition-colors"
                        style={{ backgroundColor: isHovered ? `${rowColor}22` : undefined }}
                        onMouseEnter={() => setHoveredId(row.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onFocus={() => setHoveredId(row.id)}
                        onBlur={() => setHoveredId(null)}
                      >
                        <div className="rb-ao-name">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: rowColor }}
                          />
                          <span
                            className="text-foreground min-w-0 flex-1 truncate text-xs font-semibold"
                            title={row.name}
                          >
                            {row.name}
                          </span>
                          <span
                            className={cn(
                              'rb-ao-drift-m shrink-0 text-xs font-semibold tabular-nums',
                              driftColor(row.status)
                            )}
                          >
                            {formatDrift(row.driftPp)}
                          </span>
                        </div>

                        <div className="rb-ao-bar h-2">
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

                        <div className="rb-ao-values-m justify-between text-xs text-muted-foreground tabular-nums">
                          <span>
                            Current{' '}
                            <span className="text-foreground font-medium">
                              {row.currentPct.toFixed(1)}%
                            </span>
                          </span>
                          <span>
                            Target{' '}
                            <span className="text-foreground font-medium">
                              {row.targetPct.toFixed(0)}%
                            </span>
                          </span>
                        </div>

                        <span className="rb-ao-cell text-foreground w-16 text-right text-xs font-semibold tabular-nums">
                          {row.currentPct.toFixed(1)}%
                        </span>
                        <span className="rb-ao-cell text-muted-foreground w-12 text-right text-xs font-medium tabular-nums">
                          {row.targetPct.toFixed(0)}%
                        </span>
                        <span
                          className={cn(
                            'rb-ao-cell w-14 text-right text-xs font-semibold tabular-nums',
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

        <Card className="flex h-full min-w-0 flex-col">
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
              <p className="text-muted-foreground py-6 text-center text-sm">
                Everything is within target. No action required.
              </p>
            ) : (
              <ul className="space-y-3">
                {gaps.slice(0, 3).map((row, index) => (
                  <li key={row.id} className="bg-muted/35 rounded-lg px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums text-background"
                          style={{ backgroundColor: allocationColorFor(row.id, colorMap, index) }}
                        >
                          {index + 1}
                        </span>
                        <p
                          className="text-foreground min-w-0 truncate text-sm font-semibold"
                          title={row.name}
                        >
                          {row.name}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-xs font-bold tabular-nums',
                          driftColor(row.status)
                        )}
                      >
                        {formatDrift(row.driftPp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 pl-7 text-xs">
                      {row.status === 'overweight' ? 'Above target' : 'Below target'} ·{' '}
                      {row.currentPct.toFixed(1)}% vs {row.targetPct.toFixed(0)}% ·{' '}
                      {formatCompactAmount(row.value, currency)}
                    </p>
                  </li>
                ))}
                {gaps.length > 3 && (
                  <li className="bg-muted/20 text-muted-foreground rounded-lg px-3.5 py-2.5 text-xs">
                    <span className="text-foreground font-medium">
                      +{gaps.length - 3} more off target
                    </span>
                    <span className="px-1.5">·</span>
                    {gaps
                      .slice(3)
                      .map((r) => `${r.name} ${formatDrift(r.driftPp)}`)
                      .join(' · ')}
                  </li>
                )}
              </ul>
            )}
            {mode === 'current' && gaps.length > 0 && onNavigateToTransfers && (
              <div className="mt-auto pt-4">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={onNavigateToTransfers}
                >
                  View transfers to rebalance
                  <Icons.ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
