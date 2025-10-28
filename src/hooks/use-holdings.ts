import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddonContext, Holding } from '@wealthfolio/addon-sdk';
import { addonName } from '../lib';
import { useLocalStorage } from './use-local-storage';

export interface HoldingPlanData {
  id: string;
  target: number;
  enabled: boolean;
}

export interface PlannedHolding extends Holding {
  plan: HoldingPlanData;
}

interface UseHoldingsOptions {
  accountId: string;
  ctx: AddonContext;
  enabled?: boolean;
}

export function useHoldings({ accountId, ctx, enabled = true }: UseHoldingsOptions) {
  return useQuery({
    queryKey: ['holdings', accountId],
    queryFn: async () => {
      if (!accountId || !ctx.api) {
        throw new Error('Account ID and API context are required');
      }

      const data = await ctx.api.portfolio.getHoldings(accountId);
      // Append extra data (coming from localStorage or defaults)
      // Local storage should have keys like
      // addons:rebalancer:account:<accountId>:plan
      const holdingsExtra = data.map((holding) => {
        const planKey = `addons:${addonName}:account:${accountId}:plan`;
        const plan = JSON.parse(localStorage.getItem(planKey) || '[]') as HoldingPlanData[];
        const holdingPlan = plan.find((p: HoldingPlanData) => p.id === holding.id);

        return {
          ...holding,
          plan: holdingPlan ?? { id: holding.id, target: 0, enabled: true },
        } as PlannedHolding;
      });

      const sorteredHoldings = holdingsExtra.sort((a, b) => {
        return b.weight - a.weight;
      });

      return sorteredHoldings || [];
    },
    enabled: enabled && !!accountId && !!ctx.api,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export interface UpdateHoldingParams {
  accountId: string;
}

export function useUpdateHolding({ accountId }: UpdateHoldingParams) {
  const queryClient = useQueryClient();

  const planKey = `addons:rebalancer:account:${accountId}:plan`;

  const [plan, setPlan] = useLocalStorage<HoldingPlanData[]>(planKey, []);

  const mutation = useMutation({
    mutationFn: async (plan: HoldingPlanData[]) => {
      setPlan(plan);
    },
    onSuccess: () => {
      // Invalidate and refetch holdings query to reflect changes
      queryClient.invalidateQueries({ queryKey: ['holdings', accountId] });
    },
  });

  return {
    mutation,
    isPending: mutation.isPending,
    isError: mutation.isError,
    plan,
  };
}
