// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AddonContext } from '@wealthfolio/addon-sdk';
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import i18n from '../i18n/i18n';
import { SelectedAccountProvider } from '../lib/account-provider';
import { AccountSelector } from './account-selector';

async function renderIn(language: string, ctx: AddonContext, node: ReactNode): Promise<string> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage(language);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <SelectedAccountProvider ctx={ctx}>
          <I18nextProvider i18n={i18n}>{node}</I18nextProvider>
        </SelectedAccountProvider>
      </QueryClientProvider>
    );
    await Promise.resolve();
  });
  const text = container.textContent ?? '';
  await act(() => root.unmount());
  return text;
}

describe('AccountSelector i18n (English)', () => {
  it('renders the English empty-selection label', async () => {
    const ctx = {
      api: { accounts: { getAll: () => Promise.resolve([]) } },
    } as unknown as AddonContext;
    const text = await renderIn('en', ctx, <AccountSelector ctx={ctx} />);
    expect(text).toContain('Select an account');
  });

  it('renders the Spanish empty-selection label', async () => {
    const ctx = {
      api: { accounts: { getAll: () => Promise.resolve([]) } },
    } as unknown as AddonContext;
    const text = await renderIn('es', ctx, <AccountSelector ctx={ctx} />);
    expect(text).toContain('Selecciona una cuenta');
  });
});
