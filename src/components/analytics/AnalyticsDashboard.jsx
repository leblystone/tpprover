import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArrowsOutSimple,
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Diamond,
  Flask,
  Flame,
  Lightning,
  Medal,
  Package,
  Pill,
  Pulse,
  ShareNetwork,
  Shield,
  Star,
  Target,
  Trophy,
  TrendUp,
  Truck,
  Warning,
} from '@phosphor-icons/react'
import ShareIncentiveModal, { ShareIncentiveBanner } from '../shared/ShareIncentiveModal'
import { getHalfLifeInHours, buildDecayCurve, getClearanceTimeHours, formatHalfLifeTime } from '../../utils/halfLife'
import { formatCurrency } from '../../utils/currencyUtils'
import { calculateScheduledTasksForDate } from '../../utils/calendarTasks'
import { getTaskCompletion, generateTaskId } from '../../utils/taskCompletion'
import { toKey } from '../calendar/MonthGrid'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'
import SpendingDetailModal from '../dashboard/SpendingDetailModal'
import { buildSpendLines, filterSpendLines, getUniqueVendorsAndPeptides } from '../../utils/spendingUtils'
import SearchableDropdown from '../common/SearchableDropdown'
import { useAppContext } from '../../context/AppContext'
import { filterAccountHolderRecords } from '../../utils/buddies'
import { getUnitLabel } from '../../utils/unitConversion'
import Modal from '../common/Modal'
import InsightsPremiumWall from './InsightsPremiumWall'

/* ─────────────────── ACHIEVEMENT DEFINITIONS ─────────────────── */
// iconComponent = Phosphor (duotone at render)  |  iconColor = fixed accent per achievement
const ACHIEVEMENT_DEFS = [
  // Streak — best-ever streak (not current, avoids redundancy with Consistency tab)
  { id: 'streak_bronze',  cat: 'Streak',      label: 'Bronze Streak',  desc: '7-day best streak',    iconComponent: Flame,        iconColor: '#ae9090', field: 'bestStreak',         threshold: 7,   hint: (r) => `${r} more day${r === 1 ? '' : 's'} to beat best streak` },
  { id: 'streak_silver',  cat: 'Streak',      label: 'Silver Streak',  desc: '30-day best streak',   iconComponent: Lightning,    iconColor: '#8aabb5', field: 'bestStreak',         threshold: 30,  hint: (r) => `${r} more day${r === 1 ? '' : 's'} to beat best streak` },
  { id: 'streak_gold',    cat: 'Streak',      label: 'Gold Streak',    desc: '90-day best streak',   iconComponent: Medal,        iconColor: '#b5a87a', field: 'bestStreak',         threshold: 90,  hint: (r) => `${r} more day${r === 1 ? '' : 's'} to beat best streak` },
  { id: 'streak_diamond', cat: 'Streak',      label: 'Diamond Streak', desc: '180-day best streak',  iconComponent: Diamond,      iconColor: '#9d95b5', field: 'bestStreak',         threshold: 180, hint: (r) => `${r} more day${r === 1 ? '' : 's'} to beat best streak` },
  // Doses — all-time (avoids redundancy with 30d doses shown in Research Journey)
  { id: 'doses_25',  cat: 'Doses', label: 'First 25',  desc: '25 doses logged all-time',  iconComponent: Pill,         iconColor: '#8fab8f', field: 'allTimeDoses', threshold: 25,  hint: (r) => `${r} more dose${r === 1 ? '' : 's'} to unlock` },
  { id: 'doses_100', cat: 'Doses', label: 'Century',   desc: '100 doses logged all-time', iconComponent: Flask,        iconColor: '#8ba4c0', field: 'allTimeDoses', threshold: 100, hint: (r) => `${r} more dose${r === 1 ? '' : 's'} to unlock` },
  { id: 'doses_250', cat: 'Doses', label: 'Quarter-K', desc: '250 doses logged all-time', iconComponent: Pulse,        iconColor: '#8dab98', field: 'allTimeDoses', threshold: 250, hint: (r) => `${r} more dose${r === 1 ? '' : 's'} to unlock` },
  { id: 'doses_500', cat: 'Doses', label: 'Veteran',   desc: '500 doses logged all-time', iconComponent: Star,         iconColor: '#b097a8', field: 'allTimeDoses', threshold: 500, hint: (r) => `${r} more dose${r === 1 ? '' : 's'} to unlock` },
  // Protocols — completed count
  { id: 'proto_1', cat: 'Protocols', label: 'Pioneer',      desc: 'Completed 1st protocol', iconComponent: Target,  iconColor: '#8ea5a0', field: 'completedProtocols', threshold: 1, hint: (r) => `Complete ${r} more protocol${r === 1 ? '' : 's'} to unlock` },
  { id: 'proto_5', cat: 'Protocols', label: 'Protocol Pro', desc: 'Completed 5 protocols',  iconComponent: Trophy,  iconColor: '#b5a87a', field: 'completedProtocols', threshold: 5, hint: (r) => `Complete ${r} more protocol${r === 1 ? '' : 's'} to unlock` },
  // Compliance grade — milestone-based (avoids redundancy with % in Consistency tab)
  { id: 'grade_a',    cat: 'Consistency', label: 'Grade A',  desc: '85%+ 30-day compliance', iconComponent: CheckCircle, iconColor: '#8fab8f', field: 'gradeA',     threshold: 1, hint: () => 'Reach A compliance grade (85%+) to unlock' },
  { id: 'grade_aplus',cat: 'Consistency', label: 'Grade A+', desc: '95%+ 30-day compliance', iconComponent: Shield,      iconColor: '#8fb8cc', field: 'gradeAPlus', threshold: 1, hint: () => 'Reach A+ compliance grade (95%+) to unlock' },
  // Inventory
  { id: 'inv_clean', cat: 'Inventory', label: 'Stocked Up', desc: 'No low-stock items', iconComponent: Package, iconColor: '#b09882', field: 'cleanInventory', threshold: 1, hint: () => 'Have 0 low-stock items to unlock' },
]

function useLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/** Compute days until a protocol ends; null = no-end / no start. */
function protocolDaysLeft(p) {
  if (!p.active || !p.startDate) return null
  const d = p.duration || {}
  if (d.noEnd || !d.count || !d.unit) return null
  const start = new Date(p.startDate)
  const end = new Date(start)
  const unit = String(d.unit).toLowerCase()
  if (unit === 'day') end.setDate(end.getDate() + Number(d.count))
  else if (unit === 'week') end.setDate(end.getDate() + Number(d.count) * 7)
  else if (unit === 'month') end.setMonth(end.getMonth() + Number(d.count))
  return Math.ceil((end - new Date()) / 86400000)
}

/** Peptide stock + supplies: low when qty is depleted or at/below threshold. */
function isLowStockpileEntry(s) {
  const qty = parseFloat(s.quantity)
  if (Number.isNaN(qty) || qty < 0) return false
  if (s.type === 'supply') {
    if (qty <= 0) return true
    const th = parseFloat(s.lowThreshold)
    if (Number.isFinite(th) && th > 0) return qty <= th
    return qty <= 1
  }
  return qty <= 1
}

/** e.g. "1 × vial left", "2 × tablets left", "3 × syringes left" */
function formatInventoryQtyLeftLabel(item) {
  const qty = Math.max(0, Number(item.quantity)) || 0
  if (item.type === 'supply') {
    const raw = String(item.unit || 'each').trim()
    if (!raw) return `${qty} × units left`
    const lower = raw.toLowerCase()
    if (lower === 'each' || lower === 'ea') return `${qty} × each left`
    if (qty === 1) return `${qty} × ${raw} left`
    if (raw.length > 1 && raw.toLowerCase().endsWith('s')) return `${qty} × ${raw} left`
    return `${qty} × ${raw}s left`
  }
  const unit = item.unit || 'vial'
  return `${qty} × ${getUnitLabel(unit, qty)} left`
}

/* ─────────────────── SECTION CAROUSEL ─────────────────── */
const SECTION_TABS = [
  { label: 'Overview',    value: 'overview' },
  { label: 'Consistency', value: 'compliance' },
  { label: 'Spending',    value: 'spending' },
  { label: 'Inventory',   value: 'inventory' },
  { label: 'Protocols',   value: 'protocols' },
  { label: 'Half-Life',   value: 'halflife' },
]

function CardCarousel({ cards, theme, borderColor, activeIndex: controlledIndex, onChangeIndex }) {
  const [localActive, setLocalActive] = useState(0)
  const isControlled = controlledIndex !== undefined
  const active = isControlled ? controlledIndex : localActive
  const touchStartX = useRef(null)
  const total = cards.length

  const goTo = useCallback((i) => {
    const clamped = Math.max(0, Math.min(total - 1, i))
    if (isControlled) onChangeIndex?.(clamped)
    else setLocalActive(clamped)
  }, [total, isControlled, onChangeIndex])

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1))
    touchStartX.current = null
  }

  if (total <= 1) return <>{cards[0] ?? null}</>

  const chevronBtnBase =
    'flex-shrink-0 flex items-center justify-center min-w-[2.25rem] min-h-[2.25rem] rounded-xl transition-all active:scale-90 touch-manipulation'

  return (
    <div>
      {/* Card fills width — no overlay controls (avoids covering metrics) */}
      <div
        className="relative w-full"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' }}
      >
        {cards.map((card, i) => (
          <div
            key={i}
            className="min-h-0 w-full min-w-0 flex flex-col self-stretch"
            style={{
              gridRow: 1,
              gridColumn: 1,
              width: '100%',
              minWidth: 0,
              visibility: i === active ? 'visible' : 'hidden',
              pointerEvents: i === active ? 'auto' : 'none',
              zIndex: i === active ? 1 : 0,
            }}
            aria-hidden={i !== active}
          >
            {/* Stretch to tallest slide height so short cards match visually (no grey gap). */}
            <div className="flex-1 min-h-0 w-full flex flex-col">{card}</div>
          </div>
        ))}
      </div>

      {/* Caret nav row — below card, never overlaps content */}
      <div
        className="grid grid-cols-[auto_1fr_auto] items-center gap-2 mt-3 px-0.5"
        style={{ maxWidth: '100%' }}
      >
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          className={`${chevronBtnBase} disabled:opacity-25 disabled:pointer-events-none`}
          style={{
            color: theme.primary,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}12`,
          }}
          aria-label="Previous card"
        >
          <CaretLeft weight="duotone" size={22} aria-hidden />
        </button>

        <div className="flex items-center justify-center gap-1.5 min-w-0 py-0.5">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="transition-all duration-200 rounded-full flex-shrink-0"
              style={{
                width: i === active ? 20 : 6,
                height: 6,
                backgroundColor: i === active ? theme.primary : borderColor,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
              aria-label={`Go to card ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => goTo(active + 1)}
          disabled={active === total - 1}
          className={`${chevronBtnBase} disabled:opacity-25 disabled:pointer-events-none`}
          style={{
            color: theme.primary,
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : `${theme.primary}12`,
          }}
          aria-label="Next card"
        >
          <CaretRight weight="duotone" size={22} aria-hidden />
        </button>
      </div>

      <div className="flex items-center justify-center mt-1.5">
        <span className="text-[10px] tabular-nums" style={{ color: theme.textLight }}>{active + 1} of {total}</span>
      </div>
    </div>
  )
}

