import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import externalGlobals from 'rollup-plugin-external-globals';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
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
      external: ['react', 'react-dom'],
      plugins: [
        externalGlobals({
          react: 'React',
          'react-dom': 'ReactDOM'
        })
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
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
