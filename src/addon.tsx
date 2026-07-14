import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Toaster } from './components/toaster';
import { addonMainRouteId, addonName } from './lib';
import { SelectedAccountProvider } from './lib/account-provider';
import { Rebalancer } from './pages/rebalancer';

const RebalancerWrapper = ({ ctx }: { ctx: AddonContext }) => {
  const sharedQueryClient = ctx.api.query.getClient() as QueryClient;

  return (
    <QueryClientProvider client={sharedQueryClient}>
      <SelectedAccountProvider>
        <Rebalancer ctx={ctx} />
        <Toaster />
      </SelectedAccountProvider>
    </QueryClientProvider>
  );
};

export default function enable(ctx: AddonContext) {
  ctx.router.add({
    id: addonMainRouteId,
    path: `/addons/${addonName}`,
    component: () => <RebalancerWrapper ctx={ctx} />,
  });
}
