import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import { localApiPlugin } from './scripts/vite-local-api.js';

// Vercel'de kök dizinden sunulur; kasa PC entegrasyonunda /mobile/ alt yolu kullanılır.
const base = process.env.VERCEL ? '/' : '/mobile/';
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  `v1-compat-${base === '/' ? 'root' : 'mobile'}`;

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    localApiPlugin(mode),
    {
      name: 'makara-build-version',
      transformIndexHtml(html) {
        return html.replaceAll('__MAKARA_BUILD_VERSION__', appVersion);
      },
    },
    legacy({
      targets: ['Android >= 5', 'Chrome >= 63', 'iOS >= 12', 'not IE 11'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: null,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['icons/*.png', 'icons/*.svg', 'logo.png', 'makara.png'],
      manifest: {
        name: 'MAKARA Mobil Sipariş',
        short_name: 'MAKARA Personel',
        description: 'MAKARA Satış Sistemi - Mobil Personel Arayüzü',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/image-proxy/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'product-images',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  base,
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssTarget: 'chrome61',
  },
}));
