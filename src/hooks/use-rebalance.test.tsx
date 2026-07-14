// @vitest-environment jsdom
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { describe, expect, it, vi } from 'vitest';
import { useConfigure } from './use-rebalance';

const useSelectedAccountMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock('../lib', async () => {
  const actual = await vi.importActual<typeof import('../lib')>('../lib');
  return {
    ...actual,
    useSelectedAccount: () => useSelectedAccountMock(),
  };
});

vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  };
});

describe('useConfigure', () => {
  const ctx = { api: {} } as unknown as AddonContext;

  it('returns true when no account is selected', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: null });
    useQueryMock.mockReturnValue({ data: undefined, isLoading: false });

    expect(useConfigure(ctx)).toBe(true);
  });

  it('returns true while query is still loading', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: { id: 'acc-1' } });
    useQueryMock.mockReturnValue({ data: undefined, isLoading: true });

    expect(useConfigure(ctx)).toBe(true);
  });

  it('returns true when plan is empty', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: { id: 'acc-1' } });
    useQueryMock.mockReturnValue({ data: [], isLoading: false });

    expect(useConfigure(ctx)).toBe(true);
  });

  it('returns false when plan has entries', () => {
    useSelectedAccountMock.mockReturnValue({ selectedAccount: { id: 'acc-1' } });
    useQueryMock.mockReturnValue({
      data: [{ id: 'h1', target: 100, enabled: true }],
      isLoading: false,
    });

    expect(useConfigure(ctx)).toBe(false);
  });
});
