import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { Icons } from '@wealthfolio/ui';
import { pascalCase } from 'change-case';
import { lazy } from 'react';
import { Toaster } from './components/toaster';
import { addonName } from './lib';
import { SelectedAccountProvider } from './lib/account-provider';
import { Rebalancer } from './pages/rebalancer';

export default function enable(ctx: AddonContext) {
  // Add a sidebar item
  const sidebarItem = ctx.sidebar.addItem({
    id: addonName,
    label: pascalCase(addonName),
    icon: <Icons.ArrowLeftRight className="h-5 w-5" />,
    route: `/addon/${addonName}`,
    order: 100,
  });

  // Create wrapper component with QueryClientProvider using shared client
  const RebalancerWrapper = () => {
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

  // Add a route
  ctx.router.add({
    path: `/addon/${addonName}`,
    component: lazy(() => Promise.resolve({ default: RebalancerWrapper })),
  });

  // Cleanup on disable
  ctx.onDisable(() => {
    try {
      sidebarItem.remove();
    } catch (err) {
      ctx.api.logger.error(`Failed to remove sidebar item:${err}`);
    }
  });
}
