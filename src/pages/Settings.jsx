 import React, { useEffect, useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'
 import { exportToCSV } from '../utils/export'

export default function Settings() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [pwaPrompted, setPWAPrompted] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(themeName)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPWAPrompted(true)
      window.deferredPrompt = e
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    const prompt = window.deferredPrompt
    if (prompt) {
      prompt.prompt()
      await prompt.userChoice
      window.deferredPrompt = null
      setPWAPrompted(false)
    }
  }

  const exportAll = () => {
    const data = {
      protocols: JSON.parse(localStorage.getItem('tpprover_protocols') || '[]'),
      orders: JSON.parse(localStorage.getItem('tpprover_orders') || '[]'),
      stockpile: JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]'),
      supplements: JSON.parse(localStorage.getItem('tpprover_supplements') || '[]'),
      glossary: JSON.parse(localStorage.getItem('tpprover_glossary') || '[]'),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tpprover-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data.protocols) localStorage.setItem('tpprover_protocols', JSON.stringify(data.protocols))
      if (data.orders) localStorage.setItem('tpprover_orders', JSON.stringify(data.orders))
      if (data.stockpile) localStorage.setItem('tpprover_stockpile', JSON.stringify(data.stockpile))
      if (data.supplements) localStorage.setItem('tpprover_supplements', JSON.stringify(data.supplements))
      if (data.glossary) localStorage.setItem('tpprover_glossary', JSON.stringify(data.glossary))
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Backup restored', type: 'success' } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Import failed', type: 'error' } }))
    }
  }

  return (
    <section className="space-y-4">
      
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        <div className="mb-4">
          <div className="font-semibold mb-1" style={{ color: theme.primaryDark }}>Theme</div>
          <select className="p-2 rounded border" style={{ borderColor: theme.border }} value={selectedTheme} onChange={e => { setSelectedTheme(e.target.value); try { localStorage.setItem('tpprover_theme', e.target.value); } catch {} window.location.reload() }}>
            {Object.keys(themes).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={exportAll}>Export Backup (JSON)</button>
          <label className="px-3 py-2 rounded-md text-sm font-semibold cursor-pointer" style={{ backgroundColor: theme.accent, color: theme.accentText }}>
            Import Backup
            <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files && e.target.files[0] && importBackup(e.target.files[0])} />
          </label>
        </div>
        <div>
          {pwaPrompted ? (
            <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={handleInstall}>Install App</button>
          ) : (
            <div className="text-sm text-gray-500">Install prompt will appear when supported by the browser.</div>
          )}
          <div className="text-xs text-gray-500 mt-2">PWA is enabled. Manifest and service worker are registered on supported browsers.</div>
        </div>
      </div>
    </section>
  )
 }


