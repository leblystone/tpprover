 import React, { useEffect, useMemo, useState } from 'react'
 import Modal from '../common/Modal'
 import { Home, ClipboardList, ShoppingCart, Users, Box, FlaskConical, Droplet, Pill, BookText } from 'lucide-react'
 import { useAppContext } from '../../context/AppContext'

export default function GlobalSearchModal({ open, onClose, theme, onNavigate }) {
  const safeTheme = theme || { border: '#e5e7eb', primary: '#7f9e95', white: '#ffffff', text: '#111827' }
  const [q, setQ] = useState('')
  const { protocols, orders, stockpile, supplements, vendors } = useAppContext()
  const data = useMemo(() => aggregate(protocols, orders, stockpile, supplements, vendors), [protocols, orders, stockpile, supplements, vendors])
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    const hits = []
    for (const item of data) {
      if ((item.title || '').toLowerCase().includes(needle) || (item.subtitle || '').toLowerCase().includes(needle)) {
        hits.push(item)
      }
    }
    return hits.slice(0, 20)
  }, [q, data])

  return (
    <Modal open={open} onClose={onClose} title="Global Search" theme={safeTheme}>
      <div className="space-y-3">
        <input autoFocus className="w-full p-3 rounded border" style={{ borderColor: safeTheme.border }} placeholder="Search protocols, orders, vendors, stockpile, glossary..." value={q} onChange={e => setQ(e.target.value)} />
        <ul className="divide-y" style={{ borderColor: safeTheme.border }}>
          {results.map(r => (
            <li key={r.key} className="py-2 flex items-center gap-2 px-1 rounded cursor-pointer" onMouseEnter={e => e.currentTarget.style.backgroundColor = safeTheme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => { onClose(); onNavigate?.(r.to) }}>
              <span>{iconFor(r.type)}</span>
              <div>
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-xs" style={{ color: safeTheme.textLight || '#6b7280' }}>{r.subtitle}</div>
              </div>
            </li>
          ))}
          {q && results.length === 0 && <li className="py-2 text-sm" style={{ color: safeTheme.textLight || '#6b7280' }}>No results.</li>}
        </ul>
      </div>
    </Modal>
  )
}

function aggregate(protocols = [], orders = [], stockpile = [], supplements = [], vendors = []) {
  const out = []
  try { (protocols || []).forEach(p => out.push({ key: `prot-${p.id}`, type: 'protocol', title: p.name, subtitle: p.purpose || p.category || '', to: '/protocols' })) } catch {}
  try { (orders || []).forEach(o => out.push({ key: `ord-${o.id}`, type: 'order', title: `${o.peptide} ${o.mg}mg`, subtitle: o.vendor, to: '/orders' })) } catch {}
  try { (stockpile || []).forEach(s => out.push({ key: `stk-${s.id}`, type: 'stockpile', title: s.name, subtitle: `${s.mg}mg • ${s.vendor}`, to: '/stockpile' })) } catch {}
  try { (supplements || []).forEach(su => out.push({ key: `sup-${su.id}`, type: 'supplement', title: su.name, subtitle: su.dose || su.schedule, to: '/app/supplements' })) } catch {}
  try {
    const glossary = JSON.parse(localStorage.getItem('tpprover_glossary') || '[]')
    glossary.forEach(g => out.push({ key: `glo-${g.id}`, type: 'glossary', title: g.name, subtitle: g.category || 'Custom', to: '/glossary' }))
  } catch {}
  return out
}

function iconFor(type) {
  const map = {
    protocol: <ClipboardList className="h-4 w-4" />,
    order: <ShoppingCart className="h-4 w-4" />,
    vendor: <Users className="h-4 w-4" />,
    stockpile: <Box className="h-4 w-4" />,
    supplement: <Pill className="h-4 w-4" />,
    glossary: <BookText className="h-4 w-4" />,
    default: <Home className="h-4 w-4" />,
  }
  return map[type] || map.default
}


