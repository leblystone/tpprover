import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './routes.jsx'
import { seedDemoData } from './utils/seed'

const root = createRoot(document.getElementById('root'))
try { seedDemoData() } catch {}
// Enable tester flag in development for program badges
try {
  if (!import.meta.env.PROD) {
    localStorage.setItem('tpprover_is_tester', '1')
  }
} catch {}
root.render(
  <Suspense fallback={<div className="p-6">Loading...</div>}>
    <RouterProvider router={router} />
  </Suspense>
)

// Service worker: enable in production only; unregister in dev to avoid module fetch issues
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  } else {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {})
  }
}