import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'GluControl – Control de Glucosa',
        short_name: 'GluControl',
        description: 'Aplicación profesional de control de glucosa, insulina y salud metabólica',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        id: 'com.glucontrol.app',
        categories: ['health', 'medical', 'fitness'],
        lang: 'es',
        icons: [
          { src: 'icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Registrar Glucosa',
            short_name: 'Glucosa',
            description: 'Registrar nueva lectura de glucosa',
            url: '/glucosa/nueva',
            icons: [{ src: 'icons/shortcut-glucose.png', sizes: '192x192' }],
          },
          {
            name: 'Ver Estadísticas',
            short_name: 'Stats',
            description: 'Ver estadísticas de glucosa',
            url: '/estadisticas',
            icons: [{ src: 'icons/shortcut-stats.png', sizes: '192x192' }],
          },
        ],
        screenshots: [
          {
            src: 'screenshots/dashboard.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Dashboard principal de GluControl',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@services': path.resolve(__dirname, './src/services'),
      '@repositories': path.resolve(__dirname, './src/repositories'),
      '@database': path.resolve(__dirname, './src/database'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@core': path.resolve(__dirname, './src/core'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@locales': path.resolve(__dirname, './src/locales'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'db-vendor': ['dexie', 'dexie-react-hooks'],
          'export-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas', 'xlsx'],
          'form-vendor': ['react-hook-form', 'zod'],
          'date-vendor': ['date-fns'],
        },
      },
    },
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
