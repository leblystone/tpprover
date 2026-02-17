import React, { useEffect, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function GoalModal({ open, onClose, onSave, onDelete, theme, goal }) {
  const [form, setForm] = useState({ id: undefined, text: '', dueDate: todayISO(), completed: false })
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
        <div className="flex items-center w-full">
          <button onClick={onClose} className="text-sm font-medium" style={{ color: theme?.textLight || theme?.text, background: 'none', border: 'none', padding: 0 }}>Cancel</button>
          <div className="ml-auto flex items-center gap-2">
            {goal && <button onClick={() => onDelete?.(form)} className="px-3 py-2 rounded-md text-sm font-medium" style={{ color: '#b91c1c', background: 'none', border: 'none' }}>Delete</button>}
            <button onClick={() => onSave?.(form)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary || '#fff' }}>Save</button>
          </div>
        </div>
      )}
    >
      <div className="space-y-3">
        <TextInput label="Goal" value={form.text} onChange={v => setForm(prev => ({ ...prev, text: v }))} placeholder="Describe your goal" theme={theme} />
        <label className="block text-sm font-medium" style={{ color: theme?.text }}>Goal Date
          <input type="date" className="w-full p-2 rounded border" value={form.dueDate} onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))} style={{ borderColor: theme?.border }} />
        </label>
      </div>
    </Modal>
  )
}


