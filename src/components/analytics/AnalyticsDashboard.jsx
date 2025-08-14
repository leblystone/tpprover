 import React, { useEffect, useMemo, useState } from 'react'

function useLocal(key, fallback) {
  const [state, setState] = useState(fallback)
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setState(JSON.parse(raw)) } catch {} }, [key])
  return state
}

export default function AnalyticsDashboard({ theme }) {
  const protocols = useLocal('tpprover_protocols', [])
  const orders = useLocal('tpprover_orders', [])
  const stockpile = useLocal('tpprover_stockpile', [])
  const supplements = useLocal('tpprover_supplements', [])
  const suppDone = useLocal('tpprover_supp_completions', {})

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'Delivered').length
    const activeProtocols = protocols.filter(p => p.active !== false).length
    const lowStock = stockpile.filter(s => Number(s.quantity) <= 1).length
    const supplementCount = supplements.length
    const monthlySpend = orders.reduce((acc, o) => {
      const month = (o.date || '').slice(0,7)
      const cost = Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0
      acc[month] = (acc[month] || 0) + cost
      return acc
    }, {})
    const lastMonth = Object.keys(monthlySpend).sort().slice(-1)[0]
    const lastMonthSpend = lastMonth ? monthlySpend[lastMonth] : 0
    // naive compliance over last 7 days across all supplements
    const days = [...Array(7)].map((_,i) => new Date(Date.now() - (6-i)*86400000).toISOString().slice(0,10))
    let planned = 0, done = 0
    const supplementsById = new Map(supplements.map(s => [s.id, s]))
    for (const day of days) {
      const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      for (const s of supplements) {
        if (!s.days?.includes(weekday)) continue
        if (s.schedule === 'AM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1 }
        else if (s.schedule === 'PM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
        else if (s.schedule === 'BOTH') { planned += 2; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
      }
    }
    const compliancePct = planned > 0 ? Math.round((done/planned)*100) : 0
    return { delivered, activeProtocols, lowStock, supplementCount, lastMonthSpend, compliancePct }
  }, [protocols, orders, stockpile, supplements])

  const badges = useMemo(() => {
    const out = []
    if (stats.delivered >= 1) out.push({ name: 'First Delivery', desc: 'You have a delivered order' })
    if (stats.activeProtocols >= 3) out.push({ name: 'Protocol Planner', desc: '3+ active protocols' })
    if (stats.lowStock === 0 && stockpile.length > 0) out.push({ name: 'Well Stocked', desc: 'No low stock items' })
    if (stats.supplementCount >= 5) out.push({ name: 'Supplement Scholar', desc: '5+ supplements tracked' })
    return out
  }, [stats, stockpile])


  const cardStyle = { backgroundColor: theme.white, borderColor: theme.border }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-xs text-gray-500">Delivered Orders</div>
        <div className="text-2xl font-bold">{stats.delivered}</div>
      </div>
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-xs text-gray-500">Active Protocols</div>
        <div className="text-2xl font-bold">{stats.activeProtocols}</div>
      </div>
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-xs text-gray-500">Low Stock Items</div>
        <div className="text-2xl font-bold">{stats.lowStock}</div>
      </div>
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-xs text-gray-500">Supplements Tracked</div>
        <div className="text-2xl font-bold">{stats.supplementCount}</div>
      </div>
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-xs text-gray-500">Last Month Spend</div>
        <div className="text-2xl font-bold">${stats.lastMonthSpend?.toFixed ? stats.lastMonthSpend.toFixed(2) : stats.lastMonthSpend}</div>
      </div>
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-xs text-gray-500">Supplement Compliance (7d)</div>
        <div className="text-2xl font-bold">{stats.compliancePct}%</div>
      </div>

      {/* Orders: Monthly spend trend */}
      <div className="md:col-span-2 p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Monthly Spend Trend</div>
        <MonthlySpendChart orders={orders} theme={theme} />
      </div>

      {/* Orders: Top vendors by spend */}
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Top Vendors by Spend</div>
        <TopVendors orders={orders} theme={theme} />
      </div>

      {/* Orders: Delivery lead‑time histogram */}
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Delivery Lead‑time</div>
        <LeadtimeHistogram orders={orders} theme={theme} />
      </div>

      {/* Research: 30‑day compliance trend + streak */}
      <div className="md:col-span-2 p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold" style={{ color: theme.primaryDark }}>Compliance (last 30 days)</div>
          <div className="text-xs" style={{ color: theme.textLight }}>Current streak: <b>{computeStreak(supplements, suppDone)} days</b></div>
        </div>
        <ComplianceTrend supplements={supplements} suppDone={suppDone} theme={theme} />
      </div>

      {/* Inventory: Low stock list */}
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Low Stock Now</div>
        <LowStockList stockpile={stockpile} theme={theme} />
      </div>

      {/* Vendors: Lead‑time & on‑time */}
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Vendors Lead‑time & On‑time</div>
        <VendorLeadtimeOnTime orders={orders} theme={theme} />
      </div>

      {/* Spend by Peptide */}
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Spend by Peptide</div>
        <SpendByPeptide orders={orders} theme={theme} />
      </div>

      {/* Average $/mg by Peptide */}
      <div className="p-4 rounded-xl border content-card" style={cardStyle}>
        <div className="text-sm font-semibold mb-2" style={{ color: theme.primaryDark }}>Average $/mg (Peptide)</div>
        <AvgCostPerMg orders={orders} theme={theme} />
      </div>

      {/* Peptide cost trend (select) */}
      <div className="md:col-span-2 p-4 rounded-xl border content-card" style={cardStyle}>
        <PeptideCostTrend orders={orders} theme={theme} />
      </div>
      {/* Reference moved to Badges tab */}
    </div>
  )
}


