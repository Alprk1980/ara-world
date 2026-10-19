import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ARA World',
        short_name: 'ARA World',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#ffc4dc',
        theme_color: '#ff8fb8',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json,png}'], maximumFileSizeToCacheInBytes: 20 * 1024 * 1024 },
    }),
  ],
  test: { include: ['schemas/**/*.test.ts', 'src/**/*.test.ts', 'tools/**/*.test.ts'] },
});
