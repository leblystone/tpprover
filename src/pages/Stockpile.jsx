import React, { useEffect, useMemo, useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import Modal from '../components/common/Modal'
import { PlusCircle, Filter } from 'lucide-react'

export default function Stockpile() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  // Persist stockpile to localStorage for cross-page wiring until Firebase is added
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tpprover_stockpile')
      if (raw) setItems(JSON.parse(raw))
      const ro = localStorage.getItem('tpprover_orders')
      if (ro) setOrders(JSON.parse(ro))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('tpprover_stockpile', JSON.stringify(items))
    } catch {}
  }, [items])

  // Listen for orders bump to refresh incoming cards
  const [ordersBump, setOrdersBump] = useState(() => { try { return localStorage.getItem('tpprover_orders_bump') || '0' } catch { return '0' } })
  useEffect(() => {
    const onStorage = (e) => { if (e.key === 'tpprover_orders_bump') { setOrdersBump(e.newValue || String(Date.now())); try { const ro = localStorage.getItem('tpprover_orders'); if (ro) setOrders(JSON.parse(ro)) } catch {} } }
    window.addEventListener('storage', onStorage)
    const iv = setInterval(() => { try { const v = localStorage.getItem('tpprover_orders_bump'); if (v !== ordersBump) { setOrdersBump(v || '0'); const ro = localStorage.getItem('tpprover_orders'); if (ro) setOrders(JSON.parse(ro)) } } catch {} }, 1500)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(iv) }
  }, [ordersBump])
  const [openAdd, setOpenAdd] = useState(false)
  const [form, setForm] = useState({ name: '', mg: '', quantity: '', vendor: '', purity: '', capColor: '', batchNumber: '' })
  const lowStock = useMemo(() => items.filter(i => Number(i.quantity) <= 2).map(i => i.name), [items])
  const [vendorFilter, setVendorFilter] = useState('')
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const filtered = useMemo(() => {
    return items.filter(i => (
      (!vendorFilter || (i.vendor || '').toLowerCase().includes(vendorFilter.toLowerCase())) &&
      (!query || (i.name || '').toLowerCase().includes(query.toLowerCase()) || String(i.batchNumber || '').toLowerCase().includes(query.toLowerCase()))
    ))
  }, [items, vendorFilter, query])

  // Build peptide cards: group by peptide name, then by mg and vendor
  const lowSet = useMemo(() => {
    const s = new Set()
    for (const it of items) {
      const qty = Number(it.quantity) || 0
      if (qty <= 2) s.add(`${it.name}|${it.mg}|${it.vendor}`)
    }
    return s
  }, [items])

  const groups = useMemo(() => {
    const map = new Map()
    for (const it of filtered) {
      const name = it.name || 'Unknown'
      const mg = String(it.mg || '')
      const vendor = it.vendor || 'Unknown'
      const qty = Number(it.quantity) || 0
      const mgNum = Number(it.mg) || 0
      if (!map.has(name)) map.set(name, { name, totalMg: 0, variants: {} })
      const g = map.get(name)
      g.totalMg += qty * mgNum
      if (!g.variants[mg]) g.variants[mg] = { mg, totalVials: 0, vendors: {} }
      const v = g.variants[mg]
      v.totalVials += qty
      v.vendors[vendor] = (v.vendors[vendor] || 0) + qty
    }
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name))
  }, [filtered])

  const incomingGroups = useMemo(() => {
    const list = Array.isArray(orders) ? orders.filter(o => {
      const s = (o.status || '').toLowerCase()
      return s.includes('order placed') || s.includes('shipped') || s === 'order placed'
    }) : []
    const map = new Map()
    for (const o of list) {
      const name = o.peptide || 'Unknown'
      const mg = String(o.mg || '')
      const vendor = o.vendor || 'Unknown'
      const mgNum = Number(o.mg) || 0
      if (!map.has(name)) map.set(name, { name, totalMg: 0, variants: {} })
      const g = map.get(name)
      g.totalMg += mgNum
      if (!g.variants[mg]) g.variants[mg] = { mg, totalMg: 0, vendors: {} }
      const v = g.variants[mg]
      v.totalMg += mgNum
      v.vendors[vendor] = (v.vendors[vendor] || 0) + mgNum
    }
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name))
  }, [orders])

  const [manageName, setManageName] = useState(null)
  const [manageRows, setManageRows] = useState([])
  const openManage = (peptideName) => {
    setManageName(peptideName)
    const rows = (items || []).filter(i => (i.name || '') === peptideName).map(i => ({ ...i }))
    if (rows.length === 0) rows.push({ id: Date.now(), name: peptideName, mg: '', quantity: '', vendor: '', purity: '', capColor: '', batchNumber: '' })
    setManageRows(rows)
  }
  const addManageRow = () => setManageRows(prev => ([...prev, { id: Date.now(), name: manageName, mg: '', quantity: '', vendor: '', purity: '', capColor: '', batchNumber: '' }]))
  const removeManageRow = (id) => setManageRows(prev => prev.filter(r => r.id !== id))
  const saveManage = () => {
    const cleaned = manageRows.filter(r => (r.name || '').trim())
    const others = items.filter(i => (i.name || '') !== manageName)
    setItems([...cleaned, ...others])
    setManageName(null)
    setManageRows([])
  }

  const importCSV = async (file) => {
    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length === 0) return
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const idx = (k) => header.indexOf(k)
      const next = [...items]
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        const row = {
          id: Date.now() + i,
          name: cols[idx('name')] || '',
          mg: cols[idx('mg')] || '',
          quantity: cols[idx('quantity')] || '',
          vendor: cols[idx('vendor')] || '',
          capColor: cols[idx('capcolor')] || cols[idx('cap_color')] || '',
          batchNumber: cols[idx('batchnumber')] || cols[idx('batch_#')] || cols[idx('batch')] || '',
          minQty: cols[idx('minqty')] || cols[idx('min_qty')] || '1',
        }
        next.unshift(row)
      }
      setItems(next)
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Stockpile CSV imported', type: 'success' } }))
    } catch (e) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'CSV import failed', type: 'error' } }))
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <button aria-label="Filters" className="p-2 rounded-md border" onClick={() => setShowFilters(v => !v)} style={{ borderColor: theme.border }}>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => setOpenAdd(true)}><PlusCircle className="h-4 w-4 inline mr-1"/>Add Peptide</button>
      </div>
      {showFilters && (
        <div className="flex items-center gap-2">
          <input className="p-2 rounded border text-sm" placeholder="Search peptide or batch" value={query} onChange={e => setQuery(e.target.value)} style={{ borderColor: theme.border }} />
          <input className="p-2 rounded border text-sm" placeholder="Filter by vendor" value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} style={{ borderColor: theme.border }} />
        </div>
      )}
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        {groups.length === 0 && incomingGroups.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textLight }}>No inventory yet.</p>
        ) : (
          <div>
            <div className="font-semibold mb-2" style={{ color: theme.primaryDark }}>On-hand Stock</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => (
              <div key={g.name} className="relative p-4 rounded-xl border content-card" style={{ borderColor: theme.border, backgroundColor: theme.white }}>
                {g.totalMg <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div style={{ fontSize: '64px', color: 'rgba(185,28,28,0.18)', fontWeight: 800, transform: 'rotate(-20deg)' }}>X</div>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold" style={{ color: theme.text }}>{g.name}</div>
                  <div className="status-info">Total: {g.totalMg} mg</div>
                </div>
                <div className="mb-2 text-right">
                  <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}` }} onClick={() => openManage(g.name)}>Manage</button>
                </div>
                 <div className="space-y-2">
                  {Object.values(g.variants).sort((a,b)=>String(a.mg).localeCompare(String(b.mg))).map(v => (
                    <div key={v.mg} className="rounded border p-2" style={{ borderColor: theme.border }}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="font-medium">{v.mg} mg</div>
                        <div className="text-xs status-active">{v.totalVials} vials ({(Number(v.mg)||0) * (Number(v.totalVials)||0)} mg)</div>
                      </div>
                      <ul className="mt-1 text-xs space-y-1">
                         {Object.entries(v.vendors).sort((a,b)=>a[0].localeCompare(b[0])).map(([vendor, qty]) => {
                           // compute avg purity for this name/mg/vendor
                           const rows = items.filter(it => it.name === g.name && String(it.mg) === String(v.mg) && it.vendor === vendor)
                           const purities = rows.map(r => Number(r.purity)).filter(n => !isNaN(n) && isFinite(n))
                           const avgPurity = purities.length ? (purities.reduce((a,b)=>a+b,0)/purities.length).toFixed(1) : null
                           return (
                             <li key={vendor} className="flex items-center justify-between">
                               <span>{vendor}{avgPurity ? ` • ${avgPurity}%` : ''}</span>
                               <span>
                                 {qty} vials ({(Number(v.mg)||0) * (Number(qty)||0)} mg){lowSet.has(`${g.name}|${v.mg}|${vendor}`) && <span className="status-error ml-1">Low</span>}
                               </span>
                             </li>
                           )
                         })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            </div>
            {incomingGroups.length > 0 && (
              <>
                <div className="font-semibold my-4" style={{ color: theme.primaryDark }}>Incoming Peptides</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                  {incomingGroups.map(g => (
                    <div key={`incoming-${g.name}`} className="p-4 rounded-xl border content-card opacity-70" style={{ borderColor: theme.border, backgroundColor: '#f3f4f6' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold" style={{ color: theme.text }}>{g.name}</div>
                        <div className="status-inactive">Incoming: {g.totalMg} mg</div>
                      </div>
                      <div className="space-y-2">
                        {Object.values(g.variants).sort((a,b)=>String(a.mg).localeCompare(String(b.mg))).map(v => (
                          <div key={v.mg} className="rounded border p-2" style={{ borderColor: theme.border }}>
                            <div className="flex items-center justify-between text-sm">
                              <div className="font-medium">{v.mg} mg</div>
                              <div className="text-xs status-inactive">{v.totalMg} mg en route</div>
                            </div>
                            <ul className="mt-1 text-xs space-y-1">
                              {Object.entries(v.vendors).sort((a,b)=>a[0].localeCompare(b[0])).map(([vendor, qtyMg]) => (
                                <li key={vendor} className="flex items-center justify-between">
                                  <span>{vendor}</span>
                                  <span>{qtyMg} mg</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Add Peptide" theme={theme} footer={(
        <>
          <button onClick={() => setOpenAdd(false)} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
          <button onClick={() => { setItems(prev => [{ id: Date.now(), ...form }, ...prev]); setOpenAdd(false); setForm({ name: '', mg: '', quantity: '', vendor: '', capColor: '', batchNumber: '' }) }} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }}>Save</button>
        </>
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="Peptide" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157" theme={theme} />
          <TextInput label="mg" value={form.mg} onChange={v => setForm({ ...form, mg: v })} placeholder="10" theme={theme} />
          <TextInput label="Quantity" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} placeholder="1" theme={theme} />
          <VendorSuggestInput label="Vendor" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor" theme={theme} />
          <TextInput label="Purity %" value={form.purity} onChange={v => setForm({ ...form, purity: v })} placeholder="e.g., 98" theme={theme} />
          <TextInput label="Cap Color" value={form.capColor} onChange={v => setForm({ ...form, capColor: v })} placeholder="Blue" theme={theme} />
          <TextInput label="Batch #" value={form.batchNumber} onChange={v => setForm({ ...form, batchNumber: v })} placeholder="#" theme={theme} />
        </div>
      </Modal>

      <Modal open={!!manageName} onClose={() => { setManageName(null); setManageRows([]) }} title={`Manage: ${manageName || ''}`} theme={theme} footer={(
        <>
          <button onClick={() => { setManageName(null); setManageRows([]) }} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
          <button onClick={saveManage} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }}>Save</button>
        </>
      )}>
        <div className="space-y-2">
          {manageRows.map(row => (
            <div key={row.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end border p-2 rounded" style={{ borderColor: theme.border }}>
              <TextInput label="mg" value={row.mg} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, mg: v } : r))} placeholder="10" theme={theme} />
              <TextInput label="Qty" value={row.quantity} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: v } : r))} placeholder="1" theme={theme} />
              <TextInput label="Vendor" value={row.vendor} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, vendor: v } : r))} placeholder="Vendor" theme={theme} />
              <TextInput label="Purity %" value={row.purity || ''} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, purity: v } : r))} placeholder="e.g., 98" theme={theme} />
              <TextInput label="Cap" value={row.capColor} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, capColor: v } : r))} placeholder="Blue" theme={theme} />
              <TextInput label="Batch #" value={row.batchNumber} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, batchNumber: v } : r))} placeholder="#" theme={theme} />
              <div className="sm:col-span-6 text-right">
                <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={() => removeManageRow(row.id)}>Remove</button>
              </div>
            </div>
          ))}
          <button className="px-3 py-2 rounded-md text-sm font-semibold border-dashed border" style={{ borderColor: theme.primary, color: theme.primary }} onClick={addManageRow}>+ Add Row</button>
        </div>
      </Modal>
    </section>
  )
}


