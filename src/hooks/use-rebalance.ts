import type { AddonContext } from '@wealthfolio/addon-sdk';
import { useMemo } from 'react';
import type { RebalanceAction } from '../lib';
import {
  addonName,
  calculateRebalanceActions,
  simulateRebalance,
  useSelectedAccount,
} from '../lib';
import {
  type HoldingPlanData,
  isHoldingPlanDataArray,
  type PlannedHolding,
  useHoldings,
} from './use-holdings';
import { useLocalStorage } from './use-local-storage';

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
export function useTolerance(): [number, (pp: number) => void] {
  const [tolerancePp, setRaw] = useLocalStorage<number>(TOLERANCE_KEY, 0, isValidTolerancePp);

  const setTolerancePp = (pp: number) => {
    // Round to nearest step to avoid floating-point drift
    const snapped = Math.round(pp / TOLERANCE_STEP) * TOLERANCE_STEP;
    setRaw(Math.max(TOLERANCE_MIN, Math.min(TOLERANCE_MAX, snapped)));
  };

  return [tolerancePp, setTolerancePp];
}

export { TOLERANCE_MIN, TOLERANCE_MAX, TOLERANCE_STEP };

export interface RebalancePlan {
  transfers: RebalanceAction[];
  previewHoldings: PlannedHolding[];
  totalPreviewValue: number;
}

export interface UseRebalanceOptions {
  ctx: AddonContext;
  tolerance?: number;
  enabled?: boolean;
}

export function useRebalance({
  ctx,
  tolerance = 0,
}: UseRebalanceOptions): RebalancePlan | undefined {
  const { selectedAccount } = useSelectedAccount();
  const { data: holdings } = useHoldings({
    accountId: selectedAccount?.id || '',
    ctx,
  });

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

export function useConfigure(): boolean {
  const { selectedAccount } = useSelectedAccount();
  const accountId = selectedAccount?.id ?? '__none__';

  // The stored value is HoldingPlanData[], not PlannedHolding[]
  const [savedPlan] = useLocalStorage<HoldingPlanData[]>(
    `addons:${addonName}:account:${accountId}:plan`,
    [],
    isHoldingPlanDataArray
  );

  if (accountId === '__none__') {
    return true;
  }

  return savedPlan.length === 0;
}
