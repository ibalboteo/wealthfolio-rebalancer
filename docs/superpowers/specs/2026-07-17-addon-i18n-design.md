# Rebalancer Addon — Internationalization (i18n) Design

Date: 2026-07-17
Status: Approved (pending spec review)

## Goal

Localize the Rebalancer addon's UI text and follow the Wealthfolio host's
configured language automatically. When the user changes the app language in the
host, the addon re-translates live without a reload.

Ship translations for all five host-supported languages: **en, fr, de, es, zh**.

## Context (findings)

### Host (Wealthfolio v3.6.2)

- Uses **i18next** + **react-i18next**. Language is an explicit **stored user
  setting** (not browser/OS auto-detected). The host applies it via
  `i18n.changeLanguage(settings.language)` in its settings provider.
- Supported host locales: `en`, `fr`, `de`, `es`, `zh`. Regional codes collapse
  to the base language (`load: "languageOnly"`).
- The language value is reachable from an addon through
  `ctx.api.settings.get()` → `.language`.
- The host fetches settings with React Query under key `[QueryKeys.SETTINGS]`
  (`'settings'`). The addon SDK exports the same `QueryKeys.SETTINGS`, so an
  addon querying that key shares the host's cache entry.

### Addon (this repo)

- Ships a **single self-contained `addon.js`** (CSS is inlined via
  `vite-plugin-css-injected-by-js`). The host dev loader fetches and `eval`s that
  one file, so **lazy-loaded translation chunks would not resolve** — translation
  resources must be **bundled/inlined**.
- Data hooks follow a pattern: `useQuery({ queryKey: [QueryKeys.X], queryFn:
  () => ctx.api.X.method() })` (see `src/hooks/use-accounts.ts`).
- The manifest currently declares no `settings` permission.
- User-facing strings are currently hardcoded English across `src/components/`
  and `src/pages/`.

### SDK type gap

The SDK's `Settings` interface (v3.6.2, `data-types.ts`) does **not** declare a
`language` field, but the runtime object returned by `settings.get()` includes it
(the host reads `newSettings.language`). We resolve this with a local module
augmentation, not ad-hoc casts.

## Architecture

The addon gets its **own isolated i18next instance** (it cannot import the host's
singleton — the SDK does not expose it), **bundles** all locale JSON into
`addon.js`, and drives its language from the host setting via the **shared React
Query cache**.

```
Host settings.language
        │  (shared React Query cache, key 'settings')
        ▼
  useHostLanguage(ctx) ──changeLanguage──▶ addon i18next instance
                                                 ▲
              bundled locales (en/fr/de/es/zh) ──┘
                                                 │
                                    t() / useTranslation()
                                                 ▼
                                     Rebalancer components
```

## Components

### 1. i18n instance — `src/i18n/i18n.ts`

- Create a standalone instance with `i18next.createInstance()`.
- `.use(initReactI18next)`.
- Statically import the five locale JSON files and register them as bundled
  `resources` (no backend, no lazy loading).
- Config:
  - `lng: 'en'`, `fallbackLng: 'en'`
  - `supportedLngs: ['en', 'fr', 'de', 'es', 'zh']`
  - `load: 'languageOnly'` (mirror host regional-code collapsing)
  - single namespace: `rebalancer` (also `defaultNS`)
  - `interpolation.escapeValue: false` (React escapes)
- Export the instance as the default/named export.

### 2. Provider wiring — `src/addon.tsx`

- Wrap the existing provider tree in `<I18nextProvider i18n={rebalancerI18n}>`,
  placed inside `QueryClientProvider` (so the language hook can use React Query).

### 3. Reactive language hook — `src/hooks/use-host-language.ts`

- `useQuery({ queryKey: [QueryKeys.SETTINGS], queryFn: () => ctx.api.settings.get() })`
  — the **same key the host uses**, sharing the cache and updating on host
  changes.
- An effect calls `rebalancerI18n.changeLanguage(language)` whenever the resolved
  language changes.
- **Fallback rules (never crash):**
  - `settings` permission denied / `settings.get()` throws → stay on English.
  - `language` absent or not in the supported set → stay on English.
- Called once high in the tree (e.g. in `Rebalancer` or the wrapper) so it is
  active for the whole addon.

### 4. Locale files — `src/i18n/locales/<lng>/rebalancer.json`

- One file per language: `en`, `fr`, `de`, `es`, `zh`.
- Flat, readable key scheme grouped by area, e.g. `overview.biggestGaps`,
  `transfers.sell`, `header.title`.
- English is the source of truth; the other four are machine-translated initially
  and refined later.

### 5. i18next-cli workflow — `i18next.config.ts` (repo root)

- Input globs: `src/**/*.{ts,tsx}`.
- Output: `src/i18n/locales/{{language}}/{{namespace}}.json`.
- Default namespace: `rebalancer`.
- **Type generation enabled** — emits a `.d.ts` so `t()` keys autocomplete and are
  type-checked.
- `package.json` scripts:
  - `i18n:extract` — scan code, add new keys, flag unused, regenerate types.
- Wire `i18n:extract` into the existing **lefthook** pre-commit hook so JSON and
  generated types stay in sync with the code.

### 6. Manifest permission — `manifest.json`

- Add a `settings` permission block:
  - `category: "settings"`, `functions: ["get"]`,
  - purpose: read the host UI language to localize the addon.

## Dependencies

- Runtime (bundled into `addon.js`): `i18next`, `react-i18next`.
- Dev: `i18next-cli`.
- Bundle-size impact: roughly +40–55 kB raw / ~+15 kB gzip over the current
  ~77 kB bundle. Acceptable and self-contained; the actual delta is reported after
  the first build.

## String migration

Replace hardcoded English in `src/components/` and `src/pages/` with `t('...')`
calls (and `useTranslation('rebalancer')` where hooks are needed). Extract keys
with i18next-cli, then translate all five locale files.

## Error handling

- All host access to language is guarded: any failure path falls back to English.
- No user-facing error is surfaced for a missing/denied language; the addon simply
  renders in English.

## Testing

- `use-host-language` unit tests:
  - host language → instance language (happy path)
  - unsupported/absent language → English
  - `settings.get()` throws → English
  - reacts to a changed query value (language switch)
- A component render test: settings query returns `language: 'es'` → component
  shows Spanish copy.
- Existing tests keep passing; wrap renders in the i18n provider where needed.

## Alternatives considered (rejected)

- **Reuse the host i18next instance** — not exposed to addons via `ctx`.
- **Lazy-load locale chunks** (as the host does) — breaks the host's single-file
  `eval` dev loader; resources must be inlined.
- **Read language once on mount** — chosen approach is reactive to live changes.
