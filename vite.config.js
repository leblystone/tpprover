import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis'
  },
  build: {
    rollupOptions: {
      // Removed lucide-react from external - it should be bundled
      output: {
        // Add timestamp to chunk names to force cache busting
        chunkFileNames: 'assets/[name]-[hash]-' + Date.now() + '.js',
        entryFileNames: 'assets/[name]-[hash]-' + Date.now() + '.js',
        assetFileNames: 'assets/[name]-[hash]-' + Date.now() + '.[ext]'
      }
    }
  }
})