/**
 * Celebration copy / accent / icon for Goals-page completions.
 * Hydration uses HydrationGoalCelebration separately.
 */

import {
  Scales,
  Fire,
  Flask,
  CurrencyDollar,
  Package,
  CheckCircle,
  Target,
  Percent,
  ShieldCheck,
  Pill,
  TestTube,
} from '@phosphor-icons/react'
import weightGoalImg from '../assets/weight_goal.png'
import protocolsGoalImg from '../assets/your_ready_research.png'
import streakGoalImg from '../assets/CHECK.png'
import budgetGoalImg from '../assets/under_budget.png'
import stockGoalImg from '../assets/stockpile.png'
import manualGoalImg from '../assets/target_reached.png'

function formatMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return `$${Math.round(v).toLocaleString()}`
}

function truncate(text, max = 48) {
  const s = String(text || '').trim()
  if (!s) return null
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

const META = {
  weight: {
    accent: '#059669',
    Icon: Scales,
    image: weightGoalImg,
    eyebrow: 'Goal reached',
    title: 'Weight goal crushed!',
    subtitle: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t)
        ? `You hit your ${t} lb target — time to set the next one.`
        : 'You hit your weight target — time to set the next one.'
    },
    pillValue: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) ? String(t) : '✓'
    },
    pillLabel: () => 'lb goal',
  },
  streak: {
    accent: '#EA580C',
    Icon: Fire,
    image: streakGoalImg,
    eyebrow: 'Goal reached',
    title: 'Research streak crushed!',
    subtitle: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) && t > 0
        ? `You hit your ${t}-day research streak — time to set the next one.`
        : 'You hit your research streak goal — time to set the next one.'
    },
    pillValue: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) && t > 0 ? String(t) : '✓'
    },
    pillLabel: (d) => {
      const t = Number(d.linkedTarget)
      return t === 1 ? 'day goal' : 'day goal'
    },
  },
  completedProtocols: {
    accent: '#7C3AED',
    Icon: Flask,
    image: protocolsGoalImg,
    eyebrow: 'Goal reached',
    title: 'Protocols complete!',
    subtitle: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) && t > 0
        ? `${t} protocol${t === 1 ? '' : 's'} finished — time to set the next one.`
        : 'You finished your protocol goal — time to set the next one.'
    },
    pillValue: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) && t > 0 ? String(t) : '✓'
    },
    pillLabel: (d) => {
      const t = Number(d.linkedTarget)
      return t === 1 ? 'finished' : 'finished'
    },
  },
  spendBudget: {
    accent: '#0D9488',
    Icon: CurrencyDollar,
    image: budgetGoalImg,
    eyebrow: 'Goal reached',
    title: 'Budget goal met!',
    subtitle: (d) => {
      const money = formatMoney(d.linkedTarget)
      return money
        ? `You stayed under ${money} — time to set the next one.`
        : 'You stayed under budget — time to set the next one.'
    },
    pillValue: (d) => formatMoney(d.linkedTarget) || '✓',
    pillLabel: () => 'budget',
  },
  lowStockCleared: {
    accent: '#2563EB',
    Icon: Package,
    image: stockGoalImg,
    eyebrow: 'Goal reached',
    title: 'Stockpile restocked!',
    subtitle: () => 'Nothing left on low stock — time to set the next one.',
    pillValue: () => '0',
    pillLabel: () => 'low stock',
  },
  // Fallbacks for non-suggested linked types (still celebratable)
  bodyfat: {
    accent: '#DB2777',
    Icon: Percent,
    eyebrow: 'Goal reached',
    title: 'Body-fat goal crushed!',
    subtitle: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t)
        ? `You hit your ${t}% target — time to set the next one.`
        : 'You hit your body-fat target — time to set the next one.'
    },
    pillValue: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) ? `${t}%` : '✓'
    },
    pillLabel: () => 'goal',
  },
  complianceGrade: {
    accent: '#4F46E5',
    Icon: ShieldCheck,
    eyebrow: 'Goal reached',
    title: 'Compliance goal met!',
    subtitle: (d) => {
      const g = String(d.linkedTarget || 'A').toUpperCase()
      return `You reached Grade ${g} — time to set the next one.`
    },
    pillValue: (d) => String(d.linkedTarget || 'A').toUpperCase(),
    pillLabel: () => 'grade',
  },
  allTimeDoses: {
    accent: '#C026D3',
    Icon: Pill,
    eyebrow: 'Goal reached',
    title: 'Dose milestone hit!',
    subtitle: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) && t > 0
        ? `${t} doses logged — time to set the next one.`
        : 'You hit your dose milestone — time to set the next one.'
    },
    pillValue: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) && t > 0 ? String(t) : '✓'
    },
    pillLabel: () => 'doses',
  },
  labMarker: {
    accent: '#DC2626',
    Icon: TestTube,
    eyebrow: 'Goal reached',
    title: 'Lab goal crushed!',
    subtitle: () => 'You hit your lab marker target — time to set the next one.',
    pillValue: (d) => {
      const t = Number(d.linkedTarget)
      return Number.isFinite(t) ? String(t) : '✓'
    },
    pillLabel: () => 'target',
  },
  manual: {
    accent: '#7F9E95',
    Icon: CheckCircle,
    image: manualGoalImg,
    eyebrow: 'Goal reached',
    title: 'Goal complete!',
    subtitle: (d) => {
      const name = truncate(d.text)
      return name
        ? `"${name}" is done — time to set the next one.`
        : 'You finished your goal — time to set the next one.'
    },
    pillValue: () => '✓',
    pillLabel: () => 'done',
  },
}

/**
 * @param {{ linkedType?: string|null, linkedTarget?: string|number|null, text?: string }} detail
 */
export function getGoalCelebrationMeta(detail = {}) {
  const type = detail.linkedType || null
  const key = type && META[type] ? type : 'manual'
  const base = META[key]
  const accent = base.accent
  return {
    key,
    accent,
    Icon: base.Icon || Target,
    image: base.image || null,
    eyebrow: base.eyebrow,
    title: typeof base.title === 'function' ? base.title(detail) : base.title,
    subtitle: typeof base.subtitle === 'function' ? base.subtitle(detail) : base.subtitle,
    pillValue: typeof base.pillValue === 'function' ? base.pillValue(detail) : base.pillValue,
    pillLabel: typeof base.pillLabel === 'function' ? base.pillLabel(detail) : base.pillLabel,
  }
}

/** Fire the Goals celebration modal (hydration uses its own event). */
export function dispatchGoalCompleteCelebration(goal, { devPreview = false } = {}) {
  if (!goal || typeof window === 'undefined') return
  if (goal.linkedType === 'hydrationStreak') {
    window.dispatchEvent(
      new CustomEvent('tpp:hydration-goal-complete', {
        detail: {
          streak: Number(goal.linkedTarget) || 0,
          goalId: goal.id,
          text: goal.text,
          devPreview,
        },
      })
    )
    return
  }
  window.dispatchEvent(
    new CustomEvent('tpp:goal-complete', {
      detail: {
        linkedType: goal.linkedType || null,
        linkedTarget: goal.linkedTarget ?? null,
        text: goal.text || '',
        goalId: goal.id,
        devPreview,
      },
    })
  )
}
