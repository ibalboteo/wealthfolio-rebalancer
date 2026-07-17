import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de/rebalancer.json';
import en from './locales/en/rebalancer.json';
import es from './locales/es/rebalancer.json';
import fr from './locales/fr/rebalancer.json';
import zh from './locales/zh/rebalancer.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es', 'zh'] as const;
export const DEFAULT_LANGUAGE = 'en';
export const NS = 'rebalancer';

const instance = i18next.createInstance();

instance.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  load: 'languageOnly',
  ns: [NS],
  defaultNS: NS,
  resources: {
    en: { rebalancer: en },
    fr: { rebalancer: fr },
    de: { rebalancer: de },
    es: { rebalancer: es },
    zh: { rebalancer: zh },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default instance;
