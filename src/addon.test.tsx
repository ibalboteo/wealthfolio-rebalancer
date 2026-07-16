import { describe, expect, it, vi } from 'vitest';
import { addonMainRouteId, addonName } from './lib/constants';

vi.mock('./lib/account-provider', () => ({
  SelectedAccountProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock('./pages/rebalancer', () => ({
  Rebalancer: () => null,
}));

describe('addon runtime registration', () => {
  it('registers the main route in component mode without using sidebar.addItem', () => {
    const addRoute = vi.fn();
    const addSidebarItem = vi.fn();

    const ctx = {
      api: {
        query: {
          getClient: vi.fn(),
        },
      },
      router: {
        add: addRoute,
      },
      sidebar: {
        addItem: addSidebarItem,
      },
      onDisable: vi.fn(),
    } as any;

    return import('./addon').then(({ default: enable }) => {
      enable(ctx);

      expect(addSidebarItem).not.toHaveBeenCalled();
      expect(addRoute).toHaveBeenCalledTimes(1);
      expect(addRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: addonMainRouteId,
          path: `/addons/${addonName}`,
          component: expect.anything(),
        })
      );

      const [routeConfig] = addRoute.mock.calls[0] as [Record<string, unknown>];
      expect(routeConfig.render).toBeUndefined();
    });
  });
});
