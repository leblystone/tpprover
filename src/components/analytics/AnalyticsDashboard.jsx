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
  CalendarBlank,
  Diamond,
  Flask,
  Flame,
  Lightning,
  LockSimple,
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
  ChartLine,
} from '@phosphor-icons/react'
import ShareIncentiveModal from '../shared/ShareIncentiveModal'
import AISummarizeAnalyticsModal from '../ai/AISummarizeAnalyticsModal'
import { featureFlags } from '../../config/featureFlags'
import { useTierAccess } from '../../utils/useSubscriptionAccess'
import { getHalfLifeInHours, buildDecayCurve, getClearanceTimeHours, formatHalfLifeTime } from '../../utils/halfLife'
import { getProtocolAccentHex, resolvePenColorToHex, normalizeHexToSixDigits } from '../../utils/protocolColors'
import { formatCurrency } from '../../utils/currencyUtils'
import { calculateScheduledTasksForDate } from '../../utils/calendarTasks'
import { getTaskCompletion, generateTaskId } from '../../utils/taskCompletion'
import { toKey } from '../calendar/MonthGrid'
import { getComplianceStats } from '../../utils/complianceStats'
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
  { label: 'Research',  shortLabel: 'Research',  value: 'overview' },
  { label: 'Consistency', shortLabel: 'Consist.', value: 'compliance' },
  { label: 'Spending',  shortLabel: 'Spending',  value: 'spending' },
  { label: 'Inventory', shortLabel: 'Inv.',      value: 'inventory' },
  { label: 'Protocols', shortLabel: 'Protocols', value: 'protocols' },
  { label: 'Half-Life', shortLabel: 'Half-Life', value: 'halflife' },
]

/** Section headers for Insights allSections / full-page mode */
const SECTION_META = {
  overview:   { label: 'My Research', Icon: Flask },
  compliance: { label: 'Consistency', Icon: CheckCircle },
  spending:   { label: 'Spending', Icon: CurrencyDollar },
  inventory:  { label: 'Inventory', Icon: Package },
  protocols:  { label: 'Protocols', Icon: Target },
  halflife:   { label: 'Half-Life', Icon: Pulse },
}

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

/** Expand / collapse pill used under summarized analytics sections */
function SeeAllPill({ moreCount, expanded, onToggle, theme }) {
  if (!expanded && moreCount <= 0) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold tracking-wide transition-all active:scale-[0.98] hover:opacity-80"
      style={{
        color: theme.primary,
        backgroundColor: theme.isDark ? `${theme.primary}12` : `${theme.primary}0C`,
        border: `1px solid ${theme.isDark ? `${theme.primary}28` : `${theme.primary}20`}`,
      }}
    >
      {expanded ? (
        <>Show less <CaretDown weight="duotone" size={12} style={{ transform: 'rotate(180deg)' }} /></>
      ) : (
        <>{moreCount} more card{moreCount !== 1 ? 's' : ''} <CaretRight weight="duotone" size={12} /></>
      )}
    </button>
  )
}