export default function AnalyticsDashboard({
  theme,
  defaultTab,
  showFullScreenLink = false,
  fullPage = false,
  allSections = false,
  activeTab: controlledTab,
  onTabChange,
  /** Research+ — advanced Insights analytics (Overview cards 3+, deeper tabs, etc.) */
  isPremium = true,
  /** Navigate to subscription / open checkout — required when isPremium is false for CTAs */
  onUpgradeClick,
  /** True when user is in free trial — shows Research+ badge on section headers */
  isTrialUser = false,
}) {
  const navigate = useNavigate()
  const { protocols: ctxProtocols, orders: ctxOrders, stockpile: ctxStockpile, supplements: ctxSupplements, reconItems: ctxReconItems } = useAppContext()
  const orders = ctxOrders || []
  const reconItems = ctxReconItems || []
  const protocols = useMemo(
    () => filterAccountHolderRecords(ctxProtocols || []),
    [ctxProtocols]
  )
  const supplements = useMemo(
    () => filterAccountHolderRecords(ctxSupplements || []),
    [ctxSupplements]
  )
  const stockpile = useMemo(
    () => filterAccountHolderRecords(ctxStockpile || []),
    [ctxStockpile]
  )
  const protocolHistoryRaw = useLocal('tpprover_protocol_history', [])
  const selfProtocolIds = useMemo(() => new Set(protocols.map(p => p?.id).filter(Boolean)), [protocols])
  const protocolHistory = useMemo(
    () => (protocolHistoryRaw || []).filter(h => !h?.protocolId || selfProtocolIds.has(h.protocolId)),
    [protocolHistoryRaw, selfProtocolIds]
  )
  const goals = useLocal('tpprover_user_goals', [])
  const [taskCompletion, setTaskCompletion] = useState(() => getTaskCompletion())
  const [internalTab, setInternalTab] = useState(defaultTab || 'overview')
  const activeTab = controlledTab || internalTab
  const setActiveTab = onTabChange || setInternalTab
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const shareCard = useCallback(() => {
    // Use the same visual social-card flow as the rest of the app.
    setShowShareModal(true)
  }, [])

  useEffect(() => {
    const refresh = () => setTaskCompletion(getTaskCompletion())
    window.addEventListener('tpp:task-completion-changed', refresh)
    const interval = setInterval(refresh, 5000)
    return () => { window.removeEventListener('tpp:task-completion-changed', refresh); clearInterval(interval) }
  }, [])

  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === 'Delivered').length
    const activeProtocols = protocols.filter(p => p.active !== false).length
    const lowStock = stockpile.filter(isLowStockpileEntry).length
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

  const overviewData = useMemo(() => {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const ordersWithCosts = new Set()
    const byCompound = {}
    let last30Spend = 0, totalSpend = 0

    orders.forEach(order => {
      let itemsCost = 0
      const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}')
      const includeShipping = settings.orders?.includeShippingInCosts ?? true
      const shippingCost = includeShipping ? (parseFloat(order.shippingCost) || 0) : 0
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const cost = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
          itemsCost += cost
          const name = item.name || 'Other'
          byCompound[name] = (byCompound[name] || 0) + cost
        })
      } else if (order.cost) {
        itemsCost = parseFloat(String(order.cost).replace(/[^0-9.]/g, '')) || 0
        const name = order.peptide || 'Other'
        byCompound[name] = (byCompound[name] || 0) + itemsCost
      }
      const totalCost = itemsCost + shippingCost
      if (totalCost > 0) {
        ordersWithCosts.add(order.id)
        totalSpend += totalCost
        const orderDate = order.date ? new Date(order.date) : null
        if (orderDate && orderDate >= thirtyDaysAgo) last30Spend += totalCost
      }
    })

    stockpile.forEach(item => {
      const cost = (parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0)
      if (cost > 0 && !(item.orderId && ordersWithCosts.has(item.orderId))) {
        totalSpend += cost
        const pd = item.purchaseDate ? new Date(item.purchaseDate) : null
        if (pd && pd >= thirtyDaysAgo) last30Spend += cost
      }
    })

    const avgDailySpend30 = last30Spend / 30
    const stockpileValue = stockpile.reduce((s, item) => s + (parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0), 0)
    const lowStockItems = stockpile
      .filter(isLowStockpileEntry)
      .sort((a, b) => (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0))

    const compoundList = Object.entries(byCompound).sort((a, b) => b[1] - a[1])

    const endingSoon = protocols
      .filter(p => p.active !== false)
      .map(p => ({ ...p, daysLeft: protocolDaysLeft(p) }))
      .filter(p => p.daysLeft !== null && p.daysLeft >= 0 && p.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    // Best streak (180-day window)
    let bestStreak = 0, runStreak = 0
    for (let i = 179; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dk = toKey(d)
      const sched = calculateScheduledTasksForDate(d, protocols, supplements, reconItems)
      let dayPlanned = 0, dayDone = 0
      Object.keys(sched.bySlot || {}).forEach(slot => {
        const sl = sched.bySlot[slot];
        (sl.peptides || []).forEach(pep => {
          const tid = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: slot, protocolId: pep.protocolId, peptideId: pep.peptideId })
          dayPlanned++
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) dayDone++
        });
        (sl.supplements || []).forEach(supp => {
          const tid = generateTaskId({ type: 'supplement', name: supp.name || 'Supplement', dose: supp.dose || '', unit: supp.unit || '', time: slot })
          dayPlanned++
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) dayDone++
        })
      })
      if (dayPlanned > 0 && dayDone === dayPlanned) { runStreak++; if (runStreak > bestStreak) bestStreak = runStreak }
      else if (dayPlanned > 0) runStreak = 0
    }
    bestStreak = Math.max(bestStreak, complianceData.streak)

    // 30d doses logged
    let dosesLogged30d = 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dk = toKey(d)
      const sched = calculateScheduledTasksForDate(d, protocols, supplements, reconItems)
      Object.keys(sched.bySlot || {}).forEach(slot => {
        const sl = sched.bySlot[slot];
        (sl.peptides || []).forEach(pep => {
          const tid = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: slot, protocolId: pep.protocolId, peptideId: pep.peptideId })
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) dosesLogged30d++
        });
        (sl.supplements || []).forEach(supp => {
          const tid = generateTaskId({ type: 'supplement', name: supp.name || 'Supplement', dose: supp.dose || '', unit: supp.unit || '', time: slot })
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) dosesLogged30d++
        })
      })
    }

    // all-time doses logged (scan entire taskCompletion record)
    let allTimeDoses = 0
    Object.keys(taskCompletion).forEach(dk => {
      const dayData = taskCompletion[dk] || {}
      Object.keys(dayData).forEach(slot => {
        Object.values(dayData[slot] || {}).forEach(td => {
          if (td === true || (td && typeof td === 'object' && td.completed)) allTimeDoses++
        })
      })
    })

    // unique compounds from stockpile + protocols
    const compoundNames = new Set()
    stockpile.forEach(s => { if (s.name) compoundNames.add(s.name.toLowerCase().trim()) })
    protocols.forEach(p => { (p.peptides || []).forEach(pep => { if (pep.name) compoundNames.add(pep.name.toLowerCase().trim()) }) })
    const uniqueCompounds = compoundNames.size

    // earliest tracking date
    let earliestDate = null
    orders.forEach(o => { if (o.date) { const d = new Date(o.date); if (!earliestDate || d < earliestDate) earliestDate = d } })
    protocols.forEach(p => { if (p.startDate) { const d = new Date(p.startDate); if (!earliestDate || d < earliestDate) earliestDate = d } })
    const daysTracking = earliestDate ? Math.max(1, Math.ceil((new Date() - earliestDate) / 86400000)) : 0

    // compliance grade
    const pct = complianceData.compliancePct ?? 0
    const complianceGrade = pct >= 95 ? 'A+' : pct >= 85 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct > 0 ? 'D' : '—'

    return { avgDailySpend30, stockpileValue, lowStockItems, compoundList, endingSoon, bestStreak, dosesLogged30d, allTimeDoses, totalSpend, last30Spend, uniqueCompounds, daysTracking, complianceGrade }
  }, [protocols, orders, stockpile, supplements, reconItems, taskCompletion, complianceData.streak, complianceData.compliancePct])

  return (
    <div className={fullPage ? '' : 'h-full flex flex-col'}>
      {/* Widget header (hidden in full page mode - page handles its own header) */}
      {!fullPage && (
        <div className="px-4 py-3 widget-separator" style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
              Analytics
              <TrendUp weight="duotone" size={18} style={{ color: theme.primary }} />
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
                  <ArrowsOutSimple weight="duotone" size={14} style={{ color: '#ffffff' }} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={fullPage ? '' : 'flex-1 overflow-y-auto px-4 py-3'}>
        <ShareIncentiveBanner theme={theme} onOpen={() => setShowShareModal(true)} fullPage={fullPage} />
        {allSections ? (
          /* ── All sections stacked, each with its own card carousel ── */
          <div className="space-y-6">
            {[
              { label: 'My Research',  premium: true, node: <OverviewTab theme={theme} overviewData={overviewData} complianceData={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} protocolHistory={protocolHistory} shareCard={shareCard} carouselMode isPremium={isPremium} onUpgradeClick={onUpgradeClick} /> },
              { label: 'Consistency',  premium: true, node: <ComplianceTab theme={theme} data={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} supplements={supplements} protocols={protocols} goals={goals} shareCard={shareCard} carouselMode isPremium={isPremium} onUpgradeClick={onUpgradeClick} /> },
              { label: 'Spending',     premium: true, node: <SpendingTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} onShowBreakdown={() => setShowBreakdownModal(true)} shareCard={shareCard} carouselMode isPremium={isPremium} onUpgradeClick={onUpgradeClick} /> },
              { label: 'Inventory',    premium: true, node: <InventoryTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} carouselMode isPremium={isPremium} onUpgradeClick={onUpgradeClick} /> },
              { label: 'Protocols',    premium: true, node: <ProtocolsTab theme={theme} protocolHistory={protocolHistory} protocolHistoryStats={protocolHistoryStats} stats={stats} protocols={protocols} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} carouselMode isPremium={isPremium} onUpgradeClick={onUpgradeClick} /> },
              { label: 'Half-Life',    premium: true, node: <HalfLifeTab theme={theme} protocols={protocols} reconItems={reconItems} supplements={supplements} taskCompletion={taskCompletion} subtleBg={subtleBg} borderColor={borderColor} carouselMode isPremium={isPremium} onUpgradeClick={onUpgradeClick} /> },
            ].map(({ label, premium, node }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2.5 px-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textLight }}>{label}</span>
                  {isTrialUser && premium && (
                    <span
                      className="relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #C8912A 0%, #E8C55A 35%, #F5D97A 50%, #E8C55A 65%, #B8822A 100%)',
                        color: '#3A2B10',
                        border: '1px solid rgba(255,220,120,0.6)',
                        boxShadow: '0 1px 3px rgba(184,138,62,0.3)',
                        isolation: 'isolate',
                      }}
                    >
                      <style>{`
                        @keyframes rpSectionGlisten {
                          0%   { transform: translateX(-160%); opacity: 0; }
                          8%   { opacity: 1; }
                          38%  { transform: translateX(160%);  opacity: 1; }
                          40%  { opacity: 0; }
                          100% { transform: translateX(160%);  opacity: 0; }
                        }
                        .rp-section-glisten {
                          position: absolute; inset: 0; border-radius: inherit;
                          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 47%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.6) 53%, transparent 70%);
                          animation: rpSectionGlisten 3.2s ease-in-out infinite;
                          pointer-events: none;
                        }
                      `}</style>
                      <span className="rp-section-glisten" aria-hidden="true" />
                      <span style={{ position: 'relative', zIndex: 1 }}>Research+</span>
                    </span>
                  )}
                  <div className="flex-1 h-px" style={{ backgroundColor: borderColor }} />
                </div>
                {node}
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Toggle tabs (only when NOT fullPage) */}
            {!fullPage && (
              <ToggleTabs
                value={activeTab}
                onChange={setActiveTab}
                theme={theme}
                options={[
                  { label: 'Overview', value: 'overview' },
                  { label: 'Consistency', value: 'compliance' },
                  { label: 'Spending', value: 'spending' },
                  { label: 'Inventory', value: 'inventory' },
                  { label: 'Protocols', value: 'protocols' },
                  { label: 'Half-Life', value: 'halflife' },
                ]}
              />
            )}
            <div className={fullPage ? '' : 'mt-4'}>
              {activeTab === 'overview' && <OverviewTab theme={theme} overviewData={overviewData} complianceData={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} protocolHistory={protocolHistory} shareCard={shareCard} carouselMode={fullPage} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />}
              {activeTab === 'compliance' && <ComplianceTab theme={theme} data={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} supplements={supplements} protocols={protocols} goals={goals} shareCard={shareCard} carouselMode={fullPage} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />}
              {activeTab === 'spending' && <SpendingTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} onShowBreakdown={() => setShowBreakdownModal(true)} shareCard={shareCard} carouselMode={fullPage} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />}
              {activeTab === 'inventory' && <InventoryTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} carouselMode={fullPage} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />}
              {activeTab === 'protocols' && <ProtocolsTab theme={theme} protocolHistory={protocolHistory} protocolHistoryStats={protocolHistoryStats} stats={stats} protocols={protocols} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} carouselMode={fullPage} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />}
              {activeTab === 'halflife' && <HalfLifeTab theme={theme} protocols={protocols} reconItems={reconItems} supplements={supplements} taskCompletion={taskCompletion} subtleBg={subtleBg} borderColor={borderColor} carouselMode={fullPage} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />}
            </div>
          </>
        )}
      </div>

      <SpendingDetailModal
        open={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        theme={theme}
      />
      <ShareIncentiveModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        theme={theme}
        defaultShareType="analytics"
      />
    </div>
  )
}

