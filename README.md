# Rebalancer

> Keep your portfolio aligned with your investment goals.

An unofficial Wealthfolio addon that analyses your portfolio and calculates the exact transfers needed to reach your target allocations — with a configurable deviation threshold so you only act when it truly matters.

## Description

Rebalancer compares your current holdings against a plan you define and applies a minimum-cost transportation algorithm to find the smallest set of transfers that brings every position back on target. You get clear, actionable transfer cards instead of vague percentages.

**Important:** Rebalancer is an analysis and recommendation tool only. It does not execute trades, transfers, or any financial transactions.

## Features

| Feature | Details |
|---|---|
| **Minimum-cost rebalance** | Transfers the least possible amount to reach every target, using a transportation simplex algorithm |
| **Configurable threshold** | Skip transfers below a chosen deviation (0–20 pp, step 0.5) — only rebalance when it's worth it |
| **Per-transfer contribution** | Each transfer card shows how many percentage points that specific transfer moves the position |
| **Current vs Target preview** | A side panel compares every enabled holding: current %, target %, projected value after rebalancing, and ±pp deviation |
| **Colour-coded deviations** | Blue = underweight (buying), Red = overweight (selling), Green = within threshold |
| **Multi-account support** | Switch between accounts; plan and threshold are persisted per-account and globally |
| **Instant UI sync** | Changes to the plan or threshold reflect immediately without a page reload |
| **Zero flash on load** | React Suspense + `useSuspenseQuery` eliminate the loading flicker on reload |
| **Read-only** | No brokerage connections, no trade execution |

## Usage

1. **Select an account** from the dropdown in the top toolbar.
2. **Create a plan** — open *Edit Plan* and assign target percentages to each holding. All enabled targets must sum to 100%.
3. **Set a threshold** (optional) — use the **Rebalance threshold** stepper in *Edit Plan* to ignore deviations smaller than X pp.
4. **Review transfer cards** — each card shows the FROM holding, the TO holding, and the exact amount to move.
5. **Check the preview** — open *Preview* to see the full allocation breakdown: current % → target %, projected value, and deviation badge.
6. **Execute manually** — place the trades in your brokerage and record them in Wealthfolio.

### Threshold example

```
Target: 60% VTI / 40% BND   Threshold: 2 pp

VTI 61.5% (+1.5pp), BND 38.5% (−1.5pp)  →  Both within 2 pp  →  No transfers suggested ✓
VTI 64.0% (+4.0pp), BND 36.0% (−4.0pp)  →  Both exceed threshold  →  Transfer suggested
```

## Installation

### Prerequisites

- Wealthfolio application installed
- Addon system enabled in Wealthfolio settings

### Install

1. Download the latest release from the [releases page](../../releases).
2. Extract the ZIP and place the folder in your Wealthfolio addons directory.
3. Restart Wealthfolio.
4. Enable Rebalancer in **Settings › Addons**.

### Build from source

```bash
git clone https://github.com/yourusername/rebalancer.git
cd rebalancer
pnpm install
pnpm build
pnpm bundle   # creates the distributable ZIP
```

## Development

```bash
pnpm install        # install dependencies
pnpm dev:server     # start the Wealthfolio addon dev server
pnpm dev            # build in watch mode
pnpm type-check     # TypeScript check
pnpm check          # Biome lint + format
pnpm test           # Vitest unit tests (54 tests)
pnpm build          # production build
```

### Tech Stack

- **Framework**: React 19 + TypeScript
- **State / Data**: TanStack Query v5 (with Suspense)
- **Build Tool**: Vite
- **Code Quality**: Biome (linting + formatting)
- **Testing**: Vitest — 54 tests covering rebalance algorithm, storage helpers, and plan hooks
- **Git Hooks**: Lefthook (type-check + Biome on pre-commit)
- **SDK**: Wealthfolio Addon SDK v3

### Project structure

```
src/
  addon.tsx                  # addon entry point
  pages/
    rebalancer.tsx           # main page, Suspense boundary, PreviewSheet, EditPlanSheet
  components/
    holding-planner.tsx      # plan editor with inline validation
    transfer-card.tsx        # individual transfer card with ContributionLine
    account-selector.tsx
    instrument-selector.tsx
    ticker-avatar.tsx
  hooks/
    use-holdings.ts          # useHoldings / useSuspenseHoldings + plan merge
    use-rebalance.ts         # useRebalance, useTolerance, constants
    use-local-storage.ts     # cross-tab + same-tab storage sync
  lib/
    rebalance-utils.ts       # calculateRebalanceActions, simulateRebalance
    storage.ts               # readStorage / writeStorage with validation
    rebalance-utils.test.ts
    storage.test.ts
```

## Limitations & Disclaimer

- **Unofficial addon** — not developed or endorsed by the Wealthfolio team.
- **Analysis only** — does not execute trades or connect to brokerage accounts.
- **Manual execution required** — you must implement the suggested transfers yourself.
- **No financial advice** — recommendations are mathematical calculations, not personalised investment advice.
- **Data accuracy** — results depend on accurate and up-to-date data in Wealthfolio.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Disclaimer**: This addon is not affiliated with Wealthfolio. Use at your own risk and always verify recommendations before executing trades.
