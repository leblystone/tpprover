import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useSyncedGoals } from '../utils/hooks'
import GoalModal, { getGoalCategoryMeta } from '../components/research/GoalModal'
import { prepareItemForSave } from '../utils/userDataSave'
import {
  Check,
  Lock,
  PencilSimple,
  CaretDown,
  CaretUp,
  Plus,
  Target,
  ArrowRight,
  Play,
} from '@phosphor-icons/react'
import { useTierAccess } from '../utils/useSubscriptionAccess'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'

function getDueMeta(dueRaw, theme) {
  if (!dueRaw) return null
  const dueDate = new Date(dueRaw)
  if (Number.isNaN(dueDate.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  let color = theme.info || theme.primary
  let label = `${diffDays}d left`
  if (diffDays < 0) {
    color = theme.error || '#e07b7b'
    label = `${Math.abs(diffDays)}d overdue`
  } else if (diffDays === 0) {
    color = theme.warning || '#c9a227'
    label = 'Due today'
  } else if (diffDays <= 7) {
    color = theme.warning || '#c9a227'
    label = `${diffDays}d left`
  }
  return {
    color,
    label,
    dateLabel: dueDate.toLocaleDateString(),
  }
}

function ProgressRing({ pct, theme, size = 52 }) {
  const stroke = 4
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={theme.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold tabular-nums" style={{ color: theme.text }}>{pct}%</span>
      </div>
    </div>
  )
}

function SectionHeader({ label, count, theme, collapsible = false, open = true, onToggle }) {
  const Wrapper = collapsible ? 'button' : 'div'
  return (
    <Wrapper
      type={collapsible ? 'button' : undefined}
      onClick={collapsible ? onToggle : undefined}
      className={`flex items-center gap-2 mb-2.5 px-0.5 w-full ${collapsible ? 'cursor-pointer' : ''}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textLight }}>
        {label}
      </span>
      {typeof count === 'number' && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            color: theme.textLight,
          }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
      {collapsible && (
        open
          ? <CaretUp size={14} weight="bold" style={{ color: theme.textLight }} />
          : <CaretDown size={14} weight="bold" style={{ color: theme.textLight }} />
      )}
    </Wrapper>
  )
}

function GoalCard({
  goal,
  theme,
  held = false,
  slotOpen = false,
  completed = false,
  onEdit,
  onToggleComplete,
  onSwap,
}) {
  const meta = getGoalCategoryMeta(goal.category, theme)
  const Icon = meta.Icon
  const tint = held
    ? (theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)')
    : meta.color
  const due = !completed && !held ? getDueMeta(goal.dueDate || goal.targetDate, theme) : null
  const title = goal.text || goal.title || 'Untitled goal'

  const handleCardClick = () => {
    if (held) {
      onSwap?.(goal, slotOpen ? 'resume' : 'swap')
      return
    }
    onEdit?.(goal)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      className="group relative text-left rounded-[20px] p-3.5 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] flex flex-col cursor-pointer"
      style={{
        backgroundColor: held
          ? (theme.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)')
          : (theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)'),
        border: held
          ? `1px dashed ${theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`
          : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: held
          ? 'none'
          : (theme.isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 4px 16px rgba(0,0,0,0.04)'),
        opacity: held ? 0.65 : completed ? 0.7 : 1,
        minHeight: '110px',
      }}
    >
      {!held && !completed && (
        <div
          className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(circle at top right, ${theme.primary}15 0%, transparent 60%)` }}
        />
      )}

      {held && (
        <div className="absolute top-2.5 right-2.5 z-20">
          <Lock size={11} weight="bold" style={{ color: theme.textLight }} />
        </div>
      )}

      <div className="relative z-10 w-full flex items-start gap-3 mb-2">
        <Icon size={28} weight="duotone" color={tint} />
        <div className="flex-1 min-w-0 pt-0.5 pr-1">
          <h3
            className={`font-bold text-sm truncate ${completed ? 'line-through' : ''}`}
            style={{ color: held || completed ? theme.textLight : theme.text }}
          >
            {title}
          </h3>
          {goal.notes ? (
            <p className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
              {goal.notes}
            </p>
          ) : (
            <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wide" style={{ color: theme.textLight, opacity: 0.7 }}>
              {meta.label}
            </p>
          )}
        </div>
        {!held && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit?.(goal)
            }}
            className="p-1.5 rounded-lg shrink-0 hover:opacity-80 transition-opacity"
            aria-label="Edit goal"
          >
            <PencilSimple size={16} weight="bold" style={{ color: theme.textLight }} />
          </button>
        )}
      </div>

      <div
        className="relative z-10 mt-auto pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t"
        style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
      >
        {held ? (
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold" style={{ color: theme.textLight }}>
              Paused
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: slotOpen
                  ? `${theme.primary}22`
                  : (theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                color: slotOpen ? theme.primary : theme.textLight,
              }}
            >
              {slotOpen ? 'Tap to resume' : 'Tap to swap'}
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 min-w-0 flex-1 items-center">
              {due ? (
                <>
                  <span className="text-[10px]" style={{ color: theme.textLight }}>
                    Due {due.dateLabel}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${due.color}20`, color: due.color }}
                  >
                    {due.label}
                  </span>
                </>
              ) : completed ? (
                <span className="text-[10px] font-semibold" style={{ color: theme.success || theme.primary }}>
                  Completed
                </span>
              ) : (
                <span className="text-[10px]" style={{ color: theme.textLight }}>
                  No due date
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleComplete?.(goal)
              }}
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90"
              style={{
                borderColor: completed ? (theme.success || theme.primary) : theme.border,
                backgroundColor: completed ? (theme.success || theme.primary) : 'transparent',
              }}
              title={completed ? 'Mark incomplete' : 'Mark complete'}
              aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {completed && <Check size={14} weight="bold" color="#fff" />}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Goals() {
  const { theme } = useOutletContext()
  const [goals, setGoals] = useSyncedGoals()
  const [showGoal, setShowGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [swapTarget, setSwapTarget] = useState(null)
  const [completedOpen, setCompletedOpen] = useState(null)

  const { caps } = useTierAccess()
  const { isDowngraded } = useSubscriptionAccess()
  const prevIsDowngradedRef = useRef(null)

  const organized = useMemo(() => {
    const active = goals.filter(g => !g.completed && !g.heldByFreePlan && !g.deleted)
    const held = goals.filter(g => !g.completed && g.heldByFreePlan && !g.deleted)
    const completed = goals.filter(g => g.completed && !g.deleted)
    return { active, held, completed }
  }, [goals])

  const slotOpen = caps.enforced && organized.active.length === 0 && organized.held.length > 0
  const showCompleted = completedOpen === null
    ? organized.active.length === 0 && organized.held.length === 0
    : completedOpen

  // Auto-hold excess goals on downgrade
  useEffect(() => {
    if (!caps.enforced) return
    if (organized.active.length <= 1) return
    const [, ...rest] = organized.active
    if (rest.length === 0) return
    setGoals(prev => prev.map(g => {
      if (rest.find(r => r.id === g.id)) {
        return { ...g, heldByFreePlan: true, heldAt: new Date().toISOString() }
      }
      return g
    }))
  }, [caps.enforced, organized.active.length]) // eslint-disable-line

  // Clear held flags on resubscription
  useEffect(() => {
    if (prevIsDowngradedRef.current === true && !isDowngraded) {
      setGoals(prev => prev.map(g => g.heldByFreePlan ? { ...g, heldByFreePlan: false } : g))
    }
    prevIsDowngradedRef.current = isDowngraded
  }, [isDowngraded]) // eslint-disable-line

  const handleAdd = useCallback(() => {
    if (caps.enforced && caps.maxGoals !== null && organized.active.length >= caps.maxGoals) {
      setShowUpgrade(true)
      return
    }
    setEditingGoal(null)
    setShowGoal(true)
  }, [caps, organized.active.length])

  const handleEdit = useCallback((g) => {
    if (caps.enforced && g.heldByFreePlan) return
    setEditingGoal(g)
    setShowGoal(true)
  }, [caps])

  const handleToggleComplete = useCallback((g) => {
    setGoals(prev => prev.map(x =>
      x.id === g.id ? prepareItemForSave({ ...x, completed: !x.completed }) : x
    ))
  }, [setGoals])

  const handleSwap = useCallback((heldGoal, action) => {
    if (action === 'resume') {
      setGoals(prev => prev.map(g => g.id === heldGoal.id ? { ...g, heldByFreePlan: false } : g))
      return
    }
    setSwapTarget(heldGoal)
  }, []) // eslint-disable-line

  const confirmSwap = useCallback(() => {
    if (!swapTarget) return
    setGoals(prev => prev.map(g => {
      if (!g.completed && !g.heldByFreePlan && !g.deleted) {
        return { ...g, heldByFreePlan: true, heldAt: new Date().toISOString() }
      }
      if (g.id === swapTarget.id) {
        return { ...g, heldByFreePlan: false }
      }
      return g
    }))
    setSwapTarget(null)
  }, [swapTarget]) // eslint-disable-line

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
      detail: {
        tabs: [{ value: 'goals', label: 'Goals' }],
        activeTab: 'goals',
        onTabChange: () => {},
        onActionClick: handleAdd,
        actionDisabled: false,
      }
    }))
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'))
    }
  }, [handleAdd])

  const allVisible = goals.filter(g => !g.deleted)
  const completedCount = allVisible.filter(g => g.completed).length
  const total = allVisible.length || 1
  const pct = allVisible.length === 0 ? 0 : Math.round((completedCount / total) * 100)
  const hasAny = allVisible.length > 0

  return (
    <section className="page-bg px-2 sm:px-4 py-4 space-y-4">

      {/* Free-plan slot banner */}
      {caps.enforced && caps.maxGoals !== null && (
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
            border: `1px solid ${theme.border}`,
            boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lock size={12} weight="bold" style={{ color: theme.textLight }} />
                <p className="text-sm font-semibold" style={{ color: theme.text }}>
                  {organized.active.length} / {caps.maxGoals} active goal slot used
                </p>
              </div>
              <p className="text-xs" style={{ color: theme.textLight }}>
                {organized.held.length > 0
                  ? `${organized.held.length} goal${organized.held.length > 1 ? 's' : ''} held — your data is always yours`
                  : 'Complete your active goal to open a new slot'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="shrink-0 text-xs font-semibold inline-flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
            >
              Upgrade
              <ArrowRight size={11} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Slot-open banner */}
      {slotOpen && (
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: `${theme.primary}12`, border: `1px solid ${theme.primary}30` }}
        >
          <Play size={14} weight="fill" style={{ color: theme.primary, flexShrink: 0 }} />
          <p className="text-sm flex-1" style={{ color: theme.text }}>
            <span className="font-semibold">Goal slot is open</span> — tap a held goal below to resume it.
          </p>
        </div>
      )}

      {/* Held goals hint */}
      {caps.enforced && organized.held.length > 0 && !slotOpen && (
        <div className="flex items-center gap-2 flex-wrap px-0.5">
          <Lock size={12} weight="bold" style={{ color: theme.textLight }} />
          <p className="text-xs" style={{ color: theme.textLight }}>
            <span className="font-semibold">{organized.held.length} goal{organized.held.length > 1 ? 's' : ''} paused</span>
            {' — tap a paused goal to swap it.'}
          </p>
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="ml-auto text-xs font-semibold inline-flex items-center gap-1 hover:opacity-80 transition-all"
            style={{ color: theme.primary }}
          >
            Upgrade to restore all <ArrowRight size={12} weight="bold" />
          </button>
        </div>
      )}

      {/* Hero stats */}
      {hasAny && (
        <div
          className="relative overflow-hidden rounded-2xl p-4 md:p-5"
          style={{
            backgroundColor: theme.cardBackground,
            backgroundImage: `linear-gradient(135deg, ${theme.primary}22 0%, ${theme.accent || theme.primary}14 55%, transparent 100%)`,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.isDark
              ? `0 4px 16px ${theme.primary}18`
              : `0 4px 18px ${theme.primary}14`,
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${theme.primary}22` }}
            >
              <Target size={22} weight="duotone" style={{ color: theme.primary }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-bold" style={{ color: theme.text }}>
                Your Goals
              </h2>
              <p className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                Track targets and celebrate progress
              </p>
            </div>
            <ProgressRing pct={pct} theme={theme} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Active', value: organized.active.length },
              { label: 'Completed', value: completedCount },
              { label: 'Progress', value: `${pct}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[14px] px-3 py-2.5 text-center"
                style={{
                  backgroundColor: theme.isDark ? `${theme.primary}18` : theme.background,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <div className="text-lg md:text-xl font-bold tabular-nums" style={{ color: theme.text }}>
                  {stat.value}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: theme.textLight }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAny ? (
        <div
          className="rounded-[24px] p-10 text-center"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          }}
        >
          <div
            className="w-14 h-14 rounded-[20px] mx-auto mb-4 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}20 0%, ${theme.primary}05 100%)`,
              border: `1px solid ${theme.primary}25`,
            }}
          >
            <Target size={26} weight="duotone" style={{ color: theme.primary }} />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: theme.text }}>
            No goals yet
          </p>
          <p className="text-sm mb-6" style={{ color: theme.textLight }}>
            Set a research target and track your progress
          </p>
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-[14px] text-sm font-bold transition-all active:scale-95 btn-primary-inset"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#fff' }}
          >
            <Plus size={15} weight="bold" />
            Add your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active goals */}
          {(organized.active.length > 0 || organized.held.length > 0) && (
            <div>
              <SectionHeader
                label="Active Goals"
                count={organized.active.length + organized.held.length}
                theme={theme}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {organized.active.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    theme={theme}
                    onEdit={handleEdit}
                    onToggleComplete={handleToggleComplete}
                  />
                ))}
                {organized.held.map(g => (
                  <GoalCard
                    key={g.id}
                    goal={g}
                    theme={theme}
                    held
                    slotOpen={slotOpen}
                    onEdit={handleEdit}
                    onSwap={handleSwap}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed goals */}
          {organized.completed.length > 0 && (
            <div>
              <SectionHeader
                label="Completed"
                count={organized.completed.length}
                theme={theme}
                collapsible
                open={showCompleted}
                onToggle={() => setCompletedOpen(!showCompleted)}
              />
              {showCompleted && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {organized.completed.map(g => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      theme={theme}
                      completed
                      onEdit={handleEdit}
                      onToggleComplete={handleToggleComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <GoalModal
        open={showGoal}
        onClose={() => setShowGoal(false)}
        theme={theme}
        goal={editingGoal}
        onSave={(form) => {
          setGoals(prev => {
            if (form.id) return prev.map(g => g.id === form.id ? prepareItemForSave({
              ...form,
              title: form.text || form.title,
              startDate: form.startDate,
              targetDate: form.dueDate || form.targetDate,
              category: form.category || 'General',
            }) : g)
            return [prepareItemForSave({
              ...form,
              title: form.text || form.title,
              startDate: form.startDate,
              targetDate: form.dueDate || form.targetDate,
              category: form.category || 'General',
            }, { isNew: true }), ...prev]
          })
          setShowGoal(false)
          setEditingGoal(null)
        }}
        onDelete={(form) => {
          setGoals(prev => prev.filter(g => g.id !== form.id))
          setShowGoal(false)
          setEditingGoal(null)
        }}
      />

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} theme={theme} />

      {/* Swap confirmation */}
      {swapTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSwapTarget(null) }}
        >
          <div
            className="w-full max-w-sm rounded-[24px] p-6"
            style={{
              backgroundColor: theme.card || (theme.isDark ? '#1c1c1e' : '#fff'),
              border: `1px solid ${theme.border}`,
              boxShadow: '0 24px 48px rgba(0,0,0,0.32)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.primary}18` }}>
                <ArrowRight size={18} weight="bold" style={{ color: theme.primary }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: theme.text }}>Swap goal?</p>
                <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>Your active goal will be paused</p>
              </div>
            </div>
            {organized.active[0] && (
              <div
                className="mb-3 rounded-[14px] p-3"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${theme.border}`,
                }}
              >
                <p className="text-xs font-semibold" style={{ color: theme.textLight }}>Currently active → will pause</p>
                <p className="text-sm font-bold mt-0.5 truncate" style={{ color: theme.text }}>
                  {organized.active[0].text || organized.active[0].title}
                </p>
              </div>
            )}
            <div
              className="mb-5 rounded-[14px] p-3"
              style={{ backgroundColor: `${theme.primary}10`, border: `1px solid ${theme.primary}30` }}
            >
              <p className="text-xs font-semibold" style={{ color: theme.primary }}>Will become active</p>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: theme.text }}>
                {swapTarget.text || swapTarget.title}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSwapTarget(null)}
                className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: theme.textLight,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSwap}
                className="flex-1 py-2.5 rounded-[14px] text-sm font-bold"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#fff' }}
              >
                Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
