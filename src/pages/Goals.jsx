import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useSyncedGoals } from '../utils/hooks'
import GoalModal from '../components/research/GoalModal'
import { prepareItemForSave } from '../utils/userDataSave'
import { Check, Edit, Lock, AlertTriangle, ArrowRight, Play } from 'lucide-react'
import { useTierAccess } from '../utils/useSubscriptionAccess'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'

export default function Goals() {
  const { theme } = useOutletContext()
  const [goals, setGoals] = useSyncedGoals()
  const [showGoal, setShowGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [swapTarget, setSwapTarget] = useState(null)

  const { caps } = useTierAccess()
  const { isDowngraded } = useSubscriptionAccess()
  const prevIsDowngradedRef = useRef(null)

  // Active = incomplete + not held. Held = heldByFreePlan.
  const organized = useMemo(() => {
    const active = goals.filter(g => !g.completed && !g.heldByFreePlan && !g.deleted)
    const held = goals.filter(g => !g.completed && g.heldByFreePlan && !g.deleted)
    const completed = goals.filter(g => g.completed && !g.deleted)
    return { active, held, completed }
  }, [goals])

  const slotOpen = caps.enforced && organized.active.length === 0 && organized.held.length > 0

  // Auto-hold excess goals on downgrade
  useEffect(() => {
    if (!caps.enforced) return
    if (organized.active.length <= 1) return
    // More than 1 active goal on free — hold all but the most recent
    const [keep, ...rest] = organized.active
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
    if (caps.enforced && g.heldByFreePlan) return // held goals are read-only
    setEditingGoal(g)
    setShowGoal(true)
  }, [caps])

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
  const completed = allVisible.filter(g => g.completed).length
  const total = allVisible.length || 1
  const pct = Math.round((completed / total) * 100)

  return (
    <section className="page-bg">

      {/* Free-plan slot banner */}
      {caps.enforced && caps.maxGoals !== null && (
        <div
          className="rounded-2xl px-4 py-3.5 mb-4"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
            border: `1px solid ${theme.border}`,
            boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Lock size={12} style={{ color: theme.textLight }} />
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
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Slot-open banner */}
      {slotOpen && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: `${theme.primary}12`, border: `1px solid ${theme.primary}30` }}>
          <Play size={14} style={{ color: theme.primary, flexShrink: 0 }} />
          <p className="text-sm flex-1" style={{ color: theme.text }}>
            <span className="font-semibold">Goal slot is open</span> — tap a held goal below to resume it.
          </p>
        </div>
      )}

      {/* Held goals hint */}
      {caps.enforced && organized.held.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Lock size={12} style={{ color: theme.textLight }} />
          <p className="text-xs" style={{ color: theme.textLight }}>
            <span className="font-semibold">{organized.held.length} goal{organized.held.length > 1 ? 's' : ''} paused</span>
            {organized.active.length > 0 ? ' — tap a paused goal to swap it.' : ' — tap a paused goal to resume it.'}
          </p>
          <button type="button" onClick={() => setShowUpgrade(true)} className="ml-auto text-xs font-semibold inline-flex items-center gap-1 hover:opacity-80 transition-all" style={{ color: theme.primary }}>
            Upgrade to restore all <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="content-section p-6 mb-6" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="text-sm mb-2" style={{ color: theme.text }}>Overall progress</div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.primary }} />
        </div>
        <div className="text-xs mt-1" style={{ color: theme.textLight }}>{completed} of {allVisible.length || 0} completed ({pct}%)</div>
      </div>

      {/* Goal list */}
      <div className="content-section p-6" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        {allVisible.length === 0 ? (
          <div className="text-sm" style={{ color: theme.textLight }}>No goals yet. Use "New Goal" to create your first one.</div>
        ) : (
          <ul className="space-y-2">
            {allVisible.map(g => {
              const isHeld = caps.enforced && !!g.heldByFreePlan && !g.completed
              return (
                <li
                  key={g.id}
                  className="flex items-start justify-between p-2 rounded-lg transition-all"
                  style={{
                    border: isHeld
                      ? `1px dashed ${theme.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`
                      : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    backgroundColor: isHeld
                      ? (theme.isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.02)')
                      : (theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                    opacity: isHeld ? 0.65 : 1,
                  }}
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isHeld ? (
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0" style={{ borderColor: theme.border }}>
                        <Lock size={9} style={{ color: theme.textLight }} />
                      </div>
                    ) : (
                      <button
                        onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? prepareItemForSave({ ...x, completed: !x.completed }) : x))}
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0"
                        style={{ borderColor: g.completed ? theme.success : theme.border, backgroundColor: g.completed ? theme.success : 'transparent' }}
                        title={g.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {g.completed && <Check size={12} className="text-white" />}
                      </button>
                    )}

                    <div className="flex-1 min-w-0" style={{ color: (g.completed || isHeld) ? theme.textLight : theme.text }}>
                      <div className={`font-medium text-sm truncate ${g.completed ? 'line-through' : ''}`}>{g.text || g.title}</div>
                      {isHeld ? (
                        <button
                          type="button"
                          onClick={() => handleSwap(g, slotOpen ? 'resume' : 'swap')}
                          className="text-[11px] font-semibold mt-0.5 hover:opacity-80 transition-all"
                          style={{ color: slotOpen ? theme.primary : theme.textLight }}
                        >
                          {slotOpen ? 'Tap to resume' : 'Tap to swap'}
                        </button>
                      ) : (g.dueDate || g.targetDate) && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs" style={{ color: theme.textLight }}>
                            Due: {new Date(g.dueDate || g.targetDate).toLocaleDateString()}
                          </span>
                          {!g.completed && (() => {
                            const dueDate = new Date(g.dueDate || g.targetDate)
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            dueDate.setHours(0, 0, 0, 0)
                            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                            let color = theme.info
                            let label = ''
                            if (diffDays < 0) { color = theme.error; label = `${Math.abs(diffDays)}d overdue` }
                            else if (diffDays === 0) { color = theme.warning; label = 'Due today' }
                            else if (diffDays <= 7) { color = theme.warning; label = `${diffDays}d left` }
                            else { label = `${diffDays}d left` }
                            return <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>{label}</span>
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isHeld && (
                    <button className="p-1 rounded hover:opacity-80 shrink-0" onClick={() => handleEdit(g)}>
                      <Edit className="h-4 w-4" style={{ color: theme.textLight }} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <GoalModal
        open={showGoal}
        onClose={() => setShowGoal(false)}
        theme={theme}
        goal={editingGoal}
        onSave={(form) => {
          setGoals(prev => {
            if (form.id) return prev.map(g => g.id === form.id ? prepareItemForSave(form) : g)
            return [prepareItemForSave({ ...form, title: form.text || form.title, targetDate: form.dueDate || form.targetDate }, { isNew: true }), ...prev]
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
          <div className="w-full max-w-sm rounded-[24px] p-6" style={{ backgroundColor: theme.card || (theme.isDark ? '#1c1c1e' : '#fff'), border: `1px solid ${theme.border}`, boxShadow: '0 24px 48px rgba(0,0,0,0.32)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${theme.primary}18` }}>
                <ArrowRight size={18} style={{ color: theme.primary }} />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: theme.text }}>Swap goal?</p>
                <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>Your active goal will be paused</p>
              </div>
            </div>
            {organized.active[0] && (
              <div className="mb-3 rounded-[14px] p-3" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${theme.border}` }}>
                <p className="text-xs font-semibold" style={{ color: theme.textLight }}>Currently active → will pause</p>
                <p className="text-sm font-bold mt-0.5 truncate" style={{ color: theme.text }}>{organized.active[0].text || organized.active[0].title}</p>
              </div>
            )}
            <div className="mb-5 rounded-[14px] p-3" style={{ backgroundColor: `${theme.primary}10`, border: `1px solid ${theme.primary}30` }}>
              <p className="text-xs font-semibold" style={{ color: theme.primary }}>Will become active</p>
              <p className="text-sm font-bold mt-0.5 truncate" style={{ color: theme.text }}>{swapTarget.text || swapTarget.title}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSwapTarget(null)} className="flex-1 py-2.5 rounded-[14px] text-sm font-semibold" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: theme.textLight }}>Cancel</button>
              <button type="button" onClick={confirmSwap} className="flex-1 py-2.5 rounded-[14px] text-sm font-bold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#fff' }}>Swap</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
