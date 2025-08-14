import React from 'react'
import { themes, defaultThemeName } from '../theme/themes'

function fmtMMDDYYYY(isoDate) {
  if (!isoDate) return ''
  try {
    const [y,m,d] = isoDate.split('-')
    if (y && m && d) return `${m}/${d}/${y}`
  } catch {}
  return isoDate
}

export default function Imports() {
  const [themeName] = React.useState(defaultThemeName)
  const theme = themes[themeName]
  const navigate = (to) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }
  const [items, setItems] = React.useState(() => { try { return JSON.parse(localStorage.getItem('tpprover_imports') || '[]') } catch { return [] } })
  const [selectedIds, setSelectedIds] = React.useState([])

  const updateItems = (next) => {
    setItems(next)
    try { localStorage.setItem('tpprover_imports', JSON.stringify(next)) } catch {}
  }

  const toggleSelect = (id, checked) => {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id))
  }

  const setField = (id, patch) => {
    updateItems(items.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  const acceptOne = (imp) => {
    const type = imp.targetType || 'calendar'
    if (type === 'orders') {
      try {
        const raw = localStorage.getItem('tpprover_orders')
        const arr = raw ? JSON.parse(raw) : []
        const order = {
          id: Date.now(),
          vendor: imp.vendor || '',
          peptide: imp.peptide || '',
          mg: Number(imp.mg) || 0,
          cost: imp.cost || '',
          status: imp.status || 'Order Placed',
          date: imp.date || new Date().toISOString().slice(0,10),
        }
        arr.unshift(order)
        localStorage.setItem('tpprover_orders', JSON.stringify(arr))
      } catch {}
    } else if (type === 'stockpile') {
      try {
        const raw = localStorage.getItem('tpprover_stockpile')
        const arr = raw ? JSON.parse(raw) : []
        const row = {
          id: Date.now(),
          name: imp.name || '', mg: String(imp.mg || ''), quantity: String(imp.quantity || '1'), vendor: imp.vendor || '', capColor: imp.capColor || '', batchNumber: imp.batchNumber || '', minQty: String(imp.minQty || '1')
        }
        arr.unshift(row)
        localStorage.setItem('tpprover_stockpile', JSON.stringify(arr))
      } catch {}
    } else {
      try {
        const raw = localStorage.getItem('tpprover_calendar_notes')
        const obj = raw ? JSON.parse(raw) : {}
        const dateKey = imp.date || new Date().toISOString().slice(0,10)
        obj[dateKey] = (obj[dateKey] ? obj[dateKey] + ' ' : '') + (imp.notes || '')
        localStorage.setItem('tpprover_calendar_notes', JSON.stringify(obj))
      } catch {}
    }
    updateItems(items.map(i => i.id === imp.id ? { ...i, status: 'Accepted' } : i))
  }

  const rejectOne = (imp) => {
    updateItems(items.map(i => i.id === imp.id ? { ...i, status: 'Rejected' } : i))
  }

  const bulkAccept = () => {
    let acceptedOrders = 0, acceptedStock = 0, acceptedNotes = 0
    items.filter(i => selectedIds.includes(i.id)).forEach(i => {
      const before = { o: acceptedOrders, s: acceptedStock, n: acceptedNotes }
      acceptOne(i)
      const t = i.targetType || 'calendar'
      if (t === 'orders') acceptedOrders++
      else if (t === 'stockpile') acceptedStock++
      else acceptedNotes++
    })
    const parts = []
    if (acceptedOrders) parts.push(`${acceptedOrders} orders`)
    if (acceptedStock) parts.push(`${acceptedStock} stock items`)
    if (acceptedNotes) parts.push(`${acceptedNotes} notes`)
    if (parts.length) window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `Imported ${parts.join(', ')}`, type: 'success' } }))
  }

  const bulkReject = () => {
    updateItems(items.map(i => selectedIds.includes(i.id) ? { ...i, status: 'Rejected' } : i))
  }

  const TargetSelector = ({ imp }) => (
    <select className="p-2 rounded border text-xs" value={imp.targetType || 'calendar'} onChange={e => setField(imp.id, { targetType: e.target.value })} style={{ borderColor: theme.border }}>
      <option value="orders">Orders</option>
      <option value="stockpile">Stockpile</option>
      <option value="calendar">Notes</option>
    </select>
  )

  const OrderFields = ({ imp }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Vendor" value={imp.vendor || ''} onChange={e => setField(imp.id, { vendor: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Peptide" value={imp.peptide || ''} onChange={e => setField(imp.id, { peptide: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="mg" value={imp.mg || ''} onChange={e => setField(imp.id, { mg: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Cost" value={imp.cost || ''} onChange={e => setField(imp.id, { cost: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} type="date" value={imp.date || ''} onChange={e => setField(imp.id, { date: e.target.value })} />
    </div>
  )

  const StockFields = ({ imp }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Peptide" value={imp.name || ''} onChange={e => setField(imp.id, { name: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="mg" value={imp.mg || ''} onChange={e => setField(imp.id, { mg: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Qty" value={imp.quantity || ''} onChange={e => setField(imp.id, { quantity: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Vendor" value={imp.vendor || ''} onChange={e => setField(imp.id, { vendor: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Batch #" value={imp.batchNumber || ''} onChange={e => setField(imp.id, { batchNumber: e.target.value })} />
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Min Qty" value={imp.minQty || ''} onChange={e => setField(imp.id, { minQty: e.target.value })} />
    </div>
  )

  const NoteFields = ({ imp }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <input className="p-2 rounded border text-xs" style={{ borderColor: theme.border }} type="date" value={imp.date || ''} onChange={e => setField(imp.id, { date: e.target.value })} />
      <input className="md:col-span-2 p-2 rounded border text-xs" style={{ borderColor: theme.border }} placeholder="Notes" value={imp.notes || ''} onChange={e => setField(imp.id, { notes: e.target.value })} />
    </div>
  )

  return (
    <section className="space-y-4">
      
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        {items.length === 0 ? <div className="text-sm text-gray-500">No imports yet.</div> : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={bulkAccept} disabled={selectedIds.length === 0}>Accept Selected</button>
              <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={bulkReject} disabled={selectedIds.length === 0}>Reject Selected</button>
            </div>
            <ul className="divide-y" style={{ borderColor: theme.border }}>
              {items.map(imp => (
                <li key={imp.id} className="py-3">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={selectedIds.includes(imp.id)} onChange={e => toggleSelect(imp.id, e.target.checked)} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="status-info">{(imp.status || 'Pending')}</span>
                        <TargetSelector imp={imp} />
                      </div>
                      {(imp.targetType || 'calendar') === 'orders' && <OrderFields imp={imp} />}
                      {(imp.targetType || 'calendar') === 'stockpile' && <StockFields imp={imp} />}
                      {(imp.targetType || 'calendar') === 'calendar' && <NoteFields imp={imp} />}
                      {imp.raw && (
                        <details className="text-xs">
                          <summary className="cursor-pointer">Raw</summary>
                          <pre className="p-2 rounded border overflow-auto max-h-28" style={{ borderColor: theme.border }}>{imp.raw}</pre>
                        </details>
                      )}
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => acceptOne(imp)}>Accept</button>
                        <button className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={() => rejectOne(imp)}>Reject</button>
                        {(imp.targetType || 'calendar') === 'orders' && <button className="ml-auto px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}` }} onClick={() => navigate('/orders')}>Go to Orders</button>}
                        {(imp.targetType || 'calendar') === 'stockpile' && <button className="ml-auto px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}` }} onClick={() => navigate('/stockpile')}>Go to Stockpile</button>}
                        {(imp.targetType || 'calendar') === 'calendar' && <button className="ml-auto px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}` }} onClick={() => navigate('/calendar')}>Go to Calendar</button>}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}


