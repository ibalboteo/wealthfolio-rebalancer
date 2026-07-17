import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ['en', 'fr', 'de', 'es', 'zh'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    ignore: ['src/**/*.test.{ts,tsx}'],
    output: 'src/i18n/locales/{{language}}/{{namespace}}.json',
    defaultNS: 'rebalancer',
    primaryLanguage: 'en',
    sort: true,
    indentation: 2,
  },
  types: {
    input: ['src/i18n/locales/en/*.json'],
    output: 'src/types/i18next.d.ts',
    resourcesFile: 'src/types/resources.d.ts',
  },
});
