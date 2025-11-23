import { useQuery } from '@tanstack/react-query';
import type { AddonContext, QuoteSummary } from '@wealthfolio/addon-sdk';

interface UseSearchInstrumentsOptions {
  query: string;
  ctx: AddonContext;
  enabled?: boolean;
}

export function useSearchInstruments({ query, ctx, enabled = true }: UseSearchInstrumentsOptions) {
  return useQuery<QuoteSummary[]>({
    queryKey: ['search-instruments', query],
    queryFn: async () => {
      if (!ctx.api || !query.trim()) {
        return [];
      }

      const results = await ctx.api.market.searchTicker(query.trim());
      return results || [];
    },
    enabled: enabled && !!ctx.api && !!query.trim() && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
}