function MonthlySpendChart({ orders, theme }) {
  const data = useMemo(() => {
    const map = orders.reduce((acc, o) => {
      const key = (o.date || '').slice(0,7)
      const val = Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0
      if (!key) return acc
      acc[key] = (acc[key] || 0) + val
      return acc
    }, {})
    const keys = Object.keys(map).sort()
    return keys.map(k => ({ x: k, y: map[k] }))
  }, [orders])
  if (data.length === 0) return <div className="text-xs text-gray-500">No data</div>
  const maxY = Math.max(...data.map(d => d.y)) || 1
  return (
    <svg width="100%" height="120" viewBox="0 0 400 120" className="rounded border bg-white" style={{ borderColor: theme.border }}>
      {data.map((d, i) => {
        const x = 20 + i * (360 / Math.max(1, data.length - 1))
        const y = 100 - (d.y / maxY) * 80
        const nx = i === data.length - 1 ? x : 20 + (i+1) * (360 / Math.max(1, data.length - 1))
        const ny = i === data.length - 1 ? y : 100 - (data[i+1].y / maxY) * 80
        return i < data.length - 1 ? <line key={i} x1={x} y1={y} x2={nx} y2={ny} stroke={theme.primary} strokeWidth="2" /> : null
      })}
    </svg>
  )
}

function TopVendors({ orders, theme }) {
  const rows = useMemo(() => {
    const spend = orders.reduce((acc, o) => {
      const k = o.vendor || 'Unknown'
      acc[k] = (acc[k] || 0) + (Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0)
      return acc
    }, {})
    return Object.entries(spend).sort((a,b) => b[1]-a[1]).slice(0,5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs text-gray-500">No data</div>
  const max = Math.max(...rows.map(r => r[1])) || 1
  return (
    <div className="space-y-1">
      {rows.map(([name, val]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs text-gray-500"><span className="truncate pr-2">{name}</span><span>${val.toFixed(0)}</span></div>
          <div className="h-2 rounded bg-gray-100 overflow-hidden"><div className="h-2" style={{ width: `${(val/max)*100}%`, backgroundColor: theme.primary }}></div></div>
        </div>
      ))}
    </div>
  )
}

function LeadtimeHistogram({ orders, theme }) {
  const buckets = useMemo(() => {
    const out = { '0-3':0, '4-7':0, '8-14':0, '15+':0 }
    for (const o of orders) {
      if (!o.shipDate || !o.deliveryDate) continue
      const d = Math.max(0, Math.round((new Date(o.deliveryDate) - new Date(o.shipDate)) / 86400000))
      if (d <= 3) out['0-3']++
      else if (d <= 7) out['4-7']++
      else if (d <= 14) out['8-14']++
      else out['15+']++
    }
    return out
  }, [orders])
  const entries = Object.entries(buckets)
  const max = Math.max(1, ...entries.map(e => e[1]))
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className="w-10 text-right text-gray-500">{k}d</span>
          <div className="flex-1 h-2 rounded bg-gray-100 overflow-hidden"><div className="h-2" style={{ width: `${(v/max)*100}%`, backgroundColor: theme.primary }}></div></div>
          <span className="w-6 text-right">{v}</span>
        </div>
      ))}
    </div>
  )
}

