import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    
    // Gzip Compression Plugin
    // Generates .gz files for all assets during build
    // Firebase Hosting will automatically serve these when browser supports gzip
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false, // Keep original files (Firebase Hosting needs both)
      threshold: 1024, // Only compress files larger than 1KB (skip tiny files)
      filter: /\.(js|mjs|json|css|html)$/i, // Only compress JS, CSS, HTML, JSON files
      compressionOptions: {
        level: 9, // Maximum compression level (0-9)
      },
    }),
    
    // Brotli Compression Plugin
    // Generates .br files for better compression than gzip (~15-20% smaller)
    // Modern browsers automatically request .br files when supported
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false, // Keep original files
      threshold: 1024, // Only compress files larger than 1KB
      filter: /\.(js|mjs|json|css|html)$/i, // Only compress JS, CSS, HTML, JSON files
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Firebase SDK (large, changes infrequently)
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/functions'],
          // Separate React ecosystem (changes infrequently)
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
