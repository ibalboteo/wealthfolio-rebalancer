// src/lib/allocation-colors.test.ts
import { describe, expect, it } from 'vitest';
import {
  ALLOCATION_PALETTE,
  allocationColorFor,
  buildAllocationColorMap,
} from './allocation-colors';

describe('buildAllocationColorMap', () => {
  it('assigns a palette color to every id', () => {
    const map = buildAllocationColorMap(['a', 'b', 'c']);
    expect(map.a).toBe(ALLOCATION_PALETTE[0]);
    expect(map.b).toBe(ALLOCATION_PALETTE[1]);
    expect(map.c).toBe(ALLOCATION_PALETTE[2]);
  });

  it('cycles the palette when there are more ids than colors', () => {
    const ids = ALLOCATION_PALETTE.map((_, i) => `id-${i}`).concat('overflow');
    const map = buildAllocationColorMap(ids);
    expect(map.overflow).toBe(ALLOCATION_PALETTE[0]);
  });

  it('is deterministic for the same input order', () => {
    expect(buildAllocationColorMap(['x', 'y'])).toEqual(buildAllocationColorMap(['x', 'y']));
  });
});

describe('allocationColorFor', () => {
  it('returns the mapped color when present', () => {
    const map = buildAllocationColorMap(['a']);
    expect(allocationColorFor('a', map, 5)).toBe(ALLOCATION_PALETTE[0]);
  });

  it('falls back to the palette by index when id is missing', () => {
    expect(allocationColorFor('missing', {}, 1)).toBe(ALLOCATION_PALETTE[1]);
  });
});
