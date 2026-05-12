import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        svgr(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          manifest: {
            name: 'Smurf Social',
            short_name: 'Smurf',
            description: 'Mạng xã hội Smurf - Kết nối cộng đồng',
            theme_color: '#3b82f6',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
            maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'firebase-storage-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 ngày
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
            ],
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        target: 'es2020',
        minify: 'esbuild',
        cssMinify: true,
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('/react-dom/')) return 'vendor-react';
                if (id.includes('/react-router-dom/') || id.includes('/react-router/')) return 'vendor-react';
                if (id.includes('/zustand/')) return 'vendor-react';
                if (id.includes('/scheduler/')) return 'vendor-react';
                if (id.includes('node_modules/react/')) return 'vendor-react';
                if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'vendor-firebase-core';
                if (id.includes('firebase/app') || id.includes('@firebase/app')) return 'vendor-firebase-core';
                if (id.includes('firebase/database') || id.includes('@firebase/database')) return 'vendor-firebase-db';
                if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'vendor-firebase-data';
                if (id.includes('firebase/storage') || id.includes('@firebase/storage')) return 'vendor-firebase-data';
                if (id.includes('firebase/messaging') || id.includes('@firebase/messaging')) return 'vendor-firebase-data';
                if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase-core';
                if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-form';
                if (id.includes('emoji-picker-react')) return 'vendor-emoji';
                if (id.includes('styled-components') || id.includes('react-easy-crop')) return 'vendor-media';
                if (id.includes('lucide-react')) return 'vendor-icons';
                if (id.includes('date-fns') || id.includes('react-loading-skeleton')) return 'vendor-ui';
                if (id.includes('@zegocloud')) return 'vendor-zegocloud';
                if (id.includes('lottie-react')) return 'vendor-lottie';
              }
              if (id.includes('/src/services/') || id.includes('/src/store/')) return 'app-core';
            }
          }
        }
      }
    };
});
