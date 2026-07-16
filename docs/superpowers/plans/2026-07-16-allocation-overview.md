# Allocation Overview ("Overview" tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a switchable "Overview" tab to the Rebalancer addon that shows current-vs-target allocation (donut + table + biggest-gaps card), with an Actual↔Projected toggle.

**Architecture:** Two pure helpers (`allocation-colors`, `allocation-summary`) compute the display model from the existing `PlannedHolding[]` data; two presentational components (`allocation-donut`, `allocation-overview`) render it; `rebalancer.tsx` gains a `Tabs` switch between the existing transfers grid and the new overview. All allocation math is centralized in `allocation-summary` (removing duplication of the percentage formula). No new runtime dependencies: the donut uses `Sector` from `@wealthfolio/ui/chart`, already externalized as host-provided.

**Tech Stack:** React 19, TypeScript, `@wealthfolio/ui` (Tabs, ToggleGroup, Card, formatCompactAmount), `@wealthfolio/ui/chart` (recharts `Sector`), framer-motion (existing), vitest (pure-helper tests only).

## Global Constraints

- **UI language: English** — the addon's own strings are English (`Threshold`, `Edit Plan`, `On target`). The Spanish in the reference screenshot is Wealthfolio host chrome, not the addon. All new copy is English.
- **No new runtime dependencies.** Donut uses recharts `Sector` via `@wealthfolio/ui/chart` (host-provided, externalized in `vite.config.ts`).
- **CSS vars already include `hsl(...)`** → use `var(--x)` directly, never `hsl(var(--x))`.
- **Arbitrary Tailwind classes are unreliable in the bundle** → use inline `style={{}}` for critical dimensions (bar widths, target-marker position, donut size). Standard classes (flex, gap-4, p-6, rounded-lg, etc.) are fine.
- **Only `enabled` holdings** participate in the overview; disabled holdings are excluded.
- **Testing convention:** the repo has no `@testing-library/react`. Test pure helpers with vitest; validate components via `pnpm type-check` and `pnpm build`. Do NOT add render tests or new test deps.
- **Test files** start with `// @vitest-environment jsdom` only when they touch DOM; pure-logic tests use the default `node` env.
- Run `pnpm check:fix` (biome) before each commit.

---

### Task 1: Allocation color helper

**Files:**
- Create: `src/lib/allocation-colors.ts`
- Test: `src/lib/allocation-colors.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `ALLOCATION_PALETTE: readonly string[]`
  - `buildAllocationColorMap(ids: string[]): Record<string, string>` — assigns a stable palette color per id by position, cycling the palette.
  - `allocationColorFor(id: string, map: Record<string, string>, fallbackIndex: number): string` — map lookup with positional fallback.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/allocation-colors.test.ts`
Expected: FAIL — cannot find module `./allocation-colors`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/allocation-colors.ts

/**
 * Stable, theme-friendly palette for allocation segments/rows.
 * Earthy/sage tones that read well on both light and dark backgrounds.
 */
export const ALLOCATION_PALETTE = [
  '#a8a29e',
  '#8a9a8b',
  '#c2b280',
  '#d08c60',
  '#b0a4c0',
  '#9cae9c',
  '#c9bfa8',
  '#7d9ca8',
] as const;

/** Assigns a stable palette color to each id by position, cycling the palette. */
export function buildAllocationColorMap(ids: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  ids.forEach((id, index) => {
    map[id] = ALLOCATION_PALETTE[index % ALLOCATION_PALETTE.length];
  });
  return map;
}

