/// <reference types="vitest" />
import { defineConfig } from 'vite';

// base './' so the build works from any path: the Capacitor webview, artifact hosting, file://
export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: { environment: 'node' },
});
