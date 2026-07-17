import { describe, expect, it } from 'vitest';
import i18n, { DEFAULT_LANGUAGE, NS, SUPPORTED_LANGUAGES } from './i18n';

describe('rebalancer i18n instance', () => {
  it('initializes in the default language', () => {
    expect(i18n.language).toBe(DEFAULT_LANGUAGE);
  });

  it('exposes the rebalancer namespace and supported languages', () => {
    expect(NS).toBe('rebalancer');
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'fr', 'de', 'es', 'zh']);
  });

  it('returns the key itself for a missing translation without throwing', () => {
    // Typed resources reject unknown keys at compile time; this asserts the
    // runtime fallback behavior for a key that is intentionally never defined.
    // @ts-expect-error - 'does.not.exist' is deliberately absent from the resources
    expect(i18n.t('does.not.exist')).toBe('does.not.exist');
  });
});
