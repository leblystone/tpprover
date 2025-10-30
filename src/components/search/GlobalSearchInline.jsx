import React, { useMemo, useState } from 'react'
import { ClipboardList, ShoppingCart, Users, Box, Pill, BookText, Home, X } from 'lucide-react'

export default function GlobalSearchInline({ theme, onClose, onNavigate, pageFilter }) {
  const safeTheme = theme || { border: '#e5e7eb', white: '#fff', text: '#111827' }
  const [q, setQ] = useState('')
  const data = useMemo(() => {
    const allData = aggregate();
    // If pageFilter is provided, only show results for that page type
    if (pageFilter) {
      return allData.filter(item => item.type === pageFilter);
    }
    return allData;
  }, [pageFilter])
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return []
    return data.filter(item => (item.title||'').toLowerCase().includes(needle) || (item.subtitle||'').toLowerCase().includes(needle)).slice(0, 20)
  }, [q, data])
  
  // Get placeholder text based on page
  const getPlaceholder = () => {
    if (pageFilter === 'order') return 'Search orders...'
    if (pageFilter === 'protocol') return 'Search protocols...'
    if (pageFilter === 'vendor') return 'Search vendors...'
    if (pageFilter === 'stockpile') return 'Search stockpile...'
    if (pageFilter === 'glossary') return 'Search glossary...'
    return 'Search protocols, orders, vendors, stockpile, glossary...'
  }
  
  return (
    <div className="rounded-xl border bg-white content-card p-3 animate-slide-down" style={{ borderColor: safeTheme.border }}>
      <div className="flex items-center gap-2 mb-2">
        <input autoFocus className="flex-1 p-2 rounded border" style={{ borderColor: safeTheme.border }} placeholder={getPlaceholder()} value={q} onChange={e => setQ(e.target.value)} />
        <button className="p-2 rounded hover:bg-gray-100" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <ul className="max-h-64 overflow-auto divide-y" style={{ borderColor: safeTheme.border }}>
        {results.map(r => (
          <li key={r.key} className="py-2 flex items-center gap-2 hover:bg-gray-50 px-1 rounded cursor-pointer" onClick={() => { onClose?.(); onNavigate?.(r.to) }}>
            <span>{iconFor(r.type)}</span>
            <div>
              <div className="text-sm font-medium">{r.title}</div>
              <div className="text-xs text-gray-500">{r.subtitle}</div>
            </div>
          </li>
        ))}
        {q && results.length === 0 && <li className="py-2 text-sm text-gray-500">No results.</li>}
      </ul>
    </div>
  )
}

function aggregate() {
  const out = []
  try { const prots = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]'); prots.forEach(p => out.push({ key: `prot-${p.id}`, type: 'protocol', title: p.name, subtitle: p.purpose || p.category || '', to: '/protocols' })) } catch {}
  try { const orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]'); orders.forEach(o => out.push({ key: `ord-${o.id}`, type: 'order', title: `${o.peptide} ${o.mg}mg`, subtitle: o.vendor, to: '/orders' })) } catch {}
  try { const vendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]'); vendors.forEach(v => {
    // Get first contact as subtitle (email, website, etc.)
    const contact = Array.isArray(v.contacts) && v.contacts.length > 0 ? v.contacts[0].value : '';
    out.push({ key: `ven-${v.id}`, type: 'vendor', title: v.name, subtitle: contact || '', to: '/vendors' });
  }) } catch {}
  try { const stock = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]'); stock.forEach(s => out.push({ key: `stk-${s.id}`, type: 'stockpile', title: s.name, subtitle: `${s.mg}mg • ${s.vendor}`, to: '/stockpile' })) } catch {}
  try { const supps = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]'); supps.forEach(s => out.push({ key: `sup-${s.id}`, type: 'supplement', title: s.name, subtitle: s.dose || s.schedule, to: '/research' })) } catch {}
  try { const glossary = JSON.parse(localStorage.getItem('tpprover_glossary') || '[]'); glossary.forEach(g => out.push({ key: `glo-${g.id}`, type: 'glossary', title: g.name, subtitle: g.category || 'Custom', to: '/glossary' })) } catch {}
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


