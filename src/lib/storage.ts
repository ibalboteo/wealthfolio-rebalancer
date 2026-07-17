import type { AddonContext } from '@wealthfolio/addon-sdk';

export type Validator<T> = (value: unknown) => value is T;

function isBrowser() {
  return typeof window !== 'undefined';
}

export function readStorage<T>(key: string, fallback: T, validator?: Validator<T>): T {
  if (!isBrowser()) return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) return fallback;

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (validator && !validator(parsedValue)) return fallback;

    return parsedValue as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // Defer the event so React doesn't see a state update in another component
    // during the current render/commit cycle (avoids the "Cannot update a component
    // while rendering a different component" warning).
    queueMicrotask(() => {
      if (typeof window?.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('local-storage-write', { detail: { key } }));
      }
    });
  } catch {
    // Ignore persistence errors to keep UI stable
  }
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
