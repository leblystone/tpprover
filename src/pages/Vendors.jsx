import React, { useMemo, useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'
 import Tabs from '../components/common/Tabs'
 import Modal from '../components/common/Modal'
 import TextInput from '../components/common/inputs/TextInput'
import { PlusCircle, Star, CreditCard, Banknote, Coins, Wallet, Landmark, Filter, FileUp, Mail, Phone, AtSign, Globe } from 'lucide-react'
import { FaDiscord, FaTelegramPlane, FaWhatsapp, FaFacebook } from 'react-icons/fa'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'

export default function Vendors() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [activeTab, setActiveTab] = useState('domestic')
  // Add vendor uses the same VendorDetailsModal as Manage for parity
  const [vendors, setVendors] = useState({
    domestic: [{ id: 1, name: 'Acme Research', notes: 'Reliable', createdAt: new Date().toISOString() }],
    international: [],
    group: [],
  })
  const [selected, setSelected] = useState(null)
  const [orders, setOrders] = React.useState([])
  React.useEffect(() => { try { const raw = localStorage.getItem('tpprover_orders'); if (raw) setOrders(JSON.parse(raw)) } catch {} }, [])
  const list = vendors[activeTab] || []

  // Persist vendors full details
  React.useEffect(() => { try { const raw = localStorage.getItem('tpprover_vendors_full'); if (raw) setVendors(JSON.parse(raw)) } catch {} }, [])
  React.useEffect(() => { try { localStorage.setItem('tpprover_vendors_full', JSON.stringify(vendors)) } catch {} }, [vendors])

  const addVendor = () => {
    setSelected({ type: activeTab })
  }

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [payFilter, setPayFilter] = useState([]) // e.g., ['card','zelle']
  const [contactFilter, setContactFilter] = useState([]) // e.g., ['email','telegram']
  const [labelFilter, setLabelFilter] = useState([]) // e.g., ['Reliable']
  const toggleIn = (arr, value) => (arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value])
  const filteredList = React.useMemo(() => {
    let arr = list
    if (payFilter.length > 0) {
      arr = arr.filter(v => {
        const p = v.payments || {}
        return payFilter.every(k => !!p[k])
      })
    }
    if (contactFilter.length > 0) {
      arr = arr.filter(v => {
        const cs = Array.isArray(v.contacts) ? v.contacts : []
        const types = new Set(cs.map(c => String(c.type || '').toLowerCase()))
        return contactFilter.every(k => types.has(k))
      })
    }
    if (labelFilter.length > 0) {
      arr = arr.filter(v => {
        const ls = Array.isArray(v.labels) ? v.labels : []
        return labelFilter.every(k => ls.includes(k))
      })
    }
    return arr
  }, [list, payFilter, contactFilter, labelFilter])

  // Import vendors from CSV/JSON (local only)
  const fileInputRef = React.useRef(null)
  const handleImportClick = () => fileInputRef.current?.click()
  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      // Images/PDFs: placeholder stub (future OCR/mapping). For now, show a toast and ignore content.
      if (/\.(png|jpg|jpeg|pdf)$/i.test(file.name)) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'File uploaded. OCR mapping coming soon.', type: 'info' } }))
        return
      }
      const text = await file.text()
      let rows = []
      if (file.name.toLowerCase().endsWith('.json')) {
        rows = JSON.parse(text)
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        throw new Error('xlsx-not-supported')
      } else {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
        if (lines.length <= 1) throw new Error('empty-csv')
        const delimiter = lines[0].includes('\t') ? '\t' : ','
        const split = (s) => s.split(new RegExp(`${delimiter}`))
        const headerRaw = split(lines[0])
        const header = headerRaw.map(h => h.trim())
        const norm = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ')
        const findIdx = (syn) => {
          for (let i=0;i<header.length;i++) {
            const h = norm(header[i])
            if (syn.some(w => h.includes(w))) return i
          }
          return -1
        }
        const nameIdx = findIdx(['vendor','name','supplier','company'])
        const notesIdx = findIdx(['notes','comment','comments','desc','description','about'])
        const paymentsIdx = findIdx(['payments','payment accepted','accepts','accepted'])
        const payCols = {
          card: findIdx(['card','credit','visa','mastercard']),
          zelle: findIdx(['zelle']),
          crypto: findIdx(['crypto','bitcoin','btc','ethereum','eth','usdc','usdt']),
          paypal: findIdx(['paypal','pay pal']),
          wire: findIdx(['wire','bank transfer','bank'])
        }
        const contactCols = {
          email: findIdx(['email','mail']),
          phone: findIdx(['phone','mobile','tel']),
          telegram: findIdx(['telegram','tg']),
          discord: findIdx(['discord']),
          website: findIdx(['website','url','site'])
        }
        const labelsIdx = findIdx(['labels','tags'])

        for (let i=1;i<lines.length;i++) {
          const cols = split(lines[i]).map(c => c.trim())
          const name = nameIdx>=0 ? cols[nameIdx] : (cols[0]||'')
          const notes = notesIdx>=0 ? cols[notesIdx] : ''
          const payments = { card:false, zelle:false, crypto:false, paypal:false, wire:false }
          // from specific columns
          for (const k of Object.keys(payCols)) {
            const j = payCols[k]
            if (j>=0) {
              const v = (cols[j]||'').toLowerCase()
              if (['true','yes','y','1','x','✓','accept','accepted'].some(t => v.includes(t))) payments[k] = true
            }
          }
          // parse generalized payments cell
          if (paymentsIdx>=0) {
            const v = (cols[paymentsIdx]||'').toLowerCase()
            if (/card|credit|visa|mastercard/.test(v)) payments.card = true
            if (/zelle/.test(v)) payments.zelle = true
            if (/crypto|bitcoin|btc|ethereum|eth|usdc|usdt/.test(v)) payments.crypto = true
            if (/paypal/.test(v)) payments.paypal = true
            if (/wire|bank/.test(v)) payments.wire = true
          }
          // contacts
          const contacts = []
          for (const [type, j] of Object.entries(contactCols)) {
            if (j>=0) {
              const v = cols[j]
              if (v) contacts.push({ type, value: v })
            }
          }
          // pair-style contacts
          const c1t = header.findIndex(h => norm(h).includes('contact1 type'))
          const c1v = header.findIndex(h => norm(h).includes('contact1 value'))
          const c2t = header.findIndex(h => norm(h).includes('contact2 type'))
          const c2v = header.findIndex(h => norm(h).includes('contact2 value'))
          if (c1v>=0) contacts.push({ type: c1t>=0 ? cols[c1t] : 'email', value: cols[c1v] })
          if (c2v>=0) contacts.push({ type: c2t>=0 ? cols[c2t] : 'phone', value: cols[c2v] })
          const labels = labelsIdx>=0 ? (cols[labelsIdx]||'').split(/[;|,]/).map(s => s.trim()).filter(Boolean) : []

          rows.push({ id: Date.now()+i, name, notes, payments, contacts: contacts.filter(c=>c && c.value), labels, createdAt: new Date().toISOString() })
        }
      }
      setVendors(prev => ({ ...prev, [activeTab]: [...rows, ...(prev[activeTab]||[])] }))
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `Imported ${rows.length} vendors`, type: 'success' } }))
    } catch {
      const msg = file?.name?.toLowerCase()?.match(/\.xlsx|\.xls$/) ? 'Import failed: Please export your Excel file to CSV or JSON first.' : 'Import failed. We will attempt to auto-detect columns like vendor/name, notes, payments, and contact details. Ensure your CSV has a header row.'
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: msg, type: 'error' } }))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const [showImportHint, setShowImportHint] = useState(() => { try { return localStorage.getItem('tpprover_vendors_import_hint') !== 'dismissed' } catch { return true } })

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button aria-label="Filters" className="p-2 rounded-md border" onClick={() => setShowFilters(v => !v)} style={{ borderColor: theme.border }}>
            <Filter className="h-4 w-4" />
          </button>
          <button aria-label="Import Vendors" className="p-2 rounded-md border" onClick={handleImportClick} style={{ borderColor: theme.border }} title="Import vendors (CSV/JSON)">
            <FileUp className="h-4 w-4" />
          </button>
           <input ref={fileInputRef} type="file" className="hidden" accept=".csv,.json,.xlsx,.xls,.png,.jpg,.jpeg,.pdf" onChange={onImportFile} />
          {showImportHint && (
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 rounded-full text-xs animate-pulse"
                onClick={handleImportClick}
                title="Click to import vendors from a spreadsheet or JSON"
                style={{ backgroundColor: theme.success, color: theme.white }}
              >
                Import vendors
              </button>
              <button
                aria-label="Dismiss"
                className="text-xs"
                onClick={() => { setShowImportHint(false); try { localStorage.setItem('tpprover_vendors_import_hint', 'dismissed') } catch {} }}
              >
                ×
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            theme={theme}
            value={activeTab}
            onChange={setActiveTab}
            compact
            options={[{ value: 'domestic', label: 'Domestic' }, { value: 'international', label: 'International' }, { value: 'group', label: 'Group Buys' }]}
          />
          <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={addVendor}><PlusCircle className="h-4 w-4 inline mr-1"/>Add Vendor</button>
        </div>
      </div>
      {showFilters && (
        <div className="rounded border bg-white p-3 content-card" style={{ borderColor: theme.border }}>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-sm font-semibold" style={{ color: theme.text }}>Payment:</span>
            {['card','zelle','crypto','paypal','wire'].map(k => (
              <label key={k} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={payFilter.includes(k)} onChange={() => setPayFilter(prev => toggleIn(prev, k))} /> {k}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="text-sm font-semibold" style={{ color: theme.text }}>Contact:</span>
            {['email','phone','telegram','discord','website'].map(k => (
              <label key={k} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={contactFilter.includes(k)} onChange={() => setContactFilter(prev => toggleIn(prev, k))} /> {k}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold" style={{ color: theme.text }}>Label:</span>
            {['Reliable','Bad Test','Fast Shipping','Overfill','Domestic Warehouse','Bad Packaging','Broken Vials','Vetted'].map(k => (
              <label key={k} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={labelFilter.includes(k)} onChange={() => setLabelFilter(prev => toggleIn(prev, k))} /> {k}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="rounded border bg-white p-4" style={{ borderColor: theme.border }}>
        {filteredList.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textLight }}>No vendors.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map(v => (
              <div key={v.id} className="p-4 rounded-xl border content-card" style={{ borderColor: theme.border }}>
                <div className="flex items-baseline justify-between">
                  <div className="font-semibold">{v.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs" style={{ color: theme.text }}>
                      <Star className="w-3 h-3" style={{ fill: theme.primary, stroke: theme.primary }} />
                      <span>{v.rating || 0}</span>
                    </span>
                    <ReliabilityBadge vendor={v} orders={orders} theme={theme} />
                  </div>
                </div>
                <VendorPaymentIcons vendor={v} theme={theme} />
                {v.payments && v.payments.notes && (
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>{v.payments.notes}</div>
                )}
                {(v.contacts && v.contacts.length > 0) && (
                  <div className="mt-2 text-xs">
                    <div className="font-semibold mb-1" style={{ color: theme.text }}>Contacts</div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {v.contacts.map((c, i) => (
                        <li key={i} className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center" title={c.value}>{renderContactIcon(c.type, theme)}</span>
                          <button
                            className="truncate text-left hover:underline"
                            title="Click to copy"
                            onClick={() => { try { navigator.clipboard.writeText(c.value || ''); window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Copied to clipboard', type: 'success' } })); } catch {} }}
                          >
                            {c.value}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="text-xs mt-2" style={{ color: theme.textLight }}>{v.notes || '—'}</div>
                {Array.isArray(v.labels) && v.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.labels.map(l => (
                      <span key={l} className={getVendorLabelClass(l)}>{l}</span>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-right">
                  <button className="px-3 py-1 rounded-md text-sm" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}`, color: theme.text }} onClick={() => setSelected(v)}>Manage</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Vendor uses VendorDetailsModal for full parity */}

      <VendorDetailsModal
        open={!!selected}
        onClose={() => setSelected(null)}
        theme={theme}
        vendor={selected}
        onSave={(updated) => {
          setVendors(prev => {
            // Remove from any tab it currently exists in
            const next = {
              domestic: (prev.domestic || []).filter(v => v.id !== updated.id),
              international: (prev.international || []).filter(v => v.id !== updated.id),
              group: (prev.group || []).filter(v => v.id !== updated.id),
            }
            const bucket = (updated.type === 'international') ? 'international' : (updated.type === 'group' ? 'group' : 'domestic')
            next[bucket] = [updated, ...(next[bucket] || [])]
            return next
          })
          setSelected(null)
        }}
      />
    </section>
  )
}

function VendorSpendBars({ orders, theme }) {
  const totals = orders.reduce((acc, o) => { const k = o.vendor || 'Unknown'; acc[k] = (acc[k] || 0) + (Number(o.cost) || 0); return acc }, {})
  const max = Math.max(1, ...Object.values(totals))
  const entries = Object.entries(totals)
  if (entries.length === 0) return <div className="text-sm text-gray-500">No orders yet.</div>
  return (
    <div className="space-y-2">
      {entries.map(([name, total]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs text-gray-500"><span>{name}</span><span>${total.toFixed(2)}</span></div>
          <div className="h-2 rounded bg-gray-100 overflow-hidden"><div className="h-2" style={{ width: `${(total / max) * 100}%`, backgroundColor: theme.primary }}></div></div>
        </div>
      ))}
    </div>
  )
}

function VendorPaymentIcons({ vendor, theme }) {
  const p = vendor?.payments || vendor?.paymentMethods || {}
  const items = []
  if (p.card || p.credit || p['credit card']) items.push({ label: 'Card', Icon: CreditCard })
  if (p.zelle) items.push({ label: 'Zelle', Icon: Banknote })
  if (p.crypto) items.push({ label: 'Crypto', Icon: Coins })
  if (p.paypal) items.push({ label: 'PayPal', Icon: Wallet })
  if (p.wire) items.push({ label: 'Wire', Icon: Landmark })
  if (items.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs" title="Payment methods" style={{ color: theme.text }}>
      {items.map(({ label, Icon }) => (
        <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}`, color: theme.text }}>
          <Icon className="w-3 h-3" />
          {label}
        </span>
      ))}
    </div>
  )
}

function VendorKPIs({ orders, theme }) {
  const groups = orders.reduce((acc, o) => {
    const k = o.vendor || 'Unknown'
    const placed = new Date(o.date || Date.now()).getTime()
    const shipped = o.shipDate ? new Date(o.shipDate).getTime() : null
    const delivered = o.deliveryDate ? new Date(o.deliveryDate).getTime() : null
    const lead = shipped && delivered ? (delivered - shipped) / 86400000 : null
    if (!acc[k]) acc[k] = { count: 0, leadTimes: [] }
    acc[k].count += 1
    if (lead != null && isFinite(lead) && lead >= 0) acc[k].leadTimes.push(lead)
    return acc
  }, {})
  const entries = Object.entries(groups).map(([name, v]) => ({ name, avgLead: v.leadTimes.length ? (v.leadTimes.reduce((a,b)=>a+b,0)/v.leadTimes.length) : null, orders: v.count }))
  if (entries.length === 0) return <div className="text-sm text-gray-500">No data</div>
  return (
    <div className="rounded border p-3" style={{ borderColor: theme.border }}>
      <div className="font-semibold text-sm mb-2">Vendor KPIs</div>
      <ul className="space-y-1 text-xs">
        {entries.map(e => (
          <li key={e.name} className="flex items-center justify-between">
            <span className="truncate pr-2">{e.name}</span>
            <span className="flex items-center gap-2">
              <ReliabilityBadge name={e.name} orders={orders} theme={theme} />
              {e.orders} orders • {e.avgLead != null ? `${e.avgLead.toFixed(1)}d lead` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LeadTimeChart({ orders, theme }) {
  const points = orders.filter(o => o.shipDate && o.deliveryDate).map(o => ({ x: new Date(o.deliveryDate).getTime(), y: (new Date(o.deliveryDate) - new Date(o.shipDate)) / 86400000 }))
  points.sort((a,b) => a.x - b.x)
  if (points.length === 0) return (
    <div className="rounded border p-3" style={{ borderColor: theme.border }}>
      <div className="font-semibold text-sm mb-2">Lead-time trend</div>
      <div className="text-xs text-gray-500">No shipped/delivered orders yet</div>
    </div>
  )
  const width = 280, height = 120, padding = 8
  const minX = points[0].x, maxX = points[points.length-1].x
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y))
  const xrange = (maxX - minX) || 1, yrange = (maxY - minY) || 1
  const d = points.map((p,i) => {
    const x = padding + ((p.x - minX) / xrange) * (width - padding*2)
    const y = padding + (1 - (p.y - minY) / yrange) * (height - padding*2)
    return `${i===0?'M':'L'} ${x} ${y}`
  }).join(' ')
  return (
    <div className="rounded border p-3" style={{ borderColor: theme.border }}>
      <div className="font-semibold text-sm mb-2">Lead-time trend</div>
      <svg width={width} height={height} className="rounded border bg-white" style={{ borderColor: theme.border }}>
        <path d={d} stroke={theme.primary} strokeWidth="2" fill="none" />
      </svg>
    </div>
  )
}

function ReliabilityBadge({ vendor, orders, theme }) {
  const name = vendor?.name || ''
  const vendorOrders = orders.filter(o => (o.vendor || '') === name)
  const hasCompleted = vendorOrders.some(o => (o.status || '').toLowerCase() === 'delivered')
  const createdAt = vendor?.createdAt ? new Date(vendor.createdAt) : null
  const now = new Date()
  const ageDays = createdAt ? Math.floor((now - createdAt) / 86400000) : 0
  const isNew = !hasCompleted && ageDays < 30
  return <span className={isNew ? 'status-info' : 'status-active'}>{isNew ? 'New' : 'Active'}</span>
}

function ReliabilityLevelChip({ level }) {
  const map = {
    Unknown: 'status-info',
    Low: 'status-error',
    Medium: 'status-pending',
    High: 'status-active',
    Excellent: 'status-active',
  }
  const cls = map[level] || 'status-info'
  return <span className={cls}>{level}</span>
}

function getVendorLabelClass(label) {
  const s = String(label || '').toLowerCase()
  const green = ['reliable','vetted','overfill','fast shipping']
  const red = ['bad test','bad packaging','broken vials']
  if (green.some(k => s.includes(k))) return 'status-active'
  if (red.some(k => s.includes(k))) return 'status-error'
  if (s.includes('domestic warehouse')) return 'status-inactive'
  return 'status-info'
}

function renderContactIcon(type, theme) {
  const t = String(type || '').toLowerCase()
  const cls = 'w-3 h-3'
  const color = theme?.text || '#374151'
  if (t === 'name') return <AtSign className={cls} style={{ color }} />
  if (t === 'email') return <Mail className={cls} style={{ color }} />
  if (t === 'phone') return <Phone className={cls} style={{ color }} />
  if (t === 'whatsapp') return <FaWhatsapp style={{ width: 12, height: 12, color }} />
  if (t === 'discord') return <FaDiscord style={{ width: 12, height: 12, color }} />
  if (t === 'telegram') return <FaTelegramPlane style={{ width: 12, height: 12, color }} />
  if (t === 'facebook') return <FaFacebook style={{ width: 12, height: 12, color }} />
  if (t === 'website') return <Globe className={cls} style={{ color }} />
  return <AtSign className={cls} style={{ color }} />
}


