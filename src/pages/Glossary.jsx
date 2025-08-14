 import React, { useEffect, useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'
 import TextInput from '../components/common/inputs/TextInput'

export default function Glossary() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [items, setItems] = useState([])
  const [openAdd, setOpenAdd] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Custom', notes: '' })
  const [q, setQ] = useState('')

  useEffect(() => { try { const raw = localStorage.getItem('tpprover_glossary'); if (raw) setItems(JSON.parse(raw)) } catch {} }, [])
  useEffect(() => {
    // preload canonical items once if empty
    try {
      const raw = localStorage.getItem('tpprover_glossary')
      const arr = raw ? JSON.parse(raw) : []
      if (arr.length === 0) {
        const seed = [
          { id: Date.now()+1, name: 'BPC-157', category: 'Peptide', notes: 'Tissue repair' },
          { id: Date.now()+2, name: 'TB-500 (Thymosin Beta-4)', category: 'Peptide', notes: 'Recovery' },
          { id: Date.now()+3, name: 'Vitamin D3', category: 'Supplement', notes: 'Immune support' },
          { id: Date.now()+4, name: 'Magnesium Glycinate', category: 'Supplement', notes: 'Sleep, recovery' },
        ]
        localStorage.setItem('tpprover_glossary', JSON.stringify(seed))
        setItems(seed)
      }
    } catch {}
  }, [])
  useEffect(() => { try { localStorage.setItem('tpprover_glossary', JSON.stringify(items)) } catch {} }, [items])

  const filtered = items.filter(i => (i.name || '').toLowerCase().includes(q.toLowerCase()) || (i.category || '').toLowerCase().includes(q.toLowerCase()))

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input className="p-2 rounded border text-sm" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} style={{ borderColor: theme.border }} />
          <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => setOpenAdd(true)}>Add</button>
        </div>
      </div>
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        {filtered.length === 0 ? <p className="text-sm" style={{ color: theme.textLight }}>No items.</p> : (
          <ul className="divide-y" style={{ borderColor: theme.border }}>
            {filtered.map(i => (
              <li key={i.id} className="py-2">
                <div className="font-medium">{i.name}</div>
                <div className="text-xs" style={{ color: theme.textLight }}>{i.category} • {i.notes}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {openAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <h3 className="h3 mb-3" style={{ color: theme.primaryDark }}>Add Glossary Item</h3>
            <div className="space-y-3">
              <TextInput label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Peptide name" theme={theme} />
              <TextInput label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} placeholder="Category" theme={theme} />
              <TextInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Notes" theme={theme} />
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }} onClick={() => setOpenAdd(false)}>Cancel</button>
                <button className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => { setItems(prev => [{ id: Date.now(), ...form }, ...prev]); setOpenAdd(false); setForm({ name: '', category: 'Custom', notes: '' }) }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}


