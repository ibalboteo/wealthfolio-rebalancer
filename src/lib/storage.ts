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
    // Notify same-tab listeners (native 'storage' event only fires cross-tab)
    window.dispatchEvent(new CustomEvent('local-storage-write', { detail: { key } }));
  } catch {
    // Ignore persistence errors to keep UI stable
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