/** Map lookup with a positional fallback so a color is always returned. */
export function allocationColorFor(
  id: string,
  map: Record<string, string>,
  fallbackIndex: number
): string {
  return map[id] ?? ALLOCATION_PALETTE[fallbackIndex % ALLOCATION_PALETTE.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/allocation-colors.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
pnpm check:fix
git add src/lib/allocation-colors.ts src/lib/allocation-colors.test.ts
git commit -m "feat: add stable allocation color palette helper"
```

---

### Task 2: Allocation summary helper

**Files:**
- Create: `src/lib/allocation-summary.ts`
- Test: `src/lib/allocation-summary.test.ts`

**Interfaces:**
- Consumes: `PlannedHolding` from `../hooks/use-holdings`.
- Produces:
  - `type AllocationStatus = 'in_band' | 'overweight' | 'underweight'`
  - `interface AllocationRow { id: string; symbol: string; name: string; value: number; currentPct: number; targetPct: number; driftPp: number; status: AllocationStatus }`
  - `sumEnabledValue(holdings: PlannedHolding[]): number`
  - `buildAllocationSummary(holdings: PlannedHolding[], totalValue: number, tolerancePp: number): AllocationRow[]` — one row per **enabled** holding, ordered as input.
  - `selectAllocationGaps(rows: AllocationRow[]): AllocationRow[]` — rows outside band, sorted by `|driftPp|` descending.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/allocation-summary.test.ts
import { describe, expect, it } from 'vitest';
import type { PlannedHolding } from '../hooks/use-holdings';
import {
  buildAllocationSummary,
  selectAllocationGaps,
  sumEnabledValue,
} from './allocation-summary';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/allocation-summary.test.ts`
Expected: FAIL — cannot find module `./allocation-summary`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/allocation-summary.ts
import type { PlannedHolding } from '../hooks/use-holdings';

export type AllocationStatus = 'in_band' | 'overweight' | 'underweight';

export interface AllocationRow {
  id: string;
  symbol: string;
  name: string;
  value: number;
  currentPct: number;
  targetPct: number;
  driftPp: number;
  status: AllocationStatus;
}

/** Sum of base market value across enabled holdings. */
export function sumEnabledValue(holdings: PlannedHolding[]): number {
  return holdings.reduce((sum, h) => (h.plan?.enabled ? sum + h.marketValue.base : sum), 0);
}

function classify(driftPp: number, tolerancePp: number): AllocationStatus {
  if (Math.abs(driftPp) <= tolerancePp) return 'in_band';
  return driftPp > 0 ? 'overweight' : 'underweight';
}

/**
 * Builds one row per enabled holding, computing current %, target %, drift (pp)
 * and band status. `totalValue` is the denominator for current % — pass the
 * enabled-value sum for the actual view, or the preview total for projected.
 */
export function buildAllocationSummary(
  holdings: PlannedHolding[],
  totalValue: number,
  tolerancePp: number
): AllocationRow[] {
  return holdings
    .filter((h) => h.plan?.enabled)
    .map((h) => {
      const currentPct = totalValue > 0 ? (h.marketValue.base / totalValue) * 100 : 0;
      const targetPct = h.plan?.target ?? 0;
      const driftPp = currentPct - targetPct;
      return {
        id: h.id,
        symbol: h.instrument?.symbol ?? h.holdingType,
        name: h.instrument?.name ?? h.instrument?.symbol ?? h.holdingType,
        value: h.marketValue.base,
        currentPct,
        targetPct,
        driftPp,
        status: classify(driftPp, tolerancePp),
      };
    });
}

/** Out-of-band rows, sorted by absolute drift descending. */
export function selectAllocationGaps(rows: AllocationRow[]): AllocationRow[] {
  return rows
    .filter((r) => r.status !== 'in_band')
    .sort((a, b) => Math.abs(b.driftPp) - Math.abs(a.driftPp));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/allocation-summary.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Export helpers and commit**

Add to `src/lib/index.ts` (after the existing `export * from './rebalance-utils';` line):

```ts
export * from './allocation-colors';
export * from './allocation-summary';
```

```bash
pnpm check:fix
git add src/lib/allocation-summary.ts src/lib/allocation-summary.test.ts src/lib/index.ts
git commit -m "feat: add allocation summary helper"
```

---

### Task 3: Allocation donut component

**Files:**
- Create: `src/components/allocation-donut.tsx`

**Interfaces:**
- Consumes: `AllocationRow` (Task 2), `allocationColorFor` (Task 1), `Sector` from `@wealthfolio/ui/chart`, `formatCompactAmount` from `@wealthfolio/ui`.
- Produces:
  - `interface AllocationDonutProps { rows: AllocationRow[]; colorMap: Record<string, string>; totalValue: number; currency: string; size?: number; hoveredId: string | null; onHoverChange: (id: string | null) => void; reducedMotion?: boolean }`
  - `export function AllocationDonut(props: AllocationDonutProps): JSX.Element`

There is no unit test for this component (no render-test infra). It is validated by `pnpm type-check` and `pnpm build` in Task 5, and visually.

- [ ] **Step 1: Create the component**

```tsx
// src/components/allocation-donut.tsx
import { formatCompactAmount } from '@wealthfolio/ui';
import { Sector } from '@wealthfolio/ui/chart';
import { allocationColorFor, type AllocationRow } from '../lib/allocation-summary';
import '../lib/allocation-colors';

export interface AllocationDonutProps {
  rows: AllocationRow[];
  colorMap: Record<string, string>;
  totalValue: number;
  currency: string;
  size?: number;
  hoveredId: string | null;
  onHoverChange: (id: string | null) => void;
  reducedMotion?: boolean;
}

const PADDING_ANGLE = 3;
const CORNER_RADIUS = 6;
const POP_DISTANCE = 5;

export function AllocationDonut({
  rows,
  colorMap,
  totalValue,
  currency,
  size = 240,
  hoveredId,
  onHoverChange,
  reducedMotion = false,
}: AllocationDonutProps) {
  const thickness = Math.round(size * 0.11);
  const outerR = size / 2 - 8;
  const innerR = outerR - thickness;
  const cx = size / 2;
  const cy = size / 2;

  const visibleRows = rows.filter((r) => r.currentPct > 0);
  const total = visibleRows.reduce((s, r) => s + r.currentPct, 0) || 100;

  let accDeg = 0;
  const segments = visibleRows.map((row, index) => {
    const span = (row.currentPct / total) * 360;
    const gap = visibleRows.length > 1 ? Math.min(PADDING_ANGLE, span * 0.35) : 0;
    const rawStart = accDeg;
    const rawEnd = accDeg + span;
    const startAngle = 90 - rawStart - gap / 2;
    const endAngle = 90 - rawEnd + gap / 2;
    accDeg = rawEnd;
    const midAngle = 90 - (rawStart + span / 2);
    const midRad = (-midAngle * Math.PI) / 180;
    return {
      row,
      color: allocationColorFor(row.id, colorMap, index),
      startAngle,
      endAngle,
      midRad,
    };
  });

  const hoveredRow = hoveredId ? rows.find((r) => r.id === hoveredId) ?? null : null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        <title>Current allocation</title>
        {segments.map((s) => {
          const isHovered = hoveredId === s.row.id;
          const dimmed = hoveredId !== null && !isHovered;
          const tx = isHovered && !reducedMotion ? (POP_DISTANCE * Math.cos(s.midRad)).toFixed(2) : '0';
          const ty = isHovered && !reducedMotion ? (POP_DISTANCE * Math.sin(s.midRad)).toFixed(2) : '0';
          return (
            <Sector
              key={s.row.id}
              cx={cx}
              cy={cy}
              innerRadius={innerR}
              outerRadius={outerR}
              startAngle={s.startAngle}
              endAngle={s.endAngle}
              fill={s.color}
              cornerRadius={CORNER_RADIUS}
              opacity={dimmed ? 0.3 : 1}
              transform={`translate(${tx}, ${ty})`}
              style={{ transition: 'opacity 0.15s ease, transform 0.12s ease', cursor: 'pointer' }}
              onMouseEnter={() => onHoverChange(s.row.id)}
              onMouseLeave={() => onHoverChange(null)}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {hoveredRow ? (
          <>
            <div
              className="text-muted-foreground max-w-[75%] truncate uppercase tracking-wider"
              style={{ fontSize: Math.round(size * 0.042) }}
            >
              {hoveredRow.symbol}
            </div>
            <div
              className="text-foreground mt-0.5 font-semibold tabular-nums"
              style={{ fontSize: Math.round(size * 0.1) }}
            >
              {hoveredRow.currentPct.toFixed(1)}%
            </div>
            <div
              className="text-muted-foreground mt-0.5 tabular-nums"
              style={{ fontSize: Math.round(size * 0.052) }}
            >
              {formatCompactAmount(hoveredRow.value, currency)}
            </div>
          </>
        ) : (
          <>
            <div
              className="text-muted-foreground uppercase tracking-wider"
              style={{ fontSize: Math.round(size * 0.042) }}
            >
              Portfolio
            </div>
            <div
              className="text-foreground mt-0.5 font-semibold tabular-nums"
              style={{ fontSize: Math.round(size * 0.09) }}
            >
              {formatCompactAmount(totalValue, currency)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

Note: the `import '../lib/allocation-colors';` line is only to keep the color module in the graph if tree-shaking is aggressive; `allocationColorFor` is re-exported from `allocation-summary`'s sibling — it is imported directly from `../lib/allocation-colors` instead. Correct the imports to:

```tsx
import { formatCompactAmount } from '@wealthfolio/ui';
import { Sector } from '@wealthfolio/ui/chart';
import { allocationColorFor } from '../lib/allocation-colors';
import type { AllocationRow } from '../lib/allocation-summary';
```

(Remove the placeholder `import '../lib/allocation-colors';` and the `allocationColorFor` import from `allocation-summary`.)

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS (no errors). If `Sector` props error on `transform`, cast the style/transform via the documented recharts `Sector` props — `transform` is a valid SVG prop passed through.

- [ ] **Step 3: Commit**

```bash
pnpm check:fix
git add src/components/allocation-donut.tsx
git commit -m "feat: add allocation donut component"
```

---

### Task 4: Allocation overview component

**Files:**
- Create: `src/components/allocation-overview.tsx`

**Interfaces:**
- Consumes: `PlannedHolding` (`../hooks/use-holdings`); `buildAllocationSummary`, `selectAllocationGaps`, `type AllocationRow` (`../lib/allocation-summary`); `buildAllocationColorMap`, `allocationColorFor` (`../lib/allocation-colors`); `AllocationDonut` (Task 3); `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `ToggleGroup`, `ToggleGroupItem`, `cn`, `formatCompactAmount` (`@wealthfolio/ui`); `useReducedMotion` (`framer-motion`).
- Produces:
  - `interface AllocationOverviewProps { holdings: PlannedHolding[]; previewHoldings: PlannedHolding[]; totalEnabledValue: number; totalPreviewValue: number; tolerancePp: number; currency: string }`
  - `export function AllocationOverview(props: AllocationOverviewProps): JSX.Element`

Validated by `pnpm type-check` / `pnpm build` (Task 5), not a render test.

- [ ] **Step 1: Create the component**

```tsx
// src/components/allocation-overview.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  formatCompactAmount,
  ToggleGroup,
  ToggleGroupItem,
} from '@wealthfolio/ui';
import { useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import type { PlannedHolding } from '../hooks/use-holdings';
import { allocationColorFor, buildAllocationColorMap } from '../lib/allocation-colors';
import {
  type AllocationRow,
  type AllocationStatus,
  buildAllocationSummary,
  selectAllocationGaps,
} from '../lib/allocation-summary';
import { AllocationDonut } from './allocation-donut';

export interface AllocationOverviewProps {
  holdings: PlannedHolding[];
  previewHoldings: PlannedHolding[];
  totalEnabledValue: number;
  totalPreviewValue: number;
  tolerancePp: number;
  currency: string;
}

type Mode = 'current' | 'projected';

function driftColor(status: AllocationStatus): string {
  if (status === 'in_band') return 'text-muted-foreground';
  if (status === 'overweight') return 'text-destructive';
  return 'text-blue-600 dark:text-blue-400';
}

function formatDrift(driftPp: number): string {
  const sign = driftPp > 0 ? '+' : '';
  return `${sign}${driftPp.toFixed(1)}pp`;
}

export function AllocationOverview({
  holdings,
  previewHoldings,
  totalEnabledValue,
  totalPreviewValue,
  tolerancePp,
  currency,
}: AllocationOverviewProps) {
  const [mode, setMode] = useState<Mode>('current');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reducedMotion = useReducedMotion() ?? false;

  const sourceHoldings = mode === 'current' ? holdings : previewHoldings;
  const totalValue = mode === 'current' ? totalEnabledValue : totalPreviewValue;

  const rows = useMemo(
    () => buildAllocationSummary(sourceHoldings, totalValue, tolerancePp),
    [sourceHoldings, totalValue, tolerancePp]
  );
  const colorMap = useMemo(() => buildAllocationColorMap(rows.map((r) => r.id)), [rows]);
  const gaps = useMemo(() => selectAllocationGaps(rows), [rows]);

  // Scale so both current bar and target marker fit; +8% headroom.
  const maxScale =
    Math.max(1, ...rows.flatMap((r) => [r.currentPct, r.targetPct])) * 1.08;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v as Mode)}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="current">Current</ToggleGroupItem>
          <ToggleGroupItem value="projected">After rebalance</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Allocation vs target</CardTitle>
            <CardDescription>
              {mode === 'current'
                ? 'Current allocation of each fund versus its target.'
                : 'Projected allocation after applying the suggested transfers.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid items-center gap-6 pt-2 xl:grid-cols-[260px_minmax(0,1fr)]">
              <div className="mx-auto shrink-0">
                <AllocationDonut
                  rows={rows}
                  colorMap={colorMap}
                  totalValue={totalValue}
                  currency={currency}
                  size={240}
                  hoveredId={hoveredId}
                  onHoverChange={setHoveredId}
                  reducedMotion={reducedMotion}
                />
              </div>

              <div className="min-w-0">
                <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem_4rem] gap-x-3 px-2 pb-2 text-[10px] font-medium uppercase tracking-wider">
                  <span>Fund</span>
                  <span className="text-right">Now</span>
                  <span className="text-right">Target</span>
                  <span className="text-right">Drift</span>
                </div>

                <div>
                  {rows.map((row, i) => {
                    const isHovered = hoveredId === row.id;
                    const rowColor = allocationColorFor(row.id, colorMap, i);
                    return (
                      <button
                        type="button"
                        key={row.id}
                        className="grid w-full cursor-default grid-cols-[minmax(0,1fr)_3.25rem_3.25rem_4rem] items-center gap-x-3 gap-y-2 rounded-sm px-2 py-2.5 text-left transition-colors"
                        style={{ backgroundColor: isHovered ? `${rowColor}22` : undefined }}
                        onMouseEnter={() => setHoveredId(row.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div className="col-span-4 flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ background: rowColor }}
                          />
                          <span className="text-foreground truncate text-[12.5px] font-semibold">
                            {row.symbol}
                          </span>
                        </div>

                        <div className="col-span-4 h-2">
                          <div className="bg-muted relative h-2 rounded-full">
                            <span
                              className="absolute top-0 h-full rounded-full opacity-70"
                              style={{
                                width: `${Math.min(100, (row.currentPct / maxScale) * 100)}%`,
                                background: rowColor,
                              }}
                            />
                            <span
                              className="bg-foreground absolute -top-1 h-4 rounded-sm"
                              style={{
                                width: '2.5px',
                                left: `calc(${Math.min(100, (row.targetPct / maxScale) * 100)}% - 1px)`,
                              }}
                            />
                          </div>
                        </div>

                        <span className="text-foreground text-right text-[12px] font-semibold tabular-nums">
                          {row.currentPct.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground text-right text-[12px] font-medium tabular-nums">
                          {row.targetPct.toFixed(0)}%
                        </span>
                        <span
                          className={cn(
                            'text-right text-[12px] font-semibold tabular-nums',
                            driftColor(row.status)
                          )}
                        >
                          {formatDrift(row.driftPp)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Biggest gaps</CardTitle>
            <CardDescription>
              {tolerancePp === 0
                ? 'Funds off target, largest deviation first.'
                : `Funds beyond the ${tolerancePp.toFixed(1)}pp threshold.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {gaps.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-[13px]">
                Everything is within target. No action required.
              </p>
            ) : (
              <ul className="space-y-3">
                {gaps.slice(0, 3).map((row, index) => (
                  <li key={row.id} className="bg-muted/35 rounded-lg px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums text-background"
                          style={{ backgroundColor: allocationColorFor(row.id, colorMap, index) }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-foreground truncate text-[13px] font-semibold">
                          {row.symbol}
                        </p>
                      </div>
                      <span className={cn('shrink-0 text-[12.5px] font-bold tabular-nums', driftColor(row.status))}>
                        {formatDrift(row.driftPp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 pl-7 text-[12px]">
                      {row.status === 'overweight' ? 'Above target' : 'Below target'} ·{' '}
                      {row.currentPct.toFixed(1)}% vs {row.targetPct.toFixed(0)}% ·{' '}
                      {formatCompactAmount(row.value, currency)}
                    </p>
                  </li>
                ))}
                {gaps.length > 3 && (
                  <li className="bg-muted/20 text-muted-foreground rounded-lg px-3.5 py-2.5 text-[11.5px]">
                    <span className="text-foreground font-medium">
                      +{gaps.length - 3} more off target
                    </span>
                    <span className="px-1.5">·</span>
                    {gaps
                      .slice(3)
                      .map((r) => `${r.symbol} ${formatDrift(r.driftPp)}`)
                      .join(' · ')}
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export the component**

Add to `src/components/index.ts`:

```ts
export * from './allocation-donut';
export * from './allocation-overview';
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS. If `ToggleGroup` `size`/`variant` props error, remove them (defaults are fine); the `type="single"` + `value` + `onValueChange` are the required props.

- [ ] **Step 4: Commit**

```bash
pnpm check:fix
git add src/components/allocation-overview.tsx src/components/index.ts
git commit -m "feat: add allocation overview component"
```

---

### Task 5: Wire the Overview tab into the Rebalancer page

**Files:**
- Modify: `src/pages/rebalancer.tsx`

**Interfaces:**
- Consumes: `AllocationOverview` (Task 4); `sumEnabledValue` (`../lib/allocation-summary` / re-exported from `../lib`); `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@wealthfolio/ui`).
- Produces: no new exports. Adds a `Tabs` switch inside `RebalancerContent` between the existing transfers grid (`value="transfers"`, default) and the new overview (`value="overview"`).

- [ ] **Step 1: Add imports**

At the top of `src/pages/rebalancer.tsx`, extend the `@wealthfolio/ui` import to include the Tabs primitives, add `useState` (already imported), and import the overview + helper:

```tsx
import {
  Button,
  Icons,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@wealthfolio/ui';
```

And extend the components import (currently `AccountSelector, ApplicationHeader, HoldingCard, HoldingPlanner`) to add `AllocationOverview`:

```tsx
import {
  AccountSelector,
  AllocationOverview,
  ApplicationHeader,
  HoldingCard,
  HoldingPlanner,
} from '../components';
```

And add the helper to the existing `../lib` import (currently `addonName, useSelectedAccount`):

```tsx
import { addonName, sumEnabledValue, useSelectedAccount } from '../lib';
```

- [ ] **Step 2: Add view state and wrap the transfers grid in Tabs**

Inside `RebalancerContent`, add near the other hooks (after `const prefersReducedMotion = useReducedMotion();`):

```tsx
  const [view, setView] = useState<'transfers' | 'overview'>('transfers');
```

Then replace the final `return (...)` block of `RebalancerContent` (the one that renders the threshold row and the `m.ul` transfers grid) with the version below. The threshold row + `EditPlanSheet` stay shared above the tabs; the existing transfers `LazyMotion`/`m.ul` block moves verbatim into `<TabsContent value="transfers">`.

```tsx
  return (
    <>
      {hasPlan && (
        <div className="flex items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Threshold</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setTolerancePp(tolerancePp - TOLERANCE_STEP)}
                disabled={tolerancePp <= TOLERANCE_MIN}
                aria-label="Decrease threshold"
              >
                <Icons.Minus className="h-3 w-3" />
              </Button>
              <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">
                {tolerancePp === 0 ? 'Any' : `${tolerancePp.toFixed(1)}pp`}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setTolerancePp(tolerancePp + TOLERANCE_STEP)}
                disabled={tolerancePp >= TOLERANCE_MAX}
                aria-label="Increase threshold"
              >
                <Icons.Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <EditPlanSheet ctx={ctx} compact />
        </div>
      )}

      <Tabs
        value={view}
        onValueChange={(v) => setView(v as 'transfers' | 'overview')}
        className="flex flex-1 min-h-0 flex-col gap-4"
      >
        <TabsList className="self-start">
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="flex-1 min-h-0 overflow-y-auto">
          <LazyMotion features={domAnimation}>
            <m.ul
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.04 } },
              }}
            >
              {rebalancePlan?.transfers.map(({ from, to, amount, currency }) => (
                <m.li
                  key={`${from.id}-${to.id}`}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <HoldingCard
                    status="transfer"
                    from={from}
                    to={to}
                    amount={amount}
                    currency={currency}
                  />
                </m.li>
              ))}
              {driftedHoldings.map((h) => (
                <m.li
                  key={h.id}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <HoldingCard
                    status="drifted"
                    holding={h}
                    totalPortfolioValue={rebalancePlan?.totalPreviewValue ?? 0}
                  />
                </m.li>
              ))}
              {onTargetHoldings.map((h) => (
                <m.li
                  key={h.id}
                  variants={{
                    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <HoldingCard
                    status="on-target"
                    holding={h}
                    totalPortfolioValue={rebalancePlan?.totalPreviewValue ?? 0}
                  />
                </m.li>
              ))}
            </m.ul>
          </LazyMotion>
        </TabsContent>

        <TabsContent value="overview" className="flex-1 min-h-0">
          <AllocationOverview
            holdings={holdings}
            previewHoldings={rebalancePlan?.previewHoldings ?? holdings}
            totalEnabledValue={sumEnabledValue(holdings)}
            totalPreviewValue={rebalancePlan?.totalPreviewValue ?? 0}
            tolerancePp={tolerancePp}
            currency={holdings[0]?.baseCurrency ?? 'USD'}
          />
        </TabsContent>
      </Tabs>
    </>
  );
```

- [ ] **Step 2b: Confirm `hasPlan`-only tabs**

The `Tabs` block should render only when `hasPlan` is true, matching the existing behavior where the threshold row and grid only show for a configured plan. Since the earlier `if (!hasHoldings) / if (configurationRequired) / if (planIsCorrupted)` guards already `return` before this point, reaching this `return` implies `hasPlan` is true — so no extra guard is needed. Verify by reading the function: the three guards above return early.

- [ ] **Step 3: Type-check and run the full test suite**

Run: `pnpm type-check`
Expected: PASS.

Run: `pnpm test`
Expected: PASS — all existing tests plus the two new helper test files (Tasks 1–2) pass.

- [ ] **Step 4: Build the addon**

Run: `pnpm build`
Expected: build succeeds; `dist/addon.js` produced with no bundling of `recharts` (it is externalized).

- [ ] **Step 5: Commit**

```bash
pnpm check:fix
git add src/pages/rebalancer.tsx
git commit -m "feat: add Overview tab to rebalancer page"
```

---

### Task 6: Manual verification and docs

**Files:**
- Modify: `README.md` (features table + usage)

- [ ] **Step 1: Manual smoke test in Wealthfolio**

With the dev host running (`pnpm dev:server` / `pnpm dev`), reinstall the addon, select an account with a configured plan, and verify:
- Two tabs appear: **Transfers** (default) and **Overview**.
- Overview shows the donut, the vs-target table with target markers, and the Biggest gaps card.
- The **Current / After rebalance** toggle changes the donut and bars; "After rebalance" brings drift toward 0.
- Hovering a donut segment highlights its table row and shows its value in the donut center; hovering a row highlights the segment.
- With threshold raised above all drifts, Biggest gaps shows "Everything is within target."
- `prefers-reduced-motion` disables the segment pop-out.

- [ ] **Step 2: Update README**

Add a row to the Features table (after the "Current vs Target preview" row):

```markdown
| **Overview tab** | A donut + current-vs-target table + biggest-gaps summary, with an Actual/Projected toggle to preview the portfolio after the suggested transfers |
```

Add to the Usage list a bullet describing the Overview tab.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the Overview tab"
```

---

## Self-Review

**Spec coverage:**
- Separate switchable view (Overview ↔ Transfers), tabs, default Transfers → Task 5. ✅
- Donut + current-vs-target table + Biggest gaps → Tasks 3, 4. ✅
- Actual↔Projected toggle → Task 4 (`mode`). ✅
- Enabled-only denominator, band = tolerance, drift colors → Task 2 + Task 4. ✅
- Stable per-fund color shared donut/table → Task 1 + Tasks 3–4. ✅
- Hover linkage donut↔table, center label → Tasks 3–4. ✅
- reduced-motion respected → Tasks 3–4. ✅
- Pure helper with tests, no new deps, recharts host-provided → Tasks 1–2, constraints. ✅
- Edge states reused → guards remain in `rebalancer.tsx` (Task 5). ✅

**Placeholder scan:** No TBD/TODO; all steps contain concrete code. The donut task explicitly corrects its import block in Step 1 (no lingering placeholder import). ✅

**Type consistency:** `AllocationRow` fields (`id, symbol, name, value, currentPct, targetPct, driftPp, status`) are defined in Task 2 and consumed identically in Tasks 3–4. `AllocationOverviewProps` (Task 4) matches the props passed in Task 5. `AllocationDonutProps` (Task 3) matches the usage in Task 4. `sumEnabledValue`, `buildAllocationSummary`, `selectAllocationGaps`, `buildAllocationColorMap`, `allocationColorFor` names are consistent across tasks. ✅
