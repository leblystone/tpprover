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

export default function BodyMetricsModal({ open, onClose, onSave, theme, metric }) {
  const [form, setForm] = useState({ id: undefined, date: todayISO(), weight: '', bodyfat: '', notes: '' })

  useEffect(() => {
    if (!open) return
    if (metric) {
      setForm({
        id: metric.id,
        date: metric.date || todayISO(),
        weight: metric.weight || '',
        bodyfat: metric.bodyfat || '',
        notes: metric.notes || '',
      })
    } else {
      setForm({ id: undefined, date: todayISO(), weight: '', bodyfat: '', notes: '' })
    }
  }, [open, metric])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={metric ? 'Edit Body Metric' : 'Add Body Metric'}
      theme={theme}
      footer={(
        <>
          <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
          <button onClick={() => onSave?.(form)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
        </>
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm font-medium" style={{ color: theme?.text }}>Date (mm/dd/yyyy)
          <input type="date" className="w-full p-2 rounded border" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} style={{ borderColor: theme?.border }} />
        </label>
        <TextInput label="Weight" value={form.weight} onChange={v => setForm(prev => ({ ...prev, weight: v }))} placeholder="e.g., 180" theme={theme} />
        <TextInput label="Body Fat %" value={form.bodyfat} onChange={v => setForm(prev => ({ ...prev, bodyfat: v }))} placeholder="e.g., 15" theme={theme} />
        <label className="block text-sm font-medium sm:col-span-2" style={{ color: theme?.text }}>Notes
          <textarea className="w-full p-2 rounded border text-sm" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes" style={{ borderColor: theme?.border }} />
        </label>
      </div>
    </Modal>
  )
}


