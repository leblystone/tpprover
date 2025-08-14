import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import GlobalSearchModal from './components/search/GlobalSearchModal'
import { ToastContainer } from './components/ui/Toast'


export default function App() {
  const [themeName] = useState(() => { try { return localStorage.getItem('tpprover_theme') || defaultThemeName } catch { return defaultThemeName } })
  const resolvedThemeName = themes[themeName] ? themeName : defaultThemeName
  const theme = themes[resolvedThemeName]
  React.useEffect(() => {
    if (!themes[themeName]) {
      try { localStorage.setItem('tpprover_theme', defaultThemeName) } catch {}
    }
  }, [themeName])
  const [showSearch, setShowSearch] = useState(false)
  const [toasts, setToasts] = useState([])
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))
  const addToast = (message, type = 'success') => setToasts(prev => [...prev, { id: Date.now() + Math.random(), message, type }])
  React.useEffect(() => {
    const handler = () => setShowSearch(true)
    window.addEventListener('tpp:openSearch', handler)
    const toastHandler = (e) => {
      try {
        const { message, type } = e.detail || {}
        if (message) addToast(message, type || 'success')
      } catch {}
    }
    window.addEventListener('tpp:toast', toastHandler)
    return () => { window.removeEventListener('tpp:openSearch', handler); window.removeEventListener('tpp:toast', toastHandler) }
  }, [])
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <Topbar theme={theme} />
      <main className="pt-20 md:ml-24 px-4 py-6">
        <GlobalSearchModal open={showSearch} onClose={() => setShowSearch(false)} theme={theme} onNavigate={(to) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }} />
        <Outlet />
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}