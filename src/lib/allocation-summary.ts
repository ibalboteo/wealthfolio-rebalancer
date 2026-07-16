// src/lib/allocation-summary.ts
import type { PlannedHolding } from '../hooks/use-holdings';

export type AllocationStatus = 'in_band' | 'overweight' | 'underweight';

export interface AllocationRow {
  id: string;
  symbol: string;
  name: string;
  value: number;
  currentPct: number;
  targetPct: number;
  driftPp: number;
  status: AllocationStatus;
}

/** Sum of base market value across enabled holdings. */
export function sumEnabledValue(holdings: PlannedHolding[]): number {
  return holdings.reduce((sum, h) => (h.plan?.enabled ? sum + h.marketValue.base : sum), 0);
}

/** Current allocation percentage of a value against a total; 0 when total is 0. */
export function currentPct(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0;
}

function classify(driftPp: number, tolerancePp: number): AllocationStatus {
  if (Math.abs(driftPp) <= tolerancePp) return 'in_band';
  return driftPp > 0 ? 'overweight' : 'underweight';
}

/**
 * Builds one row per enabled holding, computing current %, target %, drift (pp)
 * and band status. `totalValue` is the denominator for current % — pass the
 * enabled-value sum for the actual view, or the preview total for projected.
 */
export function buildAllocationSummary(
  holdings: PlannedHolding[],
  totalValue: number,
  tolerancePp: number
): AllocationRow[] {
  return holdings
    .filter((h) => h.plan?.enabled)
    .map((h) => {
      const current = currentPct(h.marketValue.base, totalValue);
      const targetPct = h.plan?.target ?? 0;
      const driftPp = current - targetPct;
      return {
        id: h.id,
        symbol: h.instrument?.symbol ?? h.holdingType,
        name: h.instrument?.name ?? h.instrument?.symbol ?? h.holdingType,
        value: h.marketValue.base,
        currentPct: current,
        targetPct,
        driftPp,
        status: classify(driftPp, tolerancePp),
      };
    });
}

/** Out-of-band rows, sorted by absolute drift descending. */
export function selectAllocationGaps(rows: AllocationRow[]): AllocationRow[] {
  return rows
    .filter((r) => r.status !== 'in_band')
    .sort((a, b) => Math.abs(b.driftPp) - Math.abs(a.driftPp));
}
