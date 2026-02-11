import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        chunkSizeWarningLimit: 500,
        target: 'es2020',
        minify: 'esbuild',
        cssMinify: true,
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom', 'zustand'],
              'vendor-firebase-core': ['firebase/app', 'firebase/auth'],
              'vendor-firebase-data': ['firebase/firestore', 'firebase/storage', 'firebase/messaging'],
              'vendor-form': ['react-hook-form', 'zod', '@hookform/resolvers/zod'],
              'vendor-ui': ['lucide-react', 'date-fns', 'react-loading-skeleton'],
              'vendor-media': ['styled-components', 'react-easy-crop'],
              'vendor-emoji': ['emoji-picker-react'],
            }
          }
        }
      }
    };
});
