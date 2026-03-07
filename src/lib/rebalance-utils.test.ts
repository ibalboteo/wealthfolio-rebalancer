import { describe, expect, it } from 'vitest';
import type { PlannedHolding } from '../hooks/use-holdings';
import { calculateRebalanceActions, simulateRebalance } from './rebalance-utils';

function createHolding(args: {
  id: string;
  symbol: string;
  value: number;
  target: number;
  enabled?: boolean;
}): PlannedHolding {
  return {
    id: args.id,
    holdingType: 'security',
    accountId: 'acc1',
    baseCurrency: 'USD',
    localCurrency: 'USD',
    quantity: 1,
    marketValue: { base: args.value, local: args.value },
    plan: { id: args.id, target: args.target, enabled: args.enabled ?? true },
    weight: 1,
    asOfDate: '2025-01-01',
    instrument: {
      id: `${args.id}-instr`,
      symbol: args.symbol,
      name: args.symbol,
      currency: 'USD',
      quoteMode: 'MARKET',
    },
  };
}

describe('Rebalance', () => {
  it('rebalances a two-holding portfolio to the exact target', () => {
    const scenario: PlannedHolding[] = [
      createHolding({ id: 'a', symbol: 'AAA', value: 80, target: 50 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 120, target: 50 }),
    ];

    const originalValues = scenario.map((holding) => holding.marketValue.base);
    const plan = calculateRebalanceActions(scenario, 0);
    const preview = simulateRebalance(scenario, plan);

    expect(scenario.map((holding) => holding.marketValue.base)).toEqual(originalValues);
    expect(preview.map((holding) => holding.marketValue.base)).toEqual([100, 100]);
  });

  it('rebalances an uneven three-holding portfolio', () => {
    const scenario: PlannedHolding[] = [
      createHolding({ id: 'a', symbol: 'AAA', value: 50, target: 20 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 100, target: 30 }),
      createHolding({ id: 'c', symbol: 'CCC', value: 150, target: 50 }),
    ];

    const plan = calculateRebalanceActions(scenario, 0);
    const preview = simulateRebalance(scenario, plan);

    expect(preview.map((holding) => holding.marketValue.base)).toEqual([60, 90, 150]);
  });

  it('keeps balanced portfolio unchanged', () => {
    const scenario: PlannedHolding[] = [
      createHolding({ id: '1', symbol: 'S1', value: 20, target: 20 }),
      createHolding({ id: '2', symbol: 'S2', value: 20, target: 20 }),
      createHolding({ id: '3', symbol: 'S3', value: 20, target: 20 }),
      createHolding({ id: '4', symbol: 'S4', value: 20, target: 20 }),
      createHolding({ id: '5', symbol: 'S5', value: 20, target: 20 }),
    ];

    const plan = calculateRebalanceActions(scenario, 0);
    const preview = simulateRebalance(scenario, plan);

    expect(plan).toEqual([]);
    expect(preview.map((holding) => holding.marketValue.base)).toEqual([20, 20, 20, 20, 20]);
  });

  it('excludes disabled holdings from rebalancing', () => {
    const scenario: PlannedHolding[] = [
      createHolding({ id: 'enabled1', symbol: 'E1', value: 80, target: 50, enabled: true }),
      createHolding({ id: 'enabled2', symbol: 'E2', value: 120, target: 50, enabled: true }),
      createHolding({ id: 'disabled', symbol: 'DIS', value: 300, target: 30, enabled: false }),
    ];

    const plan = calculateRebalanceActions(scenario, 0);
    const preview = simulateRebalance(scenario, plan);

    expect(preview.find((holding) => holding.id === 'disabled')?.marketValue.base).toBe(300);
    expect(preview.find((holding) => holding.id === 'enabled1')?.marketValue.base).toBe(100);
    expect(preview.find((holding) => holding.id === 'enabled2')?.marketValue.base).toBe(100);
  });
});

