import React, { useEffect, useState } from 'react'
import { themes, defaultThemeName } from '../theme/themes'
import { formatMMDDYYYY } from '../utils/date'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import { exportToCSV } from '../utils/export'
import { PlusCircle } from 'lucide-react'

export default function Protocols() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [openAdd, setOpenAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', purpose: '' })
  const [protocols, setProtocols] = useState([])

  useEffect(() => {
    try { const raw = localStorage.getItem('tpprover_protocols'); if (raw) setProtocols(JSON.parse(raw)) } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('tpprover_protocols', JSON.stringify(protocols)) } catch {}
  }, [protocols])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-end">
        <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => setOpenAdd(true)}><PlusCircle className="h-4 w-4 inline mr-1"/>New Protocol</button>
      </div>
      <div className="rounded border bg-white p-4" style={{ borderColor: theme.border }}>
        {protocols.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textLight }}>No protocols yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {protocols.map(p => (
              <div key={p.id} className="p-4 rounded-xl border content-card" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.name}</div>
                  <div className={p.active !== false ? 'status-active' : 'status-inactive'}>{p.active !== false ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>{p.category} • {p.purpose}</div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>{p.startDate ? `Start: ${formatMMDDYYYY(p.startDate)}` : 'No start'} • {p.endDate ? `End: ${formatMMDDYYYY(p.endDate)}` : 'No end'}</div>
                <div className="text-xs mt-2">
                  <span className="status-info">{Array.isArray(p.frequency?.time) ? `${p.frequency.time.length} slots/day` : '0 slots/day'}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="text-xs inline-flex items-center gap-1">
                    <input type="checkbox" checked={p.active !== false} onChange={e => {
                      const active = e.target.checked
                      setProtocols(prev => prev.map(x => x.id === p.id ? { ...x, active } : x))
                      bumpCalendar()
                    }} /> Active
                  </label>
                  <button className="px-2 py-1 rounded-md text-xs" style={{ backgroundColor: theme.success, color: theme.white }} onClick={() => startProtocol(p.id)}>Start</button>
                  <button className="px-2 py-1 rounded-md text-xs" style={{ backgroundColor: theme.error, color: theme.white }} onClick={() => completeProtocol(p.id)}>Complete</button>
                  <button className="ml-auto px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={() => setEditing(p)}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProtocolEditorModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        theme={theme}
        onSave={(data) => { setOpenAdd(false); setProtocols(prev => [{ id: Date.now(), ...data }, ...prev]) }}
      />

      <ProtocolEditorModal
        open={!!editing}
        onClose={() => setEditing(null)}
        theme={theme}
        protocol={editing}
        onSave={(data) => { setProtocols(prev => prev.map(p => p.id === editing.id ? { ...editing, ...data } : p)); setEditing(null) }}
      />
    </section>
  )
}

function bumpCalendar() {
  try {
    const now = String(Date.now())
    localStorage.setItem('tpprover_calendar_bump', now)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: now }))
    }
  } catch {}
}

function startProtocol(id) {
  try {
    const raw = localStorage.getItem('tpprover_protocols')
    const arr = raw ? JSON.parse(raw) : []
    const today = new Date().toISOString().slice(0,10)
    const next = arr.map(p => p.id === id ? { ...p, active: true, startDate: p.startDate || today } : p)
    localStorage.setItem('tpprover_protocols', JSON.stringify(next))
    bumpCalendar()
  } catch {}
}

function completeProtocol(id) {
  try {
    const raw = localStorage.getItem('tpprover_protocols')
    const arr = raw ? JSON.parse(raw) : []
    const today = new Date().toISOString().slice(0,10)
    const next = arr.map(p => p.id === id ? { ...p, active: false, endDate: today } : p)
    localStorage.setItem('tpprover_protocols', JSON.stringify(next))
    bumpCalendar()
  } catch {}
}