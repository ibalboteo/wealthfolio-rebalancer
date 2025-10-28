import { HoldingType } from '@wealthfolio/addon-sdk';
import { describe, expect, it } from 'vitest';
import type { PlannedHolding } from '../hooks/use-holdings';
import { calculateRebalanceActions, simulateRebalance } from './rebalance-utils';

describe('Rebalance', () => {
  const testCases = [
    {
      description: 'Scenario 1: 2 holdings, simple split',
      scenario: [
        {
          id: 'a',
          holdingType: HoldingType.SECURITY,
          accountId: 'acc1',
          baseCurrency: 'USD',
          localCurrency: 'USD',
          quantity: 1,
          marketValue: { base: 80, local: 80 },
          plan: { id: 'a', target: 50, enabled: true },
          weight: 1,
          asOfDate: '2025-01-01',
          instrument: {
            id: 'a-instr',
            symbol: 'AAA',
            name: 'A',
            currency: 'USD',
          },
        },
        {
          id: 'b',
          holdingType: HoldingType.SECURITY,
          accountId: 'acc1',
          baseCurrency: 'USD',
          localCurrency: 'USD',
          quantity: 1,
          marketValue: { base: 120, local: 120 },
          plan: { id: 'b  ', target: 50, enabled: true },
          weight: 1,
          asOfDate: '2025-01-01',
          instrument: {
            id: 'b-instr',
            symbol: 'BBB',
            name: 'B',
            currency: 'USD',
          },
        },
      ],
      expectedPreview: [100, 100],
    },
    {
      description: 'Scenario 2: 3 holdings, uneven values',
      scenario: [
        {
          id: 'a',
          holdingType: HoldingType.SECURITY,
          accountId: 'acc1',
          baseCurrency: 'USD',
          localCurrency: 'USD',
          quantity: 1,
          marketValue: { base: 50, local: 50 },
          plan: { id: 'a', target: 20, enabled: true },
          weight: 1,
          asOfDate: '2025-01-01',
          instrument: {
            id: 'a-instr',
            symbol: 'AAA',
            name: 'A',
            currency: 'USD',
          },
        },
        {
          id: 'b',
          holdingType: HoldingType.SECURITY,
          accountId: 'acc1',
          baseCurrency: 'USD',
          localCurrency: 'USD',
          quantity: 1,
          marketValue: { base: 100, local: 100 },
          plan: { id: 'b', target: 30, enabled: true },
          weight: 1,
          asOfDate: '2025-01-01',
          instrument: {
            id: 'b-instr',
            symbol: 'BBB',
            name: 'B',
            currency: 'USD',
          },
        },
        {
          id: 'c',
          holdingType: HoldingType.SECURITY,
          accountId: 'acc1',
          baseCurrency: 'USD',
          localCurrency: 'USD',
          quantity: 1,
          marketValue: { base: 150, local: 150 },
          plan: { id: 'c', target: 50, enabled: true },
          weight: 1,
          asOfDate: '2025-01-01',
          instrument: {
            id: 'c-instr',
            symbol: 'CCC',
            name: 'C',
            currency: 'USD',
          },
        },
      ],
      expectedPreview: [60, 90, 150], // 300 total, targets: 60, 90, 150
    },
    {
      description: 'Scenario 3: 5 holdings, equal targets',
      scenario: Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        holdingType: HoldingType.SECURITY,
        accountId: 'acc1',
        baseCurrency: 'USD',
        localCurrency: 'USD',
        quantity: 1,
        marketValue: { base: 20, local: 20 },
        plan: { id: String(i), target: 20, enabled: true },
        weight: 1,
        asOfDate: '2025-01-01',
        instrument: {
          id: `${i}-instr`,
          symbol: `SYM${i}`,
          name: `H${i}`,
          currency: 'USD',
        },
      })),
      expectedPreview: [20, 20, 20, 20, 20],
    },
    {
      description: 'Scenario 4: 10 holdings, random values',
      scenario: Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        holdingType: HoldingType.SECURITY,
        accountId: 'acc1',
        baseCurrency: 'USD',
        localCurrency: 'USD',
        quantity: 1,
        marketValue: { base: 10 * (i + 1), local: 10 * (i + 1) },
        plan: { id: String(i), target: 10, enabled: true },
        weight: 1,
        asOfDate: '2025-01-01',
        instrument: {
          id: `${i}-instr`,
          symbol: `SYM${i}`,
          name: `H${i}`,
          currency: 'USD',
        },
      })),
      expectedPreview: Array(10).fill(55), // 550 total, 10% each
    },
    {
      description: 'Scenario 5: single holding',
      scenario: [
        {
          id: 'solo',
          holdingType: HoldingType.SECURITY,
          accountId: 'acc1',
          baseCurrency: 'USD',
          localCurrency: 'USD',
          quantity: 1,
          marketValue: { base: 1000, local: 1000 },
          plan: { id: 'solo', target: 100, enabled: true },
          weight: 1,
          asOfDate: '2025-01-01',
          instrument: {
            id: 'solo-instr',
            symbol: 'SOLO',
            name: 'Solo',
            currency: 'USD',
          },
        },
      ],
      expectedPreview: [1000],
    },
  ];

  testCases.forEach(({ description, scenario, expectedPreview }) => {
    it(description, () => {
      const originalValues = scenario.map((h: PlannedHolding) => h.marketValue.base);
      const plan = calculateRebalanceActions(scenario, 0);
      const preview = simulateRebalance(scenario, plan);

      // Original should not be mutated
      expect(scenario.map((h: PlannedHolding) => h.marketValue.base)).toEqual(originalValues);

      // Check preview values
      expect(preview.map((h: PlannedHolding) => h.marketValue.base)).toEqual(expectedPreview);
    });
  });

  it('should exclude disabled holdings from rebalancing', () => {
    const scenario: PlannedHolding[] = [
      {
        id: 'enabled1',
        holdingType: HoldingType.SECURITY,
        accountId: 'acc1',
        baseCurrency: 'USD',
        localCurrency: 'USD',
        quantity: 1,
        marketValue: { base: 80, local: 80 },
        plan: { id: 'enabled1', target: 50, enabled: true },
        weight: 1,
        asOfDate: '2025-01-01',
        instrument: { id: 'e1-instr', symbol: 'E1', name: 'Enabled1', currency: 'USD' },
      },
      {
        id: 'enabled2',
        holdingType: HoldingType.SECURITY,
        accountId: 'acc1',
        baseCurrency: 'USD',
        localCurrency: 'USD',
        quantity: 1,
        marketValue: { base: 120, local: 120 },
        plan: { id: 'enabled2', target: 50, enabled: true },
        weight: 1,
        asOfDate: '2025-01-01',
        instrument: { id: 'e2-instr', symbol: 'E2', name: 'Enabled2', currency: 'USD' },
      },
      {
        id: 'disabled',
        holdingType: HoldingType.SECURITY,
        accountId: 'acc1',
        baseCurrency: 'USD',
        localCurrency: 'USD',
        quantity: 1,
        marketValue: { base: 300, local: 300 },
        plan: { id: 'disabled', target: 30, enabled: false },
        weight: 1,
        asOfDate: '2025-01-01',
        instrument: { id: 'd-instr', symbol: 'DIS', name: 'Disabled', currency: 'USD' },
      },
    ];

    const plan = calculateRebalanceActions(scenario, 0);
    const preview = simulateRebalance(scenario, plan);

    // Disabled holding should remain unchanged
    const disabledOriginal = scenario.find((h) => h.id === 'disabled')?.marketValue.base;
    const disabledPreview = preview.find((h) => h.id === 'disabled')?.marketValue.base;
    expect(disabledPreview).toBe(disabledOriginal);
    expect(disabledPreview).toBe(300);

    // Only enabled holdings should be rebalanced (80 + 120 = 200 total, 50% each = 100 each)
    const enabled1Preview = preview.find((h) => h.id === 'enabled1')?.marketValue.base;
    const enabled2Preview = preview.find((h) => h.id === 'enabled2')?.marketValue.base;
    expect(enabled1Preview).toBe(100);
    expect(enabled2Preview).toBe(100);
  });
});
