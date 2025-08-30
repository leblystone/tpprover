 import React, { useEffect, useState } from 'react'
 import Modal from '../common/Modal'
 import TextInput from '../common/inputs/TextInput'

export default function AddSupplementModal({ open, onClose, onSave, theme, supplement }) {
  const [form, setForm] = useState({ name: '', dose: '', schedule: 'AM', form: 'Oral', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] })
  useEffect(() => {
    if (open) setForm(supplement ? { ...supplement } : { name: '', dose: '', schedule: 'AM', form: 'Oral', days: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] })
  }, [open, supplement])

  const toggleDay = (day) => {
    setForm(prev => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day] }))
  }

  return (
    <Modal open={open} onClose={onClose} title={supplement ? 'Edit Supplement' : 'Add Supplement'} theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.(form)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-3">
        <TextInput label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Vitamin D3" theme={theme} />
        <TextInput label="Dose" value={form.dose} onChange={v => setForm({ ...form, dose: v })} placeholder="5000 IU" theme={theme} />
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Schedule</label>
        <div className="flex gap-2">
          {[
            { label: 'AM', value: 'AM' },
            { label: 'PM', value: 'PM' },
            { label: 'AM/PM', value: 'BOTH' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setForm({ ...form, schedule: opt.value })} className={`px-3 py-2 rounded-md text-sm font-semibold ${form.schedule === opt.value ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`} style={form.schedule === opt.value ? { backgroundColor: theme.primary } : {}}>{opt.label}</button>
          ))}
        </div>
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Days</label>
        <div className="flex flex-wrap gap-1">
          {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d, i) => (
            <button key={d} onClick={() => toggleDay(d)} className={`px-2 py-1 rounded text-xs font-semibold ${form.days.includes(d) ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`} style={form.days.includes(d) ? { backgroundColor: theme.primary } : {}}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
 }


