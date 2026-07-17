import type { PlannedHolding } from '../hooks/use-holdings';

export interface RebalanceAction {
  from: PlannedHolding;
  to: PlannedHolding;
  amount: number;
  currency: string;
}

export interface RebalanceOptions {
  /** Minimum transfer amount; pairs below this are pruned. Default: 0.01 */
  minTradeAmount?: number;
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
 * Two-tier band-based rebalancing algorithm.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DESIGN: Adapted from Wealthfolio's TransferOptimizer (Rust)
 * Reference: https://github.com/wealthfolio/wealthfolio/pull/1263
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ## Problem
 *
 * Naive exact-target rebalancing generates excessive transfers. If a portfolio
 * drifts slightly, forcing every holding back to its exact target produces many
 * small moves that are impractical (transaction costs, tax events, etc.).
 *
 * ## Solution: Band-Based Demand with Two-Tier Supply
 *
 * Instead of rebalancing to the exact target, transfers only bring underweight
 * holdings to their **lower band edge** — the minimum acceptable allocation.
 * This produces fewer and smaller transfers while keeping everything within the
 * configured tolerance band.
 *
 * ### Band Geometry (per holding)
 *
 * ```
 *   ┌─────────────────────────────────────────┐
 *   │          OVERWEIGHT ZONE                 │  current > target
 *   │          (Tier 1 supply = excess)        │
 *   ├─────────── target_value ─────────────────┤
 *   │          ACCEPTABLE ZONE                 │  lower_edge ≤ current ≤ target
 *   │          (Tier 2 supply = headroom)      │
 *   ├─────────── lower_edge ──────────────────┤  = target - band
 *   │          UNDERWEIGHT ZONE                │  current < lower_edge
 *   │          (Demand = deficit to edge)      │
 *   └─────────────────────────────────────────┘
 * ```
 *
 * - `target_value = (plan.target / 100) × total`
 * - `band_value = tolerance × total`
 * - `lower_edge = max(0, target_value - band_value)`
 *
 * ### Supply Tiers (who donates)
 *
 * - **Tier 1 (primary):** excess above TARGET from overweight holdings.
 *   These holdings are already above their goal, so reducing them improves
 *   the portfolio.
 *
 * - **Tier 2 (secondary):** headroom between lower_edge and target — only
 *   used when Tier 1 alone doesn't cover all demand. This avoids worsening
 *   holdings that are already at or below target unless absolutely necessary.
 *
 * ### Supply Selection Logic
 *
 * 1. If total demand = 0 → all within band, return []
 * 2. If Tier 1 supply ≥ total demand → use only Tier 1 (minimal disruption)
 * 3. Otherwise → merge Tier 1 + Tier 2 per holding
 *
 * **Mathematical note:** For portfolios with valid targets (summing to 100%),
 * Tier 1 always covers demand. Proof: total_demand ≤ total_deficit - n×band,
 * and total_deficit = total_excess = total_primary. Tier 2 is a safety net
 * for edge cases (e.g., rounding, corrupted plans).
 *
 * ### Transportation (who gives to whom)
 *
 * Northwest-corner greedy matching:
 * - Sort supply DESC (biggest donors first → fewer transfer pairs)
 * - Sort demand DESC (biggest receivers first)
 * - Deterministic tie-break by holding ID
 * - Greedily match supply[i] → demand[j] until exhausted
 *
 * ### Post-processing
 *
 * Transfers below `minTradeAmount` are pruned (avoids impractical micro-moves).
 *
 * ## Tolerance Semantics
 *
 * - `tolerance = 0` → lower_edge = target → exact-target rebalancing (old behavior)
 * - `tolerance = 0.05` → 5% band → only fix holdings that drifted >5% below target
 *
 * @param holdings Array of holdings with current value and target percentage (plan.target: 0-100)
 * @param tolerance Band width as a fraction of total portfolio value (e.g., 0.05 = 5%)
 * @param options Optional configuration (minTradeAmount)
 * @returns Array of rebalance actions: { from, to, amount, currency }
 */
export function calculateRebalanceActions(
  holdings: PlannedHolding[] | undefined,
  tolerance: number,
  options?: RebalanceOptions
): RebalanceAction[] {
  if (!holdings) return [];

  const minTradeAmount = options?.minTradeAmount ?? 0.01;

  // Only consider enabled holdings for rebalancing
  const enabledHoldings = holdings.filter((h) => h.plan?.enabled === true);
  if (enabledHoldings.length === 0) return [];

  const total = enabledHoldings.reduce((s, h) => s + h.marketValue.base, 0);
  if (total <= 0) return [];

  const bandValue = tolerance * total;

  // Classify each holding into supply tiers and demand
  const primarySupply: { idx: number; amount: number }[] = [];
  const secondarySupply: { idx: number; amount: number }[] = [];
  const demandEntries: { idx: number; amount: number }[] = [];

  for (let i = 0; i < enabledHoldings.length; i++) {
    const h = enabledHoldings[i];
    const targetValue = (h.plan.target / 100) * total;
    const lowerEdge = Math.max(0, targetValue - bandValue);
    const currentValue = h.marketValue.base;

    if (currentValue < lowerEdge) {
      // Below lower band edge — needs inflow
      demandEntries.push({ idx: i, amount: lowerEdge - currentValue });
    } else if (currentValue > targetValue) {
      // Above target — primary supply (excess over target)
      primarySupply.push({ idx: i, amount: currentValue - targetValue });
      // Also has secondary headroom (target down to lower edge)
      const secondary = targetValue - lowerEdge;
      if (secondary > 0) {
        secondarySupply.push({ idx: i, amount: secondary });
      }
    } else {
      // Between lower edge and target — secondary supply only
      const secondary = currentValue - lowerEdge;
      if (secondary > 0) {
        secondarySupply.push({ idx: i, amount: secondary });
      }
    }
  }

  // If no demand, everything is within band — nothing to do
  const totalDemand = demandEntries.reduce((s, e) => s + e.amount, 0);
  if (totalDemand <= 0) return [];

  // If no supply at all, nothing to transfer (e.g. corrupted plan)
  const totalPrimary = primarySupply.reduce((s, e) => s + e.amount, 0);
  const totalSecondary = secondarySupply.reduce((s, e) => s + e.amount, 0);
  if (totalPrimary + totalSecondary <= 0) return [];

  // Decide which supply tiers to use
  let supplyEntries: { idx: number; amount: number }[];

  if (totalPrimary >= totalDemand) {
    // Tier 1 alone covers demand — only take from overweight holdings
    supplyEntries = primarySupply;
  } else {
    // Tier 1 doesn't cover — combine with Tier 2
    // Merge primary + secondary per holding index
    const combined = new Map<number, number>();
    for (const { idx, amount } of primarySupply) {
      combined.set(idx, (combined.get(idx) ?? 0) + amount);
    }
    for (const { idx, amount } of secondarySupply) {
      combined.set(idx, (combined.get(idx) ?? 0) + amount);
    }
    supplyEntries = Array.from(combined, ([idx, amount]) => ({ idx, amount }));
  }

  // Sort supply by amount DESC (biggest donors first → fewer pairs),
  // then holding id ASC for deterministic tie-break
  supplyEntries.sort(
    (a, b) =>
      b.amount - a.amount || enabledHoldings[a.idx].id.localeCompare(enabledHoldings[b.idx].id)
  );
  demandEntries.sort(
    (a, b) =>
      b.amount - a.amount || enabledHoldings[a.idx].id.localeCompare(enabledHoldings[b.idx].id)
  );

  // Northwest-corner transportation: greedily match supply to demand
  const supply = supplyEntries.map((e) => e.amount);
  const demand = demandEntries.map((e) => e.amount);

  const transfers: RebalanceAction[] = [];
  let i = 0;
  let j = 0;

  while (i < supply.length && j < demand.length) {
    const flow = Math.min(supply[i], demand[j]);
    if (flow >= minTradeAmount) {
      transfers.push({
        from: enabledHoldings[supplyEntries[i].idx],
        to: enabledHoldings[demandEntries[j].idx],
        amount: Math.round(flow * 100) / 100,
        currency: enabledHoldings[supplyEntries[i].idx].baseCurrency,
      });
    }
    supply[i] -= flow;
    demand[j] -= flow;
    if (supply[i] <= 0) i++;
    if (demand[j] <= 0) j++;
  }

  return transfers;
}
