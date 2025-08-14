import React, { useEffect, useMemo, useState } from 'react'
import { themes, defaultThemeName } from '../theme/themes'
import Tabs from '../components/common/Tabs'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import OrderList from '../components/orders/OrderList'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
 
import { PlusCircle, Filter } from 'lucide-react'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'

export default function Orders() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [activeTab, setActiveTab] = useState('domestic')
  const [openAdd, setOpenAdd] = useState(false)
  const [form, setForm] = useState({ vendor: '', peptide: '', mg: '', cost: '', status: 'Order Placed', notes: '' })

  const [orders, setOrders] = useState({
    domestic: [{ id: 1, vendor: 'Acme Research', peptide: 'BPC-157', mg: 10, status: 'Shipped', date: '2025-08-12' }],
    international: [],
    group: [],
  })
  const [vendors, setVendors] = useState(['Acme Research', 'BioLabs', 'PeptideHouse'])
  // Persist vendors locally for autosuggest across sessions until Firebase is added
  useEffect(() => { try { const raw = localStorage.getItem('tpprover_vendors'); if (raw) setVendors(JSON.parse(raw)) } catch {} }, [])
  useEffect(() => { try { localStorage.setItem('tpprover_vendors', JSON.stringify(vendors)) } catch {} }, [vendors])
  const [selected, setSelected] = useState(null)
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)

  const addOrder = () => {
    const id = Date.now()
    const newOrder = { id, vendor: form.vendor, peptide: form.peptide, mg: Number(form.mg) || 0, cost: form.cost, status: form.status || 'Order Placed', notes: form.notes || '', date: new Date().toISOString().slice(0,10) }
    setOrders(prev => ({ ...prev, [activeTab]: [newOrder, ...(prev[activeTab] || [])] }))
    // Persist flat list for Recon cost lookup
    try {
      const raw = localStorage.getItem('tpprover_orders')
      const all = raw ? JSON.parse(raw) : []
      all.unshift({ ...newOrder })
      localStorage.setItem('tpprover_orders', JSON.stringify(all))
    } catch {}
    setForm({ vendor: '', peptide: '', mg: '', cost: '', status: 'Order Placed', notes: '' })
    setOpenAdd(false)
  }

  // Group buys: aggregate summary and participant management (simple local-only stub)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupParticipants, setGroupParticipants] = useState('') // comma-separated
  const [groupNotes, setGroupNotes] = useState('')
  const createGroupBuy = () => {
    const id = Date.now()
    const groupOrder = { id, vendor: form.vendor, peptide: form.peptide, mg: Number(form.mg)||0, cost: form.cost, status: 'Order Placed', date: new Date().toISOString().slice(0,10), group: { title: groupTitle || 'Group Buy', participants: groupParticipants.split(',').map(s=>s.trim()).filter(Boolean), notes: groupNotes } }
    setOrders(prev => ({ ...prev, group: [groupOrder, ...(prev.group || [])] }))
    try { const raw = localStorage.getItem('tpprover_orders'); const all = raw ? JSON.parse(raw) : []; all.unshift(groupOrder); localStorage.setItem('tpprover_orders', JSON.stringify(all)) } catch {}
    setOpenAdd(false); setForm({ vendor:'', peptide:'', mg:'', cost:'' }); setGroupTitle(''); setGroupParticipants(''); setGroupNotes('')
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Group buy created', type: 'success' } }))
  }

  const saveOrder = (updated) => {
    // Find previous status to detect transition to Delivered
    const findIn = (arr) => (arr || []).find(o => o.id === updated.id)
    const prevOrder = findIn(orders.domestic) || findIn(orders.international) || findIn(orders.group)

    const updateList = (arr) => arr.map(o => o.id === updated.id ? updated : o)
    setOrders(prev => {
      const next = {
        domestic: updateList(prev.domestic || []),
        international: updateList(prev.international || []),
        group: updateList(prev.group || []),
      }
      // move between categories if category changed
      const currentBucket = prev.domestic?.some(o => o.id === updated.id) ? 'domestic' : prev.international?.some(o => o.id === updated.id) ? 'international' : 'group'
      const targetBucket = (updated.category === 'international') ? 'international' : (updated.category === 'group' ? 'group' : 'domestic')
      if (currentBucket !== targetBucket) {
        next[currentBucket] = (next[currentBucket] || []).filter(o => o.id !== updated.id)
        next[targetBucket] = [updated, ...(next[targetBucket] || [])]
      }
      return next
    })

    // If status transitioned to Delivered, increment stockpile and compute lead-time
    if (updated?.status === 'Delivered' && (prevOrder?.status || '') !== 'Delivered') {
      try {
        const raw = localStorage.getItem('tpprover_stockpile')
        const stock = raw ? JSON.parse(raw) : []
        const name = updated.peptide || ''
        const mg = String(updated.mg || '')
        const vendor = updated.vendor || ''
        const qtyMultiplier = (String(updated.unit || 'vial').toLowerCase() === 'kit') ? 10 : 1
        const addQty = Math.max(1, Number(updated.quantity) || 1) * qtyMultiplier
        let found = false
        const newStock = stock.map(s => {
          if ((s.name || '').toLowerCase() === name.toLowerCase() && String(s.mg) === mg && (s.vendor || '').toLowerCase() === vendor.toLowerCase()) {
            found = true
            const qty = Number(s.quantity) || 0
            return { ...s, quantity: qty + addQty }
          }
          return s
        })
        if (!found && name) {
          newStock.unshift({ id: Date.now(), name, mg, quantity: addQty, vendor, capColor: '', batchNumber: '' })
        }
        localStorage.setItem('tpprover_stockpile', JSON.stringify(newStock))
      } catch {}
    }
    // persist/update flat orders, and compute per-order lead-time
    try {
      const raw = localStorage.getItem('tpprover_orders')
      let all = raw ? JSON.parse(raw) : []
      const idx = all.findIndex(o => o.id === updated.id)
      const leadDays = (updated.shipDate && updated.deliveryDate) ? Math.max(0, Math.round((new Date(updated.deliveryDate) - new Date(updated.shipDate)) / 86400000)) : undefined
      const withLead = { ...updated, leadDays }
      if (idx >= 0) all[idx] = withLead; else all.unshift(withLead)
      localStorage.setItem('tpprover_orders', JSON.stringify(all))
    } catch {}
    setSelected(null)
  }

  const deleteOrder = (toDelete) => {
    const removeFrom = (arr) => (arr || []).filter(o => o.id !== toDelete.id)
    setOrders(prev => ({
      domestic: removeFrom(prev.domestic),
      international: removeFrom(prev.international),
      group: removeFrom(prev.group),
    }))
    setSelected(null)
  }

  const list = orders[activeTab] || []
  const [statusFilter, setStatusFilter] = useState('All')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const arr = list.filter(o => (statusFilter === 'All' || (o.status || '').toLowerCase().includes(statusFilter.toLowerCase())))
    const q = query.trim().toLowerCase()
    if (!q) return arr
    return arr.filter(o => `${o.vendor} ${o.peptide} ${o.mg}`.toLowerCase().includes(q))
  }, [list, statusFilter, query])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'mg') { va = Number(va) || 0; vb = Number(vb) || 0 }
      if (typeof va === 'string') va = va.toLowerCase()
      if (typeof vb === 'string') vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const advanceStatus = (order) => {
    if (!order) return
    const today = new Date().toISOString().slice(0,10)
    let updated = { ...order }
    const s = (order.status || 'Order Placed').toLowerCase()
    if (s.includes('cancel') || s.includes('deliver')) {
      return
    }
    if (s.includes('ship')) {
      updated.status = 'Delivered'
      updated.deliveryDate = today
    } else if (s.includes('order')) {
      updated.status = 'Shipped'
      updated.shipDate = today
    }
    saveOrder(updated)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <button aria-label="Filters" className="p-2 rounded-md border" onClick={() => setShowFilters(v => !v)} style={{ borderColor: theme.border }}>
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            theme={theme}
            value={activeTab}
            onChange={setActiveTab}
            compact
            options={[{ value: 'domestic', label: 'Domestic' }, { value: 'international', label: 'International' }, { value: 'group', label: 'Group Buys' }]}
          />
          <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => setOpenAdd(true)}><PlusCircle className="h-4 w-4 inline mr-1"/>Add Order</button>
        </div>
      </div>
      {showFilters && (
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: theme.text }}>Status:</label>
          <select className="p-2 rounded border" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ borderColor: theme.border }}>
            <option>All</option>
            <option>Order Placed</option>
            <option>Shipped</option>
            <option>Delivered</option>
            <option>Cancelled</option>
          </select>
          <label className="text-sm" style={{ color: theme.text }}>Sort:</label>
          <select className="p-2 rounded border" value={sortKey} onChange={e => setSortKey(e.target.value)} style={{ borderColor: theme.border }}>
            <option value="date">Date</option>
            <option value="vendor">Vendor</option>
            <option value="peptide">Peptide</option>
            <option value="mg">mg</option>
            <option value="status">Status</option>
          </select>
          <select className="p-2 rounded border" value={sortDir} onChange={e => setSortDir(e.target.value)} style={{ borderColor: theme.border }}>
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <input className="ml-auto p-2 rounded border text-sm" placeholder="Search vendor/peptide" value={query} onChange={e => setQuery(e.target.value)} style={{ borderColor: theme.border }} />
        </div>
      )}
      <div className="rounded border bg-white p-4" style={{ borderColor: theme.border }}>
        <OrderList orders={sorted} theme={theme} onEdit={setSelected} onAdvance={advanceStatus} />
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title={activeTab==='group' ? 'New Group Buy' : 'Add Order'} theme={theme} footer={(
        <>
          <button onClick={() => setOpenAdd(false)} className="px-3 py-2 rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
          {activeTab === 'group' ? (
            <button onClick={createGroupBuy} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }}>Create</button>
          ) : (
            <button onClick={addOrder} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme.primary, color: theme.white }}>Save</button>
          )}
        </>
      )}>
        <div className="space-y-3">
          <TextInput label="Peptide" value={form.peptide} onChange={v => setForm({ ...form, peptide: v })} placeholder="Peptide" theme={theme} />
          <VendorSuggestInput label="Vendor" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor" theme={theme} />
          <TextInput label="mg" value={form.mg} onChange={v => setForm({ ...form, mg: v })} placeholder="10" theme={theme} />
          <TextInput label="Cost ($)" value={form.cost} onChange={v => setForm({ ...form, cost: v })} placeholder="$" theme={theme} />
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6 sm:col-span-4">
              <TextInput label="Quantity" value={form.quantity || ''} onChange={v => setForm({ ...form, quantity: v })} placeholder="1" theme={theme} />
            </div>
            <div className="col-span-6 sm:col-span-4">
              <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Unit</div>
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
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Status</div>
            <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
              {[
                { label: 'Order Placed', value: 'Order Placed' },
                { label: 'In Transit', value: 'Shipped' },
                { label: 'Delivered', value: 'Delivered' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm({ ...form, status: opt.value })} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${form.status === opt.value ? 'text-white' : ''}`} style={form.status === opt.value ? { backgroundColor: theme.primary } : { backgroundColor: '#F3F4F6', color: '#374151' }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <TextInput label="Date Ordered" value={form.date || ''} onChange={v => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" theme={theme} />
          <TextInput label="Delivery Date" value={form.deliveryDate || ''} onChange={v => setForm({ ...form, deliveryDate: v })} placeholder="YYYY-MM-DD" theme={theme} />
          <TextInput label="Notes" value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Notes" theme={theme} />
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Category</div>
            <div className="inline-flex rounded-full bg-gray-100 p-1 shadow-inner">
              {['domestic','international','group'].map(k => (
                <button key={k} type="button" onClick={() => setForm(prev => ({ ...form, category: k }))}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full ${form.category === k ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                  style={form.category === k ? { backgroundColor: theme.primary } : {}}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {activeTab === 'group' && (
            <>
              <TextInput label="Group Title" value={groupTitle} onChange={setGroupTitle} placeholder="e.g., BPC-157 Round #4" theme={theme} />
              <TextInput label="Participants (comma separated)" value={groupParticipants} onChange={setGroupParticipants} placeholder="alice, bob, charlie" theme={theme} />
              <TextInput label="Notes" value={groupNotes} onChange={setGroupNotes} placeholder="split shipping, escrow, etc" theme={theme} />
            </>
          )}
        </div>
      </Modal>

      <OrderDetailsModal
        open={!!selected}
        onClose={() => setSelected(null)}
        order={selected}
        theme={theme}
        onSave={(o) => { saveOrder(o); if (o.vendor && !vendors.includes(o.vendor)) setVendors([o.vendor, ...vendors]) }}
        onDelete={deleteOrder}
        vendorList={vendors}
      />
    </section>
  )
}