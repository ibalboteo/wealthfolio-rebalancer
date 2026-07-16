// src/lib/allocation-summary.test.ts
import { describe, expect, it } from 'vitest';
import type { PlannedHolding } from '../hooks/use-holdings';
import {
  buildAllocationSummary,
  currentPct,
  selectAllocationGaps,
  sumEnabledValue,
} from './allocation-summary';

describe('currentPct', () => {
  it('computes percentage of value against total', () => {
    expect(currentPct(25, 100)).toBe(25);
  });
  it('returns 0 when total is 0', () => {
    expect(currentPct(25, 0)).toBe(0);
  });
});

function holding(args: {
  id: string;
  symbol: string;
  value: number;
  target: number;
  enabled?: boolean;
  name?: string;
}): PlannedHolding {
  return {
    id: args.id,
    accountId: 'acc-1',
    holdingType: 'security',
    baseCurrency: 'EUR',
    localCurrency: 'EUR',
    quantity: 1,
    asOfDate: '2026-01-01',
    marketValue: { base: args.value, local: args.value },
    weight: 0,
    instrument: {
      id: `${args.id}-instr`,
      symbol: args.symbol,
      name: args.name ?? args.symbol,
      currency: 'EUR',
      quoteMode: 'MARKET',
    },
    plan: { id: args.id, target: args.target, enabled: args.enabled ?? true },
  } as unknown as PlannedHolding;
}

describe('sumEnabledValue', () => {
  it('sums only enabled holdings', () => {
    const holdings = [
      holding({ id: 'a', symbol: 'A', value: 60, target: 50 }),
      holding({ id: 'b', symbol: 'B', value: 40, target: 50, enabled: false }),
    ];
    expect(sumEnabledValue(holdings)).toBe(60);
  });
});

describe('buildAllocationSummary', () => {
  it('computes current %, drift and in_band status', () => {
    const holdings = [
      holding({ id: 'a', symbol: 'A', value: 60, target: 50 }),
      holding({ id: 'b', symbol: 'B', value: 40, target: 50 }),
    ];
    const rows = buildAllocationSummary(holdings, 100, 0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'a',
      symbol: 'A',
      value: 60,
      currentPct: 60,
      targetPct: 50,
      driftPp: 10,
      status: 'overweight',
    });
    expect(rows[1].status).toBe('underweight');
  });

  it('marks rows within tolerance as in_band', () => {
    const holdings = [
      holding({ id: 'a', symbol: 'A', value: 51, target: 50 }),
      holding({ id: 'b', symbol: 'B', value: 49, target: 50 }),
    ];
    const rows = buildAllocationSummary(holdings, 100, 2);
    expect(rows.every((r) => r.status === 'in_band')).toBe(true);
  });

  it('excludes disabled holdings', () => {
    const holdings = [
      holding({ id: 'a', symbol: 'A', value: 60, target: 100 }),
      holding({ id: 'b', symbol: 'B', value: 40, target: 0, enabled: false }),
    ];
    const rows = buildAllocationSummary(holdings, 60, 0);
    expect(rows.map((r) => r.id)).toEqual(['a']);
  });

  it('returns 0% when totalValue is 0', () => {
    const holdings = [holding({ id: 'a', symbol: 'A', value: 0, target: 100 })];
    const rows = buildAllocationSummary(holdings, 0, 0);
    expect(rows[0].currentPct).toBe(0);
    expect(rows[0].driftPp).toBe(-100);
  });
});

describe('selectAllocationGaps', () => {
  it('returns out-of-band rows sorted by absolute drift desc', () => {
    const holdings = [
      holding({ id: 'a', symbol: 'A', value: 20, target: 10 }),
      holding({ id: 'b', symbol: 'B', value: 55, target: 40 }),
      holding({ id: 'c', symbol: 'C', value: 25, target: 50 }),
    ];
    const rows = buildAllocationSummary(holdings, 100, 2);
    const gaps = selectAllocationGaps(rows);
    expect(gaps.map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });

  it('returns empty when everything is in band', () => {
    const holdings = [holding({ id: 'a', symbol: 'A', value: 100, target: 100 })];
    const rows = buildAllocationSummary(holdings, 100, 0);
    expect(selectAllocationGaps(rows)).toEqual([]);
  });
});
