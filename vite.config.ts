import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(rootDir, 'shared'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/icon_192.png',
        'icons/icon_512.png',
        'icons/muffin-icon.svg',
      ],
      manifest: {
        id: '/',
        name: 'Muffin',
        short_name: 'Muffin',
        description:
          'Muffin — track income, expenses, and investments from a Google Sheet on your phone',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'browser'],
        orientation: 'portrait',
        // Match canvas so Android status bar + splash blend with the app shell
        background_color: '#FAF5EF',
        theme_color: '#FAF5EF',
        icons: [
          {
            src: '/icons/icon_192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon_512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Exclude index.html from precache so expired Netlify Edge Access
        // sessions can challenge document navigations (login redirect HTML).
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        globIgnores: ['**/index.html'],
        // Navigations hit the network first so Edge Access can challenge.
        // (App data already requires network; offline shell is best-effort.)
        navigateFallback: undefined,
        // Always hit the network for API — never cache HTML login pages or JSON.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'muffin-navigations',
              networkTimeoutSeconds: 5,
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) =>
                    response && response.ok ? response : null,
                },
              ],
            },
          },
          ...(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => ({
            urlPattern: /\/\.netlify\/functions\//,
            handler: 'NetworkOnly' as const,
            method,
          })),
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
});
