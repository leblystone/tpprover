import React, { useEffect, useState } from 'react'
 import { Target } from 'lucide-react'
 import BottomSheet from '../common/BottomSheet'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function GoalModal({ open, onClose, onSave, onDelete, theme, goal }) {
  const [form, setForm] = useState({ id: undefined, text: '', dueDate: todayISO(), completed: false })
  
  // Auto-save functionality
  const { markAsSubmitted } = useAutoSave(
    `goal_form_${goal?.id || 'new'}`,
    form,
    setForm
  )
  useEffect(() => {
    if (!open) return
    if (goal) setForm({ id: goal.id, text: goal.text || goal.title || '', dueDate: goal.dueDate || goal.targetDate || todayISO(), completed: !!goal.completed })
    else setForm({ id: undefined, text: '', dueDate: todayISO(), completed: false })
  }, [open, goal])

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={goal ? 'Edit Goal' : 'New Goal'}
      theme={theme}
      footer={(
        <div className="flex items-center gap-2 w-full">
          {goal && <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border, color: '#b91c1c' }}>Delete</button>}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
            <button onClick={() => {
              markAsSubmitted();
              onSave?.(form);
            }} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Target size={32} style={{ color: theme.primary }} />
          <div className="flex flex-col gap-0.5">
            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Research Goal</h4>
            <div className="flex items-center gap-2 ml-1">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Target Objective
              </span>
            </div>
          </div>
        </div>
        
        <TextInput label="Goal" value={form.text} onChange={v => setForm(prev => ({ ...prev, text: v }))} placeholder="Describe your goal" theme={theme} />
        <GlassmorphismDatePicker
          value={form.dueDate || ''}
          onChange={(dateString) => setForm(prev => ({ ...prev, dueDate: dateString }))}
          theme={theme}
          placeholder="Goal Date"
        />
      </div>
    </BottomSheet>
  )
}
