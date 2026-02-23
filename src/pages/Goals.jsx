import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useSyncedGoals } from '../utils/hooks'
import GoalModal from '../components/research/GoalModal'
import { prepareItemForSave } from '../utils/userDataSave'
import { Check, Edit, PlusCircle } from 'lucide-react'

export default function Goals() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const [goals, setGoals] = useSyncedGoals()
  const [showGoal, setShowGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)

  const completed = goals.filter(g => g.completed).length
  const total = goals.length || 1
  const pct = Math.round((completed / total) * 100)

  return (
    <section className="page-bg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Goals</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded-md border text-sm"
            style={{ borderColor: theme.border, color: theme.text }}
          >Back</button>
          <button
            onClick={() => { setEditingGoal(null); setShowGoal(true) }}
            className="px-3 py-2 rounded-md text-sm font-semibold btn-primary-inset"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <PlusCircle className="h-4 w-4 inline mr-1" /> New Goal
          </button>
        </div>
      </div>

      <div className="content-section p-6 mb-6" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="text-sm mb-2" style={{ color: theme.text }}>Overall progress</div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
          <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.primary }} />
        </div>
        <div className="text-xs mt-1" style={{ color: theme.textLight }}>{completed} of {goals.length || 0} completed ({pct}%)</div>
      </div>

      <div className="content-section p-6" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        {goals.length === 0 ? (
          <div className="text-sm" style={{ color: theme.textLight }}>No goals yet. Use "New Goal" to create your first one.</div>
        ) : (
          <ul className="space-y-2">
            {goals.map(g => (
              <li key={g.id} className="flex items-start justify-between p-2 rounded-lg" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? prepareItemForSave({ ...x, completed: !x.completed }) : x))}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5"
                    style={{ borderColor: g.completed ? theme.success : theme.border, backgroundColor: g.completed ? theme.success : 'transparent' }}
                    title={g.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {g.completed && <Check size={12} className="text-white" />}
                  </button>
                  <div style={{ color: g.completed ? theme.textLight : theme.text }} className={g.completed ? 'line-through' : ''}>
                    <div className="font-medium text-sm">{g.text || g.title}</div>
                    {(g.dueDate || g.targetDate) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          Due: {new Date(g.dueDate || g.targetDate).toLocaleDateString()}
                        </span>
                        {!g.completed && (() => {
                          const dueDate = new Date(g.dueDate || g.targetDate);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          dueDate.setHours(0, 0, 0, 0);
                          const diffTime = dueDate.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          let color = theme.info;
                          let countdownText = '';
                          
                          if (diffDays < 0) {
                            color = theme.error;
                            countdownText = `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
                          } else if (diffDays === 0) {
                            color = theme.warning;
                            countdownText = 'Due today';
                          } else if (diffDays <= 7) {
                            color = theme.warning;
                            countdownText = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
                          } else {
                            countdownText = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
                          }
                          
                          return (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: `${color}20`, color: color }}>
                              {countdownText}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
                <button className="p-1 rounded hover:opacity-80" onClick={() => { setEditingGoal(g); setShowGoal(true) }}><Edit className="h-4 w-4" /></button>
              </li>
            ))}
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
    </section>
  )
}


