import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback-preview',
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();
          const url = req.url || '/';
          if (url.startsWith('/assets/') || url.startsWith('/favicon')) return next();
          if (/\.[a-zA-Z0-9]+$/.test(url.split('?')[0])) return next();
          req.url = '/';
          next();
        });
      },
    },
  ],
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
    allowedHosts: ['.up.railway.app', '.railway.app', 'localhost'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
