/**
 * Live progress helpers for linked goals.
 * Never invents medical targets — only reads user data + user-set targets.
 */

import { normalizeMetricRow, metricDateKey } from './metricsDisplay'
import { getTaskStreak } from './taskStreak'
import { getHydrationStreak } from './hydrationStreak'
import { getComplianceStats, countAllTimeDoses, gradeRank } from './complianceStats'
import { getLabResults, getMarkerSeries } from './labResults'
import { getProtocolHistory } from './protocolHistory'
import { getTaskCompletion } from './taskCompletion'
import { getLabMarkerByKey } from '../data/labMarkers'

function latestMetricField(metrics, field) {
  const rows = Array.isArray(metrics) ? [...metrics] : []
  rows.sort((a, b) => {
    const da = metricDateKey(a) || ''
    const db = metricDateKey(b) || ''
    if (da !== db) return db.localeCompare(da)
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
  })
  for (const row of rows) {
    const n = normalizeMetricRow(row)
    if (n[field] != null) return n[field]
  }
  return null
}

function sumOrderSpend(orders) {
  let total = 0
  let settings = {}
  try {
    settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}')
  } catch {
    /* ignore */
  }
  const includeShipping = settings.orders?.includeShippingInCosts ?? true
  for (const o of orders || []) {
    if (o.items && o.items.length > 0) {
      const itemsCost = o.items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0
        const quantity = parseInt(item.quantity, 10) || 1
        return sum + price * quantity
      }, 0)
      const shippingCost = includeShipping ? (parseFloat(o.shippingCost) || 0) : 0
      total += itemsCost + shippingCost
    } else {
      total += Number(String(o.cost || '').replace(/[^0-9.]/g, '')) || 0
    }
  }
  return total
}

