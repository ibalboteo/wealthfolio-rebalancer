import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hostProvidedDependencies: string[] = [
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

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: mode === 'production' ? [['babel-plugin-react-compiler']] : [],
      },
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  esbuild: {
    keepNames: true,
  },
  build: {
    lib: {
      entry: 'src/addon.tsx',
      fileName: () => 'addon.js',
      formats: ['es'],
    },
    rollupOptions: {
      external: hostProvidedDependencies,
    },
    outDir: 'dist',
    minify: false,
    sourcemap: false,
    ...(mode === 'development' && {
      watch: {
        include: ['src/**'],
        exclude: ['node_modules/**', 'dist/**']
      }
    })
  },
}));
