import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: process.env.PORT ? Number(process.env.PORT) : 4173,
    host: '0.0.0.0',
    // Railway sends requests with the public host header; allow it explicitly:
    allowedHosts: ['.up.railway.app', '.railway.app', 'localhost'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Increase chunk size warning since we bundle a lot of Radix UI
    chunkSizeWarningLimit: 1000,
  },
});
