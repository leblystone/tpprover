import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'lucide-react/dist/esm/icons/chrome.js',
        replacement: path.resolve(__dirname, 'src/icon-stubs/chrome.js')
      },
      {
        find: 'lucide-react/dist/esm/icons/chrome',
        replacement: path.resolve(__dirname, 'src/icon-stubs/chrome.js')
      },
      {
        find: /^lucide-react$/,
        replacement: path.resolve(__dirname, 'src/icons/lucide-safe.js')
      }
    ]
  },
  optimizeDeps: {
    exclude: ['lucide-react']
  },
  server: {
    port: 3005,
    strictPort: false,
    open: true
  }
})