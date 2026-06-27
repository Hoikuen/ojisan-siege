import { defineConfig } from 'vite';

// base: './' → ビルド成果物が相対パスになり、静的ホスティング（GitHub Pages等）にそのまま置ける
export default defineConfig({
  base: './',
  server: { host: true },
});
