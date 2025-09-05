import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import Modal from '../components/common/Modal'
import { appendStockEvent, getStockHistory } from '../utils/stockHistory'
import { PlusCircle, Filter, Edit, Package, Beaker, Percent, Hash, DollarSign, FileText, ShoppingCart } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'

export default function Stockpile() {
  const { theme } = useOutletContext()
  const navigate = useNavigate();
  const { vendors, orders, stockpile: items, setStockpile: setItems } = useAppContext();
  const [openAdd, setOpenAdd] = useState(false)
  const [form, setForm] = useState({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '' })
  const lowStock = useMemo(() => (items || []).filter(i => Number(i.quantity) <= 2).map(i => i.name), [items])
  const [vendorFilter, setVendorFilter] = useState('')
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const vendorMap = useMemo(() => (vendors || []).reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);
  
  const filtered = useMemo(() => {
    return (items || []).filter(i => {
      const vendorName = i.vendorId ? vendorMap[i.vendorId] : (i.vendor || '');
      return (
        (!vendorFilter || vendorName.toLowerCase().includes(vendorFilter.toLowerCase())) &&
        (!query || (i.name || '').toLowerCase().includes(query.toLowerCase()) || String(i.batchNumber || '').toLowerCase().includes(query.toLowerCase()))
      )
    })
  }, [items, vendorFilter, query, vendorMap])

  const groups = useMemo(() => {
    const map = new Map()
    for (const it of filtered) {
      const name = it.name || 'Unknown'
      const mg = String(it.mg || '')
      const qty = Number(it.quantity) || 0
      const mgNum = Number(it.mg) || 0
      if (!map.has(name)) map.set(name, { name, totalMg: 0, variants: {} })
      const g = map.get(name)
      g.totalMg += qty * mgNum
      if (!g.variants[mg]) g.variants[mg] = { mg, totalVials: 0, items: [] }
      const v = g.variants[mg]
      v.totalVials += qty
      v.items.push(it)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  const incomingGroups = useMemo(() => {
    const list = Array.isArray(orders) ? orders.filter(o => {
      const s = (o.status || '').toLowerCase()
      return !s.includes('delivered')
    }) : []
    
    const map = new Map()
    
    for (const o of list) {
      if (!o.items || o.items.length === 0) continue; // Skip orders with no items

      for (const item of o.items) {
        const name = item.name || 'Unknown';
        const mg = String(item.mg || '');
        const vendorName = o.vendorId ? vendorMap[o.vendorId] : (o.vendor || 'Unknown');
        const mgNum = Number(item.mg) || 0;
        const quantity = Number(item.quantity) || 1;
        const isKit = (item.unit || '').toLowerCase() === 'kit';
        const vials = isKit ? quantity * 10 : quantity;

        if (!map.has(name)) {
          map.set(name, { name, totalMg: 0, variants: {} });
        }
        const g = map.get(name);
        g.totalMg += mgNum * vials;

        if (!g.variants[mg]) {
          g.variants[mg] = { mg, totalMg: 0, vendors: {} };
        }
        const v = g.variants[mg];
        v.totalMg += mgNum * vials;

        if (!v.vendors[vendorName]) {
          v.vendors[vendorName] = 0;
        }
        v.vendors[vendorName] += mgNum * vials;
      }
    }
    return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [orders, vendorMap]);

  const [manageName, setManageName] = useState(null)
  const [manageRows, setManageRows] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const openManage = (peptideName) => {
    setManageName(peptideName)
    const rows = ((items || []) || []).filter(i => (i.name || '') === peptideName).map(i => ({ ...i }))
    if (rows.length === 0) rows.push({ id: generateId(), name: peptideName, mg: '', quantity: '', unit: 'vial', cost: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '' })
    setManageRows(rows)
  }
  const addManageRow = () => setManageRows(prev => ([...prev, { id: generateId(), name: manageName, mg: '', quantity: '', unit: 'vial', cost: '', vendor: '', vendorId: null, purity: '', capColor: '', batchNumber: '' }]))
  const removeManageRow = (id) => setManageRows(prev => prev.filter(r => r.id !== id))
  const saveManage = () => {
    // First, convert any "kit" entries in the temporary edit state back to "vial" for storage
    const convertedRows = manageRows.map(row => {
      if (row.unit === 'kit') {
        return {
          ...row,
          quantity: String((Number(row.quantity) || 0) * 10),
          unit: 'vial'
        };
      }
      return row;
    });

    const cleaned = convertedRows.filter(r => (r.name || '').trim())
    const others = (items || []).filter(i => (i.name || '') !== manageName)
    // Append history snapshots and usage markers
    try {
      const before = (items || []).filter(i => (i.name || '') === manageName)
      const after = cleaned
      // out-of-stock events
      before.forEach(b => {
        const afterMatch = after.find(a => String(a.mg) === String(b.mg) && (a.vendorId ? a.vendorId === b.vendorId : (a.vendor||'') === (b.vendor||'')))
        const prevQty = Number(b.quantity)||0
        const nextQty = Number(afterMatch?.quantity)||0
        if (prevQty > 0 && nextQty === 0) {
          appendStockEvent({ type: 'out_of_stock', name: manageName, mg: b.mg, vendor: b.vendorId ? vendorMap[b.vendorId] : b.vendor, prevQty })
        }
      })
      // quantity changes
      after.forEach(a => {
        const beforeMatch = before.find(b => String(b.mg) === String(a.mg) && (b.vendorId ? b.vendorId === a.vendorId : (b.vendor||'') === (a.vendor||'')))
        const prevQty = Number(beforeMatch?.quantity)||0
        const nextQty = Number(a.quantity)||0
        if (nextQty !== prevQty) {
          appendStockEvent({ type: 'adjust', name: manageName, mg: a.mg, vendor: a.vendorId ? vendorMap[a.vendorId] : a.vendor, prevQty, nextQty })
        }
      })
    } catch {}
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
      const next = [...(items || [])]
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',')
        const row = {
          id: generateId(),
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
        <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={() => setOpenAdd(true)}><PlusCircle className="h-4 w-4 inline mr-1"/>Add Peptide</button>
      </div>
      {showFilters && (
        <div className="flex items-center gap-2">
          <input className="p-2 rounded border text-sm" placeholder="Search peptide or batch" value={query} onChange={e => setQuery(e.target.value)} style={{ borderColor: theme.border }} />
          <input className="p-2 rounded border text-sm" placeholder="Filter by vendor" value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} style={{ borderColor: theme.border }} />
        </div>
      )}
      <div className="space-y-6">
        {groups.length === 0 && incomingGroups.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textLight }}>No inventory yet.</p>
        ) : (
          <div>
            <div className="font-semibold" style={{ color: theme.primaryDark }}>On-hand Stock</div>
            <hr className="mb-3" style={{ borderColor: theme.border }} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.filter(g => g.totalMg > 0).map(g => (
                    <div key={g.name} className="relative p-4 rounded-lg border content-card shadow-sm flex flex-col justify-between" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="font-semibold text-base" style={{ color: theme.text }}>{g.name}</div>
                                <div className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>{g.totalMg} mg</div>
                            </div>
                            <div className="space-y-3">
                                {Object.values(g.variants).sort((a, b) => String(a.mg).localeCompare(String(b.mg))).map(v => (
                                    <div key={v.mg} className="rounded-md border p-3" style={{ borderColor: theme.border }}>
                                        <div className="flex items-center justify-between text-sm mb-2">
                                            <div className="font-medium flex items-center gap-2"><Beaker size={14} /> {v.mg} mg</div>
                                            <div className="text-xs font-semibold">{v.totalVials} vials</div>
                                        </div>
                                        <ul className="mt-1 text-xs space-y-3">
                                            {v.items.map(item => (
                                                <li key={item.id} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 font-medium"><Package size={12} /> {item.vendorId ? vendorMap[item.vendorId] : item.vendor}</div>
                                                        <div className="flex items-center">
                                                            {item.orderId && (
                                                                <button title="View Source Order" className="p-1" style={{ color: theme.primary }} onClick={() => navigate(`/orders`, { state: { openOrderId: item.orderId } })}>
                                                                    <ShoppingCart size={14} />
                                                                </button>
                                                            )}
                                                            <button title="Send to Recon Calculator" className="p-1" style={{ color: theme.primary }} onClick={() => {
                                                                try {
                                                                    const payload = { peptide: g.name, mg: String(item.mg), vendor: item.vendorId ? vendorMap[item.vendorId] : item.vendor, cost: item.cost };
                                                                    localStorage.setItem('tpprover_recon_prefill', JSON.stringify(payload));
                                                                    window.history.pushState({}, '', '/recon');
                                                                    window.dispatchEvent(new PopStateEvent('popstate'));
                                                                } catch { }
                                                            }}>
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C12 2 5 9 5 14a7 7 0 0 0 14 0c0-5-7-12-7-12z"></path></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {item.purity && <div className="flex items-center gap-2 pl-5"><Percent size={12} /> {item.purity}% Purity</div>}
                                                    <div className="flex items-center gap-2 pl-5">
                                                        <Hash size={12} />
                                                        <span>{item.quantity} {Number(item.quantity) === 1 ? 'vial' : 'vials'} {Number(item.quantity) <= 2 && <span className="text-red-500 font-semibold ml-1">Low</span>}</span>
                                                    </div>
                                                    {(Number(item.cost) > 0 && Number(item.mg) > 0) && (
                                                        <div className="flex items-center gap-2 pl-5">
                                                            <DollarSign size={12} />
                                                            <span>${(Number(item.cost) / Number(item.mg)).toFixed(2)} / mg</span>
                                                        </div>
                                                    )}
                                                    {item.notes && (
                                                        <div className="flex items-start gap-2 pl-5 mt-1 text-gray-500">
                                                            <FileText size={12} className="mt-0.5" />
                                                            <p className="text-xs italic">{item.notes}</p>
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-all" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={() => openManage(g.name)}>
                                <Edit size={14} /> Manage
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {incomingGroups.length > 0 && (
              <>
                <div className="font-semibold" style={{ color: theme.primaryDark }}>Incoming Peptides</div>
                <hr className="mb-3" style={{ borderColor: theme.border }} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                  {incomingGroups.map(g => (
                    <div key={`incoming-${g.name}`} className="p-4 rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold" style={{ color: theme.text }}>{g.name}</div>
                        <div className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">{g.totalMg} mg en route</div>
                      </div>
                      <div className="space-y-2">
                        {Object.values(g.variants).sort((a,b)=>String(a.mg).localeCompare(String(b.mg))).map(v => (
                          <div key={v.mg} className="rounded-md border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <div className="font-medium flex items-center gap-2"><Beaker size={14} /> {v.mg} mg</div>
                              <div className="text-xs">{v.totalMg} mg</div>
                            </div>
                            <ul className="mt-1 text-xs space-y-1">
                              {Object.entries(v.vendors).sort((a,b)=>a[0].localeCompare(b[0])).map(([vendor, qtyMg]) => {
                                const vials = Math.max(1, Math.round((Number(qtyMg)||0) / (Number(v.mg)||1)))
                                return (
                                  <li key={vendor} className="flex items-center gap-2">
                                    <Package size={12} /> {vendor} ({vials} {vials === 1 ? 'vial' : 'vials'})
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
              </>
            )}

            {groups.some(g => g.totalMg <= 0) && (
              <>
                <div className="font-semibold" style={{ color: theme.primaryDark }}>Out of Stock</div>
                <hr className="mb-3" style={{ borderColor: theme.border }} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-2">
                  {groups.filter(g => g.totalMg <= 0).map(g => (
                    <div key={`oos-${g.name}`} className="relative p-4 rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div style={{ fontSize: '64px', color: 'rgba(185,28,28,0.10)', fontWeight: 800, transform: 'rotate(-20deg)' }}>OUT</div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold" style={{ color: theme.text }}>{g.name}</div>
                        <div className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of Stock</div>
                      </div>
                      <div className="text-sm text-gray-500">No vials on hand.</div>
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
          <button onClick={() => { 
              const finalVendor = (vendors || []).find(v => v.name === form.vendor);
              let itemToAdd = { ...form, id: generateId(), vendorId: finalVendor ? finalVendor.id : null };
              
              // Convert kit to vials before saving
              if (itemToAdd.unit === 'kit') {
                  itemToAdd.quantity = (Number(itemToAdd.quantity) || 0) * 10;
                  itemToAdd.unit = 'vial';
              }

              setItems(prev => [itemToAdd, ...prev]); 
              setOpenAdd(false); 
              setForm({ name: '', mg: '', quantity: '', vendor: '', vendorId: null, capColor: '', batchNumber: '' }) 
            }} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
        </>
      )}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextInput label="Peptide" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="BPC-157" theme={theme} />
          <TextInput label="mg" value={form.mg} onChange={v => setForm({ ...form, mg: v })} placeholder="10" theme={theme} />
          <div className="sm:col-span-2">
              <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Quantity & Unit</div>
              <div className="flex items-center p-2 rounded border" style={{ borderColor: theme?.border }}>
                <input className="flex-1 border-none outline-none text-sm bg-transparent" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="1" />
                <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
                    {['vial','kit'].map(k => (
                        <button key={k} type="button" onClick={() => setForm(prev => ({ ...prev, unit: k }))}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full ${((form.unit || 'vial') === k) ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                            style={((form.unit || 'vial') === k) ? { backgroundColor: theme.primary } : {}}>
                            {k.charAt(0).toUpperCase() + k.slice(1)}
                        </button>
                    ))}
                </div>
              </div>
            </div>
          <VendorSuggestInput label="Vendor" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor" theme={theme} />
          <TextInput label="Purity %" value={form.purity} onChange={v => setForm({ ...form, purity: v })} placeholder="e.g., 98" theme={theme} />
          <TextInput label="Cap Color" value={form.capColor} onChange={v => setForm({ ...form, capColor: v })} placeholder="Blue" theme={theme} />
          <TextInput label="Batch #" value={form.batchNumber} onChange={v => setForm({ ...form, batchNumber: v })} placeholder="#" theme={theme} />
        </div>
      </Modal>

      <Modal open={!!manageName} onClose={() => { setManageName(null); setManageRows([]); setShowHistory(false) }} title={`${manageName || 'Manage'}`} theme={theme} maxWidth="max-w-3xl" footer={(
        <>
          <button onClick={() => { setManageName(null); setManageRows([]) }} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
          <button onClick={saveManage} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
        </>
      )}>
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}`, color: theme.text }} onClick={() => setShowHistory(v => !v)}>
              {showHistory ? 'Hide History' : 'History'}
            </button>
          </div>
          {showHistory && (
            <div className="rounded border p-2 max-h-40 overflow-auto text-xs" style={{ borderColor: theme.border }}>
              {(getStockHistory() || []).filter(h => (h.name || '') === (manageName || '')).slice(0,50).map(h => (
                <div key={h.id} className="flex items-center justify-between">
                  <span>{h.type} • {h.name} {h.mg}mg {h.vendor ? `• ${h.vendor}` : ''} {h.prevQty!=null ? `(from ${h.prevQty}${h.nextQty!=null?`→${h.nextQty}`:''})` : ''}</span>
                  <span style={{ color: theme.textLight }}>{new Date(h.date).toLocaleString()}</span>
                </div>
              ))}
              {(getStockHistory() || []).filter(h => (h.name || '') === (manageName || '')).length === 0 && (
                <div className="text-gray-500">No history yet for this peptide.</div>
              )}
            </div>
          )}
          {manageRows.map(row => (
            <div key={row.id} className="space-y-2 border p-3 rounded" style={{ borderColor: theme.border }}>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div className="sm:col-span-2">
                  <VendorSuggestInput label="Vendor" value={row.vendorId ? vendorMap[row.vendorId] : (row.vendor || '')} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, vendor: v, vendorId: (vendors || []).find(vnd => vnd.name === v)?.id || null } : r))} placeholder="Vendor" theme={theme} />
                </div>
                <div className="sm:col-span-1">
                  <TextInput label="mg" value={row.mg} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, mg: v } : r))} placeholder="10" theme={theme} />
                </div>
                <div className="sm:col-span-3">
                  <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Quantity & Unit</div>
                  <div className="flex items-center p-2 rounded border" style={{ borderColor: theme?.border }}>
                    <input className="flex-1 border-none outline-none text-sm bg-transparent" value={row.quantity || ''} onChange={e => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, quantity: e.target.value } : r))} placeholder="1" />
                    <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
                        {['vial','kit'].map(k => (
                            <button key={k} type="button" onClick={() => {
                                const oldUnit = row.unit || 'vial';
                                if (oldUnit === k) return;
                                setManageRows(prev => prev.map(r => {
                                    if (r.id !== row.id) return r;
                                    const qty = Number(r.quantity) || 0;
                                    let newQty = qty;
                                    if (oldUnit === 'kit' && k === 'vial') {
                                        newQty = qty * 10;
                                    } else if (oldUnit === 'vial' && k === 'kit') {
                                        if (qty > 0 && qty % 10 === 0) {
                                            newQty = qty / 10;
                                        } else {
                                            alert("You can only convert to kits if you have a multiple of 10 vials.");
                                            return r; // Return original row without changes
                                        }
                                    }
                                    return { ...r, unit: k, quantity: String(newQty) };
                                }));
                            }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full ${((row.unit || 'vial') === k) ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                                style={((row.unit || 'vial') === k) ? { backgroundColor: theme.primary } : {}}>
                                {k.charAt(0).toUpperCase() + k.slice(1)}
                            </button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div className="sm:col-span-1">
                  <TextInput label="Cost ($)" value={row.cost || ''} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, cost: v } : r))} placeholder="$" theme={theme} />
                </div>
                <div className="sm:col-span-2">
                  <TextInput label="Purity/Test %" value={row.purity || ''} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, purity: v } : r))} placeholder="e.g., 98" theme={theme} />
                </div>
                <div className="sm:col-span-1">
                  <TextInput label="Cap Color" value={row.capColor} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, capColor: v } : r))} placeholder="Blue" theme={theme} />
                </div>
                <div className="sm:col-span-2">
                  <TextInput label="Batch # (optional)" value={row.batchNumber} onChange={v => setManageRows(prev => prev.map(r => r.id === row.id ? { ...r, batchNumber: v } : r))} placeholder="#" theme={theme} />
                </div>
              </div>
              <div className="text-right">
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


