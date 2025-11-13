import React, { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'
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
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `goal_form_${goal?.id || 'new'}`,
    form,
    setForm
  )
  useEffect(() => {
    if (!open) return
    if (goal) setForm({ id: goal.id, text: goal.text || '', dueDate: goal.dueDate || todayISO(), completed: !!goal.completed })
    else setForm({ id: undefined, text: '', dueDate: todayISO(), completed: false })
  }, [open, goal])

  return (
    <Modal
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
      <div className="space-y-3">
        {/* Auto-save indicator */}
        <AutoSaveIndicator 
          isSaving={isSaving} 
          lastSaved={lastSaved} 
          onClearForm={clearSavedData} 
          theme={theme} 
        />
        
        <TextInput label="Goal" value={form.text} onChange={v => setForm(prev => ({ ...prev, text: v }))} placeholder="Describe your goal" theme={theme} />
        <GlassmorphismDatePicker
          value={form.dueDate || ''}
          onChange={(dateString) => setForm(prev => ({ ...prev, dueDate: dateString }))}
          theme={theme}
          placeholder="Goal Date"
        />
      </div>
    </Modal>
  )
}


