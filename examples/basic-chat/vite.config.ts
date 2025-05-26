import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  define: {
    // Fix process.env references for AI Gateway
    'process.env': 'import.meta.env',
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          conciergus: ['@conciergus/chat']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@conciergus/chat'],
    exclude: ['@vercel/ai-sdk-gateway']
  }
}); 