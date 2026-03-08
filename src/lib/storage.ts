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

export function writeStorage<T>(key: string, value: T) {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
