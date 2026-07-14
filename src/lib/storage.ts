import type { AddonContext } from '@wealthfolio/addon-sdk';

export type Validator<T> = (value: unknown) => value is T;

export function readStorage<T>(_key: string, fallback: T, _validator?: Validator<T>): T {
  return fallback;
}

export function writeStorage<T>(_key: string, _value: T): void {
  // Legacy compatibility shim. Durable storage now uses async addon APIs.
}

export async function readAddonStorage<T>(
  ctx: AddonContext,
  key: string,
  fallback: T,
  validator?: Validator<T>
): Promise<T> {
  try {
    const rawValue = await ctx.api.storage.get(key);
    if (rawValue === null) return fallback;

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (validator && !validator(parsedValue)) return fallback;

    return parsedValue as T;
  } catch {
    return fallback;
  }
}

export async function writeAddonStorage<T>(
  ctx: AddonContext,
  key: string,
  value: T
): Promise<void> {
  try {
    await ctx.api.storage.set(key, JSON.stringify(value));
  } catch {
    // Ignore persistence errors to keep UI stable
  }
}

export async function deleteAddonStorage(ctx: AddonContext, key: string): Promise<void> {
  try {
    await ctx.api.storage.delete(key);
  } catch {
    // Ignore persistence errors to keep UI stable
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
