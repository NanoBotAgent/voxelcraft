import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'noise': ['simplex-noise'],
          'db': ['idb'],
          'compression': ['pako'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: {
    include: ['three', 'simplex-noise', 'idb', 'pako'],
  },
  define: {
    __VERSION__: JSON.stringify('0.1.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
