import type { AddonContext } from '@wealthfolio/addon-sdk';
import type { RebalanceAction } from '../lib';
import {
  addonName,
  calculateRebalanceActions,
  simulateRebalance,
  useSelectedAccount,
} from '../lib';
import { type PlannedHolding, useHoldings } from './use-holdings';
import { useLocalStorage } from './use-local-storage';

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
}

export function useConfigure(): boolean {
  const { selectedAccount } = useSelectedAccount();
  const [plannedHoldings] = useLocalStorage<PlannedHolding[]>(
    `addons:${addonName}:account:${selectedAccount?.id}:plan`,
    []
  );

  return plannedHoldings.length === 0;
}
