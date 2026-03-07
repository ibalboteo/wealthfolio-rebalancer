import { beforeEach, describe, expect, it } from 'vitest';
import { isRecord, readStorage, writeStorage } from './storage';

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function createMockStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));

  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

function setMockWindow(storage: StorageLike) {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage: storage,
    },
  });
}

describe('storage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('returns fallback when window is unavailable', () => {
    const result = readStorage('missing', [] as number[]);
    expect(result).toEqual([]);
  });

  it('returns fallback when value is invalid json', () => {
    setMockWindow(createMockStorage({ key: '{bad-json' }));

    const result = readStorage('key', ['fallback']);
    expect(result).toEqual(['fallback']);
  });

  it('returns fallback when validator fails', () => {
    setMockWindow(createMockStorage({ key: JSON.stringify({ value: 123 }) }));

    const result = readStorage<string[]>('key', [], (value): value is string[] => {
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    });

    expect(result).toEqual([]);
  });

  it('returns stored value when validator passes', () => {
    setMockWindow(createMockStorage({ key: JSON.stringify(['AAPL', 'MSFT']) }));

    const result = readStorage<string[]>('key', [], (value): value is string[] => {
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    });

    expect(result).toEqual(['AAPL', 'MSFT']);
  });

  it('writes json value to storage', () => {
    const storage = createMockStorage();
    setMockWindow(storage);

    writeStorage('plan', [{ id: '1', target: 50 }]);

    expect(storage.getItem('plan')).toBe('[{"id":"1","target":50}]');
  });

  it('write is a no-op when window is unavailable', () => {
    // window is undefined (set in beforeEach) — should not throw
    expect(() => writeStorage('key', { value: 42 })).not.toThrow();
  });

  it('silently ignores a storage write error (e.g. QuotaExceededError)', () => {
    const storage = createMockStorage();
    storage.setItem = () => {
      throw new DOMException('QuotaExceededError');
    };
    setMockWindow(storage);

    expect(() => writeStorage('key', { big: 'data' })).not.toThrow();
  });

  it('returns fallback when key is missing', () => {
    setMockWindow(createMockStorage()); // empty storage

    expect(readStorage('missing', 'default')).toBe('default');
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
