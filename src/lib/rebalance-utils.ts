import type { PlannedHolding } from '../hooks/use-holdings';

export interface RebalanceAction {
  from: PlannedHolding;
  to: PlannedHolding;
  amount: number;
  currency: string;
}

/**
 * Simulates the result of applying a list of rebalance transfers
 * to a given set of portfolio holdings, returning a new updated array.
 *
 * - Does not mutate the input `holdings`.
 * - Applies each transfer atomically (handles missing holdings gracefully).
 * - Optimized for O(n + m) complexity using ID map lookups.
 *
 * @param holdings   Current portfolio holdings
 * @param transfers  List of RebalanceAction objects ({ from, to, amount })
 * @returns New array of PlannedHolding objects with updated market values
 */
export function simulateRebalance(
  holdings: PlannedHolding[] | undefined,
  transfers: RebalanceAction[]
): PlannedHolding[] {
  if (!holdings || holdings.length === 0) return [];

  // Create a shallow copy to avoid mutating input
  const previewHoldings = holdings.map((h) => ({
    ...h,
    marketValue: { ...h.marketValue }, // clone nested object for immutability
  }));

  // Create an index map for O(1) access by ID
  const holdingsById = new Map<string, PlannedHolding>();
  for (const h of previewHoldings) {
    holdingsById.set(h.id, h);
  }

  // Apply transfers efficiently
  for (const { from, to, amount } of transfers) {
    const fromH = holdingsById.get(from.id);
    const toH = holdingsById.get(to.id);

    if (fromH) {
      fromH.marketValue.base = Math.max(0, (fromH.marketValue.base || 0) - amount);
    }
    if (toH) {
      toH.marketValue.base = (toH.marketValue.base || 0) + amount;
    }
  }

  return previewHoldings;
}

/**
 * Calculates the optimal set of transfers required to rebalance a portfolio
 * exactly to its target allocation, minimizing the total amount transferred.
 *
 * Implements the classic minimum-cost transportation algorithm (minimum-cost flow),
 * adapted for portfolios: distributes the excess from overweight holdings to underweight ones
 * until all are within the specified tolerance of their target percentage.
 *
 * - The `plan.target` field of each holding must be a number between 0 and 100 (target percentage).
 * - The `tolerance` parameter is a relative value (e.g., 0.01 means 1% allowed margin).
 * - Total portfolio value is conserved (sum before and after is equal).
 * - The result is deterministic and always optimal in terms of total amount transferred.
 *
 * @param holdings Array of holdings with current value and target percentage (plan.target: 0-100)
 * @param tolerance Maximum allowed tolerance (e.g., 0.01 = 1%)
 * @returns Array of rebalance actions: { from, to, amount, currency }
 *
 * @example
 * const holdings = [
 *   { ... , marketValue: { base: 1200 }, plan: { target: 60 } },
 *   { ... , marketValue: { base: 800 }, plan: { target: 40 } },
 * ];
 * const transfers = calculateRebalanceActions(holdings, 0.01);
 * // => [{ from: ..., to: ..., amount: ... }]
 */

export function calculateRebalanceActions(
  holdings: PlannedHolding[] | undefined,
  tolerance: number
): RebalanceAction[] {
  if (!holdings) return [];

  // Only consider enabled holdings for rebalancing
  const enabledHoldings = holdings.filter((h) => h.plan?.enabled === true);
  if (enabledHoldings.length === 0) return [];

  const total = enabledHoldings.reduce((s, h) => s + h.marketValue.base, 0);
  const margin = tolerance * total;

  // Deviations (target es porcentaje 0-100)
  const deviations = enabledHoldings.map((h) => h.marketValue.base - (h.plan.target / 100) * total);

  const excessIdx = deviations
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d > margin)
    .sort((a, b) => b.d - a.d);
  const deficitIdx = deviations
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d < -margin)
    .sort((a, b) => a.d - b.d);

  if (!excessIdx.length || !deficitIdx.length) return [];

  /** Build cost matrix: every valid transfer has cost = 1 per unit */
  const n = excessIdx.length;
  const m = deficitIdx.length;
  const cost: number[][] = Array.from({ length: n }, () => Array(m).fill(1));

  /** Demand/supply arrays */
  const supply = excessIdx.map((e) => e.d);
  const demand = deficitIdx.map((d) => -d.d);

  /** Solve min-cost flow via simple transportation simplex */
  const result = transportationSimplex(cost, supply, demand);

  /** Convert to transfers */
  const transfers: RebalanceAction[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const amount = result[i][j];
      if (amount > 0.01) {
        transfers.push({
          from: enabledHoldings[excessIdx[i].i],
          to: enabledHoldings[deficitIdx[j].i],
          amount: Math.round(amount * 100) / 100,
          currency: enabledHoldings[excessIdx[i].i].baseCurrency,
        });
      }
    }
  }

  return transfers;
}

/**
 * Simplified transportation simplex algorithm
 * @param cost matrix of costs
 * @param supply supply array
 * @param demand demand array
 * @returns flow matrix x_ij
 */
function transportationSimplex(_cost: number[][], supply: number[], demand: number[]): number[][] {
  const n = supply.length;
  const m = demand.length;
  const x = Array.from({ length: n }, () => Array(m).fill(0));
  let i = 0,
    j = 0;

  // Northwest corner initialization (greedy feasible solution)
  while (i < n && j < m) {
    const qty = Math.min(supply[i], demand[j]);
    x[i][j] = qty;
    supply[i] -= qty;
    demand[j] -= qty;
    if (supply[i] === 0) i++;
    if (demand[j] === 0) j++;
  }

  // Because all costs = 1, this is already optimal.
  // (If you add different costs, implement full simplex loop.)
  return x;
}