/** Shared finalize for tab card lists — summarize, stack, or carousel */
function finalizeTabCards({ cards, heroCount = 1, summarizeMode = false, expanded = false, setExpanded, carouselMode = false, theme, borderColor, activeIndex, onChangeIndex }) {
  const list = (cards || []).filter(Boolean)
  if (carouselMode && !summarizeMode) {
    if (activeIndex !== undefined) {
      return <CardCarousel cards={list} theme={theme} borderColor={borderColor} activeIndex={activeIndex} onChangeIndex={onChangeIndex} />
    }
    return <CardCarousel cards={list} theme={theme} borderColor={borderColor} />
  }
  const showSummary = summarizeMode && !expanded
  const visible = showSummary ? list.slice(0, heroCount) : list
  const moreCount = Math.max(0, list.length - heroCount)
  return (
    <div className="space-y-4">
      {visible}
      {summarizeMode && (
        <SeeAllPill
          moreCount={moreCount}
          expanded={expanded}
          onToggle={() => setExpanded?.((v) => !v)}
          theme={theme}
        />
      )}
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
  const { hasAIAccess } = useTierAccess()
  const summarizeEnabled = featureFlags.ENABLE_AI_RESEARCH && hasAIAccess
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
  const [aiSummarizeOpen, setAiSummarizeOpen] = useState(false)

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

  const complianceData = useMemo(
    () => getComplianceStats(protocols, supplements, reconItems, taskCompletion),
    [protocols, supplements, reconItems, taskCompletion]
  )

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

    // Daily dose series (90d) + 30d total — scheduled peptide/supplement completions
    const doseSeries90d = []
    for (let i = 89; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dk = toKey(d)
      let dayDoses = 0
      const sched = calculateScheduledTasksForDate(d, protocols, supplements, reconItems)
      Object.keys(sched.bySlot || {}).forEach(slot => {
        const sl = sched.bySlot[slot];
        (sl.peptides || []).forEach(pep => {
          const tid = generateTaskId({ type: 'peptide', name: pep.name || 'Peptide', dose: pep.dose || '', unit: pep.unit || '', time: slot, protocolId: pep.protocolId, peptideId: pep.peptideId })
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) dayDoses++
        });
        (sl.supplements || []).forEach(supp => {
          const tid = generateTaskId({ type: 'supplement', name: supp.name || 'Supplement', dose: supp.dose || '', unit: supp.unit || '', time: slot })
          const td = taskCompletion[dk]?.[slot]?.[tid]
          if (td === true || (td && typeof td === 'object' && td.completed)) dayDoses++
        })
      })
      doseSeries90d.push({ date: dk, count: dayDoses })
    }
    const dosesLogged30d = doseSeries90d.slice(-30).reduce((s, x) => s + x.count, 0)

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

    return { avgDailySpend30, stockpileValue, lowStockItems, compoundList, endingSoon, bestStreak, dosesLogged30d, allTimeDoses, totalSpend, last30Spend, uniqueCompounds, daysTracking, complianceGrade, doseSeries90d }
  }, [protocols, orders, stockpile, supplements, reconItems, taskCompletion, complianceData.streak, complianceData.compliancePct])

  return (
    <div className={fullPage || allSections ? 'flex flex-col flex-1 min-h-0 h-full' : 'h-full flex flex-col'}>
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

      <div className={fullPage ? 'flex flex-col flex-1 min-h-0 gap-4' : 'flex-1 overflow-y-auto px-4 py-3'}>
        {allSections ? (
          /* ── Segmented toggle + one section at a time (matches Wellness) ── */
          <div className="flex flex-col flex-1 min-h-0 gap-4">
            <ToggleTabs
              value={activeTab}
              onChange={setActiveTab}
              theme={theme}
              ariaLabel="Analytics sections"
              options={SECTION_TABS}
            />
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
              {(() => {
                const meta = SECTION_META[activeTab] || SECTION_META.overview
                const Icon = meta.Icon
                const label = meta.label
                const premium = true
                const sectionNodes = {
                  overview: (
                    <OverviewTab theme={theme} overviewData={overviewData} complianceData={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} protocolHistory={protocolHistory} shareCard={shareCard} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
                  ),
                  compliance: (
                    <ComplianceTab theme={theme} data={complianceData} stats={stats} getColor={getComplianceColor} subtleBg={subtleBg} borderColor={borderColor} supplements={supplements} protocols={protocols} goals={goals} shareCard={shareCard} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
                  ),
                  spending: (
                    <SpendingTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} onShowBreakdown={() => setShowBreakdownModal(true)} shareCard={shareCard} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
                  ),
                  inventory: (
                    <InventoryTab theme={theme} stats={stats} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
                  ),
                  protocols: (
                    <ProtocolsTab theme={theme} protocolHistory={protocolHistory} protocolHistoryStats={protocolHistoryStats} stats={stats} protocols={protocols} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
                  ),
                  halflife: (
                    <HalfLifeTab theme={theme} protocols={protocols} reconItems={reconItems} supplements={supplements} taskCompletion={taskCompletion} subtleBg={subtleBg} borderColor={borderColor} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />
                  ),
                }
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2.5 px-1 w-full min-w-0">
                      <Icon size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
                      <h2
                        className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0"
                        style={{ color: theme.text }}
                      >
                        {label}
                      </h2>
                      {isTrialUser && premium && (
                        <span
                          className="relative inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide overflow-hidden shrink-0"
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
                      <div
                        className="flex-1 h-px min-w-0"
                        style={{
                          background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                        }}
                      />
                      {label === 'My Research' && summarizeEnabled && (
                        <button
                          type="button"
                          onClick={() => setAiSummarizeOpen(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide shrink-0 transition-all hover:opacity-80 active:scale-[0.98]"
                          style={{
                            backgroundColor: theme.isDark
                              ? `${theme.primary || '#7F9E95'}18`
                              : `${theme.primary || '#7F9E95'}12`,
                            color: theme.primary || '#7F9E95',
                            border: `1px solid ${theme.isDark ? `${theme.primary || '#7F9E95'}40` : `${theme.primary || '#7F9E95'}30`}`,
                          }}
                        >
                          <ChartLine size={13} weight="duotone" />
                          Summarize
                        </button>
                      )}
                    </div>
                    {sectionNodes[activeTab] || sectionNodes.overview}
                  </div>
                )
              })()}
            </div>
          </div>
        ) : (
          <>
            {/* Toggle tabs (only when NOT fullPage) */}
            {!fullPage && (
              <ToggleTabs
                value={activeTab}
                onChange={setActiveTab}
                theme={theme}
                options={SECTION_TABS}
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
      <AISummarizeAnalyticsModal
        open={aiSummarizeOpen}
        onClose={() => setAiSummarizeOpen(false)}
        theme={theme}
        overviewData={overviewData}
        complianceData={complianceData}
        stats={stats}
        protocols={protocols}
        supplements={supplements}
      />
    </div>
  )
}

/* ─────────────────── ACHIEVEMENTS CARD ─────────────────── */
function AchievementsCard({ theme, overviewData, complianceData, stats, completedProtocols, subtleBg, borderColor, shareCard, getColor: getColorProp }) {
  const getColor = getColorProp || ((pct) => {
    if (pct >= 90) return theme.primary
    if (pct >= 70) return theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706'
    return theme.isDark ? 'rgba(197, 130, 100, 0.9)' : '#b5684a'
  })
  const { bestStreak, allTimeDoses, lowStockItems, complianceGrade } = overviewData
  const accent = theme.primary
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const gradId = React.useId().replace(/:/g, '')
  const [ringReady, setRingReady] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setRingReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Soft grade tones — no neon red / gym green
  const gradeTone =
    complianceGrade === 'A+' || complianceGrade === 'A' ? accent
    : complianceGrade === 'B' ? '#6b8f9e'
    : complianceGrade === 'C' ? '#9a906c'
    : complianceGrade === 'D' ? '#8f7a72'
    : muted

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
  const compliancePct = complianceData.hasData ? (complianceData.compliancePct ?? 0) : 0

  const shareLines = [
    `🎯 30-Day Compliance: ${complianceData.hasData ? `${compliancePct}%` : 'No data yet'} (Grade: ${complianceGrade})`,
    `🔥 Current Streak: ${complianceData.streak} days`,
    `⭐ Best Streak Ever: ${bestStreak > 0 ? `${bestStreak} days` : 'Not yet set'}`,
    unlockedList.length > 0 ? `🏅 Badges: ${unlockedList.map(a => a.label).join(', ')}` : '🏅 No badges yet',
  ]

  const ringSize = 88
  const stroke = 5
  const r = (ringSize - stroke) / 2
  const circ = 2 * Math.PI * r
  const ringPct = Math.max(0, Math.min(100, compliancePct))
  const offset = circ - ((ringReady ? ringPct : 0) / 100) * circ

  const statTiles = [
    { icon: Flame, label: 'Current streak', value: `${complianceData.streak || 0}d` },
    { icon: Star, label: 'Best streak', value: bestStreak > 0 ? `${bestStreak}d` : '—' },
    { icon: CheckCircle, label: '30-day compliance', value: complianceData.hasData ? `${compliancePct}%` : '—', valueColor: complianceData.hasData ? getColor(compliancePct) : theme.text },
  ]

  return (
    <SectionCard
      title="Achievements"
      theme={theme}
      borderColor={borderColor}
      icon={<Trophy weight="duotone" size={14} style={{ color: accent }} />}
      onShare={shareCard ? () => shareCard('My Research Achievements', shareLines) : null}
    >
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Hero: grade ring + clear streak / compliance rows */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="block -rotate-90">
              <defs>
                <linearGradient id={`ach-ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={gradeTone} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={gradeTone} stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none"
                stroke={theme.isDark ? `${accent}20` : `${accent}14`}
                strokeWidth={stroke}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none"
                stroke={`url(#ach-ring-${gradId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: theme.text }}>
                {complianceGrade}
              </span>
              <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: muted }}>
                grade
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {statTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <div
                  key={tile.label}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                    <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>
                      {tile.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: tile.valueColor || theme.text }}>
                    {tile.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Badge ladder — section break (not nested card) */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5 w-full min-w-0">
            <Medal size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2
              className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0"
              style={{ color: theme.text }}
            >
              Badge ladder ({unlockedList.length}/{ACHIEVEMENT_DEFS.length})
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>
          <p className="text-xs leading-snug mb-3 px-0.5" style={{ color: muted }}>
            Automatic milestones from tracking — not the same as personal Goals you set yourself.
          </p>

          {(() => {
            const byCat = {}
            evaluated.forEach((a) => {
              if (!byCat[a.cat]) byCat[a.cat] = []
              byCat[a.cat].push(a)
            })
            return Object.entries(byCat).map(([cat, items]) => (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="text-xs font-semibold mb-2 px-0.5" style={{ color: muted }}>
                  {cat}
                </div>
                <div className="space-y-2">
                  {items.map((a) => {
                    const Icon = a.iconComponent
                    const isNext = nextBadge?.id === a.id
                    const pct = Math.round(a.progress * 100)
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl px-2.5 py-2.5"
                        style={{
                          backgroundColor: a.unlocked
                            ? `${accent}10`
                            : subtleBg,
                          boxShadow: insetShadow,
                          outline: isNext && !a.unlocked ? `1px solid ${accent}40` : 'none',
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: a.unlocked ? `${accent}18` : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                            }}
                          >
                            <Icon
                              weight="duotone"
                              size={20}
                              style={{ color: a.unlocked ? accent : muted, opacity: a.unlocked ? 1 : 0.55 }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="text-sm font-semibold truncate"
                                style={{ color: a.unlocked ? theme.text : muted }}
                              >
                                {a.label}
                              </span>
                              {a.unlocked ? (
                                <CheckCircle weight="duotone" size={18} className="shrink-0" style={{ color: accent }} />
                              ) : (
                                <span className="flex items-center gap-1 shrink-0 text-xs tabular-nums font-semibold" style={{ color: muted }}>
                                  <LockSimple weight="duotone" size={14} />
                                  {a.val}/{a.threshold}
                                </span>
                              )}
                            </div>
                            <div className="text-xs leading-snug mt-0.5" style={{ color: muted }}>
                              {a.desc}
                            </div>
                            {!a.unlocked && (
                              <div
                                className="mt-2 h-1.5 rounded-full overflow-hidden"
                                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                              >
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(pct, a.val > 0 ? 3 : 0)}%`,
                                    backgroundColor: accent,
                                    opacity: isNext ? 0.75 : 0.45,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </div>

        {lockedList.length === 0 && (
          <div className="text-center text-xs font-semibold py-1" style={{ color: accent }}>
            All badges unlocked
          </div>
        )}
      </div>
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

/* ─────────────────── RESEARCH JOURNEY CARD ─────────────────── */
const JOURNEY_RANGES = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

function mkJourneySmoothPath(pts) {
  if (!pts.length) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1].x + pts[i].x) / 2
    d += ` C ${cx} ${pts[i - 1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  return d
}

function ResearchJourneyCard({
  theme, borderColor, subtleBg, shareCard,
  uniqueCompounds, activeProtocols, completedProtocols,
  dosesLogged30d, daysTracking, doseSeries90d = [],
  currentStreak = 0, summarizeMode = false,
  glanceStats = null,
}) {
  const gradId = React.useId().replace(/:/g, '')
  const [doseRange, setDoseRange] = useState(30)
  const [ringReady, setRingReady] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setRingReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const accent = theme.primary
  const muted = theme.textLight
  const protocolTotal = activeProtocols + completedProtocols
  const protocolPct = protocolTotal > 0 ? Math.round((activeProtocols / protocolTotal) * 100) : 0
  // Soft year-progress for tracking ring feel (caps at 100%)
  const trackPct = daysTracking > 0 ? Math.min(100, Math.round((daysTracking / 365) * 100)) : 0
  const ringPct = Math.max(protocolPct, trackPct > 0 ? Math.min(trackPct, 85) : 0, uniqueCompounds > 0 ? 12 : 0)

  const series = useMemo(() => {
    const all = doseSeries90d || []
    return all.slice(-doseRange)
  }, [doseSeries90d, doseRange])

  const doseTotal = useMemo(() => series.reduce((s, d) => s + (d.count || 0), 0), [series])
  const doseBest = useMemo(() => series.reduce((m, d) => Math.max(m, d.count || 0), 0), [series])
  const doseAvg = series.length > 0 ? doseTotal / series.length : 0
  const hasDoseActivity = doseTotal > 0

  const chart = useMemo(() => {
    const w = 360, h = 56, padT = 6, padB = 4, padX = 4
    const counts = series.map(d => d.count || 0)
    const max = Math.max(1, ...counts)
    const n = Math.max(1, counts.length - 1)
    const pts = counts.map((c, i) => ({
      x: padX + (i / n) * (w - padX * 2),
      y: padT + (1 - c / max) * (h - padT - padB),
      c,
    }))
    const line = mkJourneySmoothPath(pts)
    const area = pts.length >= 2
      ? `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`
      : ''
    return { w, h, pts, line, area, max }
  }, [series])

  const ringSize = 88
  const stroke = 5
  const r = (ringSize - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - ((ringReady ? ringPct : 0) / 100) * circ

  // One calm accent family — no orange / neon gym palette
  const metricTiles = [
    { icon: Target, label: 'Active', value: activeProtocols, bar: protocolTotal > 0 ? activeProtocols / protocolTotal : 0 },
    { icon: CheckCircle, label: 'Completed', value: completedProtocols, bar: protocolTotal > 0 ? completedProtocols / protocolTotal : 0 },
    { icon: Pill, label: 'Doses 30d', value: dosesLogged30d, bar: Math.min(1, dosesLogged30d / Math.max(doseBest * 7, 10)) },
    { icon: CalendarBlank, label: 'Tracking', value: daysTracking > 0 ? `${daysTracking}d` : '—', bar: trackPct / 100 },
  ]

  return (
    <SectionCard
      title="My Research Journey"
      theme={theme}
      borderColor={borderColor}
      icon={<Flask weight="duotone" size={14} style={{ color: accent }} />}
      onShare={shareCard ? () => shareCard('My Research Journey', [
        `🧪 Compounds Explored: ${uniqueCompounds}`,
        `📋 Active Protocols: ${activeProtocols}`,
        `✅ Protocols Completed: ${completedProtocols}`,
        `💊 Doses Logged (30d): ${dosesLogged30d}`,
        daysTracking > 0 ? `📅 Days Tracking: ${daysTracking}` : null,
        currentStreak > 0 ? `🔥 Current Streak: ${currentStreak}d` : null,
      ].filter(Boolean)) : null}
    >
      <div className="flex-1 min-h-0 flex flex-col gap-3">
        {/* Hero: soft ring + compounds */}
        <div className="flex items-center gap-3">
          <div
            className="relative shrink-0"
            style={{ width: ringSize, height: ringSize }}
          >
            <svg width={ringSize} height={ringSize} className="block -rotate-90">
              <defs>
                <linearGradient id={`journey-ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0.45" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none"
                stroke={theme.isDark ? `${accent}20` : `${accent}14`}
                strokeWidth={stroke}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none"
                stroke={`url(#journey-ring-${gradId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-xl font-bold tabular-nums leading-none" style={{ color: theme.text }}>
                {uniqueCompounds}
              </span>
              <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: muted }}>
                compounds
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 grid grid-cols-2 gap-1.5">
            {metricTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <div
                  key={tile.label}
                  className="rounded-xl px-2 py-1.5 min-w-0"
                  style={{
                    backgroundColor: subtleBg,
                    boxShadow: insetShadow,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon weight="duotone" size={13} className="shrink-0" style={{ color: muted }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: muted }}>
                      {tile.label}
                    </span>
                  </div>
                  <div className="text-sm font-bold tabular-nums leading-tight" style={{ color: theme.text }}>
                    {tile.value}
                  </div>
                  <div
                    className="mt-1 h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.round(Math.min(1, tile.bar) * 100)}%`,
                        backgroundColor: accent,
                        opacity: 0.55,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dose activity — same calm primary as Health Trends */}
        <div
          className="rounded-xl p-2.5 border"
          style={{
            borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.025)',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <ChartLine weight="duotone" size={14} style={{ color: accent }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: theme.text }}>
                Dose activity
              </span>
              {currentStreak > 0 && (
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-full tabular-nums"
                  style={{ backgroundColor: `${accent}14`, color: accent }}
                >
                  {currentStreak}d streak
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {JOURNEY_RANGES.map(({ label, value }) => {
                const active = doseRange === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDoseRange(value)}
                    className="min-w-[2.5rem] px-2.5 py-1 text-[10px] font-semibold rounded-full transition-all duration-200 focus:outline-none active:scale-95"
                    style={{
                      backgroundColor: active ? accent : (theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                      color: active ? '#fff' : muted,
                      boxShadow: active ? `0 1px 3px ${accent}28` : 'none',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {hasDoseActivity ? (
            <>
              <svg width="100%" height={chart.h} viewBox={`0 0 ${chart.w} ${chart.h}`} preserveAspectRatio="none" className="block">
                <defs>
                  <linearGradient id={`journey-dose-area-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <line
                  x1={4} y1={chart.h / 2} x2={chart.w - 4} y2={chart.h / 2}
                  stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                  strokeWidth="1" strokeDasharray="3,3"
                />
                {chart.area && <path d={chart.area} fill={`url(#journey-dose-area-${gradId})`} />}
                {chart.line && (
                  <path
                    d={chart.line}
                    fill="none"
                    stroke={accent}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                )}
              </svg>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {[
                  { label: 'Total', value: doseTotal },
                  { label: 'Avg / day', value: doseAvg < 10 ? doseAvg.toFixed(1) : Math.round(doseAvg) },
                  { label: 'Best day', value: doseBest },
                ].map((s) => (
                  <div key={s.label} className="text-center rounded-lg py-1" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
                    <div className="text-xs font-bold tabular-nums" style={{ color: theme.text }}>{s.value}</div>
                    <div className="text-[8px] font-medium uppercase tracking-wider" style={{ color: muted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[11px] py-3 text-center" style={{ color: muted }}>
              Log doses to see your activity curve
            </div>
          )}
        </div>

        {summarizeMode && glanceStats && (
          <div>
            <div className="border-t mb-3" style={{ borderColor }} />
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: muted }}>At a Glance</div>
            <div className="grid grid-cols-3 gap-2">
              {glanceStats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-sm font-bold tabular-nums" style={{ color: theme.text }}>{s.value}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: muted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

/* ─────────────────── OVERVIEW TAB ─────────────────── */
function OverviewTab({ theme, overviewData, complianceData, stats, getColor, subtleBg, borderColor, protocolHistory, shareCard, carouselMode = false, summarizeMode = false, isPremium = true, onUpgradeClick }) {
  const { lowStockItems, endingSoon, dosesLogged30d, last30Spend, uniqueCompounds, daysTracking, doseSeries90d } = overviewData
  const alertColor = theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706'
  const completedProtocols = (protocolHistory || []).filter(p => p.status === 'completed' || p.completedAt).length
  const [expanded, setExpanded] = useState(false)

  const _cards = [
    <ResearchJourneyCard
      key="journey"
      theme={theme}
      borderColor={borderColor}
      subtleBg={subtleBg}
      shareCard={shareCard}
      uniqueCompounds={uniqueCompounds}
      activeProtocols={stats.activeProtocols}
      completedProtocols={completedProtocols}
      dosesLogged30d={dosesLogged30d}
      daysTracking={daysTracking}
      doseSeries90d={doseSeries90d}
      currentStreak={complianceData?.streak || 0}
      summarizeMode={summarizeMode}
      glanceStats={[
        { label: 'Spend (30d)', value: formatCurrency(last30Spend), color: theme.primary },
        { label: 'Low Stock', value: lowStockItems.length, color: lowStockItems.length > 0 ? alertColor : theme.text },
        { label: 'Ending Soon', value: endingSoon.length, color: endingSoon.length > 0 ? alertColor : theme.text },
      ]}
    />,

    <AchievementsCard key="achievements"
      theme={theme} overviewData={overviewData} complianceData={complianceData}
      stats={stats} completedProtocols={completedProtocols} subtleBg={subtleBg}
      borderColor={borderColor} shareCard={shareCard} getColor={getColor}
    />,

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
          'Protocols ending soon alerts',
          'Full research journey & achievement tracking',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
    const out = [...free, wall]
    return finalizeTabCards({
      cards: out,
      heroCount: 2,
      summarizeMode,
      expanded,
      setExpanded,
      carouselMode,
      theme,
      borderColor,
    })
  }

  return finalizeTabCards({
    cards: _cards,
    heroCount: 2,
    summarizeMode,
    expanded,
    setExpanded,
    carouselMode,
    theme,
    borderColor,
  })
}

/* ─────────────────── COMPLIANCE TAB ─────────────────── */
function ComplianceTab({ theme, data, stats, getColor, subtleBg, borderColor, supplements, protocols, goals, shareCard, carouselMode = false, summarizeMode = false, isPremium = true, onUpgradeClick }) {
  const last7 = data.dailyStats?.slice(-7) || []
  const [expanded, setExpanded] = useState(false)
  const gradId = React.useId().replace(/:/g, '')
  const [ringReady, setRingReady] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setRingReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const accent = theme.primary
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const softLow = theme.isDark ? 'rgba(197,130,100,0.75)' : '#8f7a72'

  const softComplianceColor = (pct) => {
    if (pct >= 90) return accent
    if (pct >= 70) return theme.isDark ? 'rgba(217,167,60,0.75)' : '#9a906c'
    if (pct > 0) return softLow
    return muted
  }

  const extra = useMemo(() => {
    const ds = data.dailyStats || []
    const withTasks = ds.filter(d => d.planned > 0)
    const perfectDays = withTasks.filter(d => d.completed).length
    const missedDays = withTasks.filter(d => d.done === 0).length
    const partialDays = withTasks.filter(d => d.done > 0 && !d.completed).length
    const totalTasks = ds.reduce((s, d) => s + d.planned, 0)
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

    const first14 = data.dailyStats?.slice(0, 14) || []
    const second14 = data.dailyStats?.slice(14) || []
    const pct1 = first14.filter(d => d.planned > 0).length > 0
      ? Math.round(first14.reduce((s, d) => s + d.done, 0) / Math.max(1, first14.reduce((s, d) => s + d.planned, 0)) * 100) : null
    const pct2 = second14.filter(d => d.planned > 0).length > 0
      ? Math.round(second14.reduce((s, d) => s + d.done, 0) / Math.max(1, second14.reduce((s, d) => s + d.planned, 0)) * 100) : null
    const trendDir = pct1 !== null && pct2 !== null ? (pct2 >= pct1 ? 'up' : 'down') : null
    const trendDiff = pct1 !== null && pct2 !== null ? Math.abs(pct2 - pct1) : 0

    return { perfectDays, missedDays, partialDays, avgPerDay, bestDayLabel, weekdayPcts, trendDir, trendDiff }
  }, [data])

  if (!data.hasData) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8">
        <CheckCircle weight="duotone" size={32} style={{ color: theme.textLight, opacity: 0.5 }} />
        <div className="text-sm font-medium mt-3 mb-1" style={{ color: theme.text }}>No data to track</div>
        <div className="text-xs px-2" style={{ color: theme.textLight }}>Start a protocol or add supplements to track your research consistency</div>
      </div>
    )
  }

  const compliancePct = data.compliancePct ?? 0
  const ringSize = 88
  const stroke = 5
  const r = (ringSize - stroke) / 2
  const circ = 2 * Math.PI * r
  const ringPct = Math.max(0, Math.min(100, compliancePct))
  const offset = circ - ((ringReady ? ringPct : 0) / 100) * circ
  const ringTone = softComplianceColor(compliancePct)

  const summaryRows = [
    { icon: Flame, label: 'Current streak', value: `${data.streak || 0}d` },
    { icon: CheckCircle, label: 'Perfect days', value: extra.perfectDays },
    { icon: Pulse, label: 'Partial days', value: extra.partialDays },
    { icon: Warning, label: 'Missed days', value: extra.missedDays },
    { icon: ChartLine, label: 'Avg tasks / day', value: extra.avgPerDay },
    { icon: CalendarBlank, label: 'Best day', value: extra.bestDayLabel },
  ]

  const _cards = [
    <SectionCard key="summary" title="Consistency Summary" theme={theme} borderColor={borderColor}
      icon={<CheckCircle weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Research Consistency', [
        `✅ 30-Day Compliance: ${compliancePct}%`,
        `🔥 Current Streak: ${data.streak} days`,
        `🏅 Perfect Days: ${extra.perfectDays}`,
        `❌ Missed Days: ${extra.missedDays}`,
        `📅 Best Day: ${extra.bestDayLabel}`,
      ]) : null}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="block -rotate-90">
              <defs>
                <linearGradient id={`cons-ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ringTone} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={ringTone} stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none"
                stroke={theme.isDark ? `${accent}20` : `${accent}14`}
                strokeWidth={stroke}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={r}
                fill="none"
                stroke={`url(#cons-ring-${gradId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
              <span className="text-xl font-bold tabular-nums leading-none" style={{ color: theme.text }}>
                {compliancePct}%
              </span>
              <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: muted }}>
                30-day
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {summaryRows.slice(0, 4).map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                    <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{row.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {summaryRows.slice(4).map((row) => {
            const Icon = row.icon
            return (
              <div
                key={row.label}
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2"
                style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                  <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{row.label}</span>
                </div>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{row.value}</span>
              </div>
            )
          })}
        </div>

        {extra.trendDir && (
          <div className="text-xs px-0.5" style={{ color: muted }}>
            vs prior 14 days:{' '}
            <span className="font-semibold" style={{ color: extra.trendDir === 'up' ? accent : softLow }}>
              {extra.trendDir === 'up' ? '+' : '−'}{extra.trendDiff}%
            </span>
          </div>
        )}

        {/* Last 7 days — section break */}
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5 w-full min-w-0">
            <CalendarBlank size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2
              className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0"
              style={{ color: theme.text }}
            >
              Last 7 days
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>
          <div className="flex items-stretch justify-between gap-1">
            {last7.map((day) => {
              const dayDate = new Date(day.date + 'T00:00:00')
              const label = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayDate.getDay()]
              const hasTasks = day.planned > 0
              const isComplete = day.completed && hasTasks
              const isPartial = hasTasks && !day.completed && day.done > 0
              return (
                <div
                  key={day.date}
                  className="flex-1 min-w-0 flex flex-col items-center gap-1.5 rounded-xl py-2 px-0.5"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <span className="text-[11px] font-semibold" style={{ color: muted }}>{label}</span>
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      backgroundColor: !hasTasks
                        ? (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
                        : isComplete
                          ? accent
                          : isPartial
                            ? `${accent}40`
                            : 'transparent',
                      border: !hasTasks || isComplete
                        ? 'none'
                        : `2px solid ${isPartial ? accent : softLow}`,
                      opacity: isPartial && hasTasks ? 0.9 : 1,
                    }}
                  />
                  <span className="text-[10px] font-medium tabular-nums" style={{ color: muted }}>
                    {hasTasks ? `${day.done}/${day.planned}` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </SectionCard>,

    <SectionCard key="trend"
      title="30-Day Trend" theme={theme} borderColor={borderColor}
      icon={<ChartLine weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('30-Day Consistency Trend', [
        `✅ 30-Day Compliance: ${compliancePct}%`,
        `🔥 Current Streak: ${data.streak} days`,
        `🏅 Perfect Days: ${extra.perfectDays}`,
        `⚠️ Partial Days: ${extra.partialDays}`,
        `❌ Missed Days: ${extra.missedDays}`,
        `📊 Avg Tasks/Day: ${extra.avgPerDay}`,
      ]) : null}
    >
      <ComplianceTrend
        data={data.dailyStats}
        theme={theme}
        subtleBg={subtleBg}
        perfectDays={extra.perfectDays}
        partialDays={extra.partialDays}
        missedDays={extra.missedDays}
        softColorFn={softComplianceColor}
      />
    </SectionCard>,

    extra.weekdayPcts.length > 0 ? (
      <SectionCard key="weekday"
        title="Compliance by Day of Week" theme={theme} borderColor={borderColor}
        icon={<CalendarBlank weight="duotone" size={14} style={{ color: theme.primary }} />}
        onShare={shareCard ? () => shareCard('Compliance by Day of Week', [
          ...extra.weekdayPcts.map(({ day, pct }) => `  ${day}: ${pct}%`),
        ]) : null}
      >
        <div className="space-y-2.5">
          {extra.weekdayPcts.map(({ day, pct }) => (
            <div key={day} className="flex items-center gap-3">
              <span className="w-10 text-sm font-semibold shrink-0" style={{ color: theme.text }}>{day}</span>
              <div
                className="flex-1 h-2.5 rounded-full overflow-hidden"
                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: softComplianceColor(pct),
                    opacity: pct > 0 ? 0.85 : 0,
                  }}
                />
              </div>
              <span className="w-11 text-right text-sm font-bold tabular-nums shrink-0" style={{ color: softComplianceColor(pct) }}>
                {pct}%
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,
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
          'Compliance by weekday breakdown',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
    const out = [...free, wall]
    return finalizeTabCards({
      cards: out,
      heroCount: 1,
      summarizeMode,
      expanded,
      setExpanded,
      carouselMode,
      theme,
      borderColor,
    })
  }

  return finalizeTabCards({
    cards: _cards,
    heroCount: 1,
    summarizeMode,
    expanded,
    setExpanded,
    carouselMode,
    theme,
    borderColor,
  })
}

/* ─────────────────── SPENDING BREAKDOWN CARD ─────────────────── */
function SpendingBreakdownCard({ theme, orders, stockpile, subtleBg, borderColor, shareCard, inCarousel = false }) {
  const settings = useMemo(() => { try { return JSON.parse(localStorage.getItem('tpprover_settings') || '{}') } catch { return {} } }, [])
  const [vendorFilter, setVendorFilter] = useState('')
  const [peptideFilter, setPeptideFilter] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [dateOpen, setDateOpen] = useState(false)
  const dateRef = useRef(null)
  const dateLabels = { last30: '30 day', last90: '90 day', lastYear: '1 yr', all: 'All time' }

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
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
        <span className="text-xs font-semibold" style={{ color: theme.textLight }}>Total (filtered)</span>
        <span className="text-base font-bold tabular-nums" style={{ color: theme.text }}>{formatCurrency(filteredTotal)}</span>
      </div>
    </>
  )

  const listsBlock = (
    <>
      {byVendor.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5 w-full min-w-0">
            <Truck size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              By vendor
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
            />
          </div>
          <div className="space-y-2.5">
            {byVendor.map(([name, val]) => (
              <div key={name}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{name}</span>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{formatCurrency(val)}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(val / maxV) * 100}%`, backgroundColor: theme.primary, opacity: 0.75 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {byPeptide.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5 w-full min-w-0">
            <Flask size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              By peptide / compound
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
            />
          </div>
          <div className="space-y-2.5">
            {byPeptide.map(([name, val]) => (
              <div key={name}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{name}</span>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{formatCurrency(val)}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${(val / maxP) * 100}%`, backgroundColor: theme.primary, opacity: 0.75 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {perOrderRows.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5 px-0.5 w-full min-w-0">
            <Package size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Per order
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
            />
          </div>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: subtleBg, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
            {perOrderRows.map((row, i) => (
              <div key={row.id} className="flex items-center justify-between px-3 py-2.5 text-sm"
                style={{ borderTop: i > 0 ? `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : undefined }}>
                <span className="text-xs shrink-0 tabular-nums" style={{ color: theme.textLight, minWidth: 64 }}>{row.date || '—'}</span>
                <span className="flex-1 truncate px-2 font-semibold" style={{ color: theme.text }}>{row.vendor}</span>
                <span className="font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{formatCurrency(row.total)}</span>
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
function SpendingTab({ theme, stats, orders, stockpile, subtleBg, borderColor, onShowBreakdown, shareCard, carouselMode = false, summarizeMode = false, isPremium = true, onUpgradeClick }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const extra = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    let thisMonthSpend = 0
    let last30Spend = 0
    orders.forEach(o => {
      let cost = 0
      if (o.items && o.items.length > 0) cost = o.items.reduce((s, item) => s + ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)), 0)
      else cost = parseFloat(String(o.cost).replace(/[^0-9.]/g, '')) || 0
      const d = o.date ? new Date(o.date) : null
      if (d && d >= thisMonthStart) thisMonthSpend += cost
      if (d && d >= thirtyDaysAgo) last30Spend += cost
    })

    const totalOrders = orders.length
    const avgOrderCost = totalOrders > 0 ? stats.totalSpend / totalOrders : 0
    const avgDailySpend30 = last30Spend / 30
    const uniqueVendors = new Set(orders.map(o => o.vendor || o.vendorName).filter(Boolean)).size
    const uniquePeptides = new Set()
    orders.forEach(o => {
      if (o.items && o.items.length > 0) {
        o.items.forEach(item => {
          if (item.name) uniquePeptides.add(item.name)
        })
      } else if (o.peptide) {
        uniquePeptides.add(o.peptide)
      }
    })

    const stockpileValue = (stockpile || []).reduce((s, item) => s + ((parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0)), 0)

    return { thisMonthSpend, last30Spend, avgDailySpend30, totalOrders, avgOrderCost, uniqueVendors, uniquePeptides: uniquePeptides.size, stockpileValue }
  }, [orders, stats, stockpile])

  const accent = theme.primary
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const gradId = React.useId().replace(/:/g, '')
  const [ringReady, setRingReady] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setRingReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Ring represents this-month share of last-90 (soft progress), fallback to 30d / all-time
  const ringBasis = Math.max(stats.last90DaysSpend || 0, extra.last30Spend || 0, 1)
  const ringPct = Math.min(100, Math.round((extra.thisMonthSpend / ringBasis) * 100))
  const ringSize = 88
  const stroke = 5
  const rr = (ringSize - stroke) / 2
  const circ = 2 * Math.PI * rr
  const offset = circ - ((ringReady ? Math.max(ringPct, extra.thisMonthSpend > 0 ? 8 : 0) : 0) / 100) * circ

  const heroRows = [
    { icon: CalendarBlank, label: 'This month', value: formatCurrency(extra.thisMonthSpend) },
    { icon: Clock, label: 'Last month', value: formatCurrency(stats.lastMonthSpend) },
    { icon: TrendUp, label: 'All-time', value: formatCurrency(stats.totalSpend) },
  ]

  const activityRows = [
    { label: 'Last 30 days', value: formatCurrency(extra.last30Spend) },
    { label: 'Avg / day (30d)', value: formatCurrency(extra.avgDailySpend30) },
    { label: 'Last 90 days', value: formatCurrency(stats.last90DaysSpend) },
    { label: 'Avg / order', value: formatCurrency(extra.avgOrderCost) },
  ]

  const volumeRows = [
    { icon: Package, label: 'Total orders', value: extra.totalOrders },
    { icon: Truck, label: 'Vendors used', value: extra.uniqueVendors },
    { icon: Flask, label: 'Peptides ordered', value: extra.uniquePeptides },
    { icon: Archive, label: 'Stockpile value', value: formatCurrency(extra.stockpileValue) },
  ]

  const _cards = [
    <SectionCard key="metrics" title="Spending Summary" theme={theme} borderColor={borderColor}
      icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Spending Summary', [
        `💵 This Month: ${formatCurrency(extra.thisMonthSpend)}`,
        `📅 Last Month: ${formatCurrency(stats.lastMonthSpend)}`,
        `📆 Last 30 Days: ${formatCurrency(extra.last30Spend)}`,
        `📊 Avg / Day (30d): ${formatCurrency(extra.avgDailySpend30)}`,
        `🏦 All-Time: ${formatCurrency(stats.totalSpend)}`,
        `📦 Stockpile Value: ${formatCurrency(extra.stockpileValue)}`,
      ]) : null}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="block -rotate-90">
              <defs>
                <linearGradient id={`spend-ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={rr}
                fill="none"
                stroke={theme.isDark ? `${accent}20` : `${accent}14`}
                strokeWidth={stroke}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={rr}
                fill="none"
                stroke={`url(#spend-ring-${gradId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
              <span className="text-sm font-bold tabular-nums leading-tight text-center" style={{ color: theme.text }}>
                {formatCurrency(extra.thisMonthSpend)}
              </span>
              <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: muted }}>
                this month
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {heroRows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                    <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{row.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5 w-full min-w-0">
            <ChartLine size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Recent activity
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${accent}55 0%, ${accent}22 45%, transparent 100%)` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {activityRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl px-2.5 py-2"
                style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
              >
                <div className="text-[11px] font-semibold mb-0.5" style={{ color: muted }}>{row.label}</div>
                <div className="text-sm font-bold tabular-nums" style={{ color: theme.text }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5 w-full min-w-0">
            <Package size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Volume & stockpile
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${accent}55 0%, ${accent}22 45%, transparent 100%)` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {volumeRows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                    <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{row.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        <button type="button"
          onClick={() => {
            if (summarizeMode) setExpanded(true)
            else if (carouselMode) setActiveSlide(1)
            else onShowBreakdown?.()
          }}
          className="text-xs py-2 rounded-xl text-center w-full transition-opacity font-semibold flex items-center justify-center gap-1"
          style={{
            color: accent,
            backgroundColor: theme.isDark ? `${accent}14` : `${accent}10`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          See spending details
          <CaretRight weight="duotone" size={12} />
        </button>
      </div>
    </SectionCard>,

    <SpendingBreakdownCard key="breakdown" theme={theme} orders={orders} stockpile={stockpile} subtleBg={subtleBg} borderColor={borderColor} shareCard={shareCard} inCarousel={carouselMode} />,

    <SectionCard key="monthly"
      title="Monthly Spend Trend" theme={theme} borderColor={borderColor}
      icon={<ChartLine weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Monthly Spend Trend', [
        `💵 This Month: ${formatCurrency(extra.thisMonthSpend)}`,
        `📅 Last Month: ${formatCurrency(stats.lastMonthSpend)}`,
        `🏦 All-Time: ${formatCurrency(stats.totalSpend)}`,
        `📦 Orders: ${extra.totalOrders} across ${extra.uniqueVendors} vendor${extra.uniqueVendors !== 1 ? 's' : ''}`,
      ]) : null}
    >
      <MonthlySpendChart
        orders={orders}
        theme={theme}
        subtleBg={subtleBg}
        thisMonth={extra.thisMonthSpend}
        lastMonth={stats.lastMonthSpend}
      />
    </SectionCard>,

    <SectionCard key="vendors"
      title="Top Vendors by Spend" theme={theme} borderColor={borderColor}
      icon={<Truck weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Top Vendors by Spend', [
        `🏦 All-Time Research Spend: ${formatCurrency(stats.totalSpend)}`,
        `🛒 Total Orders: ${extra.totalOrders}`,
        `🏪 Vendors Used: ${extra.uniqueVendors}`,
      ]) : null}
    >
      <TopVendors orders={orders} theme={theme} subtleBg={subtleBg} />
    </SectionCard>,

    <SectionCard key="avgmg" title="Average $/mg" theme={theme} borderColor={borderColor}
      icon={<Pill weight="duotone" size={14} style={{ color: theme.primary }} />}
    >
      <AvgCostPerMg orders={orders} theme={theme} />
    </SectionCard>,

    <SectionCard key="trend" title="Peptide Cost Trend" theme={theme} borderColor={borderColor}
      icon={<TrendUp weight="duotone" size={14} style={{ color: theme.primary }} />}
    >
      <PeptideCostTrend orders={orders} theme={theme} subtleBg={subtleBg} />
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
    return finalizeTabCards({
      cards: out,
      heroCount: 1,
      summarizeMode,
      expanded,
      setExpanded,
      carouselMode,
      theme,
      borderColor,
      activeIndex: Math.min(activeSlide, Math.max(0, out.length - 1)),
      onChangeIndex: setActiveSlide,
    })
  }

  return finalizeTabCards({
    cards: _cards,
    heroCount: 1,
    summarizeMode,
    expanded,
    setExpanded,
    carouselMode,
    theme,
    borderColor,
    activeIndex: activeSlide,
    onChangeIndex: setActiveSlide,
  })
}

/* ─────────────────── INVENTORY TAB ─────────────────── */
function InventoryTab({ theme, stats, orders, stockpile, subtleBg, borderColor, shareCard, carouselMode = false, summarizeMode = false, isPremium = true, onUpgradeClick }) {
  const [expanded, setExpanded] = useState(false)
  const accent = theme.primary
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const gradId = React.useId().replace(/:/g, '')
  const [ringReady, setRingReady] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setRingReady(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const alertColor = theme.isDark ? 'rgba(217, 167, 60, 0.85)' : '#d97706'

  const extra = useMemo(() => {
    const totalItems = (stockpile || []).length
    const totalVials = (stockpile || []).reduce((s, item) => s + (parseFloat(item.quantity) || 0), 0)
    const totalValue = (stockpile || []).reduce((s, item) => s + ((parseFloat(item.cost) || 0) * (parseFloat(item.quantity) || 0)), 0)
    const uniqueNames = new Set((stockpile || []).map(s => s.name).filter(Boolean)).size
    const pendingOrders = orders.filter(o => { const st = (o.status || '').toLowerCase(); return !st.includes('delivered') }).length
    const lowStockItems = (stockpile || []).filter(isLowStockpileEntry)
      .sort((a, b) => (parseFloat(a.quantity) || 0) - (parseFloat(b.quantity) || 0))

    let fastestDelivery = Infinity, slowestDelivery = 0, leadSum = 0, leadCount = 0
    for (const o of orders) {
      if (!o.shipDate || !o.deliveryDate) continue
      const d = Math.max(0, Math.round((new Date(o.deliveryDate) - new Date(o.shipDate)) / 86400000))
      fastestDelivery = Math.min(fastestDelivery, d)
      slowestDelivery = Math.max(slowestDelivery, d)
      leadSum += d
      leadCount += 1
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

    const healthyItems = Math.max(0, totalItems - lowStockItems.length)
    const healthyPct = totalItems > 0 ? Math.round((healthyItems / totalItems) * 100) : 100

    return {
      totalItems,
      totalVials,
      totalValue,
      uniqueNames,
      pendingOrders,
      fastestDelivery: fastestDelivery === Infinity ? null : fastestDelivery,
      slowestDelivery: slowestDelivery === 0 ? null : slowestDelivery,
      avgLead: leadCount > 0 ? Math.round(leadSum / leadCount) : null,
      topByQty,
      topByValue,
      lowStockItems,
      healthyItems,
      healthyPct,
    }
  }, [stockpile, orders])

  const ringSize = 88
  const stroke = 5
  const rr = (ringSize - stroke) / 2
  const circ = 2 * Math.PI * rr
  const ringPct = extra.totalItems > 0 ? extra.healthyPct : (extra.totalValue > 0 ? 100 : 0)
  const offset = circ - ((ringReady ? Math.max(ringPct, extra.totalItems > 0 || extra.totalValue > 0 ? 8 : 0) : 0) / 100) * circ

  const heroRows = [
    { icon: CurrencyDollar, label: 'Stockpile value', value: formatCurrency(extra.totalValue) },
    { icon: Package, label: 'Total vials', value: Math.round(extra.totalVials) },
    { icon: Flask, label: 'Unique items', value: extra.uniqueNames },
  ]

  const fulfillmentRows = [
    { icon: Truck, label: 'Avg delivery', value: stats.avgLeadTime !== 'N/A' ? `${stats.avgLeadTime}d` : (extra.avgLead != null ? `${extra.avgLead}d` : '—') },
    { icon: CheckCircle, label: 'Delivered', value: stats.delivered ?? 0 },
    { icon: Package, label: 'In transit', value: extra.pendingOrders },
    { icon: Clock, label: 'Fastest', value: extra.fastestDelivery != null ? `${extra.fastestDelivery}d` : '—' },
  ]

  if (!isPremium) {
    return (
      <InsightsPremiumWall
        variant="full"
        theme={theme}
        borderColor={borderColor}
        sectionTitle="Inventory Analytics"
        featureBullets={[
          'Stock health ring, low-stock alerts & stockpile value',
          'Lead-time charts & vendor on-time scores',
          'Top items by quantity and value',
        ]}
        onUpgrade={onUpgradeClick}
      />
    )
  }

  const maxQty = extra.topByQty[0]?.[1]?.qty || 1
  const maxVal = extra.topByValue[0]?.[1]?.value || 1

  const _cards = [
    <SectionCard key="metrics" title="Inventory Summary" theme={theme} borderColor={borderColor}
      icon={<Archive weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Inventory Summary', [
        `📦 Stockpile Value: ${formatCurrency(extra.totalValue)}`,
        `🧪 Unique Items: ${extra.uniqueNames}`,
        `💉 Total Vials: ${Math.round(extra.totalVials)}`,
        `✅ Healthy: ${extra.healthyPct}%`,
        `⚠️ Low Stock: ${extra.lowStockItems.length}`,
        extra.lowStockItems.length > 0
          ? `Running low: ${extra.lowStockItems.slice(0, 3).map(i => `${i.name || 'Item'} (${formatInventoryQtyLeftLabel(i)})`).join(', ')}`
          : 'All clear — no low stock',
      ]) : null}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="block -rotate-90">
              <defs>
                <linearGradient id={`inv-ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={extra.lowStockItems.length > 0 ? alertColor : accent} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={extra.lowStockItems.length > 0 ? alertColor : accent} stopOpacity="0.4" />
                </linearGradient>
              </defs>
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={rr}
                fill="none"
                stroke={theme.isDark ? `${accent}20` : `${accent}14`}
                strokeWidth={stroke}
              />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={rr}
                fill="none"
                stroke={`url(#inv-ring-${gradId})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-1">
              <span className="text-sm font-bold tabular-nums leading-tight text-center" style={{ color: theme.text }}>
                {extra.totalItems > 0 ? `${extra.healthyPct}%` : '—'}
              </span>
              <span className="text-[8px] font-medium uppercase tracking-wider" style={{ color: muted }}>
                healthy
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {heroRows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                    <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{row.value}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5 w-full min-w-0">
            <Warning size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Stock health
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${accent}55 0%, ${accent}22 45%, transparent 100%)` }}
            />
          </div>
          {extra.lowStockItems.length > 0 ? (
            <div className="space-y-1.5">
              <div
                className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 mb-1"
                style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
              >
                <span className="text-xs font-semibold" style={{ color: theme.text }}>Low stock items</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: alertColor }}>{extra.lowStockItems.length}</span>
              </div>
              {extra.lowStockItems.slice(0, summarizeMode ? 3 : 5).map((item, i) => (
                <div
                  key={item.id || i}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{item.name || 'Unknown'}</span>
                  <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: alertColor }}>{formatInventoryQtyLeftLabel(item)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-xl px-2.5 py-2.5"
              style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
            >
              <CheckCircle weight="duotone" size={16} className="shrink-0" style={{ color: accent }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>All clear — no low stock items</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 px-0.5 w-full min-w-0">
            <Truck size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Fulfillment
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{ background: `linear-gradient(to right, ${accent}55 0%, ${accent}22 45%, transparent 100%)` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {fulfillmentRows.map((row) => {
              const Icon = row.icon
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2"
                  style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon weight="duotone" size={14} className="shrink-0" style={{ color: muted }} />
                    <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{row.value}</span>
                </div>
              )
            })}
          </div>
          {extra.slowestDelivery != null && (
            <div
              className="mt-1.5 flex items-center justify-between gap-2 rounded-xl px-2.5 py-2"
              style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
            >
              <span className="text-xs font-semibold" style={{ color: muted }}>Slowest delivery</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: theme.text }}>{extra.slowestDelivery}d</span>
            </div>
          )}
        </div>
      </div>
    </SectionCard>,

    <SectionCard key="leadtime" title="Delivery Lead-time" theme={theme} borderColor={borderColor}
      icon={<Clock weight="duotone" size={14} style={{ color: theme.primary }} />}
      onShare={shareCard ? () => shareCard('Delivery Lead-time', [
        `⏱ Avg: ${stats.avgLeadTime !== 'N/A' ? `${stats.avgLeadTime}d` : (extra.avgLead != null ? `${extra.avgLead}d` : '—')}`,
        extra.fastestDelivery != null ? `⚡ Fastest: ${extra.fastestDelivery}d` : null,
        extra.slowestDelivery != null ? `🐢 Slowest: ${extra.slowestDelivery}d` : null,
      ].filter(Boolean)) : null}
    >
      <LeadtimeHistogram orders={orders} theme={theme} subtleBg={subtleBg} />
    </SectionCard>,

    <SectionCard key="vendor-lead" title="Vendor Lead-time & On-time" theme={theme} borderColor={borderColor}
      icon={<Truck weight="duotone" size={14} style={{ color: theme.primary }} />}
    >
      <VendorLeadtimeOnTime orders={orders} theme={theme} subtleBg={subtleBg} />
    </SectionCard>,

    extra.topByQty.length > 0 ? (
      <SectionCard key="top-qty"
        title="Top Items by Quantity" theme={theme} borderColor={borderColor}
        icon={<Package weight="duotone" size={14} style={{ color: theme.primary }} />}
        onShare={shareCard ? () => shareCard('My Stockpile', [
          `📦 Total Vials: ${Math.round(extra.totalVials)}`,
          `💰 Stockpile Value: ${formatCurrency(extra.totalValue)}`,
          ...extra.topByQty.slice(0, 3).map(([name, v]) => `  ${name}: ${v.qty} vials`),
        ]) : null}
      >
        <div className="space-y-2">
          {extra.topByQty.map(([name, v]) => (
            <div
              key={name}
              className="rounded-xl px-2.5 py-2"
              style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{name}</span>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{v.qty} vials</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((v.qty / maxQty) * 100)}%`, backgroundColor: accent, opacity: 0.75 }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,

    extra.topByValue.length > 0 ? (
      <SectionCard key="top-val"
        title="Top Items by Value" theme={theme} borderColor={borderColor}
        icon={<CurrencyDollar weight="duotone" size={14} style={{ color: theme.primary }} />}
        onShare={shareCard ? () => shareCard('Stockpile by Value', [
          `💰 Total Stockpile Value: ${formatCurrency(extra.totalValue)}`,
          ...extra.topByValue.slice(0, 3).map(([name, v]) => `  ${name}: ${formatCurrency(v.value)}`),
        ]) : null}
      >
        <div className="space-y-2">
          {extra.topByValue.map(([name, v]) => (
            <div
              key={name}
              className="rounded-xl px-2.5 py-2"
              style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{name}</span>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{formatCurrency(v.value)}</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((v.value / maxVal) * 100)}%`, backgroundColor: accent, opacity: 0.75 }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    ) : null,
  ].filter(Boolean)

  return finalizeTabCards({
    cards: _cards,
    heroCount: 1,
    summarizeMode,
    expanded,
    setExpanded,
    carouselMode,
    theme,
    borderColor,
  })
}


/* ─────────────────── PROTOCOLS TAB ─────────────────── */
function ProtocolsTab({ theme, protocolHistory, protocolHistoryStats, stats, protocols, subtleBg, borderColor, shareCard, carouselMode = false, summarizeMode = false, isPremium = true, onUpgradeClick }) {
  const [expanded, setExpanded] = useState(false)
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

    // Last 6 months completion sparkline data
    const monthMap = {}
    for (const h of ended) {
      const key = (h.endDate || '').slice(0, 7)
      if (!key) continue
      monthMap[key] = (monthMap[key] || 0) + 1
    }
    const now = new Date()
    const last6 = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      last6.push({ key, label: key.slice(5), count: monthMap[key] || 0 })
    }

    return { totalCompleted, allTime, avgDuration, longestProtocol, shortestProtocol, uniqueProtocolNames, topPeptides, deliveryMethodList, completionRate, notesCount, last6 }
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
  const sparkMax = Math.max(...(extra.last6 || []).map((d) => d.count), 1)

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
        {summarizeMode && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
              Completed · Last 6 months
            </div>
            <div className="flex items-end gap-1.5 h-10 px-0.5">
              {extra.last6.map((d) => (
                <div key={d.key} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(3, Math.round((d.count / sparkMax) * 32))}px`,
                      backgroundColor: d.count > 0 ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                      opacity: d.count > 0 ? 0.9 : 0.5,
                    }}
                    title={`${d.key}: ${d.count}`}
                  />
                  <span className="text-[8px] tabular-nums" style={{ color: theme.textLight }}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

  return finalizeTabCards({
    cards: _cards,
    heroCount: 1,
    summarizeMode,
    expanded,
    setExpanded,
    carouselMode,
    theme,
    borderColor,
  })
}

/* ─────────────────── HALF-LIFE TAB ─────────────────── */

/** Soft theme-adjacent series colors — avoids rainbow noise */
function getDecaySeriesColor(idx, theme) {
  const primary = theme?.primary || '#7F9E95'
  const palette = theme?.isDark
    ? [primary, '#9BB5AC', '#B8A98A', '#8FA4B8', '#A898B0']
    : [primary, '#5A7A70', '#8A7A5A', '#5A7088', '#7A6A88']
  return palette[idx % palette.length]
}

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

/** Resolve display color for a peptide within its protocol (matches Protocols page accents) */
function getPeptideProtocolColor(protocol, peptide) {
  const cap = peptide?.capColor || peptide?.penColor
  if (cap) {
    const fromCap = resolvePenColorToHex(cap) || (/^#/.test(String(cap)) ? cap : null)
    const n = normalizeHexToSixDigits(fromCap || cap)
    if (n) return n
    if (fromCap) return fromCap
  }
  return getProtocolAccentHex(protocol)
}

/** Hours since last logged dose for a compound name (day-granularity, null if none in window) */
function findHoursSinceLastDose(pepName, protocols, supplements, reconItems, taskCompletion, lookbackDays = 120) {
  const nameLc = (pepName || '').toLowerCase()
  if (!nameLc) return null
  const now = new Date()
  for (let i = 0; i <= lookbackDays; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateKey = toKey(d)
    const scheduled = calculateScheduledTasksForDate(d, protocols, supplements, reconItems)
    let wasDosed = false
    Object.keys(scheduled.bySlot || {}).forEach((slot) => {
      const slotData = scheduled.bySlot[slot]
      ;(slotData.peptides || []).forEach((pep) => {
        if ((pep.name || '').toLowerCase() !== nameLc) return
        const tid = generateTaskId({
          type: 'peptide',
          name: pep.name || 'Peptide',
          dose: pep.dose || '',
          unit: pep.unit || '',
          time: slot,
          protocolId: pep.protocolId,
          peptideId: pep.peptideId,
        })
        const td = taskCompletion[dateKey]?.[slot]?.[tid]
        if (td === true || (td && typeof td === 'object' && td.completed)) wasDosed = true
      })
    })
    if (wasDosed) return i * 24
  }
  return null
}

function HalfLifeTab({ theme, protocols, reconItems = [], supplements = [], taskCompletion = {}, subtleBg, borderColor, carouselMode = false, summarizeMode = false, isPremium = true, onUpgradeClick }) {
  const [expanded, setExpanded] = useState(false)
  const { peptideData, isMockData } = useMemo(() => {
    const all = (protocols || []).filter((p) => p && Array.isArray(p.peptides) && p.peptides.length > 0)
    const real = []
    const mock = []
    const seen = new Set()

    for (const p of all) {
      const isActive = p.active !== false
      const protocolAccent = getProtocolAccentHex(p)

      for (const pep of p.peptides) {
        const name = pep.name || 'Unnamed'
        const key = `${p.id || p.protocolName || ''}::${name.toLowerCase()}`
        if (seen.has(key)) continue

        const hlHours = getHalfLifeInHours(pep)
        let entry = null

        if (hlHours > 0) {
          entry = {
            name,
            protocolId: p.id,
            protocolName: p.protocolName || p.name || 'Protocol',
            protocolActive: isActive,
            color: getPeptideProtocolColor(p, pep) || protocolAccent,
            halfLifeHours: hlHours,
            halfLifeDisplay: pep.halfLife,
            clearanceHours: getClearanceTimeHours(hlHours),
            washout: p.washout,
            duration: p.duration,
            isMock: false,
            isEstimated: pep.halfLifeSource === 'estimated',
          }
        } else if (pep.name) {
          const est = lookupHalfLife(pep.name)
          if (est) {
            entry = {
              name,
              protocolId: p.id,
              protocolName: p.protocolName || p.name || 'Protocol',
              protocolActive: isActive,
              color: getPeptideProtocolColor(p, pep) || protocolAccent,
              halfLifeHours: est.hours,
              halfLifeDisplay: est.display,
              clearanceHours: getClearanceTimeHours(est.hours),
              washout: null,
              duration: p.duration,
              isMock: true,
              isEstimated: true,
            }
          }
        }

        if (!entry) continue

        // Active protocols always show. Ended ones only while still clearing.
        if (!isActive) {
          const hoursSince = findHoursSinceLastDose(
            entry.name,
            protocols,
            supplements,
            reconItems,
            taskCompletion,
            Math.max(120, Math.ceil(entry.clearanceHours / 24) + 14),
          )
          if (hoursSince === null || hoursSince >= entry.clearanceHours) continue
          entry._hoursSinceSeed = hoursSince
        }

        seen.add(key)
        if (entry.isMock) mock.push(entry)
        else real.push(entry)
      }
    }

    if (real.length > 0) return { peptideData: real, isMockData: false }
    return { peptideData: mock, isMockData: mock.length > 0 }
  }, [protocols, supplements, reconItems, taskCompletion])

  /* ── Blood-level accumulation: walk protocol history day-by-day ── */
  const accumulationSeries = useMemo(() => {
    // Include inactive protocols so ended stacks still accumulate until clear
    const eligible = (protocols || []).filter((p) => p?.startDate && Array.isArray(p.peptides))
    const now = new Date()
    const results = []

    for (const pd of peptideData) {
      const protocol = eligible.find((p) =>
        (p.id && pd.protocolId && p.id === pd.protocolId) ||
        (p.peptides || []).some((pep) => (pep.name || '').toLowerCase() === pd.name.toLowerCase()),
      )
      if (!protocol) continue

      const startDate = new Date(protocol.startDate)
      if (isNaN(startDate.getTime())) continue

      const totalDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
      if (totalDays < 0) continue
      // Cap at 90 days for performance & readability; extend slightly for long HL if needed
      const clearanceDays = Math.ceil((pd.clearanceHours || 0) / 24)
      const daysWindow = Math.min(Math.max(totalDays, 1), Math.max(90, Math.min(clearanceDays + 7, 120)))
      const windowStart = new Date(now)
      windowStart.setDate(windowStart.getDate() - daysWindow)

      const doseHours = []
      for (let d = 0; d <= daysWindow; d++) {
        const checkDate = new Date(windowStart)
        checkDate.setDate(checkDate.getDate() + d)
        const dateKey = toKey(checkDate)
        const scheduled = calculateScheduledTasksForDate(checkDate, protocols, supplements, reconItems)

        let wasDosed = false
        Object.keys(scheduled.bySlot || {}).forEach((slot) => {
          const slotData = scheduled.bySlot[slot]
          ;(slotData.peptides || []).forEach((pep) => {
            if ((pep.name || '').toLowerCase() !== pd.name.toLowerCase()) return
            const tid = generateTaskId({
              type: 'peptide',
              name: pep.name || 'Peptide',
              dose: pep.dose || '',
              unit: pep.unit || '',
              time: slot,
              protocolId: pep.protocolId,
              peptideId: pep.peptideId,
            })
            const td = taskCompletion[dateKey]?.[slot]?.[tid]
            if (td === true || (td && typeof td === 'object' && td.completed)) wasDosed = true
          })
        })

        if (wasDosed) doseHours.push(d * 24)
      }

      if (doseHours.length === 0) continue

      const points = []
      for (let d = 0; d <= daysWindow; d++) {
        const currentHour = d * 24
        const level = doseHours.reduce((sum, dh) => {
          if (dh <= currentHour) return sum + Math.pow(0.5, (currentHour - dh) / pd.halfLifeHours)
          return sum
        }, 0)
        points.push({ day: d, level })
      }

      const maxLevel = Math.max(...points.map((p) => p.level), 0.001)
      results.push({
        name: pd.name,
        isMock: pd.isMock,
        halfLifeHours: pd.halfLifeHours,
        protocolName: pd.protocolName,
        color: pd.color,
        daysWindow,
        doseHours,
        points: points.map((p) => ({ day: p.day, level: p.level / maxLevel })),
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

  const _cards = [
    /* Combined status + clearance — one quiet card per compound */
    <SectionCard key="decay"
      title={isMockData ? 'Current Status (Estimated)' : 'Current Status'}
      theme={theme} borderColor={borderColor}
      icon={<Pulse weight="duotone" size={14} style={{ color: theme.primary }} />}
    >
      <div className="text-[10px] mb-3 leading-relaxed" style={{ color: theme.textLight }}>
        Based on your last logged dose — remaining activity and when each compound reaches &lt;1%.
      </div>
      <CurrentDecayStatusChart peptides={peptideData} accumulationSeries={accumulationSeries} theme={theme} subtleBg={subtleBg} />
    </SectionCard>,

    /* Blood-Level History based on actual/estimated dose events */
    accumulationSeries.length > 0 ? (
      <SectionCard key="bloodlevel"
        title={isMockData ? 'Blood Level History (Estimated)' : 'Blood Level History'}
        theme={theme} borderColor={borderColor}
        icon={<Pulse weight="duotone" size={14} style={{ color: theme.primary }} />}
      >
        <div className="text-[10px] mb-3 leading-relaxed" style={{ color: theme.textLight }}>
          Estimated compound concentration based on your actual logged doses.
          Half-life decay values sourced from published literature{isMockData ? ' (set in protocol editor for precision)' : ''}.
        </div>
        <BloodLevelAccumulationChart series={accumulationSeries} theme={theme} />
      </SectionCard>
    ) : null,

    /* Washout vs Clearance (real data only) */
    !isMockData && peptideData.some(p => p.washout?.enabled) ? (
      <SectionCard key="washout" title="Washout vs Clearance" theme={theme} borderColor={borderColor}>
        <div className="space-y-3">
          {peptideData.filter(p => p.washout?.enabled).map((p, i) => (
            <WashoutComparison key={`${p.name}-${i}`} data={p} color={p.color || getDecaySeriesColor(i, theme)} theme={theme} />
          ))}
        </div>
      </SectionCard>
    ) : null,
  ].filter(Boolean)

  return finalizeTabCards({
    cards: _cards,
    heroCount: 1,
    summarizeMode,
    expanded,
    setExpanded,
    carouselMode,
    theme,
    borderColor,
  })
}

function fmtHoursAgo(hours) {
  if (hours === null || hours === undefined) return null
  if (hours < 1) return `${Math.round(hours * 60)}m ago`
  if (hours < 48) return `${Math.round(hours)}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function CurrentDecayStatusChart({ peptides, accumulationSeries, theme, subtleBg }) {
  const clearedColor = theme.isDark ? '#4ade80' : '#16a34a'

  const compounds = peptides.map((pd) => {
    const series = accumulationSeries.find(s => s.name.toLowerCase() === pd.name.toLowerCase())
    let hoursSinceLastDose = pd._hoursSinceSeed ?? null
    if (series && series.doseHours.length > 0) {
      const lastDoseHour = Math.max(...series.doseHours)
      hoursSinceLastDose = Math.max(0, series.daysWindow * 24 - lastDoseHour)
    }
    const currentLevel = hoursSinceLastDose !== null
      ? Math.pow(0.5, hoursSinceLastDose / pd.halfLifeHours)
      : null
    const hoursUntilClear = hoursSinceLastDose !== null
      ? Math.max(0, pd.clearanceHours - hoursSinceLastDose)
      : null
    const alreadyClear = hoursUntilClear !== null && hoursUntilClear === 0
    const remainingPct = hoursSinceLastDose !== null
      ? Math.max(0, Math.min(100, Math.round((1 - hoursSinceLastDose / pd.clearanceHours) * 100)))
      : null

    return {
      ...pd,
      hoursSinceLastDose,
      currentLevel,
      hoursUntilClear,
      alreadyClear,
      remainingPct,
      accent: alreadyClear ? clearedColor : (pd.color || theme.primary || '#7F9E95'),
    }
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

function CompoundDecayRow({ compound, rowIdx, theme, subtleBg }) {
  const W = 360, H = 110, PAD_L = 28, PAD_R = 8, PAD_T = 14, PAD_B = 22
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const clearance = Math.max(compound.clearanceHours || 1, 0.01)
  const hlHours = Math.max(compound.halfLifeHours || 1, 0.01)
  const accent = compound.accent || theme.primary || '#7F9E95'
  const gridStroke = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'
  const axisFill = theme.textLight || '#888'

  const pts = buildDecayCurve(hlHours, clearance, 80)
  const pathPts = pts.map(pt => {
    const x = PAD_L + (pt.hour / clearance) * chartW
    const y = PAD_T + (1 - pt.level) * chartH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePath = `M${pathPts.join(' L')}`
  const areaPath = `M${PAD_L},${PAD_T + chartH} L${pathPts.join(' L')} L${PAD_L + chartW},${PAD_T + chartH} Z`
  const gradId = `cdrow-${rowIdx}`
  const clipId = `cdclip-${rowIdx}`

  const nowFraction = compound.hoursSinceLastDose !== null
    ? Math.min(Math.max(compound.hoursSinceLastDose / clearance, 0), 0.995)
    : null
  const nowX = nowFraction !== null ? PAD_L + nowFraction * chartW : null
  const nowY = compound.currentLevel !== null
    ? PAD_T + (1 - Math.min(Math.max(compound.currentLevel, 0), 1)) * chartH
    : null

  const hlX = PAD_L + Math.min(hlHours / clearance, 0.98) * chartW
  const hlY = PAD_T + (1 - 0.5) * chartH // 50% level at one half-life

  const fmtAxis = (hours) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 48) return `${Math.round(hours)}h`
    return `${(hours / 24).toFixed(hours / 24 >= 10 ? 0 : 1)}d`
  }

  const hlLabel = hlHours < 1
    ? `${Math.round(hlHours * 60)}m HL`
    : hlHours < 24
      ? `${hlHours}h HL`
      : `${(hlHours / 24).toFixed(1)}d HL`

  const pct = compound.currentLevel !== null ? Math.round(compound.currentLevel * 100) : null
  const fmtUntilClear = compound.alreadyClear
    ? 'Cleared'
    : compound.hoursUntilClear != null
      ? compound.hoursUntilClear < 48
        ? `~${Math.round(compound.hoursUntilClear)}h`
        : `~${(compound.hoursUntilClear / 24).toFixed(1)}d`
      : null

  const yTicks = [100, 50, 0]
  const xTicks = [
    { hour: 0, label: 'Dose' },
    { hour: hlHours, label: '½ life' },
    { hour: clearance, label: 'Clear' },
  ]

  return (
    <div
      className="rounded-2xl p-3"
      style={{
        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-bold truncate" style={{ color: theme.text }}>
              {compound.name}{compound.isMock ? ' *' : ''}
            </span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              {hlLabel}
            </span>
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
            {compound.hoursSinceLastDose != null
              ? `${fmtHoursAgo(compound.hoursSinceLastDose)} last dose`
              : 'No doses logged'}
            {fmtUntilClear && !compound.alreadyClear ? ` · Clears ${fmtUntilClear}` : ''}
            {compound.alreadyClear ? ' · Fully cleared' : ''}
            {compound.protocolActive === false && !compound.alreadyClear ? ' · Protocol ended' : ''}
          </div>
        </div>
        <div className="text-right shrink-0">
          {pct !== null ? (
            <>
              <div className="text-xl font-black tabular-nums leading-none" style={{ color: accent }}>
                {compound.alreadyClear ? '0%' : `${pct}%`}
              </div>
              <div className="text-[9px] font-medium uppercase tracking-wider mt-0.5" style={{ color: theme.textLight }}>
                {compound.alreadyClear ? 'cleared' : 'active'}
              </div>
            </>
          ) : (
            <div className="text-[10px] font-medium" style={{ color: theme.textLight }}>—</div>
          )}
        </div>
      </div>

      {/* Remaining bar */}
      <div className="h-2 rounded-full overflow-hidden mb-2.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${compound.remainingPct ?? 0}%`,
            backgroundColor: accent,
            opacity: 0.85,
          }}
        />
      </div>

      {/* Detailed decay chart */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.55)',
          border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        }}
      >
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block" style={{ height: 108 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="55%" stopColor={accent} stopOpacity="0.12" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
            <clipPath id={clipId}>
              <rect x={PAD_L} y={PAD_T} width={chartW} height={chartH} rx="2" />
            </clipPath>
          </defs>

          {/* Y grid + labels */}
          {yTicks.map((pctVal) => {
            const y = PAD_T + (1 - pctVal / 100) * chartH
            return (
              <g key={`y-${pctVal}`}>
                <line x1={PAD_L} y1={y} x2={PAD_L + chartW} y2={y} stroke={gridStroke} strokeWidth="1" />
                <text x={PAD_L - 4} y={y + 3} textAnchor="end" fontSize="8" fill={axisFill} fontWeight="600">
                  {pctVal}%
                </text>
              </g>
            )
          })}

          {/* Half-life marker */}
          <g clipPath={`url(#${clipId})`}>
            <line
              x1={hlX} y1={PAD_T} x2={hlX} y2={PAD_T + chartH}
              stroke={accent} strokeWidth="1" strokeDasharray="3,3" opacity="0.35"
            />
          </g>

          {/* Area + curve */}
          <g clipPath={`url(#${clipId})`}>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={accent} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Dose start dot */}
          <circle cx={PAD_L} cy={PAD_T} r="3.5" fill={accent} opacity="0.25" />
          <circle cx={PAD_L} cy={PAD_T} r="2.25" fill={accent} />

          {/* Half-life 50% point */}
          <circle cx={hlX} cy={hlY} r="2.5" fill={theme.isDark ? '#fff' : '#fff'} stroke={accent} strokeWidth="1.5" />

          {/* Now marker */}
          {nowX !== null && nowY !== null && (
            <g>
              <line
                x1={nowX} y1={PAD_T} x2={nowX} y2={PAD_T + chartH}
                stroke={accent} strokeWidth="1.25" strokeDasharray="4,3" opacity="0.75"
              />
              <circle cx={nowX} cy={nowY} r="5" fill={accent} opacity="0.2" />
              <circle cx={nowX} cy={nowY} r="3" fill={accent} />
              <rect
                x={Math.min(Math.max(nowX - 14, PAD_L), PAD_L + chartW - 28)}
                y={Math.max(PAD_T - 12, 2)}
                width="28" height="11" rx="3"
                fill={accent}
              />
              <text
                x={Math.min(Math.max(nowX, PAD_L + 14), PAD_L + chartW - 14)}
                y={Math.max(PAD_T - 4, 10)}
                textAnchor="middle"
                fontSize="7"
                fontWeight="700"
                fill={theme.textOnPrimary || '#ffffff'}
              >
                Now
              </text>
            </g>
          )}

          {/* X axis labels */}
          {xTicks.map((t) => {
            const x = PAD_L + Math.min(t.hour / clearance, 1) * chartW
            return (
              <text
                key={`x-${t.label}`}
                x={x}
                y={H - 6}
                textAnchor={t.hour === 0 ? 'start' : t.hour >= clearance ? 'end' : 'middle'}
                fontSize="8"
                fill={axisFill}
                fontWeight="600"
              >
                {t.label}
                {t.hour > 0 && t.hour < clearance ? ` · ${fmtAxis(t.hour)}` : t.hour >= clearance ? ` · ${fmtAxis(clearance)}` : ''}
              </text>
            )
          })}
        </svg>
      </div>
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
      return { path: `M${pathPoints.join(' L')}`, color: getDecaySeriesColor(idx, theme) }
    })
  }, [peptides, totalHours, chartW, chartH, theme])

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
    const color = s.color || getDecaySeriesColor(idx, theme)
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
  }).filter(Boolean), [series, maxDays, chartW, chartH, theme])

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
          const color = s.color || getDecaySeriesColor(idx, theme)
          return (
            <div key={`${s.name}-${idx}`} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>{s.name}{s.isMock ? ' *' : ''}</span>
              <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
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

function ToggleTabs({ value, onChange, options, theme, ariaLabel = 'Analytics sections' }) {
  const tabIndex = Math.max(0, options.findIndex((t) => t.value === value))
  const tabCount = options.length

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex-shrink-0 relative grid p-1 rounded-full"
      style={{
        gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
        backgroundColor: theme.isDark
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(47,59,58,0.09)',
        boxShadow: theme.isDark
          ? 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04)'
          : 'inset 0 2px 5px rgba(47,59,58,0.14), inset 0 1px 2px rgba(47,59,58,0.08), 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      <div
        className="absolute top-1 bottom-1 left-1 rounded-full pointer-events-none"
        style={{
          width: `calc((100% - 8px) / ${tabCount})`,
          transform: `translateX(calc(${tabIndex} * 100%))`,
          transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          backgroundColor: theme.primary || '#7F9E95',
          boxShadow: theme.isDark
            ? `0 4px 14px ${theme.primary}77, 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22)`
            : `0 4px 14px ${theme.primary}55, 0 2px 4px rgba(47,59,58,0.16), inset 0 1px 0 rgba(255,255,255,0.35)`,
        }}
        aria-hidden="true"
      />
      {options.map((opt) => {
        const active = value === opt.value
        const short = opt.shortLabel || opt.label
        const full = opt.label
        const hasAbbrev = short !== full
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            aria-label={full}
            title={full}
            className="relative z-[1] py-2 px-0.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors duration-200 leading-tight whitespace-nowrap"
            style={{
              color: active
                ? (theme.textOnPrimary || '#ffffff')
                : theme.isDark
                  ? 'rgba(255,255,255,0.45)'
                  : 'rgba(47,59,58,0.45)',
            }}
          >
            {hasAbbrev ? (
              <>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{full}</span>
              </>
            ) : (
              full
            )}
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
      className={`p-4 rounded-xl flex flex-col min-h-0 h-full ${className}`}
      style={{
        border: `1px solid ${theme.border || (theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
        borderLeft: `2px solid ${(theme.primary || '#7F9E95')}99`,
        backgroundColor: theme.cardBackground || (theme.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff'),
        boxShadow: theme.isDark
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 4px rgba(0,0,0,0.2)'
          : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && React.isValidElement(icon)
            ? React.cloneElement(icon, { size: 18 })
            : icon}
          <h3 className="text-sm font-bold truncate" style={{ color: theme.text }}>{title}</h3>
        </div>
        {onShare && (
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all active:scale-95 shrink-0"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: theme.textLight,
              fontSize: '11px',
              fontWeight: 600,
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              boxShadow: theme.isDark
                ? 'inset 0 2px 4px rgba(255,255,255,0.08), inset 0 1px 2px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.2)'
                : 'inset 0 2px 4px rgba(255,255,255,0.55), inset 0 1px 2px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.05)',
            }}
            title="Share this card"
          >
            <ShareNetwork weight="duotone" size={12} />
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

function ComplianceTrend({ data, theme, subtleBg, perfectDays = 0, partialDays = 0, missedDays = 0, softColorFn }) {
  const muted = theme.textLight
  const accent = theme.primary
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const colorFn = softColorFn || ((pct) => {
    if (pct >= 90) return accent
    if (pct >= 70) return theme.isDark ? 'rgba(217,167,60,0.75)' : '#9a906c'
    if (pct > 0) return theme.isDark ? 'rgba(197,130,100,0.75)' : '#8f7a72'
    return theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  })

  if (!data || data.length === 0) {
    return <div className="text-xs py-2" style={{ color: muted }}>No data</div>
  }

  const days = data.slice(-30)
  const n = Math.max(days.length, 1)
  const w = 360
  const h = 88
  const padT = 8
  const padB = 6
  const padX = 4
  const chartH = h - padT - padB
  const barGap = 1.5
  const barW = Math.max(3, (w - padX * 2) / n - barGap)

  const pcts = days.map((day) => (day.planned > 0 ? Math.round((day.done / day.planned) * 100) : 0))
  const withPlanned = days.filter((d) => d.planned > 0)
  const avgPct = withPlanned.length
    ? Math.round(withPlanned.reduce((s, d) => s + Math.round((d.done / d.planned) * 100), 0) / withPlanned.length)
    : 0
  const bestPct = pcts.length ? Math.max(0, ...pcts) : 0

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="rounded-xl p-2.5 border"
        style={{
          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.025)',
        }}
      >
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
          <line
            x1={padX}
            y1={padT + chartH / 2}
            x2={w - padX}
            y2={padT + chartH / 2}
            stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            strokeWidth="1"
            strokeDasharray="3,3"
          />
          {days.map((day, i) => {
            const pct = pcts[i]
            const barH = day.planned > 0 ? Math.max(pct > 0 ? 3 : 1.5, (pct / 100) * chartH) : 1.5
            const x = padX + i * ((w - padX * 2) / n) + barGap / 2
            const y = padT + chartH - barH
            const fill = day.planned > 0
              ? colorFn(pct)
              : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)')
            return (
              <rect
                key={day.date || i}
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="1.5"
                fill={fill}
                opacity={day.planned > 0 ? (pct >= 90 ? 0.9 : pct > 0 ? 0.75 : 0.35) : 0.5}
              />
            )
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Perfect', value: perfectDays },
          { label: 'Partial', value: partialDays },
          { label: 'Missed', value: missedDays },
        ].map((s) => (
          <div key={s.label} className="text-center rounded-lg py-1.5" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
            <div className="text-sm font-bold tabular-nums" style={{ color: theme.text }}>{s.value}</div>
            <div className="text-[10px] font-medium" style={{ color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between px-0.5 text-[11px]" style={{ color: muted }}>
        <span>Avg day <strong className="tabular-nums" style={{ color: theme.text }}>{avgPct}%</strong></span>
        <span>Best day <strong className="tabular-nums" style={{ color: theme.text }}>{bestPct}%</strong></span>
      </div>
    </div>
  )
}

function MonthlySpendChart({ orders, theme, subtleBg, thisMonth = 0, lastMonth = 0 }) {
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
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
  if (data.length === 0) return <div className="text-xs py-2" style={{ color: muted }}>No order data yet</div>
  const maxY = Math.max(...data.map(d => d.y)) || 1
  const peak = data.reduce((best, d) => (d.y > best.y ? d : best), data[0])
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="rounded-xl p-2.5 border"
        style={{
          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.025)',
        }}
      >
        <svg width="100%" height={112} viewBox="0 0 400 112" preserveAspectRatio="none" className="block">
          <line
            x1={16} y1={56} x2={384} y2={56}
            stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            strokeWidth="1" strokeDasharray="3,3"
          />
          {data.map((d, i) => {
            const barW = Math.max(8, 360 / data.length - 4)
            const x = 20 + i * (360 / data.length)
            const h = Math.max(2, (d.y / maxY) * 88)
            return <rect key={d.x} x={x} y={100 - h} width={barW} height={h} rx="3" fill={theme.primary} opacity="0.75" />
          })}
        </svg>
        <div className="flex justify-between mt-1 px-1">
          {data.length <= 6 ? data.map(d => (
            <span key={d.x} className="text-[10px] font-medium" style={{ color: muted }}>{d.x.slice(5)}</span>
          )) : (
            <>
              <span className="text-[10px] font-medium" style={{ color: muted }}>{data[0].x.slice(5)}</span>
              <span className="text-[10px] font-medium" style={{ color: muted }}>{data[data.length - 1].x.slice(5)}</span>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'This month', value: formatCurrency(thisMonth) },
          { label: 'Last month', value: formatCurrency(lastMonth) },
          { label: 'Peak month', value: formatCurrency(peak?.y || 0) },
        ].map((s) => (
          <div key={s.label} className="text-center rounded-lg py-1.5" style={{ backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), boxShadow: insetShadow }}>
            <div className="text-xs font-bold tabular-nums leading-tight" style={{ color: theme.text }}>{s.value}</div>
            <div className="text-[10px] font-medium mt-0.5" style={{ color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopVendors({ orders, theme, subtleBg }) {
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
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
        <div
          key={name}
          className="rounded-xl px-2.5 py-2"
          style={{ backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), boxShadow: insetShadow }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{name}</span>
            <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{formatCurrency(val)}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${(val / max) * 100}%`, backgroundColor: theme.primary, opacity: 0.75 }} />
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
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.name}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{r.name}</span>
            <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>{formatCurrency(r.rate)}/mg</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${(r.rate / max) * 100}%`, backgroundColor: theme.primary, opacity: 0.75 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function PeptideCostTrend({ orders, theme, subtleBg }) {
  const muted = theme.textLight
  const accent = theme.primary
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
  const gradId = React.useId().replace(/:/g, '')

  const { months, series, blended, latest, prior, best } = useMemo(() => {
    const byPep = {}
    const blendedMap = {}
    for (const o of orders || []) {
      const month = (o.date || '').slice(0, 7)
      if (!month) continue
      const push = (name, mg, cost) => {
        if (!name || mg <= 0 || cost <= 0) return
        if (!byPep[name]) byPep[name] = { totalCost: 0, months: {} }
        byPep[name].totalCost += cost
        if (!byPep[name].months[month]) byPep[name].months[month] = { mg: 0, cost: 0 }
        byPep[name].months[month].mg += mg
        byPep[name].months[month].cost += cost
        if (!blendedMap[month]) blendedMap[month] = { mg: 0, cost: 0 }
        blendedMap[month].mg += mg
        blendedMap[month].cost += cost
      }
      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          const mg = parseFloat(item.mg) || 0
          const cost = (parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1)
          push(item.name || 'Unknown', mg, cost)
        })
      } else {
        const mg = Number(String(o.mg || '').replace(/[^0-9.]/g, '')) || 0
        const cost = Number(String(o.cost || '').replace(/[^0-9.]/g, '')) || 0
        push(o.peptide || 'Unknown', mg, cost)
      }
    }

    const monthKeys = Object.keys(blendedMap).sort().slice(-12)
    const blendedSeries = monthKeys.map((m) => ({
      x: m,
      rate: blendedMap[m].mg > 0 ? blendedMap[m].cost / blendedMap[m].mg : 0,
    }))

    const ranked = Object.entries(byPep)
      .map(([name, v]) => {
        const pts = Object.keys(v.months).sort().map((m) => ({
          x: m,
          rate: v.months[m].mg > 0 ? v.months[m].cost / v.months[m].mg : 0,
        })).filter((p) => p.rate > 0)
        return { name, totalCost: v.totalCost, pts }
      })
      .filter((r) => r.pts.length >= 1)
      .sort((a, b) => b.totalCost - a.totalCost)

    // Prefer peptides with 2+ months for a real trend; fall back to top spenders
    const withTrend = ranked.filter((r) => r.pts.length >= 2)
    const pick = (withTrend.length > 0 ? withTrend : ranked).slice(0, 3)

    const seriesOut = pick.map((r) => {
      const first = r.pts[0]?.rate ?? 0
      const last = r.pts[r.pts.length - 1]?.rate ?? 0
      const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0
      return { name: r.name, latest: last, deltaPct }
    })

    const latestRate = blendedSeries.length ? blendedSeries[blendedSeries.length - 1].rate : 0
    const priorRate = blendedSeries.length > 1 ? blendedSeries[blendedSeries.length - 2].rate : null
    const bestRate = blendedSeries.length
      ? blendedSeries.reduce((m, d) => (d.rate > 0 && (m == null || d.rate < m) ? d.rate : m), null)
      : null

    return {
      months: monthKeys,
      series: seriesOut,
      blended: blendedSeries,
      latest: latestRate,
      prior: priorRate,
      best: bestRate,
    }
  }, [orders])

  const chart = useMemo(() => {
    const w = 360, h = 100, padT = 10, padB = 8, padX = 12
    const rates = blended.map((d) => d.rate).filter((v) => v > 0)
    const max = Math.max(1, ...rates)
    const n = Math.max(1, months.length - 1)
    const xAt = (i) => padX + (i / n) * (w - padX * 2)
    const yAt = (rate) => padT + (1 - rate / max) * (h - padT - padB)

    const pts = blended.map((d, i) => ({ x: xAt(i), y: yAt(d.rate), rate: d.rate }))
    const line = mkJourneySmoothPath(pts)
    const area = pts.length >= 2
      ? `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`
      : ''

    return { w, h, pts, line, area }
  }, [months, blended])

  if (!months.length || blended.every((d) => d.rate <= 0)) {
    return <div className="text-xs py-6 text-center" style={{ color: muted }}>No $/mg history yet — add mg + cost on orders</div>
  }

  const changePct = prior != null && prior > 0 ? ((latest - prior) / prior) * 100 : null
  const seriesColors = [
    accent,
    theme.isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
    theme.isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.28)',
  ]

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="rounded-xl p-2.5 border"
        style={{
          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.025)',
        }}
      >
        <svg width="100%" height={112} viewBox={`0 0 ${chart.w} ${chart.h}`} preserveAspectRatio="none" className="block">
          <defs>
            <linearGradient id={`cost-trend-area-${gradId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line
            x1={12} y1={chart.h / 2} x2={chart.w - 12} y2={chart.h / 2}
            stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
            strokeWidth="1" strokeDasharray="3,3"
          />
          {chart.area && <path d={chart.area} fill={`url(#cost-trend-area-${gradId})`} />}
          {chart.line && (
            <path d={chart.line} fill="none" stroke={accent} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {chart.pts.map((p, i) => (
            <circle
              key={`pt-${i}`}
              cx={p.x}
              cy={p.y}
              r={i === chart.pts.length - 1 ? 3.5 : 2.5}
              fill={accent}
            />
          ))}
        </svg>
        <div className="flex justify-between mt-1 px-1">
          <span className="text-[10px] font-medium" style={{ color: muted }}>{months[0]?.slice(5)}</span>
          {months.length > 2 && (
            <span className="text-[10px] font-medium" style={{ color: muted }}>blended $/mg</span>
          )}
          <span className="text-[10px] font-medium" style={{ color: muted }}>{months[months.length - 1]?.slice(5)}</span>
        </div>
      </div>

      {series.length > 0 && (
        <div className="space-y-1.5">
          {series.map((s, idx) => (
            <div
              key={s.name}
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
              style={{ backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), boxShadow: insetShadow }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: seriesColors[idx] || accent }}
                />
                <span className="text-xs font-semibold truncate" style={{ color: theme.text }}>{s.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold tabular-nums" style={{ color: theme.text }}>{formatCurrency(s.latest)}/mg</span>
                {s.deltaPct !== 0 && Math.abs(s.deltaPct) >= 0.5 && (
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: s.deltaPct < 0 ? accent : muted }}
                  >
                    {s.deltaPct > 0 ? '+' : ''}{Math.round(s.deltaPct)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { label: 'Latest', value: formatCurrency(latest) },
          {
            label: 'vs prior mo',
            value: changePct == null ? '—' : `${changePct > 0 ? '+' : ''}${Math.round(changePct)}%`,
          },
          { label: 'Best $/mg', value: best != null ? formatCurrency(best) : '—' },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center rounded-lg py-1.5"
            style={{ backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), boxShadow: insetShadow }}
          >
            <div className="text-xs font-bold tabular-nums leading-tight" style={{ color: theme.text }}>{s.value}</div>
            <div className="text-[10px] font-medium mt-0.5" style={{ color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LeadtimeHistogram({ orders, theme, subtleBg }) {
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
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
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <div className="text-xs py-2" style={{ color: muted }}>No delivery dates yet</div>
  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="rounded-xl p-2.5 border space-y-2.5"
        style={{
          borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.025)',
        }}
      >
        {entries.map(([k, v]) => (
          <div key={k}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm font-semibold" style={{ color: theme.text }}>{k} days</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: theme.text }}>{v}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(v / max) * 100}%`, backgroundColor: theme.primary, opacity: 0.75 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'Tracked orders', value: total },
          { label: 'Most common', value: `${entries.reduce((best, e) => e[1] > best[1] ? e : best, entries[0])[0]}d` },
        ].map((s) => (
          <div
            key={s.label}
            className="text-center rounded-lg py-1.5"
            style={{ backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), boxShadow: insetShadow }}
          >
            <div className="text-xs font-bold tabular-nums leading-tight" style={{ color: theme.text }}>{s.value}</div>
            <div className="text-[10px] font-medium mt-0.5" style={{ color: muted }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function VendorLeadtimeOnTime({ orders, theme, subtleBg }) {
  const muted = theme.textLight
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
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
      if (leads.length === 0) return { vendor, avg: null, ontime: null, n: 0 }
      const avg = leads.reduce((a, b) => a + b, 0) / leads.length
      const ontime = leads.filter(d => d <= 7).length / leads.length
      return { vendor, avg, ontime, n: leads.length }
    }).filter(r => r.n > 0).sort((a, b) => (a.avg ?? 1e9) - (b.avg ?? 1e9)).slice(0, 5)
  }, [orders])
  if (rows.length === 0) return <div className="text-xs py-2" style={{ color: muted }}>No vendor lead-time data yet</div>
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div
          key={r.vendor}
          className="rounded-xl px-2.5 py-2"
          style={{ backgroundColor: subtleBg || (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'), boxShadow: insetShadow }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-semibold truncate" style={{ color: theme.text }}>{r.vendor}</span>
            <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: theme.text }}>
              {r.avg != null ? `${r.avg.toFixed(1)}d` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <div className="h-full rounded-full"
                style={{ width: `${Math.round((r.ontime || 0) * 100)}%`, backgroundColor: theme.primary, opacity: 0.75 }} />
            </div>
            <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: muted }}>
              {r.ontime != null ? `${Math.round(r.ontime * 100)}% on-time` : '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
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
