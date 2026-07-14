// @vitest-environment jsdom
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import * as storage from '../lib/storage';
import { useAddonStorageState } from './use-local-storage';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const EMPTY_PLAN: string[] = [];

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('useAddonStorageState', () => {
  it('resets hydrated/value on key switch and ignores stale previous key resolution', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    const readMock = vi.spyOn(storage, 'readAddonStorage');
    vi.spyOn(storage, 'writeAddonStorage').mockResolvedValue();

    const pending = new Map<string, Deferred<string[]>>();
    readMock.mockImplementation(async (_ctx, key, _fallback) => {
      const deferred = pending.get(key) ?? createDeferred<string[]>();
      pending.set(key, deferred);
      return deferred.promise;
    });

    const ctx = {
      api: {
        storage: {
          get: vi.fn(),
          set: vi.fn(),
        },
      },
    } as unknown as AddonContext;

    const snapshots: Array<{ value: string[]; hydrated: boolean }> = [];

    function Harness({ storageKey }: { storageKey: string }) {
      const [value, , hydrated] = useAddonStorageState<string[]>(ctx, storageKey, EMPTY_PLAN);
      snapshots.push({ value, hydrated });
      return null;
    }

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness storageKey="acc-1" />);
    });

    await act(async () => {
      root.render(<Harness storageKey="acc-2" />);
    });

    expect(snapshots[snapshots.length - 1]).toEqual({ value: [], hydrated: false });

    await act(async () => {
      pending.get('acc-1')?.resolve(['configured-from-acc-1']);
      await Promise.resolve();
    });

    expect(snapshots[snapshots.length - 1]).toEqual({ value: [], hydrated: false });

    await act(async () => {
      pending.get('acc-2')?.resolve([]);
      await Promise.resolve();
    });

    expect(snapshots[snapshots.length - 1]).toEqual({ value: [], hydrated: true });

    await act(async () => {
      root.unmount();
    });
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });
});
