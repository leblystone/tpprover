import React from 'react'
import {
  Check,
  Lock,
  PencilSimple,
} from '@phosphor-icons/react'
import { getGoalCategoryMeta } from './GoalModal'
import { useIsSimpleMode } from '../../hooks/useIsSimpleMode'

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
    color = theme.error || theme.primary
    label = `${Math.abs(diffDays)}d overdue`
  } else if (diffDays === 0) {
    color = theme.warning || theme.primary
    label = 'Due today'
  } else if (diffDays <= 7) {
    color = theme.warning || theme.primary
    label = `${diffDays}d left`
  }
  return {
    color,
    label,
    dateLabel: dueDate.toLocaleDateString(),
  }
}

export function LinkedProgressBar({ progress, theme }) {
  if (!progress) return null
  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-semibold truncate" style={{ color: theme.textLight }}>
          {progress.label}
        </span>
        <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: theme.primary }}>
          {progress.pct}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: theme.isDark ? `${theme.primary}22` : `${theme.primary}15` }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, Math.max(0, progress.pct))}%`,
            backgroundColor: progress.met ? (theme.success || theme.primary) : theme.primary,
          }}
        />
      </div>
    </div>
  )
}

export function TimeProgressBar({ startDate, dueDate, theme }) {
  if (!startDate || !dueDate) return null
  const start = new Date(`${startDate}T12:00:00`).getTime()
  const due = new Date(`${dueDate}T12:00:00`).getTime()
  const now = Date.now()
  if (Number.isNaN(start) || Number.isNaN(due) || due <= start) return null
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (due - start)) * 100)))
  const isOverdue = now > due
  const barColor = isOverdue ? (theme.error || '#e07b7b') : theme.primary
  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-semibold" style={{ color: theme.textLight }}>Time elapsed</span>
        <span className="text-[10px] font-bold tabular-nums" style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? `${theme.primary}22` : `${theme.primary}15` }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

/**
 * Active / held / completed goal card — shared by Goals page and setup review.
 */
export default function GoalCard({
  goal,
  theme,
  held = false,
  slotOpen = false,
  completed = false,
  onEdit,
  onToggleComplete,
  onSwap,
  linkedProgress = null,
  hideActions = false,
}) {
  const simpleMode = useIsSimpleMode()
  const meta = getGoalCategoryMeta(goal.category, theme)
  const Icon = meta.Icon
  const tint = held
    ? theme.textLight
    : meta.color
  const showLinked = !simpleMode && !!goal.linkedType
  const due = !completed && !held && !showLinked ? getDueMeta(goal.dueDate || goal.targetDate, theme) : null
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
          ? (theme.isDark ? `${theme.primary}08` : theme.background)
          : theme.cardBackground,
        border: held
          ? `1px dashed ${theme.border}`
          : `1px solid ${theme.border}`,
        borderLeft: held ? undefined : `4px solid ${tint}`,
        boxShadow: held
          ? 'none'
          : (theme.isDark ? `0 4px 12px ${theme.primary}12` : `0 4px 16px ${theme.primary}10`),
        opacity: held ? 0.65 : completed ? 0.8 : 1,
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
            className={`font-bold text-sm ${completed ? 'line-through' : ''}`}
            style={{ color: held || completed ? theme.textLight : theme.text, wordBreak: 'break-word', overflowWrap: 'break-word' }}
          >
            {title}
          </h3>
          {!simpleMode && goal.notes ? (
            <p className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
              {goal.notes}
            </p>
          ) : (
            <p className="text-[10px] mt-0.5 font-medium uppercase tracking-wide" style={{ color: theme.textLight, opacity: 0.7 }}>
              {showLinked ? `Auto · ${meta.label}` : meta.label}
            </p>
          )}
        </div>
      </div>

      <div
        className="relative z-10 mt-auto pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t"
        style={{ borderColor: theme.border }}
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
                  : `${theme.primary}12`,
                color: slotOpen ? theme.primary : theme.textLight,
              }}
            >
              {slotOpen ? 'Tap to resume' : 'Tap to swap'}
            </span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 min-w-0 flex-1 items-center">
              {showLinked && linkedProgress && !completed ? (
                <LinkedProgressBar progress={linkedProgress} theme={theme} />
              ) : completed ? (
                <span className="text-[10px] font-semibold" style={{ color: theme.success || theme.primary }}>
                  ✓ Completed{goal.updatedAt ? ` · ${new Date(goal.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                </span>
              ) : due ? (
                !simpleMode && goal.startDate ? (
                  <TimeProgressBar startDate={goal.startDate} dueDate={goal.dueDate || goal.targetDate} theme={theme} />
                ) : (
                  <span className="text-[10px] font-semibold" style={{ color: due.color }}>
                    {due.label}
                  </span>
                )
              ) : (
                <span className="text-[10px]" style={{ color: theme.textLight }}>
                  No due date
                </span>
              )}
            </div>
            {!showLinked && !hideActions && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleComplete?.(goal, e)
                }}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all active:scale-90"
                style={{
                  borderColor: completed ? (theme.success || theme.primary) : theme.border,
                  backgroundColor: completed ? (theme.success || theme.primary) : 'transparent',
                }}
                title={completed ? 'Mark incomplete' : 'Mark complete'}
                aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
              >
                {completed && <Check size={14} weight="bold" color={theme.textOnPrimary || '#fff'} />}
              </button>
            )}
            {showLinked && linkedProgress?.met && !completed && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: `${theme.success || theme.primary}22`, color: theme.success || theme.primary }}
              >
                Reached
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
