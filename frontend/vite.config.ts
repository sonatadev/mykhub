import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// In dev, /api, /collab and /uploads are proxied to the real backend so the
// app talks to real data instead of mocks. Target is overridable via env
// since the backend is only reachable through a scoped, temporary tunnel.
const API_PROXY_TARGET = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        share: path.resolve(__dirname, 'share.html'),
        shareSpace: path.resolve(__dirname, 'share-space.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: API_PROXY_TARGET, changeOrigin: true },
      '/uploads': { target: API_PROXY_TARGET, changeOrigin: true },
      '/collab': { target: API_PROXY_TARGET, ws: true, changeOrigin: true },
    },
  },
});
