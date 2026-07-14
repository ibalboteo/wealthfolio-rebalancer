// @vitest-environment jsdom
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { describe, expect, it, vi } from 'vitest';
import { useConfigure } from './use-rebalance';

const useSelectedAccountMock = vi.fn();
const useAddonStorageStateMock = vi.fn();

vi.mock('../lib', async () => {
  const actual = await vi.importActual<typeof import('../lib')>('../lib');
  return {
    ...actual,
    useSelectedAccount: () => useSelectedAccountMock(),
  };
});

vi.mock('./use-local-storage', async () => {
  const actual = await vi.importActual<typeof import('./use-local-storage')>('./use-local-storage');
  return {
    ...actual,
    useAddonStorageState: (...args: unknown[]) => useAddonStorageStateMock(...args),
  };
});

describe('useConfigure', () => {
  const ctx = {} as AddonContext;

  it('returns true when no account is selected', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: null });
    useAddonStorageStateMock.mockReturnValue([[], vi.fn(), true]);

    expect(useConfigure(ctx)).toBe(true);
  });

  it('returns true while storage is still hydrating', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: { id: 'acc-1' } });
    useAddonStorageStateMock.mockReturnValue([[], vi.fn(), false]);

    expect(useConfigure(ctx)).toBe(true);
  });

  it('returns true when hydrated plan is empty', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: { id: 'acc-1' } });
    useAddonStorageStateMock.mockReturnValue([[], vi.fn(), true]);

    expect(useConfigure(ctx)).toBe(true);
  });

  it('returns false when hydrated plan has entries', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: { id: 'acc-1' } });
    useAddonStorageStateMock.mockReturnValue([
      [{ id: 'h1', target: 100, enabled: true }],
      vi.fn(),
      true,
    ]);

    expect(useConfigure(ctx)).toBe(false);
  });
});
