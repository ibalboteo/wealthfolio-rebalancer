import { useQuery } from '@tanstack/react-query';
import { type AddonContext, QueryKeys } from '@wealthfolio/addon-sdk';
import { useEffect } from 'react';
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n/i18n';

export function normalizeLanguage(language: unknown): string {
  if (typeof language !== 'string') {
    return DEFAULT_LANGUAGE;
  }
  const base = language.split('-')[0]?.toLowerCase() ?? DEFAULT_LANGUAGE;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(base) ? base : DEFAULT_LANGUAGE;
}

export function useHostLanguage(ctx: AddonContext): string {
  const { data } = useQuery({
    queryKey: [QueryKeys.SETTINGS],
    queryFn: () => ctx.api.settings.get(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const language = normalizeLanguage(data?.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language).catch(() => {});
    }
  }, [language]);

  return language;
}