describe('calculateRebalanceActions – defensive edge cases', () => {
  it('returns [] for undefined input', () => {
    expect(calculateRebalanceActions(undefined, 0)).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(calculateRebalanceActions([], 0)).toEqual([]);
  });

  it('returns [] when all holdings are disabled', () => {
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 80, target: 50, enabled: false }),
      createHolding({ id: 'b', symbol: 'BBB', value: 120, target: 50, enabled: false }),
    ];
    expect(calculateRebalanceActions(holdings, 0)).toEqual([]);
  });

  it('returns [] for a single enabled holding (nothing to transfer to)', () => {
    const holdings = [createHolding({ id: 'solo', symbol: 'SOLO', value: 1000, target: 100 })];
    expect(calculateRebalanceActions(holdings, 0)).toEqual([]);
  });

  it('respects tolerance and suppresses tiny deviations', () => {
    // 5% tolerance – portfolio is only 2% off, so no transfers needed
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 102, target: 50 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 98, target: 50 }),
    ];
    expect(calculateRebalanceActions(holdings, 0.05)).toEqual([]);
  });

  it('generates transfers when deviation exceeds tolerance', () => {
    // 1% tolerance but portfolio is 20% off
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 80, target: 50 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 120, target: 50 }),
    ];
    const transfers = calculateRebalanceActions(holdings, 0.01);
    expect(transfers.length).toBeGreaterThan(0);
  });

  it('conserves total portfolio value after applying all transfers', () => {
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 50, target: 20 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 100, target: 30 }),
      createHolding({ id: 'c', symbol: 'CCC', value: 350, target: 50 }),
    ];
    const totalBefore = holdings.reduce((s, h) => s + h.marketValue.base, 0);
    const transfers = calculateRebalanceActions(holdings, 0);
    const preview = simulateRebalance(holdings, transfers);
    const totalAfter = preview.reduce((s, h) => s + h.marketValue.base, 0);
    expect(totalAfter).toBeCloseTo(totalBefore, 2);
  });

  it('uses the currency of the source holding for each transfer', () => {
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 80, target: 50 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 120, target: 50 }),
    ];
    const [transfer] = calculateRebalanceActions(holdings, 0);
    expect(transfer.currency).toBe('USD');
  });
});

describe('simulateRebalance – defensive edge cases', () => {
  it('returns [] for undefined holdings', () => {
    expect(simulateRebalance(undefined, [])).toEqual([]);
  });

  it('returns [] for empty holdings array', () => {
    expect(simulateRebalance([], [])).toEqual([]);
  });

  it('does not mutate the original holdings array', () => {
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 80, target: 50 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 120, target: 50 }),
    ];
    const originalValues = holdings.map((h) => h.marketValue.base);
    const transfers = calculateRebalanceActions(holdings, 0);
    simulateRebalance(holdings, transfers);
    expect(holdings.map((h) => h.marketValue.base)).toEqual(originalValues);
  });

  it('clamps market value to 0 when a transfer exceeds the available balance', () => {
    const holdings = [
      createHolding({ id: 'a', symbol: 'AAA', value: 10, target: 50 }),
      createHolding({ id: 'b', symbol: 'BBB', value: 90, target: 50 }),
    ];
    // Manually craft an over-sized transfer to verify the clamp
    const oversizedTransfer = {
      from: holdings[1],
      to: holdings[0],
      amount: 999,
      currency: 'USD',
    };
    const preview = simulateRebalance(holdings, [oversizedTransfer]);
    expect(preview.find((h) => h.id === 'b')?.marketValue.base).toBe(0);
  });

  it('ignores transfers that reference unknown holding IDs', () => {
    const holdings = [createHolding({ id: 'a', symbol: 'AAA', value: 100, target: 100 })];
    const ghostTransfer = {
      from: createHolding({ id: 'ghost', symbol: 'GHT', value: 50, target: 50 }),
      to: holdings[0],
      amount: 25,
      currency: 'USD',
    };
    const preview = simulateRebalance(holdings, [ghostTransfer]);
    // Only the "to" side is found; no crash, "a" value is increased
    expect(preview.find((h) => h.id === 'a')?.marketValue.base).toBe(125);
  });
});