function isLowStock(s) {
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

function countCompletedProtocols(protocolHistory) {
  return (protocolHistory || []).filter(
    (p) => !p.isMock && (p.status === 'completed' || p.completedAt || (p.endDate && !p.active))
  ).length
}

/**
 * Snapshot of live values used by Goals page.
 * Pass context data when available; falls back to localStorage readers.
 */
export function buildGoalLiveSnapshot({
  metrics = [],
  protocols = [],
  supplements = [],
  reconItems = [],
  orders = [],
  stockpile = [],
  taskCompletion,
  protocolHistory,
  labResults,
} = {}) {
  const tc = taskCompletion ?? getTaskCompletion()
  const compliance = getComplianceStats(protocols, supplements, reconItems, tc)
  const labs = labResults ?? getLabResults()
  const history = protocolHistory ?? getProtocolHistory()

  return {
    weight: latestMetricField(metrics, 'weight'),
    bodyfat: latestMetricField(metrics, 'bodyfat'),
    streak: getTaskStreak(),
    hydrationStreak: getHydrationStreak(),
    compliancePct: compliance.compliancePct,
    complianceGrade: compliance.grade,
    complianceHasData: compliance.hasData,
    allTimeDoses: countAllTimeDoses(tc),
    completedProtocols: countCompletedProtocols(history),
    totalSpend: sumOrderSpend(orders),
    lowStockCount: (stockpile || []).filter(isLowStock).length,
    stockpileCount: (stockpile || []).length,
    labResults: labs,
  }
}

/**
 * Compute progress for a single goal against a live snapshot.
 * @returns {{
 *   current: number|string|null,
 *   target: number|string|null,
 *   pct: number,
 *   label: string,
 *   met: boolean,
 *   unit?: string,
 * } | null}
 */
export function getLinkedGoalProgress(goal, snapshot) {
  if (!goal?.linkedType || !snapshot) return null
  const type = goal.linkedType
  const targetRaw = goal.linkedTarget
  const start = goal.linkedStartValue != null ? Number(goal.linkedStartValue) : null

  switch (type) {
    case 'weight': {
      const current = snapshot.weight
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || current == null) {
        return {
          current,
          target: Number.isFinite(target) ? target : null,
          pct: 0,
          label: current == null ? 'Log a weight to track progress' : `Current ${current} lbs`,
          met: false,
          unit: 'lbs',
        }
      }
      const met = start != null && Number.isFinite(start)
        ? (target <= start ? current <= target : current >= target)
        : current === target
      let pct = 0
      if (start != null && Number.isFinite(start) && start !== target) {
        const span = Math.abs(target - start)
        const moved = Math.abs(current - start)
        const toward = (target <= start && current <= start) || (target >= start && current >= start)
        pct = toward ? Math.min(100, Math.round((moved / span) * 100)) : 0
        if (met) pct = 100
      } else {
        pct = met ? 100 : 0
      }
      return {
        current,
        target,
        pct,
        label: `${current} → ${target} lbs`,
        met,
        unit: 'lbs',
      }
    }
    case 'bodyfat': {
      const current = snapshot.bodyfat
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || current == null) {
        return {
          current,
          target: Number.isFinite(target) ? target : null,
          pct: 0,
          label: current == null ? 'Log body fat to track progress' : `Current ${current}%`,
          met: false,
          unit: '%',
        }
      }
      const met = start != null && Number.isFinite(start)
        ? (target <= start ? current <= target : current >= target)
        : current === target
      let pct = 0
      if (start != null && Number.isFinite(start) && start !== target) {
        const span = Math.abs(target - start)
        const moved = Math.abs(current - start)
        const toward = (target <= start && current <= start) || (target >= start && current >= start)
        pct = toward ? Math.min(100, Math.round((moved / span) * 100)) : 0
        if (met) pct = 100
      } else {
        pct = met ? 100 : 0
      }
      return {
        current,
        target,
        pct,
        label: `${current}% → ${target}%`,
        met,
        unit: '%',
      }
    }
    case 'streak': {
      const current = snapshot.streak || 0
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || target <= 0) {
        return { current, target: null, pct: 0, label: `${current} day streak`, met: false }
      }
      const pct = Math.min(100, Math.round((current / target) * 100))
      return {
        current,
        target,
        pct,
        label: `${current} / ${target} day streak`,
        met: current >= target,
      }
    }
    case 'hydrationStreak': {
      const current = snapshot.hydrationStreak || 0
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || target <= 0) {
        return { current, target: null, pct: 0, label: `${current} day hydration`, met: false }
      }
      const pct = Math.min(100, Math.round((current / target) * 100))
      return {
        current,
        target,
        pct,
        label: `${current} / ${target} hydration days`,
        met: current >= target,
      }
    }
    case 'complianceGrade': {
      const current = snapshot.complianceGrade || '—'
      const target = String(targetRaw || 'A').toUpperCase()
      const met = gradeRank(current) >= gradeRank(target) && snapshot.complianceHasData
      return {
        current,
        target,
        pct: met ? 100 : Math.min(99, snapshot.compliancePct || 0),
        label: snapshot.complianceHasData
          ? `Grade ${current} · target ${target}`
          : 'No compliance data yet',
        met,
      }
    }
    case 'allTimeDoses': {
      const current = snapshot.allTimeDoses || 0
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || target <= 0) {
        return { current, target: null, pct: 0, label: `${current} doses logged`, met: false }
      }
      const pct = Math.min(100, Math.round((current / target) * 100))
      return {
        current,
        target,
        pct,
        label: `${current} / ${target} doses`,
        met: current >= target,
      }
    }
    case 'completedProtocols': {
      const current = snapshot.completedProtocols || 0
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || target <= 0) {
        return { current, target: null, pct: 0, label: `${current} protocols finished`, met: false }
      }
      const pct = Math.min(100, Math.round((current / target) * 100))
      return {
        current,
        target,
        pct,
        label: `${current} / ${target} protocols`,
        met: current >= target,
      }
    }
    case 'spendBudget': {
      const current = snapshot.totalSpend || 0
      const target = Number(targetRaw)
      if (!Number.isFinite(target) || target <= 0) {
        return {
          current,
          target: null,
          pct: 0,
          label: `$${Math.round(current).toLocaleString()} spent`,
          met: false,
        }
      }
      const pct = Math.min(100, Math.round((current / target) * 100))
      const underBudget = current <= target
      // Only "met" (auto-complete) once the goal's target/due date has arrived
      const dueRaw = goal.dueDate || goal.targetDate
      let duePassed = false
      if (dueRaw) {
        const due = new Date(dueRaw)
        if (!Number.isNaN(due.getTime())) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          due.setHours(0, 0, 0, 0)
          duePassed = today >= due
        }
      }
      return {
        current,
        target,
        pct,
        label: `$${Math.round(current).toLocaleString()} / $${Math.round(target).toLocaleString()}`,
        met: underBudget && duePassed,
        underBudget,
      }
    }
    case 'lowStockCleared': {
      const current = snapshot.lowStockCount || 0
      const stockCount = snapshot.stockpileCount || 0
      const met = stockCount > 0 && current === 0
      return {
        current,
        target: 0,
        pct: met ? 100 : (stockCount === 0 ? 0 : Math.max(0, 100 - current * 20)),
        label: stockCount === 0
          ? 'Add stockpile items to track'
          : current === 0
            ? 'No low-stock items'
            : `${current} low-stock item${current === 1 ? '' : 's'}`,
        met,
      }
    }
    case 'labMarker': {
      const markerKey = goal.linkedMarkerKey
      if (!markerKey) {
        return { current: null, target: null, pct: 0, label: 'Pick a lab marker', met: false }
      }
      const catalog = getLabMarkerByKey(markerKey)
      const series = getMarkerSeries(snapshot.labResults, {
        markerKey,
        markerName: goal.linkedMarkerName,
      })
      const latest = series.length ? series[series.length - 1].value : null
      const target = Number(targetRaw)
      const unit = catalog?.unit || goal.linkedMarkerUnit || ''
      if (!Number.isFinite(target) || latest == null) {
        return {
          current: latest,
          target: Number.isFinite(target) ? target : null,
          pct: 0,
          label: latest == null
            ? `Log ${catalog?.name || 'marker'} to track`
            : `${latest}${unit ? ` ${unit}` : ''}`,
          met: false,
          unit,
        }
      }
      const met = start != null && Number.isFinite(start)
        ? (target <= start ? latest <= target : latest >= target)
        : latest === target
      let pct = 0
      if (start != null && Number.isFinite(start) && start !== target) {
        const span = Math.abs(target - start)
        const moved = Math.abs(latest - start)
        const toward = (target <= start && latest <= start) || (target >= start && latest >= start)
        pct = toward ? Math.min(100, Math.round((moved / span) * 100)) : 0
        if (met) pct = 100
      } else {
        pct = met ? 100 : 0
      }
      return {
        current: latest,
        target,
        pct,
        label: `${latest} → ${target}${unit ? ` ${unit}` : ''}`,
        met,
        unit,
      }
    }
    default:
      return null
  }
}

export function isLinkedGoalMet(goal, snapshot) {
  const progress = getLinkedGoalProgress(goal, snapshot)
  return !!progress?.met
}
