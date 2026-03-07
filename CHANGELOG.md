# Changelog

All notable changes to the Rebalancer addon will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] - 2026-03-07

### Added
- **Configurable rebalance threshold** — a persistent tolerance setting (0–20 pp,
  step 0.5) in the Edit Plan sheet; positions whose deviation is within the
  threshold are excluded from the rebalance calculation.
- **`useTolerance` hook** — reads/writes the threshold from localStorage with
  range validation, step snapping and clamp-on-write; exports
  `TOLERANCE_MIN`, `TOLERANCE_MAX`, `TOLERANCE_STEP` constants.
- **Suspense-based loading** — migrated to `useSuspenseQuery` (`useSuspenseHoldings`)
  and wrapped the content tree in a `<Suspense>` boundary with a centered
  spinner, eliminating the 404 flash and "no transactions" flash on reload.
- **"Current vs Target" preview sheet** — replaced the post-rebalance deviation
  view (always ≈ 0) with a per-holding comparison: current % → target %,
  projected monetary value, and a ± pp deviation badge colour-coded by threshold.
- **Per-transfer contribution display** (`ContributionLine`) on each transfer
  card showing the current allocation and the pp change that specific transfer
  contributes.
- **Inline validation error** in the holding planner form footer, replacing the
  toast that was hidden behind the Sheet's top-layer stacking context.
- **54 unit tests** covering rebalance-utils, storage helpers, and the holding
  plan hook (validated, plan persistence, edge cases).
- **"Portfolio on target" empty state** with a green check icon and contextual
  copy that mentions the active threshold when > 0.

### Changed
- **SDK v3 migration** — updated manifest, types and API calls to the
  Wealthfolio addon SDK v3 (`SymbolSearchResult`, new context shape, etc.).
- **Single-row toolbar** — merged account selector and action buttons
  (Preview, Edit Plan) into one header row, removing the duplicate toolbar.
- **`RebalancerContent` / `Rebalancer` split** — outer shell owns the header
  and Suspense boundary; inner component consumes guaranteed-non-undefined data.
- **Consistent deviation colour semantics** across PreviewSheet and TransferCard:
  blue = underweight / being bought, red = overweight / being sold,
  green = within the configured threshold (on target).
- **Preview green threshold** now equals `max(0.5, tolerancePp)` so the
  colour matches the configured rebalance threshold rather than a hardcoded value.

### Fixed
- **Same-tab storage sync** — `writeStorage` now dispatches a
  `CustomEvent('local-storage-write')` in addition to relying on the native
  `storage` event (which only fires cross-tab); `useLocalStorage` listens to
  both, so saving a plan now immediately reflects in the UI without a reload.
- **Clear-all storage not reactive** — handled `event.key === null` (fired when
  DevTools clears all storage) in the `useLocalStorage` event handler.
- **Runtime exceptions on first run** — added validators and safe fallbacks in
  `readStorage` / `writeStorage` to prevent crashes from malformed or missing
  stored values.
- **Layout clipping** — added `gap-6`, `shrink-0`, `flex-1 min-h-0` to the
  main layout so the transfer card grid never overflows the viewport.
- **Symbol duplication** in transfer card names — removed a redundant
  `<span>{symbol}</span>`, falling back correctly through
  `name || symbol || holdingType`.
- **`useConfigure` validator mismatch** — fixed a bug where the wrong type
  validator was applied to the stored plan, incorrectly marking configured
  accounts as unconfigured.

## [0.6.0] - 2026-02-01

### Added
- Initial release of the Rebalancer addon.
- Rebalance calculation using a minimum-cost transportation algorithm.
- Sidebar navigation integration and responsive layout.
- Integration with Wealthfolio addon SDK v1.0.0.
