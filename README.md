# Rebalancer

> Rebalance your portfolio through fund transfers — tax-free.

An unofficial Wealthfolio addon that identifies the **fund-to-fund transfers** needed to keep your portfolio aligned with your target allocation. In Spain, transfers between investment funds are tax-exempt, allowing you to defer taxation and fully leverage the power of compound interest.

## Why this addon?

Wealthfolio includes a built-in rebalancing feature, but it only shows individual **buy and sell** opportunities. It does not pair those operations as transfers — which is precisely the key to taking advantage of Spain's tax-free fund transfer regime.

Rebalancer fills that gap: it compares your current holdings against a plan you define and applies a minimum-cost transportation algorithm to calculate the **optimal set of transfers** (source → destination) that brings every position to its target with the least amount moved. The result is clear, actionable transfer cards — not generic percentages.

**Important:** Rebalancer is an analysis and recommendation tool only. It does not execute transfers, trades, or any financial transactions.

## Features

| Feature | Details |
|---|---|
| **Minimum-cost transfers** | Computes the smallest set of transfers (source → destination) to reach every target, using a transportation simplex algorithm |
| **Spanish tax advantage** | Designed to leverage Spain's tax-exempt fund transfers — defer taxes and maximise compound growth |
| **Configurable threshold** | Ignore deviations below a chosen threshold (0–20 pp, step 0.5) — only act when it's worth it |
| **Per-transfer contribution** | Each transfer card shows how many percentage points that specific transfer moves |
| **Current vs Target preview** | A side panel compares every position: current %, target %, projected value, and ±pp deviation |
| **Colour-coded deviations** | Blue = underweight, Red = overweight, Green = within threshold |
| **Multi-account support** | Switch between accounts; plan and threshold are persisted per-account and globally |
| **Instant UI sync** | Changes to the plan or threshold reflect immediately without a page reload |
| **Zero flash on load** | React Suspense + `useSuspenseQuery` eliminate the loading flicker |
| **Read-only** | No broker connections, no trade execution |

## Usage

1. **Select an account** from the dropdown in the top toolbar.
2. **Create a plan** — open *Edit Plan* and assign target percentages to each holding. All enabled targets must sum to 100%.
3. **Set a threshold** (optional) — use the **Rebalance threshold** stepper in *Edit Plan* to ignore deviations smaller than X pp.
4. **Review transfer cards** — each card shows the SOURCE fund, the DESTINATION fund, and the exact amount to transfer.
5. **Check the preview** — open *Preview* to see the full allocation breakdown: current % → target %, projected value, and deviation badge.
6. **Execute manually** — place the transfers through your fund provider and record them in Wealthfolio.

### Threshold example

```
Target: 60% Fund A / 40% Fund B   Threshold: 2 pp

Fund A 61.5% (+1.5pp), Fund B 38.5% (−1.5pp)  →  Both within 2 pp  →  No transfers suggested ✓
Fund A 64.0% (+4.0pp), Fund B 36.0% (−4.0pp)  →  Both exceed threshold  →  Transfer suggested
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
pnpm test           # Vitest unit tests (77 tests)
pnpm build          # production build
```

### Sandbox Migration Notes (Wealthfolio 3.6.1+)

- Rebalancer is migrated to the Wealthfolio 3.6.1+ sandbox architecture.
- The addon page route and sidebar link are declared in manifest contributions.
- Persistence uses durable `ctx.api.storage` via async storage helpers.

### Tech Stack

- **Framework**: React 19 + TypeScript
- **State / Data**: TanStack Query v5 (with Suspense)
- **Build Tool**: Vite
- **Code Quality**: Biome (linting + formatting)
- **Testing**: Vitest — 77 tests covering rebalance algorithm, storage helpers, and plan hooks
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
- **Analysis only** — does not execute transfers or connect to fund providers.
- **Manual execution required** — you must place the suggested transfers yourself.
- **No financial advice** — recommendations are mathematical calculations, not personalised investment advice.
- **Data accuracy** — results depend on accurate and up-to-date data in Wealthfolio.
- **Spanish tax regime** — the tax exemption for fund transfers applies to investment funds in Spain. Verify current regulations and consult a tax advisor.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Disclaimer**: This addon is not affiliated with Wealthfolio. Use at your own risk and always verify recommendations before executing transfers.
