import { describe, expect, it } from 'vitest';
import manifest from '../../manifest.json';
import pkg from '../../package.json';
import viteConfig from '../../vite.config';

const expectedHostProvided: string[] = [
  '@tanstack/react-query',
  '@wealthfolio/addon-sdk',
  '@wealthfolio/addon-sdk/host-api',
  '@wealthfolio/addon-sdk/host-dependencies',
  '@wealthfolio/addon-sdk/manifest',
  '@wealthfolio/addon-sdk/permissions',
  '@wealthfolio/addon-sdk/types',
  '@wealthfolio/addon-sdk/utils',
  '@wealthfolio/ui',
  '@wealthfolio/ui/chart',
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
];

describe('build contract', () => {
  it('does not use rollup-plugin-external-globals', () => {
    expect('rollup-plugin-external-globals' in pkg.devDependencies).toBe(false);
  });

  it('aligns addon sdk and ui dependency versions to 3.6.x', () => {
    expect(pkg.dependencies['@wealthfolio/addon-sdk']).toBe('^3.6.0');
    expect(pkg.dependencies['@wealthfolio/ui']).toBe('^3.6.0');
  });

  it('declares hostDependencies required by the host runtime', () => {
    expect(manifest.hostDependencies).toBeDefined();
    expect(manifest.hostDependencies).toMatchObject({
      '@tanstack/react-query': '^5.90.0',
      '@wealthfolio/addon-sdk': '^3.6.0',
      '@wealthfolio/ui': '^3.6.0',
      react: '^19.2.0',
      'react-dom': '^19.2.0',
    });
  });

  it('externalizes host provided dependencies as ESM specifiers', () => {
    const resolved = viteConfig({
      mode: 'production',
      command: 'build',
      isSsrBuild: false,
      isPreview: false,
    });
    const external = resolved.build?.rollupOptions?.external;

    expect(Array.isArray(external)).toBe(true);
    expect(external).toEqual(expect.arrayContaining(expectedHostProvided));
  });
});
