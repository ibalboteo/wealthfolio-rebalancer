// src/lib/allocation-colors.ts

/**
 * Stable, theme-friendly palette for allocation segments/rows.
 * Earthy/sage tones that read well on both light and dark backgrounds.
 */
export const ALLOCATION_PALETTE = [
  '#a8a29e',
  '#8a9a8b',
  '#c2b280',
  '#d08c60',
  '#b0a4c0',
  '#9cae9c',
  '#c9bfa8',
  '#7d9ca8',
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
