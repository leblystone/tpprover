import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Injects build timestamp into dist/sw.js so every deploy produces a new file (PWA update detection)
function swVersionPlugin() {
  return {
    name: 'sw-version',
    closeBundle() {
      const outDir = join(process.cwd(), 'dist')
      const swPath = join(outDir, 'sw.js')
      if (!existsSync(swPath)) return
      const version = `ts-${Date.now()}`
      let content = readFileSync(swPath, 'utf8')
      if (content.includes('__SW_BUILD_VERSION__')) {
        content = content.replace(/__SW_BUILD_VERSION__/g, version)
        writeFileSync(swPath, content)
        console.log('[sw-version] Injected build version into sw.js:', version)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  const devHttps = env.VITE_DEV_HTTPS === 'true' || env.VITE_DEV_HTTPS === '1';

  return {
    plugins: [react(), swVersionPlugin()],
    server: {
      // Fixed port for this project — use different ports in other projects (e.g. 5174, 5175) to avoid conflicts
      port: 5173,
      host: true,
      open: true,
      // Set VITE_DEV_HTTPS=true in .env to use https://localhost (satisfies Stripe.js HTTPS in dev, accept the cert once)
      ...(devHttps ? { https: true } : {}),
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*'
      }
    },
    define: {
      'process.env': {},
      'global': 'globalThis',
      // Explicitly define environment variables for mobile builds
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY),
      'import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID': JSON.stringify(env.VITE_STRIPE_MONTHLY_PRICE_ID),
      'import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID': JSON.stringify(env.VITE_STRIPE_ANNUAL_PRICE_ID),
      'import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID': JSON.stringify(env.VITE_STRIPE_LIFETIME_PRICE_ID),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID),
      'import.meta.env.VITE_APP_BUILD_VERSION': JSON.stringify(env.VITE_APP_BUILD_VERSION || env.BUILD_ID || env.COMMIT_REF || '')
    },
    build: {
      rollupOptions: {
        // Removed lucide-react from external - it should be bundled
      }
    }
  }
})