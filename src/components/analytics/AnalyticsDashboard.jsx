import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, DollarSign, Truck, Archive, AlertTriangle, FlaskConical, Maximize2, Zap, Eye, TrendingUp, Clock, Package } from 'lucide-react'
import Tabs from '../common/Tabs'
import { formatCurrency } from '../../utils/currencyUtils'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'
import SpendingDetailModal from '../dashboard/SpendingDetailModal'

function useLocal(key, fallback) {
  const [state, setState] = useState(fallback)
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setState(JSON.parse(raw)) } catch {} }, [key])
  return state
}

export default function AnalyticsDashboard({ theme, defaultTab, showFullScreenLink = false }) {
  const navigate = useNavigate()
  const protocols = useLocal('tpprover_protocols', [])
  const orders = useLocal('tpprover_orders', [])
  const stockpile = useLocal('tpprover_stockpile', [])
  const supplements = useLocal('tpprover_supplements', [])
  const suppDone = useLocal('tpprover_supp_completions', {})
  const protocolHistory = useLocal('tpprover_protocol_history', [])
  const [activeTab, setActiveTab] = useState(defaultTab || 'compliance')
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'Delivered').length
    const activeProtocols = protocols.filter(p => p.active !== false).length
    const lowStock = stockpile.filter(s => Number(s.quantity) <= 1).length
    const supplementCount = supplements.length

    const now = new Date()
    const last90Days = new Date()
    last90Days.setDate(last90Days.getDate() - 90)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    let lastMonthSpend = 0, last90DaysSpend = 0, totalSpend = 0
    const ordersWithCosts = new Set()

    orders.forEach(order => {
      let itemsCost = 0
      if (order.items && order.items.length > 0) {
        itemsCost = order.items.reduce((sum, item) => {
          const price = parseFloat(item.price) || 0
          const quantity = parseInt(item.quantity, 10) || 1
          return sum + (price * quantity)
        }, 0)
      } else if (order.cost) {
        itemsCost = parseFloat(String(order.cost).replace(/[^0-9.]/g, '')) || 0
      }
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}')
      const includeShipping = settings.orders?.includeShippingInCosts ?? true
      const shippingCost = includeShipping ? (parseFloat(order.shippingCost) || 0) : 0
      const totalCost = itemsCost + shippingCost
      if (totalCost > 0) {
        ordersWithCosts.add(order.id)
        const orderDate = order.date ? new Date(order.date) : null
        totalSpend += totalCost
        if (orderDate && orderDate >= last90Days) last90DaysSpend += totalCost
        if (orderDate && orderDate >= lastMonthStart && orderDate <= lastMonthEnd) lastMonthSpend += totalCost
      }
    })

    stockpile.forEach(stockItem => {
      const orderId = stockItem.orderId
      const costPerVial = parseFloat(stockItem.cost) || 0
      const quantity = parseFloat(stockItem.quantity) || 0
      const stockItemTotal = costPerVial * quantity
      if (stockItemTotal > 0 && !(orderId && ordersWithCosts.has(orderId))) {
        totalSpend += stockItemTotal
        const purchaseDate = stockItem.purchaseDate ? new Date(stockItem.purchaseDate) : null
        if (purchaseDate && purchaseDate >= last90Days) last90DaysSpend += stockItemTotal
        if (purchaseDate && purchaseDate >= lastMonthStart && purchaseDate <= lastMonthEnd) lastMonthSpend += stockItemTotal
      }
    })

    const days7 = [...Array(7)].map((_, i) => new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10))
    let planned = 0, done = 0
    for (const day of days7) {
      const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      for (const s of supplements) {
        if (!s.days?.includes(weekday)) continue
        if (s.schedule === 'AM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1 }
        else if (s.schedule === 'PM') { planned += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
        else if (s.schedule === 'BOTH') { planned += 2; if (suppDone?.[day]?.[`${s.id}_AM`]) done += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) done += 1 }
      }
    }
    const compliancePct = planned > 0 ? Math.round((done / planned) * 100) : 0

    let totalLeadTime = 0, leadTimeCount = 0
    for (const o of orders) {
      if (!o.shipDate || !o.deliveryDate) continue
      const d = Math.max(0, Math.round((new Date(o.deliveryDate) - new Date(o.shipDate)) / 86400000))
      totalLeadTime += d
      leadTimeCount++
    }
    const avgLeadTime = leadTimeCount > 0 ? (totalLeadTime / leadTimeCount).toFixed(1) : 'N/A'

    return {
      delivered, activeProtocols, lowStock, supplementCount,
      lastMonthSpend, last90DaysSpend, totalSpend,
      compliancePct, avgLeadTime
    }
  }, [protocols, orders, stockpile, supplements, suppDone])

  const complianceData = useMemo(() => {
    const days = [...Array(30)].map((_, i) => new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10))
    let totalPlanned = 0, totalDone = 0
    const dailyStats = days.map(day => {
      const weekday = new Date(day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      let dayPlanned = 0, dayDone = 0
      for (const s of (supplements || [])) {
        if (!s.days?.includes(weekday)) continue
        if (s.schedule === 'AM') { dayPlanned += 1; if (suppDone?.[day]?.[`${s.id}_AM`]) dayDone += 1 }
        else if (s.schedule === 'PM') { dayPlanned += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) dayDone += 1 }
        else if (s.schedule === 'BOTH') { dayPlanned += 2; if (suppDone?.[day]?.[`${s.id}_AM`]) dayDone += 1; if (suppDone?.[day]?.[`${s.id}_PM`]) dayDone += 1 }
      }
      totalPlanned += dayPlanned
      totalDone += dayDone
      return { date: day, planned: dayPlanned, done: dayDone, completed: dayPlanned === 0 || dayDone === dayPlanned }
    })
    const compliancePct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0
    let streak = 0
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].completed) streak++
      else break
    }
    return { compliancePct, streak, hasData: totalPlanned > 0, dailyStats }
  }, [supplements, suppDone])

  const protocolHistoryStats = useMemo(() => {
    const ended = (protocolHistory || []).filter(h => h.endDate && !h.isMock)
    const thisMonthKey = new Date().toISOString().slice(0, 7)
    const thisMonth = ended.filter(h => (h.endDate || '').slice(0, 7) === thisMonthKey).length
    return { thisMonth }
  }, [protocolHistory])

  const getComplianceColor = (pct) => {
    if (pct >= 90) return theme.primary
    if (pct >= 70) return theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706'
    return theme.isDark ? 'rgba(197, 130, 100, 0.9)' : '#b5684a'
  }

  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.04)' : theme.primary + '08'
  const cardBg = theme.isDark ? theme.cardBackground : theme.cardBackground || '#ffffff'
  const borderColor = theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Analytics
            <TrendingUp size={18} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.analytics} theme={theme} />
            {showFullScreenLink && (
              <button
                type="button"
                onClick={() => navigate('/app/dashboard/analytics')}
                className="rounded-full flex items-center justify-center action-button-hover transition-colors"
                style={{
                  color: '#ffffff',
                  backgroundColor: theme.primary,
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  border: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                aria-label="Open full-screen analytics"
              >
                <Maximize2 size={14} strokeWidth={2} style={{ color: '#ffffff' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          theme={theme}
          stretch
          options={[
            { label: 'Consistency', value: 'compliance' },
            { label: 'Spending', value: 'spending' },
            { label: 'Inventory', value: 'inventory' },
            { label: 'Protocols', value: 'protocols' },
          ]}
        />

        <div className="mt-4">
          {activeTab === 'compliance' && <ComplianceTab theme={theme} data={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} />}
          {activeTab === 'spending' && <SpendingTab theme={theme} stats={stats} orders={orders} subtleBg={subtleBg} borderColor={borderColor} onShowBreakdown={() => setShowBreakdownModal(true)} />}
          {activeTab === 'inventory' && <InventoryTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} />}
          {activeTab === 'protocols' && <ProtocolsTab theme={theme} protocolHistory={protocolHistory} protocolHistoryStats={protocolHistoryStats} stats={stats} subtleBg={subtleBg} borderColor={borderColor} />}
        </div>
      </div>

      <SpendingDetailModal
        open={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        theme={theme}
      />
    </div>
  )
}

/* ─────────────────── COMPLIANCE TAB ─────────────────── */
function ComplianceTab({ theme, data, stats, getColor, subtleBg, borderColor }) {
  const last7 = data.dailyStats?.slice(-7) || []

  return (
    <div className="space-y-4">
      {!data.hasData ? (
        <div className="flex flex-col items-center justify-center text-center py-8">
          <CheckCircle size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
          <div className="text-sm font-medium mt-3 mb-1" style={{ color: theme.text }}>No data to track</div>
          <div className="text-xs px-2" style={{ color: theme.textLight }}>Start a protocol or add supplements to track your research consistency</div>
        </div>
      ) : (
        <>
          {/* Hero percentage + streak */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold" style={{ color: getColor(data.compliancePct) }}>
                {data.compliancePct}%
              </div>
              <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>30-day compliance</div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
              <Zap size={14} style={{ color: theme.primary }} />
              <span className="text-sm font-bold" style={{ color: theme.primary }}>{data.streak}</span>
              <span className="text-xs" style={{ color: theme.textLight }}>day streak</span>
            </div>
          </div>

          {/* 7-day dot grid */}
          <div className="rounded-lg p-3" style={{ backgroundColor: subtleBg }}>
            <div className="text-xs font-medium mb-2" style={{ color: theme.textLight }}>Last 7 days</div>
            <div className="flex items-center justify-between">
              {last7.map((day) => {
                const dayDate = new Date(day.date + 'T00:00:00')
                const label = ['S','M','T','W','T','F','S'][dayDate.getDay()]
                const hasTasks = day.planned > 0
                const isComplete = day.completed && hasTasks
                const isPartial = hasTasks && !day.completed && day.done > 0
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>{label}</span>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      backgroundColor: !hasTasks
                        ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                        : isComplete ? theme.primary
                        : isPartial ? (theme.isDark ? 'rgba(217,167,60,0.5)' : '#d9770640')
                        : 'transparent',
                      border: !hasTasks ? 'none'
                        : isComplete ? 'none'
                        : `2px solid ${theme.isDark ? 'rgba(197,130,100,0.6)' : '#b5684a60'}`
                    }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* 30-day bar chart */}
          <SectionCard title="30-Day Trend" theme={theme} borderColor={borderColor}>
            <ComplianceTrend data={data.dailyStats} theme={theme} />
          </SectionCard>
        </>
      )}
    </div>
  )
}

/* ─────────────────── SPENDING TAB ─────────────────── */
function SpendingTab({ theme, stats, orders, subtleBg, borderColor, onShowBreakdown }) {
  return (
    <div className="space-y-4">
      {/* Hero metric */}
      <div className="text-center">
        <div className="text-2xl font-bold mb-0.5" style={{ color: theme.text }}>
          {formatCurrency(stats.lastMonthSpend)}
        </div>
        <div className="text-sm" style={{ color: theme.textLight }}>Last Month</div>
      </div>

      {/* Secondary rows - matching SpendingWidget */}
      <div className="space-y-2">
        <div className="flex justify-between items-center p-2.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
          <span className="text-sm" style={{ color: theme.text }}>Last 90 Days</span>
          <span className="text-sm font-semibold" style={{ color: theme.text }}>{formatCurrency(stats.last90DaysSpend)}</span>
        </div>
        <div className="flex justify-between items-center p-2.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
          <span className="text-sm" style={{ color: theme.text }}>Total Overall</span>
          <span className="text-sm font-semibold" style={{ color: theme.primary }}>{formatCurrency(stats.totalSpend)}</span>
        </div>
        <button
          type="button"
          onClick={onShowBreakdown}
          className="text-xs py-1 rounded text-center w-full transition-opacity"
          style={{ color: theme.isDark ? theme.textLight : theme.primary }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          View breakdown &middot; By vendor &amp; peptide
        </button>
      </div>

      {/* Charts */}
      <SectionCard title="Monthly Spend Trend" theme={theme} borderColor={borderColor}>
        <MonthlySpendChart orders={orders} theme={theme} />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Top Vendors by Spend" theme={theme} borderColor={borderColor}>
          <TopVendors orders={orders} theme={theme} />
        </SectionCard>
        <SectionCard title="Spend by Peptide" theme={theme} borderColor={borderColor}>
          <SpendByPeptide orders={orders} theme={theme} />
        </SectionCard>
      </div>

      <SectionCard title="Average $/mg" theme={theme} borderColor={borderColor}>
        <AvgCostPerMg orders={orders} theme={theme} />
      </SectionCard>

      <SectionCard title="Peptide Cost Trend" theme={theme} borderColor={borderColor}>
        <PeptideCostTrend orders={orders} theme={theme} />
      </SectionCard>
    </div>
  )
}

/* ─────────────────── INVENTORY TAB ─────────────────── */
function InventoryTab({ theme, stats, orders, stockpile, subtleBg, borderColor }) {
  return (
    <div className="space-y-4">
      {/* Hero stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={<Truck size={16} style={{ color: theme.primary }} />} label="Avg. Delivery" value={stats.avgLeadTime !== 'N/A' ? `${stats.avgLeadTime}d` : 'N/A'} theme={theme} subtleBg={subtleBg} />
        <MetricCard icon={<Archive size={16} className="text-red-400" />} label="Low Stock" value={stats.lowStock} theme={theme} subtleBg={subtleBg} />
        <MetricCard icon={<Package size={16} style={{ color: theme.primary }} />} label="Delivered" value={stats.delivered} theme={theme} subtleBg={subtleBg} />
        <MetricCard icon={<FlaskConical size={16} style={{ color: theme.primary }} />} label="Supplements" value={stats.supplementCount} theme={theme} subtleBg={subtleBg} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Delivery Lead-time (days)" theme={theme} borderColor={borderColor}>
          <LeadtimeHistogram orders={orders} theme={theme} />
        </SectionCard>
        <SectionCard title="Vendor Lead-time & On-time" theme={theme} borderColor={borderColor}>
          <VendorLeadtimeOnTime orders={orders} theme={theme} />
        </SectionCard>
      </div>

      <SectionCard title="Low Stock Items" theme={theme} borderColor={borderColor}>
        <LowStockList stockpile={stockpile} theme={theme} />
      </SectionCard>
    </div>
  )
}

/* ─────────────────── PROTOCOLS TAB ─────────────────── */
function ProtocolsTab({ theme, protocolHistory, protocolHistoryStats, stats, subtleBg, borderColor }) {
  const totalCompleted = (protocolHistory || []).filter(h => h.endDate && !h.isMock).length
  const allTime = (protocolHistory || []).filter(h => !h.isMock).length

  return (
    <div className="space-y-4">
      {/* Hero stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard icon={<FlaskConical size={16} className="text-indigo-400" />} label="Total Completed" value={totalCompleted} theme={theme} subtleBg={subtleBg} />
        <MetricCard icon={<Clock size={16} style={{ color: theme.primary }} />} label="This Month" value={protocolHistoryStats.thisMonth} theme={theme} subtleBg={subtleBg} />
        <MetricCard icon={<CheckCircle size={16} className="text-green-400" />} label="Active Now" value={stats.activeProtocols} theme={theme} subtleBg={subtleBg} />
        <MetricCard icon={<TrendingUp size={16} style={{ color: theme.primary }} />} label="All-Time" value={allTime} theme={theme} subtleBg={subtleBg} />
      </div>

      <SectionCard title="Completed by Month" theme={theme} borderColor={borderColor}>
        <ProtocolsCompletedByMonth protocolHistory={protocolHistory} theme={theme} />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Completion Status" theme={theme} borderColor={borderColor}>
          <ProtocolCompletionStatus protocolHistory={protocolHistory} theme={theme} />
        </SectionCard>
        <SectionCard title="Avg Duration (days)" theme={theme} borderColor={borderColor}>
          <ProtocolDurationTrend protocolHistory={protocolHistory} theme={theme} />
        </SectionCard>
      </div>
    </div>
  )
}

/* ─────────────────── SHARED UI COMPONENTS ─────────────────── */

function MetricCard({ icon, label, value, theme, subtleBg }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ backgroundColor: subtleBg }}>
      {icon && <div>{icon}</div>}
      <div>
        <div className="text-xs" style={{ color: theme.textLight }}>{label}</div>
        <div className="text-lg font-bold" style={{ color: theme.text }}>{value}</div>
      </div>
    </div>
  )
}

function SectionCard({ title, children, theme, borderColor, className = '' }) {
  return (
    <div className={`p-3 rounded-lg border ${className}`} style={{ borderColor, backgroundColor: theme.isDark ? theme.cardBackground : '#ffffff' }}>
      <h4 className="text-xs font-semibold mb-2.5 uppercase tracking-wide" style={{ color: theme.textLight }}>{title}</h4>
      {children}
    </div>
  )
}

/* ─────────────────── CHART COMPONENTS ─────────────────── */

function ComplianceTrend({ data, theme }) {
  if (!data || data.length === 0) return <div className="text-xs py-2" style={{ color: theme.textLight }}>No data</div>
  return (
    <div className="h-28">
      <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none" className="rounded">
        {data.map((day, i) => {
          const pct = day.planned > 0 ? Math.round((day.done / day.planned) * 100) : 0
          const x = 2 + i * (296 / 30)
          const h = Math.max(1, (pct / 100) * 90)
          const color = pct >= 90 ? theme.primary
            : pct >= 70 ? (theme.isDark ? 'rgba(217,167,60,0.7)' : '#d97706')
            : pct > 0 ? (theme.isDark ? 'rgba(197,130,100,0.7)' : '#b5684a')
            : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
          return <rect key={i} x={x} y={95 - h} width={Math.max(4, 296 / 30 - 2)} height={h} rx="2" fill={color} />
        })}
      </svg>
    </div>
  )
}

function MonthlySpendChart({ orders, theme }) {
  const data = useMemo(() => {
    const map = orders.reduce((acc, o) => {
      const key = (o.date || '').slice(0, 7)
      let val = 0
      if (o.items && o.items.length > 0) {
        val = o.items.reduce((s, item) => s + ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)), 0)
      } else {
        val = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0
      }
      if (!key) return acc
      acc[key] = (acc[key] || 0) + val
      return acc
    }, {})
    return Object.keys(map).sort().slice(-12).map(k => ({ x: k, y: map[k] }))
  }, [orders])
  if (data.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No order data yet</div>
  const maxY = Math.max(...data.map(d => d.y)) || 1
  return (
    <div>
      <div className="h-32">
        <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="none" className="rounded">
          {data.map((d, i) => {
            const barW = Math.max(8, 360 / data.length - 4)
            const x = 20 + i * (360 / data.length)
            const h = Math.max(2, (d.y / maxY) * 110)
            return <rect key={d.x} x={x} y={120 - h} width={barW} height={h} rx="3" fill={theme.primary} opacity="0.85" />
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-1 px-1">
        {data.length <= 6 ? data.map(d => (
          <span key={d.x} className="text-[9px]" style={{ color: theme.textLight }}>{d.x.slice(5)}</span>
        )) : (
          <>
            <span className="text-[9px]" style={{ color: theme.textLight }}>{data[0].x.slice(5)}</span>
            <span className="text-[9px]" style={{ color: theme.textLight }}>{data[data.length - 1].x.slice(5)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function TopVendors({ orders, theme }) {
  const rows = useMemo(() => {
    const spend = orders.reduce((acc, o) => {
      const k = o.vendor || o.vendorName || 'Unknown'
      let val = 0
      if (o.items && o.items.length > 0) {
        val = o.items.reduce((s, item) => s + ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)), 0)
      } else {
        val = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0
      }
      acc[k] = (acc[k] || 0) + val
      return acc
    }, {})
    return Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No data</div>
  const max = Math.max(...rows.map(r => r[1])) || 1
  return (
    <div className="space-y-2">
      {rows.map(([name, val]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="truncate pr-2" style={{ color: theme.text }}>{name}</span>
            <span className="font-medium" style={{ color: theme.textLight }}>{formatCurrency(val)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(val / max) * 100}%`, backgroundColor: theme.primary }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function SpendByPeptide({ orders, theme }) {
  const rows = useMemo(() => {
    const spend = orders.reduce((acc, o) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          const k = item.name || 'Unknown'
          const val = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
          acc[k] = (acc[k] || 0) + val
        })
      } else {
        const k = o.peptide || 'Unknown'
        acc[k] = (acc[k] || 0) + (Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0)
      }
      return acc
    }, {})
    return Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No data</div>
  const max = Math.max(...rows.map(r => r[1])) || 1
  return (
    <div className="space-y-2">
      {rows.map(([name, val]) => (
        <div key={name}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="truncate pr-2" style={{ color: theme.text }}>{name}</span>
            <span className="font-medium" style={{ color: theme.textLight }}>{formatCurrency(val)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(val / max) * 100}%`, backgroundColor: theme.primary }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AvgCostPerMg({ orders, theme }) {
  const rows = useMemo(() => {
    const agg = orders.reduce((acc, o) => {
      const k = o.peptide || 'Unknown'
      const mg = Number(String(o.mg).replace(/[^0-9.]/g, '')) || 0
      const cost = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0
      if (!acc[k]) acc[k] = { mg: 0, cost: 0 }
      acc[k].mg += mg
      acc[k].cost += cost
      return acc
    }, {})
    return Object.entries(agg)
      .filter(([, v]) => v.mg > 0)
      .map(([name, v]) => ({ name, rate: v.cost / v.mg }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No data</div>
  const max = Math.max(...rows.map(r => r.rate)) || 1
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.name}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="truncate pr-2" style={{ color: theme.text }}>{r.name}</span>
            <span className="font-medium" style={{ color: theme.textLight }}>{formatCurrency(r.rate)}/mg</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(r.rate / max) * 100}%`, backgroundColor: theme.primary }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PeptideCostTrend({ orders, theme }) {
  const peptides = useMemo(() => Array.from(new Set((orders || []).map(o => o.peptide).filter(Boolean))).sort(), [orders])
  const [sel, setSel] = useState(() => peptides[0] || '')
  const data = useMemo(() => {
    const map = orders.filter(o => (o.peptide || '') === sel).reduce((acc, o) => {
      const key = (o.date || '').slice(0, 7)
      const mg = Number(String(o.mg).replace(/[^0-9.]/g, '')) || 0
      const cost = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0
      if (!key) return acc
      if (!acc[key]) acc[key] = { mg: 0, cost: 0 }
      acc[key].mg += mg
      acc[key].cost += cost
      return acc
    }, {})
    return Object.keys(map).sort().map(k => ({ x: k, rate: map[k].mg > 0 ? map[k].cost / map[k].mg : 0 }))
  }, [orders, sel])
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs font-medium" style={{ color: theme.textLight }}>Peptide:</label>
        <select
          className="py-1.5 px-2 rounded-md border text-xs"
          value={sel}
          onChange={e => setSel(e.target.value)}
          style={{ borderColor: theme.border, backgroundColor: theme.isDark ? theme.secondary : '#ffffff', color: theme.text }}
        >
          <option value="">Select</option>
          {peptides.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      {(!data || data.length === 0) ? (
        <div className="text-xs py-6 text-center" style={{ color: theme.textLight }}>No data for selected peptide</div>
      ) : (
        <div className="h-32">
          <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="none" className="rounded">
            {data.map((d, i) => {
              const x = 20 + i * (360 / Math.max(1, data.length - 1))
              const maxR = Math.max(...data.map(a => a.rate), 1)
              const y = 120 - (d.rate / maxR) * 110
              const nx = i === data.length - 1 ? x : 20 + (i + 1) * (360 / Math.max(1, data.length - 1))
              const ny = i === data.length - 1 ? y : 120 - (data[i + 1].rate / maxR) * 110
              return i < data.length - 1 ? <line key={i} x1={x} y1={y} x2={nx} y2={ny} stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" /> : null
            })}
            {data.map((d, i) => {
              const x = 20 + i * (360 / Math.max(1, data.length - 1))
              const maxR = Math.max(...data.map(a => a.rate), 1)
              const y = 120 - (d.rate / maxR) * 110
              return <circle key={`dot-${i}`} cx={x} cy={y} r="3" fill={theme.primary} />
            })}
          </svg>
        </div>
      )}
    </div>
  )
}

function LeadtimeHistogram({ orders, theme }) {
  const buckets = useMemo(() => {
    const out = { '0-3': 0, '4-7': 0, '8-14': 0, '15+': 0 }
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
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className="w-10 text-right font-medium" style={{ color: theme.textLight }}>{k}d</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-2 rounded-full" style={{ width: `${(v / max) * 100}%`, backgroundColor: theme.primary }} />
          </div>
          <span className="w-6 text-right font-medium" style={{ color: theme.text }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function VendorLeadtimeOnTime({ orders, theme }) {
  const rows = useMemo(() => {
    const map = new Map()
    for (const o of (orders || [])) {
      const vendor = o.vendor || o.vendorName || 'Unknown'
      const shipped = o.shipDate ? new Date(o.shipDate) : null
      const delivered = o.deliveryDate ? new Date(o.deliveryDate) : null
      const lead = (shipped && delivered) ? Math.max(0, Math.round((delivered - shipped) / 86400000)) : null
      const arr = map.get(vendor) || []
      if (lead != null) arr.push(lead)
      map.set(vendor, arr)
    }
    return Array.from(map.entries()).map(([vendor, leads]) => {
      if (leads.length === 0) return { vendor, avg: null, ontime: null }
      const avg = leads.reduce((a, b) => a + b, 0) / leads.length
      const ontime = leads.filter(d => d <= 7).length / leads.length
      return { vendor, avg, ontime }
    }).sort((a, b) => (a.avg ?? 1e9) - (b.avg ?? 1e9)).slice(0, 5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No data</div>
  return (
    <ul className="space-y-2">
      {rows.map(r => (
        <li key={r.vendor} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.primary + '08' }}>
          <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{r.vendor}</span>
          <span style={{ color: theme.textLight }}>
            {r.avg != null ? `${r.avg.toFixed(1)}d` : '—'} &middot; {r.ontime != null ? `${Math.round(r.ontime * 100)}%` : '—'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LowStockList({ stockpile, theme }) {
  const lows = useMemo(() => (stockpile || []).filter(s => Number(s.quantity) <= Number(s.minQty || 1)).slice(0, 5), [stockpile])
  if (lows.length === 0) return (
    <div className="text-xs flex items-center gap-2 py-1" style={{ color: theme.textLight }}>
      <CheckCircle size={14} className="text-green-400" /> No low stock items
    </div>
  )
  return (
    <ul className="space-y-2">
      {lows.map(s => (
        <li key={s.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs font-medium" style={{ color: theme.text }}>{s.name} {s.mg ? `(${s.mg} mg)` : ''}</span>
          </div>
          <span className="text-xs font-semibold text-red-500">{s.quantity} left</span>
        </li>
      ))}
    </ul>
  )
}

/* ─────────────────── PROTOCOL CHARTS ─────────────────── */

function ProtocolsCompletedByMonth({ protocolHistory, theme }) {
  const data = useMemo(() => {
    const map = (protocolHistory || [])
      .filter(h => h.endDate && !h.isMock)
      .reduce((acc, h) => {
        const key = (h.endDate || '').slice(0, 7)
        if (!key) return acc
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})
    return Object.keys(map).sort().slice(-12).map(k => ({ x: k, y: map[k] }))
  }, [protocolHistory])
  if (data.length === 0) return <div className="text-xs py-4" style={{ color: theme.textLight }}>No completed protocols yet. Finish a protocol to see trends.</div>
  const maxY = Math.max(...data.map(d => d.y), 1)
  return (
    <div>
      <div className="h-32">
        <svg width="100%" height="100%" viewBox="0 0 400 130" preserveAspectRatio="none" className="rounded">
          {data.map((d, i) => {
            const barW = Math.max(8, 360 / data.length - 4)
            const x = 20 + i * (360 / data.length)
            const h = Math.max(2, (d.y / maxY) * 110)
            return <rect key={d.x} x={x} y={120 - h} width={barW} height={h} rx="3" fill={theme.primary} opacity="0.85" />
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-1 px-1">
        {data.length <= 6 ? data.map(d => (
          <span key={d.x} className="text-[9px]" style={{ color: theme.textLight }}>{d.x.slice(5)}</span>
        )) : (
          <>
            <span className="text-[9px]" style={{ color: theme.textLight }}>{data[0].x.slice(5)}</span>
            <span className="text-[9px]" style={{ color: theme.textLight }}>{data[data.length - 1].x.slice(5)}</span>
          </>
        )}
      </div>
    </div>
  )
}

function ProtocolCompletionStatus({ protocolHistory, theme }) {
  const rows = useMemo(() => {
    const ended = (protocolHistory || []).filter(h => h.endDate && !h.isMock)
    const statusCounts = ended.reduce((acc, h) => {
      const s = h.completionStatus || h.endType || 'completed'
      const label = s === 'completed' ? 'Completed' : s === 'stopped' || s === 'manual' ? 'Stopped early' : s === 'rescheduled' ? 'Rescheduled' : String(s)
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {})
    return Object.entries(statusCounts).sort((a, b) => b[1] - a[1])
  }, [protocolHistory])
  if (rows.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No completed protocols yet.</div>
  const max = Math.max(...rows.map(r => r[1]), 1)
  return (
    <div className="space-y-2">
      {rows.map(([label, count]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span className="truncate pr-2" style={{ color: theme.text }}>{label}</span>
            <span className="font-medium" style={{ color: theme.textLight }}>{count}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: theme.primary }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProtocolDurationTrend({ protocolHistory, theme }) {
  const data = useMemo(() => {
    const ended = (protocolHistory || []).filter(h => h.endDate && h.startDate && !h.isMock)
    const byMonth = ended.reduce((acc, h) => {
      const key = (h.endDate || '').slice(0, 7)
      if (!key) return acc
      const days = Math.round((new Date(h.endDate).getTime() - new Date(h.startDate).getTime()) / 86400000)
      if (!acc[key]) acc[key] = []
      acc[key].push(days)
      return acc
    }, {})
    return Object.keys(byMonth).sort().slice(-6).map(k => ({
      x: k,
      avg: byMonth[k].length ? Math.round(byMonth[k].reduce((a, b) => a + b, 0) / byMonth[k].length) : 0
    }))
  }, [protocolHistory])
  if (data.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>Complete protocols to see duration trends.</div>
  const maxVal = Math.max(...data.map(d => d.avg), 1)
  return (
    <div>
      <div className="h-28">
        <svg width="100%" height="100%" viewBox="0 0 400 110" preserveAspectRatio="none" className="rounded">
          {data.map((d, i) => {
            const barW = Math.max(12, 360 / data.length - 6)
            const x = 20 + i * (360 / data.length)
            const h = Math.max(2, (d.avg / maxVal) * 90)
            return (
              <g key={d.x}>
                <rect x={x} y={100 - h} width={barW} height={h} rx="3" fill={theme.primary} opacity="0.85" />
                <text x={x + barW / 2} y={100 - h - 4} textAnchor="middle" fontSize="9" fill={theme.textLight}>{d.avg}d</text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-1 px-1">
        {data.map(d => <span key={d.x} className="text-[9px]" style={{ color: theme.textLight }}>{d.x.slice(5)}</span>)}
      </div>
    </div>
  )
}
