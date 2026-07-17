// src/lib/allocation-colors.ts

/**
 * Stable allocation palette. Uses Wealthfolio's own theme chart tokens
 * (`--chart-*`, the "forest / sage / sand / clay / plum + stone" allocation
 * palette) so the donut matches the host and follows light/dark automatically.
 * These are CSS variables (present in the addon sandbox), so referencing them
 * inline always resolves — unlike utility classes, which only exist if the host
 * happens to generate them.
 */
export const ALLOCATION_PALETTE = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-stone)',
  'var(--chart-6)',
  'var(--chart-7)',
] as const;

/** Assigns a stable palette color to each id by position, cycling the palette. */
export function buildAllocationColorMap(ids: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  ids.forEach((id, index) => {
    map[id] = ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length];
  });
  return map;
}

/** Map lookup with a positional fallback so a color is always returned. */
export function allocationColorFor(
  id: string,
  map: Record<string, string>,
  fallbackIndex: number
): string {
  return map[id] ?? ALLOCATION_PALETTE[fallbackIndex % ALLOCATION_PALETTE.length];
}
