import { useQuery } from "@tanstack/react-query";
import {
  type AddonContext,
  type SimplePerformanceMetrics,
} from "@wealthfolio/addon-sdk";

interface UsePerformanceOptions {
  accountIds: string[];
  ctx: AddonContext;
  enabled?: boolean;
}

export function usePerformance({
  accountIds,
  ctx,
  enabled = true,
}: UsePerformanceOptions) {
  return useQuery<SimplePerformanceMetrics[]>({
    queryKey: ["performance", accountIds],
    queryFn: async () => {
      if (!ctx.api || !accountIds.length) {
        return [];
      }

      const data = await ctx.api.performance.calculateAccountsSimple(
        accountIds
      );
      return data || [];
    },
    enabled: enabled && !!ctx.api && accountIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
