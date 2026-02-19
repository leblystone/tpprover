import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, DollarSign, Truck, Archive, AlertTriangle, FlaskConical, Maximize2, Zap, Eye, TrendingUp, Clock, Package, Activity } from 'lucide-react'
import { getHalfLifeInHours, buildDecayCurve, getClearanceTimeHours, formatHalfLifeTime } from '../../utils/halfLife'
import { formatCurrency } from '../../utils/currencyUtils'
import { calculateScheduledTasksForDate } from '../../utils/calendarTasks'
import { getTaskCompletion, generateTaskId } from '../../utils/taskCompletion'
import { toKey } from '../calendar/MonthGrid'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'
import SpendingDetailModal from '../dashboard/SpendingDetailModal'

function useLocal(key, fallback) {
  const [state, setState] = useState(fallback)
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setState(JSON.parse(raw)) } catch {} }, [key])
  return state
}

export default function AnalyticsDashboard({ theme, defaultTab, showFullScreenLink = false, fullPage = false }) {
  const navigate = useNavigate()
  const protocols = useLocal('tpprover_protocols', [])
  const orders = useLocal('tpprover_orders', [])
  const stockpile = useLocal('tpprover_stockpile', [])
  const supplements = useLocal('tpprover_supplements', [])
  const reconItems = useLocal('tpprover_recon_items', [])
  const protocolHistory = useLocal('tpprover_protocol_history', [])
  const goals = useLocal('tpprover_goals', [])
  const [taskCompletion, setTaskCompletion] = useState(() => getTaskCompletion())
  const [activeTab, setActiveTab] = useState(defaultTab || 'compliance')
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)

  useEffect(() => {
    const refresh = () => setTaskCompletion(getTaskCompletion())
    window.addEventListener('tpp:task-completion-changed', refresh)
    const interval = setInterval(refresh, 5000)
    return () => { window.removeEventListener('tpp:task-completion-changed', refresh); clearInterval(interval) }
  }, [])

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

    let planned = 0, done = 0
    for (let i = 6; i >= 0; i--) {
      const d7 = new Date(); d7.setDate(d7.getDate() - i)
      const dk = toKey(d7)
      const sched = calculateScheduledTasksForDate(d7, protocols, supplements, reconItems)
      Object.keys(sched.bySlot || {}).forEach(slot => {
        const sl = sched.bySlot[slot]
        ;(sl.peptides || []).forEach(pep => {
          const tid = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: slot, protocolId: pep.protocolId, peptideId: pep.peptideId })
          planned++
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) done++
        })
        ;(sl.supplements || []).forEach(supp => {
          const tid = generateTaskId({ type: 'supplement', name: supp.name || 'Supplement', dose: supp.dose || '', unit: supp.unit || '', time: slot })
          planned++
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) done++
        })
      })
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
  }, [protocols, orders, stockpile, supplements, reconItems, taskCompletion])

  const complianceData = useMemo(() => {
    const days = [...Array(30)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      return d
    })

    let totalPlanned = 0, totalDone = 0
    const dailyStats = []

    for (const day of days) {
      const dateKey = toKey(day)
      const scheduledData = calculateScheduledTasksForDate(day, protocols, supplements, reconItems)

      let dayPlanned = 0, dayDone = 0

      Object.keys(scheduledData.bySlot || {}).forEach(timeSlot => {
        const slot = scheduledData.bySlot[timeSlot]

        if (slot.peptides && Array.isArray(slot.peptides)) {
          slot.peptides.forEach(pep => {
            const taskId = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: timeSlot, protocolId: pep.protocolId, peptideId: pep.peptideId })
            dayPlanned++
            const td = taskCompletion[dateKey]?.[timeSlot]?.[taskId]
            if (td === true || (td && typeof td === 'object' && td.completed)) dayDone++
          })
        }

        if (slot.supplements && Array.isArray(slot.supplements)) {
          slot.supplements.forEach(supp => {
            const taskId = generateTaskId({ type: 'supplement', name: supp.name || 'Supplement', dose: supp.dose || '', unit: supp.unit || '', time: timeSlot })
            dayPlanned++
            const td = taskCompletion[dateKey]?.[timeSlot]?.[taskId]
            if (td === true || (td && typeof td === 'object' && td.completed)) dayDone++
          })
        }
      })

      totalPlanned += dayPlanned
      totalDone += dayDone
      dailyStats.push({ date: dateKey, planned: dayPlanned, done: dayDone, completed: dayPlanned === 0 || dayDone === dayPlanned })
    }

    const compliancePct = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : 0
    let streak = 0
    for (let i = dailyStats.length - 1; i >= 0; i--) {
      if (dailyStats[i].completed) streak++
      else break
    }
    return { compliancePct, streak, hasData: totalPlanned > 0, dailyStats }
  }, [protocols, supplements, reconItems, taskCompletion])

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

  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
  const borderColor = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  return (
    <div className={fullPage ? '' : 'h-full flex flex-col'}>
      {/* Widget header (hidden in full page mode - page handles its own header) */}
      {!fullPage && (
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
      )}

      <div className={fullPage ? '' : 'flex-1 overflow-y-auto px-4 py-3'}>
        {/* Toggle tabs */}
        <ToggleTabs
          value={activeTab}
          onChange={setActiveTab}
          theme={theme}
          options={[
            { label: 'Consistency', value: 'compliance' },
            { label: 'Spending', value: 'spending' },
            { label: 'Inventory', value: 'inventory' },
            { label: 'Protocols', value: 'protocols' },
            { label: 'Half-Life', value: 'halflife' },
          ]}
        />

        <div className="mt-4">
          {activeTab === 'compliance' && <ComplianceTab theme={theme} data={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} supplements={supplements} protocols={protocols} goals={goals} />}
          {activeTab === 'spending' && <SpendingTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} onShowBreakdown={() => setShowBreakdownModal(true)} />}
          {activeTab === 'inventory' && <InventoryTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} />}
          {activeTab === 'protocols' && <ProtocolsTab theme={theme} protocolHistory={protocolHistory} protocolHistoryStats={protocolHistoryStats} stats={stats} protocols={protocols} subtleBg={subtleBg} borderColor={borderColor} />}
          {activeTab === 'halflife' && <HalfLifeTab theme={theme} protocols={protocols} subtleBg={subtleBg} borderColor={borderColor} />}
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
function ComplianceTab({ theme, data, stats, getColor, subtleBg, borderColor, supplements, protocols, goals }) {
  const last7 = data.dailyStats?.slice(-7) || []
  const last14 = data.dailyStats?.slice(-14) || []

  const extra = useMemo(() => {
    const ds = data.dailyStats || []
    const withTasks = ds.filter(d => d.planned > 0)
    const perfectDays = withTasks.filter(d => d.completed).length
    const missedDays = withTasks.filter(d => d.done === 0).length
    const partialDays = withTasks.filter(d => d.done > 0 && !d.completed).length
    const totalTasks = ds.reduce((s, d) => s + d.planned, 0)
    const totalDone = ds.reduce((s, d) => s + d.done, 0)
    const avgPerDay = withTasks.length > 0 ? (totalTasks / withTasks.length).toFixed(1) : '0'

    const bestDay = withTasks.length > 0
      ? withTasks.reduce((best, d) => {
          const pct = d.planned > 0 ? d.done / d.planned : 0
          return pct > (best.planned > 0 ? best.done / best.planned : 0) ? d : best
        }, withTasks[0])
      : null
    const bestDayLabel = bestDay ? new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'

    const byWeekday = {}
    for (const d of ds) {
      const wd = new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
      if (!byWeekday[wd]) byWeekday[wd] = { planned: 0, done: 0 }
      byWeekday[wd].planned += d.planned
      byWeekday[wd].done += d.done
    }
    const weekdayPcts = Object.entries(byWeekday)
      .filter(([, v]) => v.planned > 0)
      .map(([day, v]) => ({ day, pct: Math.round((v.done / v.planned) * 100) }))
      .sort((a, b) => b.pct - a.pct)

    const suppCount = (supplements || []).length
    const activeProtocols = (protocols || []).filter(p => p.active !== false).length
    const goalsCompleted = (goals || []).filter(g => g.completed).length
    const goalsTotal = (goals || []).length

    const first14 = data.dailyStats?.slice(0, 14) || []
    const second14 = data.dailyStats?.slice(14) || []
    const pct1 = first14.filter(d => d.planned > 0).length > 0
      ? Math.round(first14.reduce((s, d) => s + d.done, 0) / Math.max(1, first14.reduce((s, d) => s + d.planned, 0)) * 100) : null
    const pct2 = second14.filter(d => d.planned > 0).length > 0
      ? Math.round(second14.reduce((s, d) => s + d.done, 0) / Math.max(1, second14.reduce((s, d) => s + d.planned, 0)) * 100) : null
    const trendDir = pct1 !== null && pct2 !== null ? (pct2 >= pct1 ? 'up' : 'down') : null
    const trendDiff = pct1 !== null && pct2 !== null ? Math.abs(pct2 - pct1) : 0

    return { perfectDays, missedDays, partialDays, totalTasks, totalDone, avgPerDay, bestDayLabel, weekdayPcts, suppCount, activeProtocols, goalsCompleted, goalsTotal, trendDir, trendDiff }
  }, [data, supplements, protocols, goals])

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
          {/* Hero row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold" style={{ color: getColor(data.compliancePct) }}>{data.compliancePct}%</div>
              <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                30-day compliance
                {extra.trendDir && <span style={{ color: extra.trendDir === 'up' ? theme.primary : '#d97706' }}> ({extra.trendDir === 'up' ? '+' : '-'}{extra.trendDiff}% vs prev)</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
              <Zap size={14} style={{ color: theme.primary }} />
              <span className="text-sm font-bold" style={{ color: theme.primary }}>{data.streak}</span>
              <span className="text-xs" style={{ color: theme.textLight }}>day streak</span>
            </div>
          </div>

          {/* 30-day summary row */}
          <div className="grid grid-cols-4 gap-2">
            <MetricCard label="Perfect Days" value={extra.perfectDays} theme={theme} />
            <MetricCard label="Partial" value={extra.partialDays} theme={theme} />
            <MetricCard label="Missed" value={extra.missedDays} theme={theme} />
            <MetricCard label="Avg/Day" value={extra.avgPerDay} theme={theme} />
          </div>

          {/* 7-day dot grid */}
          <div className="rounded-xl p-3" style={{ backgroundColor: subtleBg }}>
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
                      backgroundColor: !hasTasks ? (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                        : isComplete ? theme.primary : isPartial ? (theme.isDark ? 'rgba(217,167,60,0.5)' : '#d9770640') : 'transparent',
                      border: !hasTasks ? 'none' : isComplete ? 'none' : `2px solid ${theme.isDark ? 'rgba(197,130,100,0.6)' : '#b5684a60'}`
                    }} />
                    {hasTasks && <span className="text-[8px]" style={{ color: theme.textLight }}>{day.done}/{day.planned}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 30-day bar chart */}
          <SectionCard title="30-Day Trend" theme={theme} borderColor={borderColor}>
            <ComplianceTrend data={data.dailyStats} theme={theme} />
          </SectionCard>

          {/* Compliance by weekday */}
          {extra.weekdayPcts.length > 0 && (
            <SectionCard title="Compliance by Day of Week" theme={theme} borderColor={borderColor}>
              <div className="space-y-1.5">
                {extra.weekdayPcts.map(({ day, pct }) => (
                  <div key={day} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-right font-medium" style={{ color: theme.textLight }}>{day}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: getColor(pct) }} />
                    </div>
                    <span className="w-8 text-right font-medium" style={{ color: getColor(pct) }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Research snapshot */}
          <SectionCard title="Research Snapshot" theme={theme} borderColor={borderColor}>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: subtleBg }}>
                <span style={{ color: theme.textLight }}>Supplements</span>
                <span className="font-semibold" style={{ color: theme.text }}>{extra.suppCount}</span>
              </div>
              <div className="flex justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: subtleBg }}>
                <span style={{ color: theme.textLight }}>Active Protocols</span>
                <span className="font-semibold" style={{ color: theme.text }}>{extra.activeProtocols}</span>
              </div>
              <div className="flex justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: subtleBg }}>
                <span style={{ color: theme.textLight }}>Best Day</span>
                <span className="font-semibold" style={{ color: theme.text }}>{extra.bestDayLabel}</span>
              </div>
              <div className="flex justify-between text-xs p-2 rounded-lg" style={{ backgroundColor: subtleBg }}>
                <span style={{ color: theme.textLight }}>Goals</span>
                <span className="font-semibold" style={{ color: theme.text }}>{extra.goalsCompleted}/{extra.goalsTotal}</span>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  )
}

/* ─────────────────── SPENDING TAB ─────────────────── */
function SpendingTab({ theme, stats, orders, stockpile, subtleBg, borderColor, onShowBreakdown }) {
  const extra = useMemo(() => {
    const now = new Date()
    const thisMonthKey = now.toISOString().slice(0, 7)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    let thisMonthSpend = 0
    orders.forEach(o => {
      let cost = 0
      if (o.items && o.items.length > 0) cost = o.items.reduce((s, item) => s + ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)), 0)
      else cost = parseFloat(String(o.cost).replace(/[^0-9.]/g, '')) || 0
      const d = o.date ? new Date(o.date) : null
      if (d && d >= thisMonthStart) thisMonthSpend += cost
    })

    const totalOrders = orders.length
    const avgOrderCost = totalOrders > 0 ? stats.totalSpend / totalOrders : 0
    const uniqueVendors = new Set(orders.map(o => o.vendor || o.vendorName).filter(Boolean)).size
    const uniquePeptides = new Set()
    orders.forEach(o => {
      if (o.items && o.items.length > 0) o.items.forEach(item => { if (item.name) uniquePeptides.add(item.name) })
      else if (o.peptide) uniquePeptides.add(o.peptide)
    })

    const stockpileValue = (stockpile || []).reduce((s, item) => s + ((parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0)), 0)

    return { thisMonthSpend, totalOrders, avgOrderCost, uniqueVendors, uniquePeptides: uniquePeptides.size, stockpileValue }
  }, [orders, stats, stockpile])

  return (
    <div className="space-y-4">
      {/* Hero metrics grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2.5 rounded-xl" style={{ backgroundColor: '#6B7F77', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="text-lg font-bold text-white">{formatCurrency(extra.thisMonthSpend)}</div>
          <div className="text-[10px] text-white/80">This Month</div>
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{ backgroundColor: '#566D64', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="text-lg font-bold text-white">{formatCurrency(stats.lastMonthSpend)}</div>
          <div className="text-[10px] text-white/80">Last Month</div>
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{ backgroundColor: '#445952', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="text-lg font-bold text-white">{formatCurrency(stats.totalSpend)}</div>
          <div className="text-[10px] text-white/80">All-Time</div>
        </div>
      </div>

      {/* Secondary summary */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard icon={<DollarSign size={14} style={{ color: theme.primary }} />} label="Last 90 Days" value={formatCurrency(stats.last90DaysSpend)} theme={theme} />
        <MetricCard icon={<DollarSign size={14} style={{ color: theme.primary }} />} label="Avg / Order" value={formatCurrency(extra.avgOrderCost)} theme={theme} />
        <MetricCard label="Total Orders" value={extra.totalOrders} theme={theme} />
        <MetricCard label="Vendors Used" value={extra.uniqueVendors} theme={theme} />
        <MetricCard label="Peptides Ordered" value={extra.uniquePeptides} theme={theme} />
        <MetricCard icon={<Archive size={14} style={{ color: theme.primary }} />} label="Stockpile Value" value={formatCurrency(extra.stockpileValue)} theme={theme} />
      </div>

      <button
        type="button"
        onClick={onShowBreakdown}
        className="text-xs py-1.5 rounded text-center w-full transition-opacity font-medium"
        style={{ color: theme.isDark ? theme.textLight : theme.primary }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        View full breakdown &middot; By vendor &amp; peptide
      </button>

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
  const extra = useMemo(() => {
    const totalItems = (stockpile || []).length
    const totalVials = (stockpile || []).reduce((s, item) => s + (parseFloat(item.quantity) || 0), 0)
    const totalValue = (stockpile || []).reduce((s, item) => s + ((parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0)), 0)
    const uniqueNames = new Set((stockpile || []).map(s => s.name).filter(Boolean)).size
    const pendingOrders = orders.filter(o => { const st = (o.status || '').toLowerCase(); return !st.includes('delivered') }).length

    let fastestDelivery = Infinity, slowestDelivery = 0
    for (const o of orders) {
      if (!o.shipDate || !o.deliveryDate) continue
      const d = Math.max(0, Math.round((new Date(o.deliveryDate) - new Date(o.shipDate)) / 86400000))
      fastestDelivery = Math.min(fastestDelivery, d)
      slowestDelivery = Math.max(slowestDelivery, d)
    }

    const byName = {};
    (stockpile || []).forEach(s => {
      const n = s.name || 'Unknown'
      if (!byName[n]) byName[n] = { qty: 0, value: 0 }
      byName[n].qty += (parseFloat(s.quantity) || 0)
      byName[n].value += (parseFloat(s.cost) || 0) * (parseFloat(s.quantity) || 0)
    })
    const topByQty = Object.entries(byName).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5)
    const topByValue = Object.entries(byName).sort((a, b) => b[1].value - a[1].value).slice(0, 5)

    return { totalItems, totalVials, totalValue, uniqueNames, pendingOrders, fastestDelivery: fastestDelivery === Infinity ? null : fastestDelivery, slowestDelivery: slowestDelivery === 0 ? null : slowestDelivery, topByQty, topByValue }
  }, [stockpile, orders])

  return (
    <div className="space-y-4">
      {/* Hero stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Unique Items" value={extra.uniqueNames} theme={theme} />
        <MetricCard label="Total Vials" value={extra.totalVials} theme={theme} />
        <MetricCard icon={<DollarSign size={14} style={{ color: theme.primary }} />} label="Stockpile Value" value={formatCurrency(extra.totalValue)} theme={theme} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard icon={<Truck size={16} style={{ color: theme.primary }} />} label="Avg. Delivery" value={stats.avgLeadTime !== 'N/A' ? `${stats.avgLeadTime}d` : 'N/A'} theme={theme} />
        <MetricCard icon={<Archive size={16} className="text-red-400" />} label="Low Stock" value={stats.lowStock} theme={theme} />
        <MetricCard icon={<Package size={16} style={{ color: theme.primary }} />} label="Delivered" value={stats.delivered} theme={theme} />
        <MetricCard label="In Transit" value={extra.pendingOrders} theme={theme} />
        {extra.fastestDelivery !== null && <MetricCard label="Fastest" value={`${extra.fastestDelivery}d`} theme={theme} />}
        {extra.slowestDelivery !== null && <MetricCard label="Slowest" value={`${extra.slowestDelivery}d`} theme={theme} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Delivery Lead-time (days)" theme={theme} borderColor={borderColor}>
          <LeadtimeHistogram orders={orders} theme={theme} />
        </SectionCard>
        <SectionCard title="Vendor Lead-time & On-time" theme={theme} borderColor={borderColor}>
          <VendorLeadtimeOnTime orders={orders} theme={theme} />
        </SectionCard>
      </div>

      {extra.topByQty.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SectionCard title="Top Items by Quantity" theme={theme} borderColor={borderColor}>
            <div className="space-y-1.5">
              {extra.topByQty.map(([name, v]) => (
                <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
                  <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{name}</span>
                  <span className="font-semibold" style={{ color: theme.textLight }}>{v.qty} vials</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Top Items by Value" theme={theme} borderColor={borderColor}>
            <div className="space-y-1.5">
              {extra.topByValue.map(([name, v]) => (
                <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
                  <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{name}</span>
                  <span className="font-semibold" style={{ color: theme.primary }}>{formatCurrency(v.value)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <SectionCard title="Low Stock Items" theme={theme} borderColor={borderColor}>
        <LowStockList stockpile={stockpile} theme={theme} />
      </SectionCard>
    </div>
  )
}

/* ─────────────────── PROTOCOLS TAB ─────────────────── */
function ProtocolsTab({ theme, protocolHistory, protocolHistoryStats, stats, protocols, subtleBg, borderColor }) {
  const extra = useMemo(() => {
    const ended = (protocolHistory || []).filter(h => h.endDate && !h.isMock)
    const totalCompleted = ended.length
    const allTime = (protocolHistory || []).filter(h => !h.isMock).length

    const durations = ended.filter(h => h.startDate).map(h => Math.round((new Date(h.endDate).getTime() - new Date(h.startDate).getTime()) / 86400000)).filter(d => d > 0)
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
    const longestProtocol = durations.length > 0 ? Math.max(...durations) : null
    const shortestProtocol = durations.length > 0 ? Math.min(...durations) : null

    const uniqueProtocolNames = new Set(ended.map(h => h.protocolName).filter(Boolean)).size

    const peptideFreq = {}
    for (const p of (protocols || [])) {
      if (p.peptides && Array.isArray(p.peptides)) {
        p.peptides.forEach(pep => {
          if (pep.name) peptideFreq[pep.name] = (peptideFreq[pep.name] || 0) + 1
        })
      }
    }
    const topPeptides = Object.entries(peptideFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const deliveryMethods = {}
    for (const p of (protocols || [])) {
      if (p.peptides && Array.isArray(p.peptides)) {
        p.peptides.forEach(pep => {
          const m = pep.deliveryMethod || 'pipette'
          deliveryMethods[m] = (deliveryMethods[m] || 0) + 1
        })
      }
    }
    const deliveryMethodList = Object.entries(deliveryMethods).sort((a, b) => b[1] - a[1])

    const completionRate = ended.length > 0
      ? Math.round(ended.filter(h => (h.completionStatus || h.endType) === 'completed').length / ended.length * 100)
      : null

    const notesCount = ended.reduce((s, h) => s + (Array.isArray(h.notes) ? h.notes.length : 0), 0)

    return { totalCompleted, allTime, avgDuration, longestProtocol, shortestProtocol, uniqueProtocolNames, topPeptides, deliveryMethodList, completionRate, notesCount }
  }, [protocolHistory, protocols])

  const deliveryLabel = { pipette: 'Syringe', pen: 'Pen', nasal: 'Nasal', topical: 'Topical' }

  return (
    <div className="space-y-4">
      {/* Hero stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard icon={<FlaskConical size={14} className="text-indigo-400" />} label="Completed" value={extra.totalCompleted} theme={theme} />
        <MetricCard icon={<Clock size={14} style={{ color: theme.primary }} />} label="This Month" value={protocolHistoryStats.thisMonth} theme={theme} />
        <MetricCard icon={<CheckCircle size={14} className="text-green-400" />} label="Active Now" value={stats.activeProtocols} theme={theme} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="All-Time Entries" value={extra.allTime} theme={theme} />
        <MetricCard label="Unique Protocols" value={extra.uniqueProtocolNames} theme={theme} />
        {extra.avgDuration !== null && <MetricCard label="Avg Duration" value={`${extra.avgDuration}d`} theme={theme} />}
        {extra.completionRate !== null && <MetricCard label="Completion Rate" value={`${extra.completionRate}%`} theme={theme} />}
        {extra.longestProtocol !== null && <MetricCard label="Longest" value={`${extra.longestProtocol}d`} theme={theme} />}
        {extra.shortestProtocol !== null && <MetricCard label="Shortest" value={`${extra.shortestProtocol}d`} theme={theme} />}
        <MetricCard label="Total Notes" value={extra.notesCount} theme={theme} />
      </div>

      <SectionCard title="Completed by Month" theme={theme} borderColor={borderColor}>
        <ProtocolsCompletedByMonth protocolHistory={protocolHistory} theme={theme} />
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SectionCard title="Completion Status" theme={theme} borderColor={borderColor}>
          <ProtocolCompletionStatus protocolHistory={protocolHistory} theme={theme} />
        </SectionCard>
        <SectionCard title="Avg Duration by Month" theme={theme} borderColor={borderColor}>
          <ProtocolDurationTrend protocolHistory={protocolHistory} theme={theme} />
        </SectionCard>
      </div>

      {extra.topPeptides.length > 0 && (
        <SectionCard title="Most Used Peptides (across protocols)" theme={theme} borderColor={borderColor}>
          <div className="space-y-1.5">
            {extra.topPeptides.map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
                <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{name}</span>
                <span className="font-semibold" style={{ color: theme.textLight }}>{count} protocol{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {extra.deliveryMethodList.length > 0 && (
        <SectionCard title="Delivery Methods" theme={theme} borderColor={borderColor}>
          <div className="space-y-1.5">
            {extra.deliveryMethodList.map(([method, count]) => {
              const total = extra.deliveryMethodList.reduce((s, [, c]) => s + c, 0)
              return (
                <div key={method} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-right font-medium" style={{ color: theme.textLight }}>{deliveryLabel[method] || method}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${(count / total) * 100}%`, backgroundColor: theme.primary }} />
                  </div>
                  <span className="w-8 text-right font-medium" style={{ color: theme.text }}>{Math.round((count / total) * 100)}%</span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

/* ─────────────────── HALF-LIFE TAB ─────────────────── */

const DECAY_COLORS = ['#7F9E95', '#c87a5c', '#6B8DD6', '#D4A85C', '#9B7FC4', '#5CA8C8', '#C45C7A', '#5CC88D']

function HalfLifeTab({ theme, protocols, subtleBg, borderColor }) {
  const peptideData = useMemo(() => {
    const items = []
    const active = (protocols || []).filter(p => p.active !== false)
    for (const p of active) {
      if (!p.peptides || !Array.isArray(p.peptides)) continue
      for (const pep of p.peptides) {
        const hlHours = getHalfLifeInHours(pep)
        if (hlHours <= 0) continue
        items.push({
          name: pep.name || 'Unnamed',
          protocolName: p.protocolName || p.name || 'Protocol',
          halfLifeHours: hlHours,
          halfLifeDisplay: pep.halfLife,
          clearanceHours: getClearanceTimeHours(hlHours),
          washout: p.washout,
          duration: p.duration,
        })
      }
    }
    return items
  }, [protocols])

  if (peptideData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10">
        <Activity size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
        <div className="text-sm font-medium mt-3 mb-1" style={{ color: theme.text }}>No half-life data</div>
        <div className="text-xs px-4" style={{ color: theme.textLight }}>
          Add half-life values to your peptides in the protocol editor to see decay visualizations here.
        </div>
      </div>
    )
  }

  const maxClearance = Math.max(...peptideData.map(p => p.clearanceHours))
  const chartHours = maxClearance

  return (
    <div className="space-y-4">
      {/* Decay Curve Chart */}
      <SectionCard title="Decay Curves" theme={theme} borderColor={borderColor}>
        <DecayCurveChart peptides={peptideData} totalHours={chartHours} theme={theme} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
          {peptideData.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DECAY_COLORS[i % DECAY_COLORS.length] }} />
              <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>{p.name}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Compound Cards */}
      <div className="space-y-2">
        {peptideData.map((p, i) => (
          <CompoundCard key={`${p.name}-${i}`} data={p} color={DECAY_COLORS[i % DECAY_COLORS.length]} theme={theme} subtleBg={subtleBg} />
        ))}
      </div>

      {/* Washout vs Clearance Comparison */}
      {peptideData.some(p => p.washout?.enabled) && (
        <SectionCard title="Washout vs Clearance" theme={theme} borderColor={borderColor}>
          <div className="space-y-3">
            {peptideData.filter(p => p.washout?.enabled).map((p, i) => (
              <WashoutComparison key={`${p.name}-${i}`} data={p} color={DECAY_COLORS[i % DECAY_COLORS.length]} theme={theme} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function DecayCurveChart({ peptides, totalHours, theme }) {
  const W = 400, H = 160, PAD_L = 35, PAD_R = 10, PAD_T = 10, PAD_B = 25
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const curves = useMemo(() => {
    return peptides.map((p, idx) => {
      const points = buildDecayCurve(p.halfLifeHours, totalHours, 80)
      const pathPoints = points.map(pt => {
        const x = PAD_L + (pt.hour / totalHours) * chartW
        const y = PAD_T + (1 - pt.level) * chartH
        return `${x},${y}`
      })
      return { path: `M${pathPoints.join(' L')}`, color: DECAY_COLORS[idx % DECAY_COLORS.length] }
    })
  }, [peptides, totalHours, chartW, chartH])

  const yTicks = [0, 25, 50, 75, 100]
  const xTickCount = Math.min(6, Math.max(3, Math.ceil(totalHours / 24)))
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((i / xTickCount) * totalHours))

  return (
    <div className="w-full overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="rounded">
        {/* Grid lines */}
        {yTicks.map(pct => {
          const y = PAD_T + (1 - pct / 100) * chartH
          return (
            <g key={`y-${pct}`}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke={theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="0.5" />
              <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="8" fill={theme.textLight}>{pct}%</text>
            </g>
          )
        })}

        {/* 50% reference line (highlighted) */}
        <line x1={PAD_L} y1={PAD_T + 0.5 * chartH} x2={W - PAD_R} y2={PAD_T + 0.5 * chartH}
          stroke={theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'} strokeWidth="0.75" strokeDasharray="4,3" />

        {/* X-axis ticks */}
        {xTicks.map(h => {
          const x = PAD_L + (h / totalHours) * chartW
          return (
            <text key={`x-${h}`} x={x} y={H - 4} textAnchor="middle" fontSize="8" fill={theme.textLight}>
              {h < 24 ? `${h}h` : `${(h / 24).toFixed(h % 24 === 0 ? 0 : 1)}d`}
            </text>
          )
        })}

        {/* Curve area fills */}
        {curves.map((c, idx) => {
          const points = buildDecayCurve(peptides[idx].halfLifeHours, totalHours, 80)
          const pathPoints = points.map(pt => {
            const x = PAD_L + (pt.hour / totalHours) * chartW
            const y = PAD_T + (1 - pt.level) * chartH
            return `${x},${y}`
          })
          const areaPath = `M${PAD_L},${PAD_T + chartH} L${pathPoints.join(' L')} L${PAD_L + chartW},${PAD_T + chartH} Z`
          return <path key={`area-${idx}`} d={areaPath} fill={c.color} opacity="0.08" />
        })}

        {/* Curve lines */}
        {curves.map((c, idx) => (
          <path key={`line-${idx}`} d={c.path} fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  )
}

function CompoundCard({ data, color, theme, subtleBg }) {
  const hlLabel = data.halfLifeDisplay?.unit === 'days'
    ? `${data.halfLifeDisplay.value} day${data.halfLifeDisplay.value !== '1' ? 's' : ''}`
    : `${data.halfLifeDisplay?.value || '?'} hour${data.halfLifeDisplay?.value !== '1' ? 's' : ''}`

  return (
    <div className="p-3 rounded-xl" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{data.name}</span>
        <span className="text-[10px] ml-auto flex-shrink-0" style={{ color: theme.textLight }}>{data.protocolName}</span>
      </div>

      {/* Gradient decay bar */}
      <div className="h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
        <div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${color} 0%, ${color}60 40%, ${color}15 75%, transparent 100%)`, width: '100%' }} />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: theme.textLight }} />
          <span style={{ color: theme.textLight }}>Half-life:</span>
          <span className="font-semibold" style={{ color: theme.text }}>{hlLabel}</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span style={{ color: theme.textLight }}>~99% clearance:</span>
          <span className="font-semibold" style={{ color: theme.text }}>{formatHalfLifeTime(data.clearanceHours)}</span>
        </div>
      </div>

      {data.washout?.enabled && (
        <div className="flex items-center gap-1 text-[11px] mt-1">
          <span style={{ color: theme.textLight }}>Washout set:</span>
          <span className="font-semibold" style={{ color: theme.text }}>
            {data.washout.count || data.washout.duration || '?'} {data.washout.unit || 'weeks'}
          </span>
        </div>
      )}
    </div>
  )
}

function WashoutComparison({ data, color, theme }) {
  const washoutUnit = String(data.washout?.unit || 'week').toLowerCase()
  const washoutCount = Number(data.washout?.count || data.washout?.duration || 0)
  let washoutHours = 0
  if (washoutUnit.includes('day')) washoutHours = washoutCount * 24
  else if (washoutUnit.includes('week')) washoutHours = washoutCount * 7 * 24
  else if (washoutUnit.includes('month')) washoutHours = washoutCount * 30 * 24

  const clearanceHours = data.clearanceHours
  const maxHours = Math.max(washoutHours, clearanceHours, 1)

  return (
    <div>
      <div className="text-xs font-medium mb-1.5" style={{ color: theme.text }}>{data.name}</div>
      <div className="space-y-1.5">
        {/* Washout bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-16 text-right" style={{ color: theme.textLight }}>Washout</span>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (washoutHours / maxHours) * 100)}%`, backgroundColor: theme.isDark ? 'rgba(200,122,92,0.6)' : '#c87a5c' }} />
          </div>
          <span className="text-[10px] w-10 text-right font-medium" style={{ color: theme.text }}>{formatHalfLifeTime(washoutHours)}</span>
        </div>
        {/* Clearance bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] w-16 text-right" style={{ color: theme.textLight }}>Clearance</span>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (clearanceHours / maxHours) * 100)}%`, backgroundColor: color }} />
          </div>
          <span className="text-[10px] w-10 text-right font-medium" style={{ color: theme.text }}>{formatHalfLifeTime(clearanceHours)}</span>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────── SHARED UI COMPONENTS ─────────────────── */

function ToggleTabs({ value, onChange, options, theme }) {
  return (
    <div
      className="flex gap-2 p-1 w-full overflow-x-auto hide-scrollbar snap-x"
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
      role="tablist"
    >
      {options.map(opt => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-4 py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 focus:outline-none active:scale-95 whitespace-nowrap flex-shrink-0 snap-start"
            style={{
              backgroundColor: isActive ? '#445952' : (theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
              color: isActive ? '#fff' : theme.text,
              border: isActive ? '1px solid #3B4240' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
              boxShadow: isActive
                ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)'
                : 'none',
            }}
            role="tab"
            aria-selected={isActive}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function MetricCard({ icon, label, value, theme, bgColor, textColor }) {
  const isCustomColor = !!bgColor;
  const cardBg = bgColor || (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)');
  const cardBorder = isCustomColor ? 'transparent' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`;
  const cardShadow = isCustomColor ? 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' : 'none';
  const labelColor = isCustomColor ? 'rgba(255,255,255,0.8)' : theme.textLight;
  const valueColor = textColor || (isCustomColor ? '#ffffff' : theme.text);

  let displayIcon = icon;
  if (icon && isCustomColor && React.isValidElement(icon)) {
    const existingStyle = icon.props.style || {};
    displayIcon = React.cloneElement(icon, { style: { ...existingStyle, color: valueColor } });
  }

  return (
    <div
      className="flex items-center gap-2.5 p-3 rounded-xl"
      style={{
        border: cardBorder,
        backgroundColor: cardBg,
        boxShadow: cardShadow,
      }}
    >
      {displayIcon && <div>{displayIcon}</div>}
      <div>
        <div className="text-xs" style={{ color: labelColor }}>{label}</div>
        <div className="text-lg font-bold" style={{ color: valueColor }}>{value}</div>
      </div>
    </div>
  )
}

function SectionCard({ title, children, theme, borderColor, className = '' }) {
  return (
    <div
      className={`p-3.5 rounded-xl ${className}`}
      style={{
        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
      }}
    >
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
    const agg = {}
    for (const o of orders) {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          const k = item.name || 'Unknown'
          const mg = parseFloat(item.mg) || 0
          const cost = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
          if (!agg[k]) agg[k] = { mg: 0, cost: 0 }
          agg[k].mg += mg
          agg[k].cost += cost
        })
      } else {
        const k = o.peptide || 'Unknown'
        const mg = Number(String(o.mg).replace(/[^0-9.]/g, '')) || 0
        const cost = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0
        if (!agg[k]) agg[k] = { mg: 0, cost: 0 }
        agg[k].mg += mg
        agg[k].cost += cost
      }
    }
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
  const peptides = useMemo(() => {
    const names = new Set()
    for (const o of (orders || [])) {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => { if (item.name) names.add(item.name) })
      } else if (o.peptide) {
        names.add(o.peptide)
      }
    }
    return Array.from(names).sort()
  }, [orders])
  const [sel, setSel] = useState(() => peptides[0] || '')
  const data = useMemo(() => {
    const map = {}
    for (const o of orders) {
      const key = (o.date || '').slice(0, 7)
      if (!key) continue
      if (o.items && o.items.length > 0) {
        const match = o.items.find(item => item.name === sel)
        if (!match) continue
        const mg = parseFloat(match.mg) || 0
        const cost = (parseFloat(match.price) || 0) * (parseInt(match.quantity, 10) || 1)
        if (!map[key]) map[key] = { mg: 0, cost: 0 }
        map[key].mg += mg
        map[key].cost += cost
      } else if ((o.peptide || '') === sel) {
        const mg = Number(String(o.mg).replace(/[^0-9.]/g, '')) || 0
        const cost = Number(String(o.cost).replace(/[^0-9.]/g, '')) || 0
        if (!map[key]) map[key] = { mg: 0, cost: 0 }
        map[key].mg += mg
        map[key].cost += cost
      }
    }
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
    const labelMap = {
      'completed': 'Completed',
      'ended_early': 'Ended Early',
      'stopped': 'Stopped Early',
      'manual': 'Manually Ended',
      'rescheduled': 'Rescheduled',
      'unknown': 'Unknown',
    }
    const statusCounts = ended.reduce((acc, h) => {
      const raw = h.completionStatus || h.endType || 'completed'
      const label = labelMap[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
