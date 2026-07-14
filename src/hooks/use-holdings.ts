import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { AddonContext, Holding } from '@wealthfolio/addon-sdk';
import { addonName } from '../lib';
import { isRecord, readAddonStorage, writeAddonStorage } from '../lib/storage';

export interface HoldingPlanData {
  id: string;
  target: number;
  enabled: boolean;
}

export interface PlannedHolding extends Holding {
  plan: HoldingPlanData;
}

function isHoldingPlanData(value: unknown): value is HoldingPlanData {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.target === 'number' &&
    Number.isFinite(value.target) &&
    typeof value.enabled === 'boolean'
  );
}

export function isHoldingPlanDataArray(value: unknown): value is HoldingPlanData[] {
  return Array.isArray(value) && value.every(isHoldingPlanData);
}

interface UseHoldingsOptions {
  accountId: string;
  ctx: AddonContext;
  enabled?: boolean;
}

function getPlanKey(accountId: string) {
  return `addons:${addonName}:account:${accountId}:plan`;
}

export async function loadHoldingPlan(
  ctx: AddonContext,
  accountId: string
): Promise<HoldingPlanData[]> {
  return readAddonStorage<HoldingPlanData[]>(
    ctx,
    getPlanKey(accountId),
    [],
    isHoldingPlanDataArray
  );
}

export async function persistHoldingPlan(
  ctx: AddonContext,
  accountId: string,
  plan: HoldingPlanData[]
): Promise<void> {
  await writeAddonStorage(ctx, getPlanKey(accountId), plan);
}

async function fetchHoldings(accountId: string, ctx: AddonContext): Promise<PlannedHolding[]> {
  if (!accountId || !ctx.api) {
    throw new Error('Account ID and API context are required');
  }

  const data = await ctx.api.portfolio.getHoldings(accountId);
  const holdings = Array.isArray(data) ? data : [];

  const plan = await loadHoldingPlan(ctx, accountId);

  const holdingsExtra = holdings.map((holding) => {
    const holdingPlan = plan.find((p: HoldingPlanData) => p.id === holding.id);
    return {
      ...holding,
      plan: holdingPlan ?? { id: holding.id, target: 0, enabled: true },
    } as PlannedHolding;
  });

  return holdingsExtra.sort((a, b) => b.weight - a.weight);
}

const holdingsQueryOptions = (accountId: string, ctx: AddonContext) => ({
  queryKey: ['holdings', accountId] as const,
  queryFn: () => fetchHoldings(accountId, ctx),
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

export function useHoldings({ accountId, ctx, enabled = true }: UseHoldingsOptions) {
  return useQuery({
    ...holdingsQueryOptions(accountId, ctx),
    enabled: enabled && !!accountId && !!ctx.api,
  });
}

export function useSuspenseHoldings({ accountId, ctx }: Omit<UseHoldingsOptions, 'enabled'>) {
  return useSuspenseQuery(holdingsQueryOptions(accountId, ctx));
}

export interface UpdateHoldingParams {
  accountId: string;
  ctx: AddonContext;
}

export function useUpdateHolding({ accountId, ctx }: UpdateHoldingParams) {
  const queryClient = useQueryClient();
  const { data: plan = [] } = useQuery({
    queryKey: ['holding-plan', accountId],
    queryFn: () => loadHoldingPlan(ctx, accountId),
    enabled: !!accountId && !!ctx.api,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (plan: HoldingPlanData[]) => {
      await persistHoldingPlan(ctx, accountId, plan);
    },
    onSuccess: () => {
      // Invalidate and refetch holdings query to reflect changes
      queryClient.invalidateQueries({ queryKey: ['holding-plan', accountId] });
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
