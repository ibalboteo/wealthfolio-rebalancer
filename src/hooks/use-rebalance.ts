import type { AddonContext } from '@wealthfolio/addon-sdk';
import { useMemo } from 'react';
import type { RebalanceAction } from '../lib';
import { addonName, calculateRebalanceActions, simulateRebalance } from '../lib';
import type { PlannedHolding } from './use-holdings';
import { useAddonStorageState } from './use-local-storage';

// ─── Tolerance ──────────────────────────────────────────────────────────────

const TOLERANCE_KEY = `addons:${addonName}:tolerance`;
const TOLERANCE_MIN = 0;
const TOLERANCE_MAX = 20;
const TOLERANCE_STEP = 0.5;

function isValidTolerancePp(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= TOLERANCE_MIN && v <= TOLERANCE_MAX;
}

/**
 * Returns the configurable deviation threshold (in percentage points).
 * Holdings that deviate from target by less than this amount are skipped.
 * Range: 0–20 pp.  Default: 0 (any deviation triggers a transfer).
 */
export function useTolerance(ctx: AddonContext): [number, (pp: number) => void] {
  const [tolerancePp, setRaw] = useAddonStorageState<number>(
    ctx,
    TOLERANCE_KEY,
    0,
    isValidTolerancePp
  );

  const setTolerancePp = (pp: number) => {
    // Round to nearest step to avoid floating-point drift
    const snapped = Math.round(pp / TOLERANCE_STEP) * TOLERANCE_STEP;
    setRaw(Math.max(TOLERANCE_MIN, Math.min(TOLERANCE_MAX, snapped)));
  };

  return [tolerancePp, setTolerancePp];
}

export { TOLERANCE_MAX, TOLERANCE_MIN, TOLERANCE_STEP };

export interface RebalancePlan {
  transfers: RebalanceAction[];
  previewHoldings: PlannedHolding[];
  totalPreviewValue: number;
}

/**
 * Pure computation hook: derives the rebalance plan from holdings and tolerance.
 * Holdings must be provided by the caller (e.g. from useSuspenseHoldings).
 */
export function useRebalance(
  holdings: PlannedHolding[] | undefined,
  tolerance = 0
): RebalancePlan | undefined {
  return useMemo(() => {
    const transfers = calculateRebalanceActions(holdings, tolerance);
    const previewHoldings = simulateRebalance(holdings, transfers);
    const totalPreviewValue = previewHoldings.reduce(
      (sum, h) => (h.plan?.enabled ? sum + h.marketValue.base : sum),
      0
    );

    return {
      transfers,
      previewHoldings,
      totalPreviewValue,
    };
  }, [holdings, tolerance]);
}

/**
 * Pure function: determines whether a plan needs configuration based on
 * the enriched holdings data. A plan is "unconfigured" when no holding
 * has a non-default plan entry (i.e. all targets are 0 and all are enabled).
 */
export function useConfigure(holdings: PlannedHolding[] | undefined): boolean {
  if (!holdings || holdings.length === 0) return true;
  return holdings.every((h) => h.plan.target === 0 && h.plan.enabled === true);
}
