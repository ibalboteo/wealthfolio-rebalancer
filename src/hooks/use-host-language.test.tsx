// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import i18n from '../i18n/i18n';
import { normalizeLanguage, useHostLanguage } from './use-host-language';

describe('normalizeLanguage', () => {
  it('returns a supported language unchanged', () => {
    expect(normalizeLanguage('es')).toBe('es');
  });

  it('collapses regional codes to the base language', () => {
    expect(normalizeLanguage('fr-CA')).toBe('fr');
  });

  it('falls back to en for unsupported languages', () => {
    expect(normalizeLanguage('pt')).toBe('en');
  });

  it('falls back to en for absent/invalid values', () => {
    expect(normalizeLanguage(undefined)).toBe('en');
    expect(normalizeLanguage(null)).toBe('en');
    expect(normalizeLanguage(42)).toBe('en');
  });
});

function makeCtx(get: () => Promise<{ language?: string }>): AddonContext {
  return {
    api: { settings: { get } },
  } as unknown as AddonContext;
}

async function mountWithCtx(ctx: AddonContext): Promise<() => void> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Harness() {
    useHostLanguage(ctx);
    return null;
  }

  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>
    );
    await Promise.resolve();
  });
  // Flush the resolved settings query + the async changeLanguage effect.
  // The settings query resolution, the effect re-run, and i18next's
  // changeLanguage promise each settle on separate microtask/macrotask ticks.
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
  return () => act(() => root.unmount());
}

describe('useHostLanguage (reactive)', () => {
  it('switches the instance to the host language', async () => {
    await i18n.changeLanguage('en');
    const ctx = makeCtx(() => Promise.resolve({ language: 'es' }));
    const unmount = await mountWithCtx(ctx);
    expect(i18n.language).toBe('es');
    await unmount();
  });

  it('falls back to en when settings.get rejects', async () => {
    await i18n.changeLanguage('es');
    const ctx = makeCtx(() => Promise.reject(new Error('permission denied')));
    const unmount = await mountWithCtx(ctx);
    expect(i18n.language).toBe('en');
    await unmount();
  });

  it('falls back to en for an unsupported host language', async () => {
    await i18n.changeLanguage('es');
    const ctx = makeCtx(() => Promise.resolve({ language: 'pt' }));
    const unmount = await mountWithCtx(ctx);
    expect(i18n.language).toBe('en');
    await unmount();
  });
});
