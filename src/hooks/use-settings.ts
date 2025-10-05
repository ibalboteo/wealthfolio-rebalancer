import { useQuery } from "@tanstack/react-query";
import {
  Account,
  QueryKeys,
  Settings,
  type AddonContext,
} from "@wealthfolio/addon-sdk";

interface UseSettingsOptions {
  ctx: AddonContext;
  enabled?: boolean;
}

export function useSettings({ ctx, enabled = true }: UseSettingsOptions) {
  return useQuery<Settings>({
    queryKey: [QueryKeys.SETTINGS],
    queryFn: async () => {
      if (!ctx.api) {
        throw new Error("API context is required");
      }

      const data = await ctx.api.settings.get();
      return data || [];
    },
    enabled: enabled && !!ctx.api,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
