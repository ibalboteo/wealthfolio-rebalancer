// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import type { PlannedHolding } from './use-holdings';
import { useConfigure } from './use-rebalance';

function makePlannedHolding(
  overrides: Partial<PlannedHolding> & { plan: PlannedHolding['plan'] }
): PlannedHolding {
  return {
    id: overrides.id ?? 'h1',
    accountId: 'acc-1',
    holdingType: 'equity',
    baseCurrency: 'USD',
    localCurrency: 'USD',
    quantity: 10,
    asOfDate: '2026-01-01',
    marketValue: { base: 1000, ...overrides.marketValue },
    weight: 0,
    instrument: null,
    plan: overrides.plan,
  } as unknown as PlannedHolding;
}

describe('useConfigure', () => {
  it('returns true when holdings is undefined', () => {
    expect(useConfigure(undefined)).toBe(true);
  });

  it('returns true when holdings is empty', () => {
    expect(useConfigure([])).toBe(true);
  });

  it('returns true when all holdings have default plan (target=0, enabled=true)', () => {
    const holdings = [
      makePlannedHolding({ id: 'h1', plan: { id: 'h1', target: 0, enabled: true } }),
      makePlannedHolding({ id: 'h2', plan: { id: 'h2', target: 0, enabled: true } }),
    ];
    expect(useConfigure(holdings)).toBe(true);
  });

  it('returns false when plan has non-zero targets', () => {
    const holdings = [
      makePlannedHolding({ id: 'h1', plan: { id: 'h1', target: 60, enabled: true } }),
      makePlannedHolding({ id: 'h2', plan: { id: 'h2', target: 40, enabled: true } }),
    ];
    expect(useConfigure(holdings)).toBe(false);
  });

  it('returns false when a holding has enabled=false', () => {
    const holdings = [
      makePlannedHolding({ id: 'h1', plan: { id: 'h1', target: 0, enabled: false } }),
      makePlannedHolding({ id: 'h2', plan: { id: 'h2', target: 0, enabled: true } }),
    ];
    expect(useConfigure(holdings)).toBe(false);
  });
});