/* ─────────────────── ACHIEVEMENTS CARD ─────────────────── */
function AchievementsCard({ theme, overviewData, complianceData, stats, completedProtocols, subtleBg, borderColor, shareCard, getColor: getColorProp }) {
  const getColor = getColorProp || ((pct) => {
    if (pct >= 90) return theme.primary;
    if (pct >= 70) return theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706';
    return theme.isDark ? 'rgba(197, 130, 100, 0.9)' : '#b5684a';
  });
  const { bestStreak, allTimeDoses, lowStockItems, complianceGrade } = overviewData

  const gradeColor = complianceGrade === 'A+' || complianceGrade === 'A' ? '#22c55e'
    : complianceGrade === 'B' ? '#3b9ed8'
    : complianceGrade === 'C' ? '#f59e0b'
    : complianceGrade === 'D' ? '#ef4444'
    : (theme.textLight || '#aaa')

  const values = {
    bestStreak:         bestStreak || 0,
    allTimeDoses:       allTimeDoses || 0,
    completedProtocols: completedProtocols || 0,
    gradeA:             (complianceGrade === 'A' || complianceGrade === 'A+') ? 1 : 0,
    gradeAPlus:         complianceGrade === 'A+' ? 1 : 0,
    cleanInventory:     (lowStockItems || []).length === 0 && (stats?.totalItems || 0) > 0 ? 1 : 0,
  }

  const evaluated = ACHIEVEMENT_DEFS.map(def => {
    const val = values[def.field] || 0
    const unlocked = val >= def.threshold
    const progress = Math.min(1, val / def.threshold)
    return { ...def, val, unlocked, progress }
  })

  const unlockedList = evaluated.filter(a => a.unlocked)
  const lockedList   = evaluated.filter(a => !a.unlocked)
  const nextBadge    = [...lockedList].sort((a, b) => b.progress - a.progress)[0] || null

  const shareLines = [
    `🎯 30-Day Compliance: ${complianceData.hasData ? `${complianceData.compliancePct ?? 0}%` : 'No data yet'} (Grade: ${complianceGrade})`,
    `🔥 Current Streak: ${complianceData.streak} days`,
    `⭐ Best Streak Ever: ${bestStreak > 0 ? `${bestStreak} days` : 'Not yet set'}`,
    unlockedList.length > 0 ? `🏅 Badges: ${unlockedList.map(a => `${a.icon} ${a.label}`).join(', ')}` : '🏅 No badges yet',
  ]

  return (
    <SectionCard
      title="Achievements"
      theme={theme}
      borderColor={borderColor}
      icon={<Trophy weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('My Research Achievements', shareLines) : null}
    >
      {/* ── Original stats layout (grade + streak + compliance) ── */}
      <div className="flex items-center gap-3 mb-3.5">
        <div className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl"
          style={{ backgroundColor: gradeColor + '18', border: `2px solid ${gradeColor}40`, color: gradeColor }}>
          {complianceGrade}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame weight="duotone" size={13} style={{ color: '#f97316' }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>Current Streak</span>
            </div>
            <span className="text-sm font-black" style={{ color: theme.primary }}>{complianceData.streak}d</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Star weight="duotone" size={13} style={{ color: theme.primary }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>Best Streak</span>
            </div>
            <span className="text-sm font-black" style={{ color: theme.text }}>{bestStreak > 0 ? `${bestStreak}d` : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle weight="duotone" size={13} style={{ color: '#22c55e' }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>30d Compliance</span>
            </div>
            <span className="text-sm font-black" style={{ color: getColor(complianceData.compliancePct ?? 0) }}>
              {complianceData.hasData ? `${complianceData.compliancePct ?? 0}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Badge divider ── */}
      <div className="border-t mb-3" style={{ borderColor: borderColor }} />

      {/* ── Unlocked badges ── */}
      {unlockedList.length > 0 ? (
        <div className="space-y-1.5 mb-3">
          {unlockedList.map(a => {
            const Icon = a.iconComponent
            return (
              <div key={a.id}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl"
                style={{
                  backgroundColor: a.iconColor + '12',
                  border: `1px solid ${a.iconColor}28`,
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                }}>
                <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: a.iconColor + '18' }}>
                  <Icon weight="duotone" size={13} style={{ color: a.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold leading-tight" style={{ color: theme.text }}>{a.label}</div>
                  <div className="text-[9px] leading-tight" style={{ color: theme.textLight }}>{a.desc}</div>
                </div>
                <CheckCircle weight="duotone" size={13} style={{ color: a.iconColor, flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mb-3 py-2 text-xs text-center rounded-lg"
          style={{ backgroundColor: subtleBg, color: theme.textLight }}>
          No badges yet — keep logging to earn your first 🏅
        </div>
      )}

      {/* ── Next badge progress ── */}
      {nextBadge && (
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: theme.textLight }}>Next Badge</div>
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5">
              {(() => { const Icon = nextBadge.iconComponent; return <Icon weight="duotone" size={13} style={{ color: nextBadge.iconColor, opacity: 0.45 }} /> })()}
              <div>
                <div className="text-xs font-semibold leading-tight" style={{ color: theme.text }}>{nextBadge.label}</div>
                <div className="text-[9px] leading-tight" style={{ color: theme.textLight }}>{nextBadge.desc}</div>
              </div>
            </div>
            <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: theme.textLight }}>
              {nextBadge.val}/{nextBadge.threshold}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden mt-1.5 mb-1"
            style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(nextBadge.progress * 100, nextBadge.val > 0 ? 3 : 0)}%`,
                background: `linear-gradient(90deg, ${theme.primary}, ${theme.primary}cc)`,
              }} />
          </div>
          <div className="text-[9px]" style={{ color: theme.textLight }}>
            {nextBadge.hint(nextBadge.threshold - nextBadge.val)}
          </div>
        </div>
      )}

      {lockedList.length === 0 && (
        <div className="text-center text-xs font-semibold mt-1" style={{ color: theme.primary }}>
          🏆 All badges unlocked!
        </div>
      )}
    </SectionCard>
  )
}

/* ─────────────────── ACTION ITEMS CARD ─────────────────── */
function ActionItemsCard({ theme, lowStockItems, endingSoon, complianceData, subtleBg, borderColor, alertColor }) {
  const criticalColor = '#ef4444'
  const warningColor = alertColor

  const items = []

  // Low stock alerts
  ;(lowStockItems || []).forEach(item => {
    const isCritical = (item.qtyLeft != null && item.qtyLeft <= 3) || (item.daysLeft != null && item.daysLeft <= 3)
    items.push({
      id: `low-${item.id || item.name}`,
      type: 'low-stock',
      priority: isCritical ? 0 : 1,
      color: isCritical ? criticalColor : warningColor,
      icon: <Warning weight="duotone" size={14} />,
      label: item.name || 'Unknown Item',
      badge: 'Order Now',
      detail: item.daysLeft != null
        ? `~${item.daysLeft}d supply left`
        : item.qtyLeft != null
          ? `${item.qtyLeft} units left`
          : 'Running low',
    })
  })

  // Protocols ending soon
  ;(endingSoon || []).forEach(p => {
    items.push({
      id: `end-${p.id}`,
      type: 'ending-soon',
      priority: p.daysLeft <= 3 ? 0 : 2,
      color: p.daysLeft <= 3 ? criticalColor : warningColor,
      icon: <Clock weight="duotone" size={14} />,
      label: p.protocolName || 'Protocol',
      badge: p.daysLeft === 0 ? 'Ends Today' : `${p.daysLeft}d Left`,
      detail: p.daysLeft === 0 ? 'Ends today — plan next cycle' : `Protocol ending in ${p.daysLeft} day${p.daysLeft !== 1 ? 's' : ''}`,
    })
  })

  // Low compliance alert
  const compPct = complianceData?.compliancePct ?? null
  if (complianceData?.hasData && compPct != null && compPct < 70) {
    items.push({
      id: 'compliance',
      type: 'compliance',
      priority: compPct < 50 ? 0 : 2,
      color: compPct < 50 ? criticalColor : warningColor,
      icon: <Target weight="duotone" size={14} />,
      label: 'Compliance Low',
      badge: `${compPct}% Rate`,
      detail: 'Log missed doses to improve consistency',
    })
  }

  items.sort((a, b) => a.priority - b.priority)

  if (items.length === 0) {
    return (
      <SectionCard title="Action Items" theme={theme} borderColor={borderColor} icon={<CheckCircle weight="duotone" size={14} style={{ color: '#22c55e' }} />}>
        <div className="flex items-center gap-2.5 p-2 rounded-xl" style={{ backgroundColor: '#22c55e12', border: '1px solid #22c55e25' }}>
          <CheckCircle weight="duotone" size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
          <span className="text-xs font-medium" style={{ color: theme.text }}>All clear — inventory stocked, protocols on track!</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Action Items"
      theme={theme}
      borderColor={borderColor}
      icon={<Warning weight="duotone" size={14} style={{ color: items[0]?.color || alertColor }} />}
    >
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2.5 rounded-xl"
            style={{ backgroundColor: `${item.color}10`, border: `1px solid ${item.color}28` }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${item.color}20`, color: item.color }}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: theme.text }}>{item.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>{item.detail}</div>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: `${item.color}22`, color: item.color }}
            >
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

/* ─────────────────── OVERVIEW TAB ─────────────────── */
function OverviewTab({ theme, overviewData, complianceData, stats, getColor, subtleBg, borderColor, protocolHistory, shareCard, carouselMode = false, isPremium = true, onUpgradeClick }) {
  const { avgDailySpend30, stockpileValue, lowStockItems, compoundList, endingSoon, bestStreak, dosesLogged30d, totalSpend, last30Spend, uniqueCompounds, daysTracking, complianceGrade } = overviewData
  const maxCompound = compoundList[0]?.[1] || 1
  const alertColor = theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706'
  const completedProtocols = (protocolHistory || []).filter(p => p.status === 'completed' || p.completedAt).length
  const gradeColor = complianceGrade === 'A+' || complianceGrade === 'A' ? '#22c55e' : complianceGrade === 'B' ? '#3b9ed8' : complianceGrade === 'C' ? '#f59e0b' : complianceGrade === 'D' ? '#ef4444' : theme.textLight

  const _cards = [
    <SectionCard key="journey"
      title="My Research Journey" theme={theme} borderColor={borderColor}
      icon={<Flask weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('My Research Journey', [
        `🧪 Compounds Explored: ${uniqueCompounds}`,
        `📋 Active Protocols: ${stats.activeProtocols}`,
        `✅ Protocols Completed: ${completedProtocols}`,
        `💊 Doses Logged (30d): ${dosesLogged30d}`,
        daysTracking > 0 ? `📅 Days Tracking: ${daysTracking}` : null,
      ].filter(Boolean)) : null}
    >
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-2 items-stretch">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl gap-1 min-h-0 h-full"
          style={{ backgroundColor: theme.primary + '14', border: `1px solid ${theme.primary}25` }}>
          <Flask weight="duotone" size={18} style={{ color: theme.primary }} />
          <div className="text-2xl font-black" style={{ color: theme.primary }}>{uniqueCompounds}</div>
          <div className="text-[10px] font-medium text-center" style={{ color: theme.textLight }}>Compounds Explored</div>
        </div>
        <div
          className="grid grid-cols-2 gap-1.5 min-h-0 h-full"
          style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}
        >
          <div className="flex flex-col items-center justify-center p-2 rounded-xl gap-0.5 min-h-0"
            style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.07)' }}>
            <div className="text-base font-black" style={{ color: theme.text }}>{stats.activeProtocols}</div>
            <div className="text-[9px] text-center leading-tight" style={{ color: theme.textLight }}>Active Protocols</div>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl gap-0.5 min-h-0"
            style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.07)' }}>
            <div className="text-base font-black" style={{ color: theme.text }}>{completedProtocols}</div>
            <div className="text-[9px] text-center leading-tight" style={{ color: theme.textLight }}>Completed</div>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl gap-0.5 min-h-0"
            style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.07)' }}>
            <div className="text-base font-black" style={{ color: theme.text }}>{dosesLogged30d}</div>
            <div className="text-[9px] text-center leading-tight" style={{ color: theme.textLight }}>Doses (30d)</div>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl gap-0.5 min-h-0"
            style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.07)' }}>
            <div className="text-base font-black" style={{ color: theme.text }}>{daysTracking > 0 ? `${daysTracking}d` : '—'}</div>
            <div className="text-[9px] text-center leading-tight" style={{ color: theme.textLight }}>Tracking</div>
          </div>
        </div>
      </div>
    </SectionCard>,

    <AchievementsCard key="achievements"
      theme={theme} overviewData={overviewData} complianceData={complianceData}
      stats={stats} completedProtocols={completedProtocols} subtleBg={subtleBg}
      borderColor={borderColor} shareCard={shareCard} getColor={getColor}
    />,

    <SectionCard key="spending"
      title="Spending Overview" theme={theme} borderColor={borderColor}
      icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Research Investment', [
        `💰 Last 30 Days: ${formatCurrency(last30Spend)}`,
        `📅 Avg / Day: ${formatCurrency(avgDailySpend30)}`,
        `🏦 All-Time Invested: ${formatCurrency(totalSpend)}`,
        `📦 Stockpile Value: ${formatCurrency(stockpileValue)}`,
        compoundList.length > 0 ? `🧪 Top Compound: ${compoundList[0]?.[0]} (${formatCurrency(compoundList[0]?.[1])})` : null,
      ].filter(Boolean)) : null}
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2.5 rounded-xl" style={{ backgroundColor: '#6B7F77', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="text-base font-bold text-white">{formatCurrency(last30Spend)}</div>
          <div className="text-[9px] text-white/80">Last 30 Days</div>
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{ backgroundColor: '#566D64', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="text-base font-bold text-white">{formatCurrency(avgDailySpend30)}</div>
          <div className="text-[9px] text-white/80">Avg / Day</div>
        </div>
        <div className="text-center p-2.5 rounded-xl" style={{ backgroundColor: '#445952', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}>
          <div className="text-base font-bold text-white">{formatCurrency(totalSpend)}</div>
          <div className="text-[9px] text-white/80">All-Time</div>
        </div>
      </div>
      <MetricCard icon={<Archive weight="duotone" size={14} style={{ color: theme.primary }} />} label="Stockpile Value" value={formatCurrency(stockpileValue)} theme={theme} />
    </SectionCard>,

    compoundList.length > 0 ? (
      <SectionCard key="compound"
        title="Spend by Compound" theme={theme} borderColor={borderColor}
        icon={<Flask weight="duotone" size={14} style={{ color: theme.primary }} />}
        onShare={shareCard ? () => shareCard('Spend by Compound', [
          ...compoundList.slice(0, 5).map(([name, amt]) => `  ${name}: ${formatCurrency(amt)}`),
          `💵 Total Research Spend: ${formatCurrency(totalSpend)}`,
        ]) : null}
      >
        <div className="space-y-2">
          {compoundList.slice(0, 8).map(([name, amount]) => (
            <div key={name} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate" style={{ color: theme.text }}>{name}</span>
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: theme.primary }}>{formatCurrency(amount)}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((amount / maxCompound) * 100)}%`, backgroundColor: theme.primary }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,

    <SectionCard key="inventory"
      title="Inventory Status" theme={theme} borderColor={borderColor}
      icon={<Archive weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Inventory Status', [
        `📦 Stockpile Value: ${formatCurrency(stockpileValue)}`,
        `⚠️ Low Stock Items: ${lowStockItems.length}`,
        lowStockItems.length > 0
          ? `🔴 Running Low: ${lowStockItems.slice(0, 3).map(i => `${i.name || 'Item'} (${formatInventoryQtyLeftLabel(i)})`).join(', ')}`
          : '✅ Inventory looks good',
      ]) : null}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <MetricCard icon={<Warning weight="duotone" size={14} style={{ color: lowStockItems.length > 0 ? alertColor : theme.primary }} />} label="Low Stock Items" value={lowStockItems.length} theme={theme} />
        <MetricCard icon={<Archive weight="duotone" size={14} style={{ color: theme.primary }} />} label="Stockpile Value" value={formatCurrency(stockpileValue)} theme={theme} />
      </div>
      {lowStockItems.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>Items Running Low</div>
          {lowStockItems.slice(0, 5).map((item, i) => (
            <div key={item.id || i} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
              <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{item.name || 'Unknown'}</span>
              <span className="font-bold flex-shrink-0" style={{ color: alertColor }}>{formatInventoryQtyLeftLabel(item)}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>,

    endingSoon.length > 0 ? (
      <SectionCard key="ending"
        title="Protocols Ending Soon" theme={theme} borderColor={borderColor}
        icon={<Clock weight="duotone" size={14} style={{ color: alertColor }} />}
      >
        <div className="space-y-2">
          {endingSoon.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: p.daysLeft <= 3 ? `${alertColor}12` : subtleBg }}>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: theme.text }}>{p.protocolName || 'Protocol'}</div>
                <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                  {p.daysLeft === 0 ? 'Ends today' : `${p.daysLeft} day${p.daysLeft !== 1 ? 's' : ''} remaining`}
                </div>
              </div>
              <span className="text-xs font-bold flex-shrink-0 ml-3 px-2 py-1 rounded-full"
                style={{ backgroundColor: p.daysLeft <= 3 ? `${alertColor}20` : `${theme.primary}15`, color: p.daysLeft <= 3 ? alertColor : theme.primary }}>
                {p.daysLeft === 0 ? 'Today' : `${p.daysLeft}d`}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,
  ].filter(Boolean)

  if (!isPremium) {
    const free = _cards.slice(0, 2)
    const wall = (
      <InsightsPremiumWall
        key="insights-premium-overview"
        variant="card"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Overview analytics"
        featureBullets={[
          'Spending overview & spend-by-compound',
          'Inventory snapshot & protocols ending soon',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
    const out = [...free, wall]
    if (carouselMode) return <CardCarousel cards={out} theme={theme} borderColor={borderColor} />
    return <div className="space-y-4">{out}</div>
  }

  if (carouselMode) return <CardCarousel cards={_cards} theme={theme} borderColor={borderColor} />
  return <div className="space-y-4">{_cards}</div>
}

/* ─────────────────── COMPLIANCE TAB ─────────────────── */
function ComplianceTab({ theme, data, stats, getColor, subtleBg, borderColor, supplements, protocols, goals, shareCard, carouselMode = false, isPremium = true, onUpgradeClick }) {
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

  if (!data.hasData) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <CheckCircle weight="duotone" size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
        <div className="text-sm font-medium mt-3 mb-1" style={{ color: theme.text }}>No data to track</div>
        <div className="text-xs px-2" style={{ color: theme.textLight }}>Start a protocol or add supplements to track your research consistency</div>
      </div>
    )
  }

  const _cards = [
    /* Slide 1: Summary stats + 7-day grid */
    <SectionCard key="summary" title="Consistency Summary" theme={theme} borderColor={borderColor}
      icon={<CheckCircle weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Research Consistency', [
        `✅ 30-Day Compliance: ${data.compliancePct}%`,
        `🔥 Current Streak: ${data.streak} days`,
        `🏅 Perfect Days: ${extra.perfectDays}`,
        `❌ Missed Days: ${extra.missedDays}`,
      ]) : null}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold" style={{ color: getColor(data.compliancePct) }}>{data.compliancePct}%</div>
            <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
              30-day compliance
              {extra.trendDir && <span style={{ color: extra.trendDir === 'up' ? theme.primary : '#d97706' }}> ({extra.trendDir === 'up' ? '+' : '-'}{extra.trendDiff}% vs prev)</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
            <Lightning weight="duotone" size={14} style={{ color: theme.primary }} />
            <span className="text-sm font-bold" style={{ color: theme.primary }}>{data.streak}</span>
            <span className="text-xs" style={{ color: theme.textLight }}>day streak</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MetricCard label="Perfect Days" value={extra.perfectDays} theme={theme} />
          <MetricCard label="Partial" value={extra.partialDays} theme={theme} />
          <MetricCard label="Missed" value={extra.missedDays} theme={theme} />
          <MetricCard label="Avg/Day" value={extra.avgPerDay} theme={theme} />
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.06)' }}>
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
      </div>
    </SectionCard>,

    /* Slide 2: 30-Day Trend chart */
    <SectionCard key="trend"
      title="30-Day Trend" theme={theme} borderColor={borderColor}
      onShare={shareCard ? () => shareCard('30-Day Consistency Trend', [
        `✅ 30-Day Compliance: ${data.compliancePct}%`,
        `🔥 Current Streak: ${data.streak} days`,
        `🏅 Perfect Days: ${extra.perfectDays}`,
        `⚠️ Partial Days: ${extra.partialDays}`,
        `❌ Missed Days: ${extra.missedDays}`,
        `📊 Avg Tasks/Day: ${extra.avgPerDay}`,
      ]) : null}
    >
      <ComplianceTrend data={data.dailyStats} theme={theme} />
    </SectionCard>,

    /* Slide 3: Compliance by weekday (conditional) */
    extra.weekdayPcts.length > 0 ? (
      <SectionCard key="weekday"
        title="Compliance by Day of Week" theme={theme} borderColor={borderColor}
        onShare={shareCard ? () => shareCard('Compliance by Day of Week', [
          ...extra.weekdayPcts.map(({ day, pct }) => `  ${day}: ${pct}%`),
        ]) : null}
      >
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
    ) : null,

    /* Slide 4: Research Snapshot */
    <SectionCard key="snapshot"
      title="Research Snapshot" theme={theme} borderColor={borderColor}
      onShare={shareCard ? () => shareCard('Research Snapshot', [
        `💊 Supplements: ${extra.suppCount}`,
        `📋 Active Protocols: ${extra.activeProtocols}`,
        `📅 Best Day: ${extra.bestDayLabel}`,
        `🎯 Goals Completed: ${extra.goalsCompleted}/${extra.goalsTotal}`,
      ]) : null}
    >
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
    </SectionCard>,
  ].filter(Boolean)

  if (!isPremium) {
    const free = _cards.slice(0, 1)
    const wall = (
      <InsightsPremiumWall
        key="insights-premium-consistency"
        variant="card"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Consistency analytics"
        featureBullets={[
          '30-day trend chart',
          'Compliance by weekday',
          'Research snapshot grid',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
    const out = [...free, wall]
    if (carouselMode) return <CardCarousel cards={out} theme={theme} borderColor={borderColor} />
    return <div className="space-y-4">{out}</div>
  }

  if (carouselMode) return <CardCarousel cards={_cards} theme={theme} borderColor={borderColor} />
  return <div className="space-y-4">{_cards}</div>
}

/* ─────────────────── SPENDING BREAKDOWN CARD ─────────────────── */
function SpendingBreakdownCard({ theme, orders, stockpile, subtleBg, borderColor, shareCard, inCarousel = false }) {
  const settings = useMemo(() => { try { return JSON.parse(localStorage.getItem('tpprover_settings') || '{}') } catch { return {} } }, [])
  const [vendorFilter, setVendorFilter] = useState('')
  const [peptideFilter, setPeptideFilter] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [dateOpen, setDateOpen] = useState(false)
  const dateRef = useRef(null)
  const dateLabels = { all: 'All time', last30: 'Last 30d', last90: 'Last 90d', lastMonth: 'Last month' }

  useEffect(() => {
    const handler = (e) => { if (dateRef.current && !dateRef.current.contains(e.target)) setDateOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allLines = useMemo(() => buildSpendLines(orders, stockpile, settings), [orders, stockpile, settings])
  const { vendors, peptides } = useMemo(() => getUniqueVendorsAndPeptides(allLines), [allLines])
  const vendorOptions = useMemo(() => [{ value: '', label: 'All vendors' }, ...vendors.map(v => ({ value: v, label: v }))], [vendors])
  const peptideOptions = useMemo(() => [{ value: '', label: 'All peptides' }, ...peptides.map(p => ({ value: p, label: p }))], [peptides])

  const filteredLines = useMemo(() => filterSpendLines(allLines, { vendor: vendorFilter || undefined, peptide: peptideFilter || undefined, dateRange }), [allLines, vendorFilter, peptideFilter, dateRange])
  const filteredTotal = useMemo(() => filteredLines.reduce((s, l) => s + l.amount, 0), [filteredLines])

  const byVendor = useMemo(() => {
    const map = filteredLines.reduce((acc, l) => { const v = l.vendor || 'Unknown'; acc[v] = (acc[v] || 0) + l.amount; return acc }, {})
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [filteredLines])

  const byPeptide = useMemo(() => {
    const map = filteredLines.reduce((acc, l) => { const p = l.peptide || 'Unknown'; acc[p] = (acc[p] || 0) + l.amount; return acc }, {})
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [filteredLines])

  const maxV = Math.max(1, ...byVendor.map(([, v]) => v))
  const maxP = Math.max(1, ...byPeptide.map(([, v]) => v))

  const perOrderRows = useMemo(() => {
    const orderMap = new Map(); let stTotal = 0
    filteredLines.forEach(l => {
      if (l.source === 'order' && l.orderId) {
        const cur = orderMap.get(l.orderId) || { date: l.date, vendor: l.vendor, total: 0 }
        cur.total += l.amount; orderMap.set(l.orderId, cur)
      } else if (l.source === 'stockpile') stTotal += l.amount
    })
    const rows = Array.from(orderMap.entries()).map(([id, { date, vendor, total }]) => ({ id, date, vendor: vendor || 'Unknown', total }))
    rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    const out = rows.slice(0, 15)
    if (stTotal > 0) out.push({ id: '_stockpile', date: null, vendor: 'Stockpile / Manual', total: stTotal })
    return out
  }, [filteredLines])

  const filtersBlock = (
    <>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
        <div className="min-w-0">
          <SearchableDropdown options={vendorOptions} value={vendorFilter} onChange={setVendorFilter} placeholder="All vendors" theme={theme} idleMessage="Search vendors" emptyMessage="No vendors" />
        </div>
        <div className="min-w-0">
          <SearchableDropdown options={peptideOptions} value={peptideFilter} onChange={setPeptideFilter} placeholder="All peptides" theme={theme} idleMessage="Search peptides" emptyMessage="No peptides" />
        </div>
        <div className="relative flex-shrink-0" ref={dateRef}>
          <button type="button" onClick={() => setDateOpen(o => !o)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs"
            style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#fff', color: theme.text, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)', minWidth: 88 }}
          >
            <span className="truncate">{dateLabels[dateRange]}</span>
            <CaretDown weight="duotone" size={12} style={{ color: theme.textLight, flexShrink: 0 }} />
          </button>
          {dateOpen && (
            <div className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
              style={{ backgroundColor: theme.isDark ? theme.cardBackground : '#fff', borderColor: theme.border, minWidth: '100%' }}>
              {Object.entries(dateLabels).map(([key, label], idx) => (
                <button key={key} type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { setDateRange(key); setDateOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs transition-all"
                  style={{ color: dateRange === key ? theme.primary : theme.text, borderTop: idx > 0 ? `1px solid ${theme.border}` : undefined }}
                >{label}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.07)' }}>
        <span className="text-xs font-medium" style={{ color: theme.textLight }}>Total (filtered)</span>
        <span className="text-base font-bold" style={{ color: theme.primary }}>{formatCurrency(filteredTotal)}</span>
      </div>
    </>
  )

  const listsBlock = (
    <>
      {byVendor.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: theme.textLight }}>By Vendor</div>
          <div className="space-y-1.5">
            {byVendor.map(([name, val]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="truncate pr-2" style={{ color: theme.text }}>{name}</span>
                  <span className="font-semibold flex-shrink-0" style={{ color: theme.primary }}>{formatCurrency(val)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(val / maxV) * 100}%`, backgroundColor: theme.primary }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {byPeptide.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: theme.textLight }}>By Peptide / Compound</div>
          <div className="space-y-1.5">
            {byPeptide.map(([name, val]) => (
              <div key={name}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="truncate pr-2" style={{ color: theme.text }}>{name}</span>
                  <span className="font-semibold flex-shrink-0" style={{ color: theme.primary }}>{formatCurrency(val)}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(val / maxP) * 100}%`, backgroundColor: theme.primary }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {perOrderRows.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: theme.textLight }}>Per Order</div>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: borderColor }}>
            {perOrderRows.map((row, i) => (
              <div key={row.id} className="flex items-center justify-between px-3 py-2 text-xs"
                style={{ borderTop: i > 0 ? `1px solid ${borderColor}` : undefined, backgroundColor: i % 2 === 0 ? 'transparent' : subtleBg }}>
                <span style={{ color: theme.textLight, minWidth: 60 }}>{row.date || '—'}</span>
                <span className="flex-1 truncate px-2 font-medium" style={{ color: theme.text }}>{row.vendor}</span>
                <span className="font-semibold flex-shrink-0" style={{ color: theme.primary }}>{formatCurrency(row.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )

  return (
    <SectionCard title="Spending Breakdown" theme={theme} borderColor={borderColor}
      className={inCarousel ? 'max-h-[min(26rem,56dvh)]' : ''}
      icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Spending Breakdown', [
        `💵 Filtered Total: ${formatCurrency(filteredTotal)}`,
        ...byVendor.slice(0, 3).map(([n, v]) => `  ${n}: ${formatCurrency(v)}`),
      ]) : null}
    >
      {inCarousel ? (
        <div className="flex flex-col flex-1 min-h-0 gap-4">
          <div className="flex-shrink-0 space-y-4">{filtersBlock}</div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scrollbar-hide pr-0.5 space-y-4">{listsBlock}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtersBlock}
          {listsBlock}
        </div>
      )}
    </SectionCard>
  )
}

/* ─────────────────── SPENDING TAB ─────────────────── */
function SpendingTab({ theme, stats, orders, stockpile, subtleBg, borderColor, onShowBreakdown, shareCard, carouselMode = false, isPremium = true, onUpgradeClick }) {
  const [activeSlide, setActiveSlide] = useState(0)
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

  const _cards = [
    /* Slide 1: Summary metrics */
    <SectionCard key="metrics" title="Spending Summary" theme={theme} borderColor={borderColor}
      icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Spending Summary', [
        `💵 This Month: ${formatCurrency(extra.thisMonthSpend)}`,
        `📅 Last Month: ${formatCurrency(stats.lastMonthSpend)}`,
        `🏦 All-Time: ${formatCurrency(stats.totalSpend)}`,
      ]) : null}
    >
      <div className="space-y-3">
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
        <div className="grid grid-cols-2 gap-2">
          <MetricCard icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />} label="Last 90 Days" value={formatCurrency(stats.last90DaysSpend)} theme={theme} />
          <MetricCard icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />} label="Avg / Order" value={formatCurrency(extra.avgOrderCost)} theme={theme} />
          <MetricCard label="Total Orders" value={extra.totalOrders} theme={theme} />
          <MetricCard label="Vendors Used" value={extra.uniqueVendors} theme={theme} />
          <MetricCard label="Peptides Ordered" value={extra.uniquePeptides} theme={theme} />
          <MetricCard icon={<Archive weight="duotone" size={14} style={{ color: theme.primary }} />} label="Stockpile Value" value={formatCurrency(extra.stockpileValue)} theme={theme} />
        </div>
        <button type="button"
          onClick={() => carouselMode ? setActiveSlide(1) : onShowBreakdown?.()}
          className="text-xs py-1.5 rounded text-center w-full transition-opacity font-medium flex items-center justify-center gap-1"
          style={{ color: theme.isDark ? theme.textLight : theme.primary }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          View full breakdown &middot; By vendor &amp; peptide
          {carouselMode && <CaretRight weight="duotone" size={12} />}
        </button>
      </div>
    </SectionCard>,

    /* Slide 2: Full Spending Breakdown (was modal) */
    <SpendingBreakdownCard key="breakdown" theme={theme} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} inCarousel={carouselMode} />,

    /* Slide 3: Monthly Spend Trend */
    <SectionCard key="monthly"
      title="Monthly Spend Trend" theme={theme} borderColor={borderColor}
      onShare={shareCard ? () => shareCard('Monthly Spend Trend', [
        `💵 This Month: ${formatCurrency(extra.thisMonthSpend)}`,
        `📅 Last Month: ${formatCurrency(stats.lastMonthSpend)}`,
        `🏦 All-Time: ${formatCurrency(stats.totalSpend)}`,
        `📦 Orders: ${extra.totalOrders} across ${extra.uniqueVendors} vendor${extra.uniqueVendors !== 1 ? 's' : ''}`,
      ]) : null}
    >
      <MonthlySpendChart orders={orders} theme={theme} />
    </SectionCard>,

    /* Slide 3: Top Vendors */
    <SectionCard key="vendors"
      title="Top Vendors by Spend" theme={theme} borderColor={borderColor}
      onShare={shareCard ? () => shareCard('Top Vendors by Spend', [
        `🏦 All-Time Research Spend: ${formatCurrency(stats.totalSpend)}`,
        `🛒 Total Orders: ${extra.totalOrders}`,
        `🏪 Vendors Used: ${extra.uniqueVendors}`,
      ]) : null}
    >
      <TopVendors orders={orders} theme={theme} />
    </SectionCard>,

    /* Slide 4: Spend by Peptide */
    <SectionCard key="peptide"
      title="Spend by Peptide" theme={theme} borderColor={borderColor}
      onShare={shareCard ? () => shareCard('Spend by Peptide', [
        `🧪 Peptides Ordered: ${extra.uniquePeptides}`,
        `💵 Avg / Order: ${formatCurrency(extra.avgOrderCost)}`,
        `📦 Stockpile Value: ${formatCurrency(extra.stockpileValue)}`,
      ]) : null}
    >
      <SpendByPeptide orders={orders} theme={theme} />
    </SectionCard>,

    /* Slide 5: Average $/mg */
    <SectionCard key="avgmg" title="Average $/mg" theme={theme} borderColor={borderColor}>
      <AvgCostPerMg orders={orders} theme={theme} />
    </SectionCard>,

    /* Slide 6: Peptide Cost Trend */
    <SectionCard key="trend" title="Peptide Cost Trend" theme={theme} borderColor={borderColor}>
      <PeptideCostTrend orders={orders} theme={theme} />
    </SectionCard>,
  ].filter(Boolean)

  if (!isPremium) {
    const free = _cards.slice(0, 1)
    const wall = (
      <InsightsPremiumWall
        key="insights-premium-spending"
        variant="card"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Spending analytics"
        featureBullets={[
          'Full vendor & peptide breakdown',
          'Monthly trends, top vendors & cost-per-mg',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
    const out = [...free, wall]
    const idx = Math.min(activeSlide, Math.max(0, out.length - 1))
    if (carouselMode) return <CardCarousel cards={out} theme={theme} borderColor={borderColor} activeIndex={idx} onChangeIndex={setActiveSlide} />
    return <div className="space-y-4">{out}</div>
  }

  if (carouselMode) return <CardCarousel cards={_cards} theme={theme} borderColor={borderColor} activeIndex={activeSlide} onChangeIndex={setActiveSlide} />
  return <div className="space-y-4">{_cards}</div>
}

/* ─────────────────── INVENTORY TAB ─────────────────── */
function InventoryTab({ theme, stats, orders, stockpile, subtleBg, borderColor, shareCard, carouselMode = false, isPremium = true, onUpgradeClick }) {
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

  if (!isPremium) {
    return (
      <InsightsPremiumWall
        variant="full"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Inventory Analytics"
        featureBullets={[
          'Lead-time charts & vendor on-time scores',
          'Top stockpile items & low-stock alerts',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
  }

  const _cards = [
    /* Slide 1: Summary metrics */
    <SectionCard key="metrics" title="Inventory Summary" theme={theme} borderColor={borderColor}
      icon={<Archive weight="duotone" size={14} style={{ color: theme.primary }} />}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="Unique Items" value={extra.uniqueNames} theme={theme} />
          <MetricCard label="Total Vials" value={extra.totalVials} theme={theme} />
          <MetricCard icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />} label="Stockpile Value" value={formatCurrency(extra.totalValue)} theme={theme} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard icon={<Truck weight="duotone" size={16} style={{ color: theme.primary }} />} label="Avg. Delivery" value={stats.avgLeadTime !== 'N/A' ? `${stats.avgLeadTime}d` : 'N/A'} theme={theme} />
          <MetricCard icon={<Archive weight="duotone" size={16} className="text-red-400" />} label="Low Stock" value={stats.lowStock} theme={theme} />
          <MetricCard icon={<Package weight="duotone" size={16} style={{ color: theme.primary }} />} label="Delivered" value={stats.delivered} theme={theme} />
          <MetricCard label="In Transit" value={extra.pendingOrders} theme={theme} />
          {extra.fastestDelivery !== null && <MetricCard label="Fastest" value={`${extra.fastestDelivery}d`} theme={theme} />}
          {extra.slowestDelivery !== null && <MetricCard label="Slowest" value={`${extra.slowestDelivery}d`} theme={theme} />}
        </div>
      </div>
    </SectionCard>,

    /* Slide 2: Delivery Lead-time */
    <SectionCard key="leadtime" title="Delivery Lead-time (days)" theme={theme} borderColor={borderColor}>
      <LeadtimeHistogram orders={orders} theme={theme} />
    </SectionCard>,

    /* Slide 3: Vendor Lead-time */
    <SectionCard key="vendor-lead" title="Vendor Lead-time & On-time" theme={theme} borderColor={borderColor}>
      <VendorLeadtimeOnTime orders={orders} theme={theme} />
    </SectionCard>,

    /* Slide 4: Top by Qty (conditional) */
    extra.topByQty.length > 0 ? (
      <SectionCard key="top-qty"
        title="Top Items by Quantity" theme={theme} borderColor={borderColor}
        onShare={shareCard ? () => shareCard('My Stockpile', [
          `📦 Total Vials: ${Math.round(extra.totalVials)}`,
          `💰 Stockpile Value: ${formatCurrency(extra.totalValue)}`,
          ...extra.topByQty.slice(0, 3).map(([name, v]) => `  ${name}: ${v.qty} vials`),
        ]) : null}
      >
        <div className="space-y-1.5">
          {extra.topByQty.map(([name, v]) => (
            <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
              <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{name}</span>
              <span className="font-semibold" style={{ color: theme.textLight }}>{v.qty} vials</span>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,

    /* Slide 5: Top by Value (conditional) */
    extra.topByValue.length > 0 ? (
      <SectionCard key="top-val"
        title="Top Items by Value" theme={theme} borderColor={borderColor}
        onShare={shareCard ? () => shareCard('Stockpile by Value', [
          `💰 Total Stockpile Value: ${formatCurrency(extra.totalValue)}`,
          ...extra.topByValue.slice(0, 3).map(([name, v]) => `  ${name}: ${formatCurrency(v.value)}`),
        ]) : null}
      >
        <div className="space-y-1.5">
          {extra.topByValue.map(([name, v]) => (
            <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
              <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{name}</span>
              <span className="font-semibold" style={{ color: theme.primary }}>{formatCurrency(v.value)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,

    /* Slide 6: Low Stock Items */
    <SectionCard key="lowstock" title="Low Stock Items" theme={theme} borderColor={borderColor}>
      <LowStockList stockpile={stockpile} theme={theme} />
    </SectionCard>,
  ].filter(Boolean)

  if (carouselMode) return <CardCarousel cards={_cards} theme={theme} borderColor={borderColor} />
  return <div className="space-y-4">{_cards}</div>
}

/* ─────────────────── PROTOCOLS TAB ─────────────────── */
function ProtocolsTab({ theme, protocolHistory, protocolHistoryStats, stats, protocols, subtleBg, borderColor, shareCard, carouselMode = false, isPremium = true, onUpgradeClick }) {
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

  if (!isPremium) {
    return (
      <InsightsPremiumWall
        variant="full"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Protocol Analytics"
        featureBullets={[
          'Completed-by-month & completion status charts',
          'Duration trends, peptides used & delivery methods',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
  }

  const deliveryLabel = { pipette: 'Syringe', pen: 'Pen', nasal: 'Nasal', topical: 'Topical' }

  const _cards = [
    /* Slide 1: Summary metrics */
    <SectionCard key="metrics" title="Protocol Summary" theme={theme} borderColor={borderColor}
      icon={<Flask weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('My Protocol Journey', [
        `📋 Total Completed: ${extra.totalCompleted}`,
        `🔬 Active Now: ${stats.activeProtocols}`,
        extra.completionRate !== null ? `✅ Completion Rate: ${extra.completionRate}%` : null,
      ].filter(Boolean)) : null}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <MetricCard icon={<Flask weight="duotone" size={14} className="text-indigo-400" />} label="Completed" value={extra.totalCompleted} theme={theme} />
          <MetricCard icon={<Clock weight="duotone" size={14} style={{ color: theme.primary }} />} label="This Month" value={protocolHistoryStats.thisMonth} theme={theme} />
          <MetricCard icon={<CheckCircle weight="duotone" size={14} className="text-green-400" />} label="Active Now" value={stats.activeProtocols} theme={theme} />
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
      </div>
    </SectionCard>,

    /* Slide 2: Completed by Month */
    <SectionCard key="by-month"
      title="Completed by Month" theme={theme} borderColor={borderColor}
      onShare={shareCard ? () => shareCard('My Protocol Journey', [
        `📋 Total Completed: ${extra.totalCompleted}`,
        `🔬 Active Now: ${stats.activeProtocols}`,
        extra.avgDuration !== null ? `⏱ Avg Duration: ${extra.avgDuration} days` : null,
        extra.completionRate !== null ? `✅ Completion Rate: ${extra.completionRate}%` : null,
        extra.longestProtocol !== null ? `🏆 Longest Protocol: ${extra.longestProtocol} days` : null,
      ].filter(Boolean)) : null}
    >
      <ProtocolsCompletedByMonth protocolHistory={protocolHistory} theme={theme} />
    </SectionCard>,

    /* Slide 3: Completion Status */
    <SectionCard key="status" title="Completion Status" theme={theme} borderColor={borderColor}>
      <ProtocolCompletionStatus protocolHistory={protocolHistory} theme={theme} />
    </SectionCard>,

    /* Slide 4: Duration Trend */
    <SectionCard key="duration" title="Avg Duration by Month" theme={theme} borderColor={borderColor}>
      <ProtocolDurationTrend protocolHistory={protocolHistory} theme={theme} />
    </SectionCard>,

    /* Slide 5: Most Used Peptides (conditional) */
    extra.topPeptides.length > 0 ? (
      <SectionCard key="top-peptides"
        title="Most Used Peptides" theme={theme} borderColor={borderColor}
        onShare={shareCard ? () => shareCard('My Most Used Peptides', [
          ...extra.topPeptides.map(([name, count]) => `  🧪 ${name}: ${count} protocol${count !== 1 ? 's' : ''}`),
          `📋 Active Now: ${stats.activeProtocols}`,
          extra.completionRate !== null ? `✅ Completion Rate: ${extra.completionRate}%` : null,
        ].filter(Boolean)) : null}
      >
        <div className="space-y-1.5">
          {extra.topPeptides.map(([name, count]) => (
            <div key={name} className="flex items-center justify-between text-xs p-1.5 rounded-lg" style={{ backgroundColor: subtleBg }}>
              <span className="truncate pr-2 font-medium" style={{ color: theme.text }}>{name}</span>
              <span className="font-semibold" style={{ color: theme.textLight }}>{count} protocol{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,

    /* Slide 6: Delivery Methods (conditional) */
    extra.deliveryMethodList.length > 0 ? (
      <SectionCard key="delivery" title="Delivery Methods" theme={theme} borderColor={borderColor}>
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
    ) : null,
  ].filter(Boolean)

  if (carouselMode) return <CardCarousel cards={_cards} theme={theme} borderColor={borderColor} />
  return <div className="space-y-4">{_cards}</div>
}

/* ─────────────────── HALF-LIFE TAB ─────────────────── */

const DECAY_COLORS = ['#7F9E95', '#c87a5c', '#6B8DD6', '#D4A85C', '#9B7FC4', '#5CA8C8', '#C45C7A', '#5CC88D']

/* Known half-lives (hours) for common research peptides — used for estimates when user hasn't entered values */
const HALF_LIFE_LOOKUP = [
  { match: ['bpc-157', 'bpc157', 'bpc 157'],                  hours: 4,    display: '~4h',    note: 'Estimated' },
  { match: ['tb-500', 'tb500', 'tb 500', 'thymosin beta'],     hours: 24,   display: '~24h',   note: 'Estimated' },
  { match: ['semaglutide', 'sema'],                            hours: 168,  display: '~7d',    note: 'Estimated' },
  { match: ['tirzepatide'],                                    hours: 120,  display: '~5d',    note: 'Estimated' },
  { match: ['cjc-1295 dac', 'cjc1295 dac', 'cjc with dac'],   hours: 336,  display: '~14d',   note: 'Estimated' },
  { match: ['cjc-1295', 'cjc1295', 'cjc'],                    hours: 0.5,  display: '~30min', note: 'Estimated' },
  { match: ['ipamorelin'],                                     hours: 2,    display: '~2h',    note: 'Estimated' },
  { match: ['ghrp-2', 'ghrp2'],                               hours: 0.5,  display: '~30min', note: 'Estimated' },
  { match: ['ghrp-6', 'ghrp6'],                               hours: 0.5,  display: '~30min', note: 'Estimated' },
  { match: ['hexarelin'],                                      hours: 3,    display: '~3h',    note: 'Estimated' },
  { match: ['sermorelin'],                                     hours: 0.33, display: '~20min', note: 'Estimated' },
  { match: ['igf-1 lr3', 'igf1 lr3', 'igf lr3'],              hours: 20,   display: '~20h',   note: 'Estimated' },
  { match: ['igf-1', 'igf1'],                                  hours: 0.5,  display: '~30min', note: 'Estimated' },
  { match: ['mt-ii', 'mt2', 'melanotan'],                      hours: 24,   display: '~24h',   note: 'Estimated' },
  { match: ['pt-141', 'pt141', 'bremelanotide'],               hours: 8,    display: '~8h',    note: 'Estimated' },
  { match: ['semax'],                                          hours: 10,   display: '~10h',   note: 'Estimated' },
  { match: ['selank'],                                         hours: 0.08, display: '~5min',  note: 'Estimated' },
  { match: ['ghk-cu', 'ghkcu', 'ghk cu'],                     hours: 24,   display: '~24h',   note: 'Estimated' },
  { match: ['aod-9604', 'aod9604', 'aod'],                    hours: 3,    display: '~3h',    note: 'Estimated' },
  { match: ['tesamorelin'],                                    hours: 2,    display: '~2h',    note: 'Estimated' },
  { match: ['epithalon'],                                      hours: 1,    display: '~1h',    note: 'Estimated' },
  { match: ['ll-37', 'll37'],                                  hours: 3,    display: '~3h',    note: 'Estimated' },
  { match: ['kpv'],                                            hours: 3,    display: '~3h',    note: 'Estimated' },
  { match: ['dihexa'],                                         hours: 120,  display: '~5d',    note: 'Estimated' },
  { match: ['5-amino', '5amino', '1mq'],                       hours: 8,    display: '~8h',    note: 'Estimated' },
  { match: ['ara-290', 'ara290'],                              hours: 4,    display: '~4h',    note: 'Estimated' },
  { match: ['ss-31', 'elamipretide'],                          hours: 1,    display: '~1h',    note: 'Estimated' },
  { match: ['peg-mgf', 'pegmgf'],                              hours: 24,   display: '~24h',   note: 'Estimated' },
  { match: ['mgf'],                                            hours: 0.5,  display: '~30min', note: 'Estimated' },
  { match: ['kisspeptin'],                                     hours: 0.5,  display: '~30min', note: 'Estimated' },
  { match: ['humanin'],                                        hours: 2,    display: '~2h',    note: 'Estimated' },
  { match: ['nad+', 'nad'],                                    hours: 1,    display: '~1h',    note: 'Estimated' },
  { match: ['foxo4-dri', 'foxo4'],                             hours: 72,   display: '~3d',    note: 'Estimated' },
  { match: ['mots-c', 'motsc'],                                hours: 1,    display: '~1h',    note: 'Estimated' },
  { match: ['liraglutide'],                                    hours: 13,   display: '~13h',   note: 'Estimated' },
  { match: ['retatrutide'],                                    hours: 168,  display: '~7d',    note: 'Estimated' },
  { match: ['growth hormone', 'hgh', 'somatropin'],            hours: 3,    display: '~3h',    note: 'Estimated' },
]

function lookupHalfLife(peptideName) {
  const lower = (peptideName || '').toLowerCase().trim()
  for (const entry of HALF_LIFE_LOOKUP) {
    if (entry.match.some(m => lower.includes(m) || m.includes(lower.replace(/[^a-z0-9]/g, '')))) {
      return entry
    }
  }
  return null
}

function HalfLifeTab({ theme, protocols, reconItems = [], supplements = [], taskCompletion = {}, subtleBg, borderColor, carouselMode = false, isPremium = true, onUpgradeClick }) {
  const { peptideData, isMockData, hasEstimated } = useMemo(() => {
    const active = (protocols || []).filter(p => p.active !== false)
    const real = []
    const mock = []
    let estimated = false

    for (const p of active) {
      if (!p.peptides || !Array.isArray(p.peptides)) continue
      for (const pep of p.peptides) {
        const hlHours = getHalfLifeInHours(pep)
        if (hlHours > 0) {
          const isEstimated = pep.halfLifeSource === 'estimated'
          if (isEstimated) estimated = true
          real.push({
            name: pep.name || 'Unnamed',
            protocolName: p.protocolName || p.name || 'Protocol',
            halfLifeHours: hlHours,
            halfLifeDisplay: pep.halfLife,
            clearanceHours: getClearanceTimeHours(hlHours),
            washout: p.washout,
            duration: p.duration,
            isMock: false,
            isEstimated,
          })
        } else if (pep.name) {
          const est = lookupHalfLife(pep.name)
          if (est) {
            mock.push({
              name: pep.name,
              protocolName: p.protocolName || p.name || 'Protocol',
              halfLifeHours: est.hours,
              halfLifeDisplay: est.display,
              clearanceHours: getClearanceTimeHours(est.hours),
              washout: null,
              duration: p.duration,
              isMock: true,
              isEstimated: true,
            })
          }
        }
      }
    }

    if (real.length > 0) return { peptideData: real, isMockData: false, hasEstimated: estimated }
    return { peptideData: mock, isMockData: mock.length > 0, hasEstimated: mock.length > 0 }
  }, [protocols])

  /* ── Blood-level accumulation: walk protocol history day-by-day ── */
  const accumulationSeries = useMemo(() => {
    const active = (protocols || []).filter(p => p.active !== false && p.startDate)
    const now = new Date()
    const results = []

    for (const pd of peptideData) {
      // Find the protocol containing this peptide
      const protocol = active.find(p =>
        (p.peptides || []).some(pep => (pep.name || '').toLowerCase() === pd.name.toLowerCase())
      )
      if (!protocol) continue

      const startDate = new Date(protocol.startDate)
      if (isNaN(startDate.getTime())) continue

      const totalDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
      if (totalDays < 1) continue
      // Cap at 90 days for performance & readability
      const daysWindow = Math.min(totalDays, 90)
      const windowStart = new Date(now)
      windowStart.setDate(windowStart.getDate() - daysWindow)

      // Collect dose events (hours relative to windowStart)
      const doseHours = []
      for (let d = 0; d <= daysWindow; d++) {
        const checkDate = new Date(windowStart)
        checkDate.setDate(checkDate.getDate() + d)
        const dateKey = toKey(checkDate)
        const scheduled = calculateScheduledTasksForDate(checkDate, protocols, supplements, reconItems)

        // Always check real task completion — "mock" only refers to the half-life
        // value (sourced from literature), not the user's actual dose logs
        let wasDosed = false
        Object.keys(scheduled.bySlot || {}).forEach(slot => {
          const slotData = scheduled.bySlot[slot]
          ;(slotData.peptides || []).forEach(pep => {
            if ((pep.name || '').toLowerCase() !== pd.name.toLowerCase()) return
            const tid = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: slot, protocolId: pep.protocolId, peptideId: pep.peptideId })
            const td = taskCompletion[dateKey]?.[slot]?.[tid]
            if (td === true || (td && typeof td === 'object' && td.completed)) wasDosed = true
          })
        })

        if (wasDosed) doseHours.push(d * 24)
      }

      if (doseHours.length === 0) continue

      // Build daily blood-level checkpoints using exponential decay superposition
      const points = []
      for (let d = 0; d <= daysWindow; d++) {
        const currentHour = d * 24
        const level = doseHours.reduce((sum, dh) => {
          if (dh <= currentHour) return sum + Math.pow(0.5, (currentHour - dh) / pd.halfLifeHours)
          return sum
        }, 0)
        points.push({ day: d, level })
      }

      // Normalize so max = 1.0
      const maxLevel = Math.max(...points.map(p => p.level), 0.001)
      results.push({
        name: pd.name,
        isMock: pd.isMock,
        halfLifeHours: pd.halfLifeHours,
        protocolName: pd.protocolName,
        daysWindow,
        doseHours,
        points: points.map(p => ({ day: p.day, level: p.level / maxLevel })),
      })
    }
    return results
  }, [peptideData, protocols, supplements, reconItems, taskCompletion])

  if (!isPremium) {
    return (
      <InsightsPremiumWall
        variant="full"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Half-Life Analytics"
        featureBullets={[
          'Clearance timelines & decay visualizations',
          'Blood-level history & washout comparisons',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
  }

  if (peptideData.length === 0) {
    return (
      <SectionCard title="Half-Life Decay" theme={theme} borderColor={borderColor} icon={<Pulse weight="duotone" size={14} style={{ color: theme.primary }} />}>
        <div className="flex flex-col items-center justify-center text-center py-6">
          <Pulse weight="duotone" size={28} style={{ color: theme.textLight, opacity: 0.4 }} />
          <div className="text-sm font-medium mt-3 mb-1" style={{ color: theme.text }}>No half-life data yet</div>
          <div className="text-xs px-2 leading-relaxed" style={{ color: theme.textLight }}>
            Open the protocol editor, select a peptide, and set its half-life to see decay curves here.
          </div>
        </div>
      </SectionCard>
    )
  }

  const disclaimerBanner = (isMockData || hasEstimated) ? (
    <div className="flex items-start gap-2 p-2.5 rounded-xl mb-3"
      style={{ backgroundColor: theme.isDark ? 'rgba(180,140,60,0.12)' : 'rgba(180,140,60,0.08)', border: '1px solid rgba(180,140,60,0.22)' }}>
      <span className="text-base leading-none mt-0.5">⚠️</span>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#b58a30' }}>Estimated values</div>
        <div className="text-[10px] leading-relaxed" style={{ color: theme.textLight }}>
          {isMockData
            ? 'Half-life values not set — using published literature estimates for your active compounds. Your actual dose logs are used exactly. Set half-life in the protocol editor for precision.'
            : 'Some half-life values were auto-estimated from published research. Not medical advice. Edit half-life in the protocol editor to use your own values.'}
        </div>
      </div>
    </div>
  ) : null

  const _cards = [
    /* Slide 1: Current Decay Status — per-compound, anchored to last actual dose */
    <SectionCard key="decay"
      title={isMockData ? 'Compound Status (Estimated)' : 'Compound Status'}
      theme={theme} borderColor={borderColor}
    >
      {disclaimerBanner}
      <CurrentDecayStatusChart peptides={peptideData} accumulationSeries={accumulationSeries} theme={theme} subtleBg={subtleBg} />
    </SectionCard>,

    /* Slide 2: Clearance Timeline — when will each compound be cleared? */
    <SectionCard key="clearance"
      title={isMockData ? 'Clearance Timeline (Estimated)' : 'Clearance Timeline'}
      theme={theme} borderColor={borderColor}
      icon={<Clock weight="duotone" size={14} style={{ color: theme.primary }} />}
    >
      {disclaimerBanner}
      <div className="text-[10px] mb-3 leading-relaxed" style={{ color: theme.textLight }}>
        Based on your last logged dose — when each compound reaches &lt;1% of initial level.
      </div>
      <div className="space-y-2">
        {peptideData.map((p, i) => {
          const series = accumulationSeries.find(s => s.name.toLowerCase() === p.name.toLowerCase())
          const color = DECAY_COLORS[i % DECAY_COLORS.length]
          let hoursSinceDose = null
          let hoursUntilClear = null
          if (series && series.doseHours.length > 0) {
            const lastDoseHour = Math.max(...series.doseHours)
            hoursSinceDose = Math.max(0, series.daysWindow * 24 - lastDoseHour)
            hoursUntilClear = Math.max(0, p.clearanceHours - hoursSinceDose)
          }
          const alreadyClear = hoursUntilClear !== null && hoursUntilClear === 0
          // remainingPct: 100% = just dosed, 0% = fully cleared — intuitive direction
          const remainingPct = hoursSinceDose !== null
            ? Math.max(0, Math.min(100, Math.round((1 - hoursSinceDose / p.clearanceHours) * 100)))
            : null
          const currentLevel = hoursSinceDose !== null
            ? Math.round(Math.pow(0.5, hoursSinceDose / p.halfLifeHours) * 100)
            : null
          const fmtUntilClear = alreadyClear ? 'Cleared'
            : hoursUntilClear !== null
              ? hoursUntilClear < 48 ? `~${Math.round(hoursUntilClear)}h` : `~${(hoursUntilClear / 24).toFixed(1)}d`
              : null
          const hlLabel = p.halfLifeHours < 1
            ? `${Math.round(p.halfLifeHours * 60)}m HL`
            : p.halfLifeHours < 24
              ? `${p.halfLifeHours}h HL`
              : `${(p.halfLifeHours / 24).toFixed(1)}d HL`

          return (
            <div key={`${p.name}-${i}`} className="p-2.5 rounded-xl" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'}`, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: alreadyClear ? '#22c55e' : color }} />
                  <span className="text-xs font-semibold" style={{ color: theme.text }}>{p.name}{p.isMock ? ' *' : ''}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded-full" style={{ backgroundColor: color + '18', color }}>{hlLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {alreadyClear ? (
                    <span className="text-[10px] font-bold" style={{ color: '#22c55e' }}>Fully Cleared</span>
                  ) : currentLevel !== null ? (
                    <>
                      <span className="text-[10px]" style={{ color: theme.textLight }}>~{currentLevel}% active</span>
                      <span className="text-[10px] font-bold" style={{ color: color }}>clears {fmtUntilClear}</span>
                    </>
                  ) : (
                    <span className="text-[10px]" style={{ color: theme.textLight }}>No doses logged</span>
                  )}
                </div>
              </div>
              {/* Remaining bar: full = just dosed, empty = fully cleared */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${remainingPct ?? 0}%`, backgroundColor: alreadyClear ? '#22c55e' : color, opacity: 0.75 }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: theme.textLight }}>
                  {hoursSinceDose !== null ? fmtHoursAgo(hoursSinceDose) + ' last dose' : 'No dose history'}
                </span>
                <span className="text-[9px] font-medium" style={{ color: remainingPct !== null ? color : theme.textLight }}>
                  {remainingPct !== null ? `${remainingPct}% remaining` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </SectionCard>,

    /* Slide 3: Blood-Level History based on actual/estimated dose events */
    accumulationSeries.length > 0 ? (
      <SectionCard key="bloodlevel"
        title={isMockData ? 'Blood Level History (Estimated)' : 'Blood Level History'}
        theme={theme} borderColor={borderColor}
        icon={<Pulse weight="duotone" size={14} style={{ color: theme.primary }} />}
      >
        {disclaimerBanner}
        <div className="text-[10px] mb-3 leading-relaxed" style={{ color: theme.textLight }}>
          Estimated compound concentration based on your actual logged doses.
          Half-life decay values sourced from published literature{isMockData ? ' (set in protocol editor for precision)' : ''}.
        </div>
        <BloodLevelAccumulationChart series={accumulationSeries} theme={theme} />
      </SectionCard>
    ) : null,

    /* Slide 4: Washout vs Clearance (real data only) */
    !isMockData && peptideData.some(p => p.washout?.enabled) ? (
      <SectionCard key="washout" title="Washout vs Clearance" theme={theme} borderColor={borderColor}>
        <div className="space-y-3">
          {peptideData.filter(p => p.washout?.enabled).map((p, i) => (
            <WashoutComparison key={`${p.name}-${i}`} data={p} color={DECAY_COLORS[i % DECAY_COLORS.length]} theme={theme} />
          ))}
        </div>
      </SectionCard>
    ) : null,
  ].filter(Boolean)

  if (carouselMode) return <CardCarousel cards={_cards} theme={theme} borderColor={borderColor} />
  return <div className="space-y-4">{_cards}</div>
}

function fmtHoursAgo(hours) {
  if (hours === null || hours === undefined) return null
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 48) return `${Math.round(hours)}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function CurrentDecayStatusChart({ peptides, accumulationSeries, theme, subtleBg }) {
  const compounds = peptides.map((pd, idx) => {
    const series = accumulationSeries.find(s => s.name.toLowerCase() === pd.name.toLowerCase())
    let hoursSinceLastDose = null
    if (series && series.doseHours.length > 0) {
      const lastDoseHour = Math.max(...series.doseHours)
      hoursSinceLastDose = series.daysWindow * 24 - lastDoseHour
    }
    const currentLevel = hoursSinceLastDose !== null
      ? Math.pow(0.5, hoursSinceLastDose / pd.halfLifeHours)
      : null
    return { ...pd, hoursSinceLastDose, currentLevel, color: DECAY_COLORS[idx % DECAY_COLORS.length] }
  })

  if (!compounds.length) return null
  return (
    <div className="space-y-2.5">
      {compounds.map((c, idx) => (
        <CompoundDecayRow key={`${c.name}-${idx}`} compound={c} rowIdx={idx} theme={theme} subtleBg={subtleBg} />
      ))}
    </div>
  )
}

function CompoundDecayRow({ compound, rowIdx, theme }) {
  const W = 320, H = 58, PAD_T = 4, PAD_B = 16
  const chartW = W
  const chartH = H - PAD_T - PAD_B
  const clearance = compound.clearanceHours
  const pts = buildDecayCurve(compound.halfLifeHours, clearance, 80)
  const pathPts = pts.map(pt => {
    const x = (pt.hour / clearance) * chartW
    const y = PAD_T + (1 - pt.level) * chartH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePath = `M${pathPts.join(' L')}`
  const areaPath = `M0,${PAD_T + chartH} L${pathPts.join(' L')} L${chartW},${PAD_T + chartH} Z`
  const gradId = `cdrow-${rowIdx}`

  const nowFraction = compound.hoursSinceLastDose !== null
    ? Math.min(compound.hoursSinceLastDose / clearance, 0.99)
    : null
  const nowX = nowFraction !== null ? nowFraction * chartW : null
  const nowY = compound.currentLevel !== null
    ? PAD_T + (1 - compound.currentLevel) * chartH
    : null

  const hlLabel = clearance < 48
    ? `${compound.halfLifeHours < 1 ? `${Math.round(compound.halfLifeHours * 60)}m` : `${compound.halfLifeHours}h`} HL`
    : `${(compound.halfLifeHours / 24).toFixed(1)}d HL`
  const endLabel = clearance < 48 ? `${Math.round(clearance)}h` : `${(clearance / 24).toFixed(1)}d`

  const pct = compound.currentLevel !== null ? Math.round(compound.currentLevel * 100) : null

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: compound.color }} />
          <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{compound.name}{compound.isMock ? ' *' : ''}</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-0.5" style={{ backgroundColor: compound.color + '20', color: compound.color }}>{hlLabel}</span>
        </div>
        {pct !== null ? (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px]" style={{ color: theme.textLight }}>{fmtHoursAgo(compound.hoursSinceLastDose)}</span>
            <span className="text-[11px] font-bold" style={{ color: compound.color }}>{pct}%</span>
          </div>
        ) : (
          <span className="text-[10px]" style={{ color: theme.textLight }}>No doses logged</span>
        )}
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', marginTop: 4 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={compound.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={compound.color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={compound.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {nowX !== null && nowY !== null && (
          <>
            <line x1={nowX} y1={PAD_T} x2={nowX} y2={PAD_T + chartH} stroke={compound.color} strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
            <circle cx={nowX} cy={nowY} r="4" fill={compound.color} opacity="0.25" />
            <circle cx={nowX} cy={nowY} r="2.5" fill={compound.color} />
            <text x={Math.min(nowX + 4, W - 22)} y={nowY - 4} fontSize="7" fill={compound.color} fontWeight="700">Now</text>
          </>
        )}
        {/* X axis labels */}
        <text x={2} y={H - 3} fontSize="7" fill={theme.textLight} textAnchor="start">Dose</text>
        <text x={W / 2} y={H - 3} fontSize="7" fill={theme.textLight} textAnchor="middle">{clearance < 48 ? `${Math.round(clearance / 2)}h` : `${(clearance / 48).toFixed(1)}d`}</text>
        <text x={W - 2} y={H - 3} fontSize="7" fill={theme.textLight} textAnchor="end">{endLabel}</text>
      </svg>
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

function BloodLevelAccumulationChart({ series, theme }) {
  const W = 400, H = 170, PAD_L = 35, PAD_R = 12, PAD_T = 12, PAD_B = 28
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B

  const maxDays = Math.max(...series.map(s => s.daysWindow), 1)

  const paths = useMemo(() => series.map((s, idx) => {
    if (!s.points.length) return null
    const color = DECAY_COLORS[idx % DECAY_COLORS.length]
    const pts = s.points.map(p => {
      const x = PAD_L + (p.day / maxDays) * chartW
      const y = PAD_T + (1 - p.level) * chartH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    const line = `M${pts.join(' L')}`
    // Area fill
    const first = s.points[0]
    const last = s.points[s.points.length - 1]
    const fx = PAD_L + (first.day / maxDays) * chartW
    const lx = PAD_L + (last.day / maxDays) * chartW
    const area = `M${fx.toFixed(1)},${(PAD_T + chartH).toFixed(1)} L${pts.join(' L')} L${lx.toFixed(1)},${(PAD_T + chartH).toFixed(1)} Z`
    // Dose tick positions
    const doseTicks = s.doseHours.map(dh => {
      const day = dh / 24
      return PAD_L + (day / maxDays) * chartW
    })
    return { line, area, color, doseTicks }
  }).filter(Boolean), [series, maxDays, chartW, chartH])

  const yTicks = [0, 25, 50, 75, 100]
  const xTickCount = Math.min(7, maxDays)
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => Math.round((i / xTickCount) * maxDays))

  return (
    <div className="w-full overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="rounded">
        <defs>
          {paths.map((p, idx) => (
            <linearGradient key={`grad-${idx}`} id={`bl-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid */}
        {yTicks.map(pct => {
          const y = PAD_T + (1 - pct / 100) * chartH
          return (
            <g key={`y-${pct}`}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="0.5" />
              <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="8" fill={theme.textLight}>{pct}%</text>
            </g>
          )
        })}

        {/* "Today" marker at right edge */}
        <line x1={W - PAD_R} y1={PAD_T} x2={W - PAD_R} y2={PAD_T + chartH}
          stroke={theme.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'}
          strokeWidth="1" strokeDasharray="3,3" />
        <text x={W - PAD_R} y={PAD_T - 3} textAnchor="end" fontSize="7"
          fill={theme.textLight}>Today</text>

        {/* X-axis ticks */}
        {xTicks.map(d => {
          const x = PAD_L + (d / maxDays) * chartW
          return (
            <text key={`x-${d}`} x={x} y={H - 5} textAnchor="middle" fontSize="8" fill={theme.textLight}>
              {d === 0 ? 'Day 1' : `D${d}`}
            </text>
          )
        })}

        {/* Area fills */}
        {paths.map((p, idx) => (
          <path key={`area-${idx}`} d={p.area} fill={`url(#bl-grad-${idx})`} />
        ))}

        {/* Dose tick marks along bottom */}
        {paths.map((p, idx) =>
          p.doseTicks.map((x, di) => (
            <line key={`dose-${idx}-${di}`} x1={x} y1={PAD_T + chartH} x2={x} y2={PAD_T + chartH + 4}
              stroke={p.color} strokeWidth="1" opacity="0.5" />
          ))
        )}

        {/* Curve lines */}
        {paths.map((p, idx) => (
          <path key={`line-${idx}`} d={p.line} fill="none" stroke={p.color}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Current-level dots (last point) */}
        {paths.map((p, idx) => {
          const last = series[idx]?.points[series[idx].points.length - 1]
          if (!last) return null
          const cx = PAD_L + (last.day / maxDays) * chartW
          const cy = PAD_T + (1 - last.level) * chartH
          return (
            <g key={`dot-${idx}`}>
              <circle cx={cx} cy={cy} r="4" fill={p.color} opacity="0.25" />
              <circle cx={cx} cy={cy} r="2.5" fill={p.color} />
            </g>
          )
        })}
      </svg>

      {/* Legend with current level */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {series.map((s, idx) => {
          const last = s.points[s.points.length - 1]
          const pct = last ? Math.round(last.level * 100) : 0
          return (
            <div key={`${s.name}-${idx}`} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: DECAY_COLORS[idx % DECAY_COLORS.length] }} />
              <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>{s.name}{s.isMock ? ' *' : ''}</span>
              <span className="text-[10px] font-bold" style={{ color: DECAY_COLORS[idx % DECAY_COLORS.length] }}>{pct}%</span>
            </div>
          )
        })}
      </div>
      <div className="text-[9px] mt-1 opacity-60" style={{ color: theme.textLight }}>
        Tick marks along bottom = dose events · Current level shown as % of peak
      </div>
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
          <Clock weight="duotone" size={10} style={{ color: theme.textLight }} />
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
      className="grid gap-1 p-1 rounded-xl w-full"
      style={{
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.04)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)',
      }}
      role="tablist"
    >
      {options.map(opt => {
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 focus:outline-none active:scale-95"
            style={{
              backgroundColor: isActive ? '#445952' : 'transparent',
              color: isActive ? '#fff' : theme.textLight,
              border: isActive ? '1px solid #3B4240' : '1px solid transparent',
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
  const cardShadow = isCustomColor ? 'inset 0 2px 4px rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.15)' : 'inset 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.06)';
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

function SectionCard({ title, children, theme, borderColor, className = '', icon, onShare }) {
  const cardRef = useRef(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cardImageUrl, setCardImageUrl] = useState('')

  const captureCard = useCallback(async () => {
    if (!cardRef.current) return ''
    const { toPng } = await import('html-to-image')
    return toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: theme?.cardBackground || '#ffffff',
    })
  }, [theme])

  const handleShareOpen = useCallback(async () => {
    if (!onShare) return
    setShareOpen(true)
    setIsCapturing(true)
    setCardImageUrl('')
    try {
      const image = await captureCard()
      setCardImageUrl(image)
    } catch (err) {
      console.error('[SectionCardShare] capture failed', err)
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Could not capture this card yet. Try again.', type: 'error' },
      }))
    } finally {
      setIsCapturing(false)
    }
  }, [captureCard, onShare])

  const handleDownload = useCallback(() => {
    if (!cardImageUrl) return
    const a = document.createElement('a')
    a.href = cardImageUrl
    a.download = `analytics-${String(title || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}.png`
    a.click()
  }, [cardImageUrl, title])

  const handleNativeShare = useCallback(async () => {
    if (!cardImageUrl) return
    const fileName = `analytics-${String(title || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    try {
      const blob = await (await fetch(cardImageUrl)).blob()
      const file = new File([blob], fileName, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `The Pep Planner — ${title}`,
          text: `Check out my ${title} card from The Pep Planner.`,
          files: [file],
        })
        return
      }

      if (navigator.share) {
        await navigator.share({
          title: `The Pep Planner — ${title}`,
          text: `Check out my ${title} card from The Pep Planner.`,
        })
        return
      }

      handleDownload()
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.warn('[SectionCardShare] share failed, fallback to download', err)
      handleDownload()
    }
  }, [cardImageUrl, handleDownload, title])

  const handleShare = () => {
    if (onShare) {
      handleShareOpen()
    }
  }
  return (
    <div
      ref={cardRef}
      className={`p-3.5 rounded-xl flex flex-col min-h-0 h-full ${className}`}
      style={{
        border: `1px solid ${theme.border || (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
        backgroundColor: theme.cardBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
        boxShadow: theme.isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 4px rgba(0,0,0,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          {icon && icon}
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>{title}</h4>
        </div>
        {onShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all active:scale-95"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: theme.textLight,
              fontSize: '10px',
              fontWeight: 600,
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              boxShadow: theme.isDark
                ? 'inset 0 2px 4px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.2)'
                : 'inset 0 2px 4px rgba(255,255,255,0.55), inset 0 1px 2px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.05)',
            }}
            title="Share this card"
          >
            <ShareNetwork weight="duotone" size={10} />
            Share
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        theme={theme}
        title={title || 'Share Card'}
        variant="modern"
        maxWidth="max-w-md"
        footer={(
          <div className="w-full grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={isCapturing || !cardImageUrl}
              className="w-full py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{
                backgroundColor: theme.primary,
                color: theme.textOnPrimary,
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.18), 0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              Share
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isCapturing || !cardImageUrl}
              className="w-full py-2.5 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                color: theme.text,
                border: `1px solid ${theme.border}`,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
              }}
            >
              Download
            </button>
          </div>
        )}
      >
        <div className="space-y-3">
          <p className="text-xs" style={{ color: theme.textLight }}>
            Share only this card. This is separate from the 3-month promo flow.
          </p>
          <div
            className="rounded-xl p-3 flex items-center justify-center"
            style={{ border: `1px solid ${theme.border}`, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
          >
            {isCapturing ? (
              <div className="text-xs py-8" style={{ color: theme.textLight }}>Preparing card preview…</div>
            ) : cardImageUrl ? (
              <img src={cardImageUrl} alt={`${title} preview`} className="rounded-lg w-full h-auto" />
            ) : (
              <div className="text-xs py-8" style={{ color: theme.textLight }}>Preview unavailable</div>
            )}
          </div>
        </div>
      </Modal>
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
  const lows = useMemo(() => (stockpile || [])
    .filter(isLowStockpileEntry)
    .sort((a, b) => (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0))
    .slice(0, 5), [stockpile])
  if (lows.length === 0) return (
    <div className="text-xs flex items-center gap-2 py-1" style={{ color: theme.textLight }}>
      <CheckCircle weight="duotone" size={14} className="text-green-400" /> No low stock items
    </div>
  )
  return (
    <ul className="space-y-2">
      {lows.map((s, idx) => (
        <li key={s.id || `${s.name}-${idx}`} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}>
          <div className="flex items-center gap-2">
            <Warning weight="duotone" size={14} className="text-red-400" />
            <span className="text-xs font-medium" style={{ color: theme.text }}>
              {s.name}
              {s.type === 'supply' ? (s.brand ? ` · ${s.brand}` : '') : (s.mg ? ` (${s.mg} mg)` : '')}
            </span>
          </div>
          <span className="text-xs font-semibold text-red-500">{formatInventoryQtyLeftLabel(s)}</span>
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
