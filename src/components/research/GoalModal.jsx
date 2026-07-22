import React, { useEffect, useState } from 'react'
import { Target, Heart, Flask, Barbell, Star, Stethoscope } from '@phosphor-icons/react'
import BottomSheet from '../common/BottomSheet'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'

export const GOAL_CATEGORIES = [
  { id: 'General', label: 'General', Icon: Target, color: null },
  { id: 'Health', label: 'Health', Icon: Heart, color: '#e07b7b' },
  { id: 'Research', label: 'Research', Icon: Flask, color: '#8ba4c0' },
  { id: 'Fitness', label: 'Fitness', Icon: Barbell, color: '#8fab8f' },
  { id: 'Lifestyle', label: 'Lifestyle', Icon: Star, color: '#b5a87a' },
  { id: 'Medical', label: 'Medical', Icon: Stethoscope, color: '#9ca3af' },
]

export function getGoalCategoryMeta(category, theme) {
  const found = GOAL_CATEGORIES.find(c => c.id === category) || GOAL_CATEGORIES[0]
  return {
    ...found,
    color: found.color || theme?.primary || '#929e82',
  }
}

function toISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function todayISO() {
  return toISODate(new Date())
}

function addDaysISO(baseISO, days) {
  const base = baseISO ? new Date(`${baseISO}T12:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date()
    fallback.setDate(fallback.getDate() + days)
    return toISODate(fallback)
  }
  base.setDate(base.getDate() + days)
  return toISODate(base)
}

const TARGET_QUICK_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

export default function GoalModal({ open, onClose, onSave, onDelete, theme, goal }) {
  const [form, setForm] = useState({
    id: undefined,
    text: '',
    startDate: todayISO(),
    dueDate: '',
    notes: '',
    completed: false,
    category: 'General',
  })

  const { markAsSubmitted } = useAutoSave(
    `goal_form_${goal?.id || 'new'}`,
    form,
    setForm
  )

  useEffect(() => {
    if (!open) return
    if (goal) {
      setForm({
        id: goal.id,
        text: goal.text || goal.title || '',
        startDate: goal.startDate || todayISO(),
        dueDate: goal.dueDate || goal.targetDate || '',
        notes: goal.notes || '',
        completed: !!goal.completed,
        category: goal.category || 'General',
      })
    } else {
      setForm({
        id: undefined,
        text: '',
        startDate: todayISO(),
        dueDate: '',
        notes: '',
        completed: false,
        category: 'General',
      })
    }
  }, [open, goal])

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={goal ? 'Edit Goal' : 'New Goal'}
      theme={theme}
      fitContent={true}
      footer={(
        <div className="flex items-center w-full">
          <button onClick={onClose} className="text-sm font-medium" style={{ color: theme?.textLight || theme?.text, background: 'none', border: 'none', padding: 0 }}>Cancel</button>
          <div className="ml-auto flex items-center gap-2">
            {goal && <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md text-sm font-medium" style={{ color: '#b91c1c', background: 'none', border: 'none' }}>Delete</button>}
            <button onClick={() => {
              markAsSubmitted();
              onSave?.(form);
            }} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary || '#fff' }}>Save</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 mb-4">
          <Target size={28} className="shrink-0" style={{ color: theme.isDark ? 'rgba(200, 215, 195, 0.7)' : theme.primary }} />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-base font-semibold tracking-wide" style={{ color: theme.text }}>Research Goal</h4>
            </div>
            <div className="flex items-center gap-2 ml-1">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.2)' : theme.primary }}></div>
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Category, Name & Dates
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_CATEGORIES.map(({ id, label, Icon, color }) => {
              const selected = (form.category || 'General') === id
              const accent = color || theme.primary
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, category: id }))}
                  className="w-full inline-flex justify-center items-center gap-1.5 px-2 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                  style={{
                    backgroundColor: selected ? accent : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    color: selected ? '#fff' : theme.textLight,
                    border: `1px solid ${selected ? accent : theme.border}`,
                  }}
                >
                  <Icon size={14} weight={selected ? 'fill' : 'duotone'} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <TextInput label="Goal" value={form.text} onChange={v => setForm(prev => ({ ...prev, text: v }))} placeholder="Describe your goal" theme={theme} outlined />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>
              Start Date
            </label>
            <GlassmorphismDatePicker
              value={form.startDate || ''}
              onChange={(dateString) => setForm(prev => ({ ...prev, startDate: dateString }))}
              theme={theme}
              placeholder="Start Date"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: theme.textLight || theme.text, fontSize: '0.75rem', marginBottom: '4px' }}>
              Target Date
            </label>
            <GlassmorphismDatePicker
              value={form.dueDate || ''}
              onChange={(dateString) => setForm(prev => ({ ...prev, dueDate: dateString }))}
              theme={theme}
              placeholder="Target Date"
            />
            <div className="flex gap-1.5 mt-2">
              {TARGET_QUICK_OPTIONS.map(({ label, days }) => {
                const presetDate = addDaysISO(form.startDate || todayISO(), days)
                const selected = form.dueDate === presetDate
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, dueDate: presetDate }))}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: selected
                        ? `${theme.primary}22`
                        : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: selected ? theme.primary : theme.textLight,
                      border: `1px solid ${selected ? `${theme.primary}40` : theme.border}`,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <TextInput
          label="Notes"
          value={form.notes || ''}
          onChange={v => setForm(prev => ({ ...prev, notes: v }))}
          placeholder="Details, milestones, or reasoning (optional)"
          theme={theme}
          multiline={true}
          outlined
        />
      </div>
    </BottomSheet>
  )
}
