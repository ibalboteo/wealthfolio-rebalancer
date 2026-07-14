import type { AddonContext } from '@wealthfolio/addon-sdk';
import { describe, expect, it, vi } from 'vitest';
import { deleteAddonStorage, isRecord, readAddonStorage, writeAddonStorage } from './storage';

type StorageApi = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

function createCtx(storage: Partial<StorageApi>) {
  return {
    api: {
      storage: {
        get: storage.get ?? (async () => null),
        set: storage.set ?? (async () => undefined),
        delete: storage.delete ?? (async () => undefined),
      },
    },
  } as unknown as AddonContext;
}

describe('storage', () => {
  it('reads from ctx.api.storage asynchronously', async () => {
    const ctx = createCtx({
      get: async () => '[1,2]',
    });

    const value = await readAddonStorage<number[]>(ctx, 'k', []);
    expect(value).toEqual([1, 2]);
  });

  it('returns fallback when key is missing', async () => {
    const ctx = createCtx({
      get: async () => null,
    });

    const result = await readAddonStorage(ctx, 'missing', [] as number[]);
    expect(result).toEqual([]);
  });

  it('returns fallback when value is invalid json', async () => {
    const ctx = createCtx({
      get: async () => '{bad-json',
    });

    const result = await readAddonStorage(ctx, 'key', ['fallback']);
    expect(result).toEqual(['fallback']);
  });

  it('returns fallback when validator fails', async () => {
    const ctx = createCtx({
      get: async () => JSON.stringify({ value: 123 }),
    });

    const result = await readAddonStorage<string[]>(ctx, 'key', [], (value): value is string[] => {
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    });

    expect(result).toEqual([]);
  });

  it('returns stored value when validator passes', async () => {
    const ctx = createCtx({
      get: async () => JSON.stringify(['AAPL', 'MSFT']),
    });

    const result = await readAddonStorage<string[]>(ctx, 'key', [], (value): value is string[] => {
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    });

    expect(result).toEqual(['AAPL', 'MSFT']);
  });

  it('writes to ctx.api.storage asynchronously', async () => {
    const set = vi.fn(async () => undefined);
    const ctx = createCtx({ set });

    await writeAddonStorage(ctx, 'k', { a: 1 });
    expect(set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }));
  });

  it('swallows async write errors', async () => {
    const ctx = createCtx({
      set: async () => {
        throw new Error('set failed');
      },
    });

    await expect(writeAddonStorage(ctx, 'k', { value: 42 })).resolves.toBeUndefined();
  });

  it('deletes key via ctx.api.storage asynchronously', async () => {
    const del = vi.fn(async () => undefined);
    const ctx = createCtx({ delete: del });

    await deleteAddonStorage(ctx, 'k');
    expect(del).toHaveBeenCalledWith('k');
  });

  it('swallows async delete errors', async () => {
    const ctx = createCtx({
      delete: async () => {
        throw new Error('delete failed');
      },
    });

    await expect(deleteAddonStorage(ctx, 'k')).resolves.toBeUndefined();
  });

  it('returns fallback when async storage get throws', async () => {
    const ctx = createCtx({
      get: async () => {
        throw new Error('get failed');
      },
    });

    const result = await readAddonStorage(ctx, 'missing', 'default');
    expect(result).toBe('default');
  });
});

describe('isRecord', () => {
  it('returns true for a plain object', () => {
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns true for an empty object', () => {
    expect(isRecord({})).toBe(true);
  });

  it('returns false for null', () => {
    expect(isRecord(null)).toBe(false);
  });

  it('returns true for an array (arrays are objects — validators must check further)', () => {
    // This is intentional: downstream validators (isHoldingPlanDataArray) guard against arrays.
    expect(isRecord([])).toBe(true);
  });

  it('returns false for a string', () => {
    expect(isRecord('hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isRecord(42)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it('returns false for a boolean', () => {
    expect(isRecord(false)).toBe(false);
  });
});
