import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: { environment: 'jsdom', setupFiles: './src/test-setup.js' },
});