function ComplianceTrend({ supplements, suppDone, theme }) {
  const data = useMemo(() => {
    const days = [...Array(30)].map((_,i) => new Date(Date.now() - (29-i)*86400000).toISOString().slice(0,10))
    return days.map(day => {
      const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      let planned = 0, done = 0
      for (const s of (supplements||[])) {
        if (!s.days?.includes(weekday)) continue
        if (s.schedule === 'AM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1 }
        else if (s.schedule === 'PM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
        else if (s.schedule === 'BOTH') { planned += 2; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
      }
      const pct = planned > 0 ? Math.round((done/planned)*100) : 0
      return pct
    })
  }, [supplements, suppDone])
  const max = 100
  return (
    <svg width="100%" height="80" viewBox="0 0 300 80" className="rounded border bg-white" style={{ borderColor: theme.border }}>
      {data.map((v, i) => {
        const x = 5 + i * (290 / 30)
        const h = (v / max) * 70
        return <rect key={i} x={x} y={75 - h} width={6} height={h} fill={theme.primary} />
      })}
    </svg>
  )
}

function computeStreak(supplements, suppDone) {
  const daysBack = 90
  let streak = 0
  for (let i = 0; i < daysBack; i++) {
    const day = new Date(Date.now() - i*86400000).toISOString().slice(0,10)
    const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    let planned = 0, done = 0
    for (const s of (supplements||[])) {
      if (!s.days?.includes(weekday)) continue
      if (s.schedule === 'AM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1 }
      else if (s.schedule === 'PM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
      else if (s.schedule === 'BOTH') { planned += 2; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
    }
    if (planned > 0 && done === planned) streak++
    else if (planned > 0) break
  }
  return streak
}

function LowStockList({ stockpile, theme }) {
  const lows = useMemo(() => (stockpile||[]).filter(s => Number(s.quantity) <= Number(s.minQty||1)).slice(0,5), [stockpile])
  if (lows.length === 0) return <div className="text-xs text-gray-500">No low stock items.</div>
  return (
    <ul className="text-xs space-y-1">
      {lows.map(s => (
        <li key={s.id} className="flex items-center justify-between">
          <span className="truncate pr-2">{s.name} {s.mg ? `(${s.mg} mg)` : ''}</span>
          <span className="status-error">{s.quantity} left</span>
        </li>
      ))}
    </ul>
  )
}

function VendorLeadtimeOnTime({ orders, theme }) {
  const rows = useMemo(() => {
    const map = new Map()
    for (const o of (orders||[])) {
      const vendor = o.vendor || 'Unknown'
      const shipped = o.shipDate ? new Date(o.shipDate) : null
      const delivered = o.deliveryDate ? new Date(o.deliveryDate) : null
      const lead = (shipped && delivered) ? Math.max(0, Math.round((delivered - shipped)/86400000)) : null
      const arr = map.get(vendor) || []
      if (lead != null) arr.push(lead)
      map.set(vendor, arr)
    }
    const list = Array.from(map.entries()).map(([vendor, leads]) => {
      if (leads.length === 0) return { vendor, avg: null, ontime: null }
      const avg = leads.reduce((a,b)=>a+b,0)/leads.length
      const ontime = leads.filter(d => d <= 7).length / leads.length
      return { vendor, avg, ontime }
    }).sort((a,b)=> (a.avg ?? 1e9) - (b.avg ?? 1e9)).slice(0,5)
    return list
  }, [orders])
  if (rows.length === 0) return <div className="text-xs text-gray-500">No data</div>
  return (
    <ul className="text-xs space-y-1">
      {rows.map(r => (
        <li key={r.vendor} className="flex items-center justify-between">
          <span className="truncate pr-2">{r.vendor}</span>
          <span>{r.avg != null ? `${r.avg.toFixed(1)}d` : '—'} • {r.ontime != null ? `${Math.round(r.ontime*100)}% on‑time` : '—'}</span>
        </li>
      ))}
    </ul>
  )
}

function SpendByPeptide({ orders, theme }) {
  const rows = useMemo(() => {
    const spend = orders.reduce((acc, o) => {
      const k = o.peptide || 'Unknown'
      acc[k] = (acc[k] || 0) + (Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0)
      return acc
    }, {})
    return Object.entries(spend).sort((a,b)=>b[1]-a[1]).slice(0,5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs text-gray-500">No data</div>
  const max = Math.max(...rows.map(r=>r[1])) || 1
  return (
    <div className="space-y-1">
      {rows.map(([name, val]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs text-gray-500"><span className="truncate pr-2">{name}</span><span>${val.toFixed(0)}</span></div>
          <div className="h-2 rounded bg-gray-100 overflow-hidden"><div className="h-2" style={{ width: `${(val/max)*100}%`, backgroundColor: theme.primary }}></div></div>
        </div>
      ))}
    </div>
  )
}

function AvgCostPerMg({ orders, theme }) {
  const rows = useMemo(() => {
    const agg = orders.reduce((acc, o) => {
      const k = o.peptide || 'Unknown'
      const mg = Number(String(o.mg).replace(/[^0-9.]/g,'')) || 0
      const cost = Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0
      if (!acc[k]) acc[k] = { mg: 0, cost: 0 }
      acc[k].mg += mg
      acc[k].cost += cost
      return acc
    }, {})
    return Object.entries(agg)
      .filter(([,v]) => v.mg > 0)
      .map(([name, v]) => ({ name, rate: v.cost / v.mg }))
      .sort((a,b)=>a.rate-b.rate)
      .slice(0,5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs text-gray-500">No data</div>
  const max = Math.max(...rows.map(r=>r.rate)) || 1
  return (
    <div className="space-y-1">
      {rows.map(r => (
        <div key={r.name}>
          <div className="flex items-center justify-between text-xs text-gray-500"><span className="truncate pr-2">{r.name}</span><span>${r.rate.toFixed(2)}/mg</span></div>
          <div className="h-2 rounded bg-gray-100 overflow-hidden"><div className="h-2" style={{ width: `${(r.rate/max)*100}%`, backgroundColor: theme.primary }}></div></div>
        </div>
      ))}
    </div>
  )
}

function PeptideCostTrend({ orders, theme }) {
  const peptides = useMemo(() => Array.from(new Set((orders||[]).map(o => o.peptide).filter(Boolean))).sort(), [orders])
  const [sel, setSel] = useState(() => peptides[0] || '')
  const data = useMemo(() => {
    const map = orders.filter(o => (o.peptide||'') === sel).reduce((acc, o) => {
      const key = (o.date || '').slice(0,7)
      const mg = Number(String(o.mg).replace(/[^0-9.]/g,'')) || 0
      const cost = Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0
      if (!key) return acc
      if (!acc[key]) acc[key] = { mg: 0, cost: 0 }
      acc[key].mg += mg
      acc[key].cost += cost
      return acc
    }, {})
    const keys = Object.keys(map).sort()
    return keys.map(k => ({ x: k, rate: map[k].mg > 0 ? map[k].cost / map[k].mg : 0 }))
  }, [orders, sel])
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs text-gray-500">Peptide:</label>
        <select className="p-2 rounded border text-sm" value={sel} onChange={e => setSel(e.target.value)} style={{ borderColor: theme.border }}>
          {peptides.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      {(!data || data.length === 0) ? (
        <div className="text-xs text-gray-500">No data</div>
      ) : (
        <svg width="100%" height="120" viewBox="0 0 400 120" className="rounded border bg-white" style={{ borderColor: theme.border }}>
          {data.map((d,i) => {
            const x = 20 + i * (360 / Math.max(1, data.length - 1))
            const y = 100 - (d.rate / Math.max(...data.map(a=>a.rate), 1)) * 80
            const nx = i === data.length - 1 ? x : 20 + (i+1) * (360 / Math.max(1, data.length - 1))
            const ny = i === data.length - 1 ? y : 100 - (data[i+1].rate / Math.max(...data.map(a=>a.rate), 1)) * 80
            return i < data.length - 1 ? <line key={i} x1={x} y1={y} x2={nx} y2={ny} stroke={theme.primary} strokeWidth="2" /> : null
          })}
        </svg>
      )}
    </div>
  )
}
