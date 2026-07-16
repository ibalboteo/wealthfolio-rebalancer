import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { addonMainRouteId, addonName } from './lib';
import { SelectedAccountProvider } from './lib/account-provider';
import { Rebalancer } from './pages/rebalancer';

const RebalancerWrapper = ({ ctx }: { ctx: AddonContext }) => {
  const sharedQueryClient = ctx.api.query.getClient() as QueryClient;

  return (
    <QueryClientProvider client={sharedQueryClient}>
      <SelectedAccountProvider ctx={ctx}>
        <Rebalancer ctx={ctx} />
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
