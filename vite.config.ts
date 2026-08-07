import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon_192.png', 'icons/icon_512.png'],
      manifest: {
        name: 'Muffin',
        short_name: 'Muffin',
        description:
          'Muffin — track income, expenses, and investments from a Google Sheet on your phone',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#2563eb',
        icons: [
          {
            src: '/icons/icon_192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon_512.png',
            sizes: '512x512',
            type: 'image/png',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        // Never SPA-fallback Netlify Functions (auth redirects must stay network).
        navigateFallbackDenylist: [/^\/\.netlify\/functions\//],
        // Always hit the network for API — never cache HTML login pages or JSON.
        runtimeCaching: (
          ['GET', 'POST', 'PUT', 'DELETE'] as const
        ).map((method) => ({
          urlPattern: /\/\.netlify\/functions\//,
          handler: 'NetworkOnly' as const,
          method,
        })),
      },
      devOptions: {
        enabled: false,
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
