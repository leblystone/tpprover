 import React, { useEffect, useState } from 'react'
 import Modal from '../common/Modal'
 import TextInput from '../common/inputs/TextInput'

const timeOptions = ['Morning','Afternoon','Evening','Night']

export default function ProtocolEditorModal({ open, onClose, theme, protocol, onSave }) {
  const [form, setForm] = useState(createEmpty())
  useEffect(() => { if (open) setForm(protocol ? { ...createEmpty(), ...protocol } : createEmpty()) }, [open, protocol])

  const updateFreq = (key, val) => setForm(prev => ({ ...prev, frequency: { ...prev.frequency, [key]: val } }))
  const toggleTime = (t) => setForm(prev => ({ ...prev, frequency: { ...prev.frequency, time: prev.frequency.time.includes(t) ? prev.frequency.time.filter(x => x !== t) : [...prev.frequency.time, t] } }))

  return (
    <Modal open={open} onClose={onClose} title={protocol ? 'Edit Protocol' : 'New Protocol'} theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={() => onSave?.(form)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-3">
        <TextInput label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Protocol name" theme={theme} />
        <TextInput label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} placeholder="Category" theme={theme} />
        <TextInput label="Purpose" value={form.purpose} onChange={v => setForm({ ...form, purpose: v })} placeholder="Purpose" theme={theme} />
        <label className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: theme.text }}>
          <input type="checkbox" checked={!!form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active
        </label>
        <div className="text-xs flex items-center gap-2">
          <span className={form.active ? 'status-active' : 'status-inactive'}>{form.active ? 'Active' : 'Inactive'}</span>
          <span className="status-info">{Array.isArray(form.frequency?.time) ? `${form.frequency.time.length} slots/day` : '0 slots/day'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="block text-sm font-medium" style={{ color: theme.text }}>Start Date
            <input type="date" className="w-full p-2 rounded border" style={{ borderColor: theme.border }} value={form.startDate || ''} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </label>
          <label className="block text-sm font-medium" style={{ color: theme.text }}>End Date
            <input type="date" className="w-full p-2 rounded border" style={{ borderColor: theme.border }} value={form.endDate || ''} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Frequency</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="number" className="p-2 rounded border" style={{ borderColor: theme.border }} value={form.frequency.count} onChange={e => updateFreq('count', Number(e.target.value) || 1)} placeholder="# per" />
          <select className="p-2 rounded border" style={{ borderColor: theme.border }} value={form.frequency.per} onChange={e => updateFreq('per', e.target.value)}>
            <option>Day</option>
            <option>Week</option>
            <option>Month</option>
          </select>
          <div className="flex flex-wrap gap-1">
            {timeOptions.map(t => (
              <button key={t} onClick={() => toggleTime(t)} className={`px-2 py-1 rounded text-xs font-semibold ${form.frequency.time.includes(t) ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`} style={form.frequency.time.includes(t) ? { backgroundColor: theme.primary } : {}}>{t}</button>
            ))}
          </div>
        </div>
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Days of Week</label>
        <div className="flex flex-wrap gap-1">
          {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((d, i) => (
            <button key={d} onClick={() => setForm(prev => ({ ...prev, activeDays: prev.activeDays.includes(d) ? prev.activeDays.filter(x => x !== d) : [...prev.activeDays, d] }))} className={`px-2 py-1 rounded text-xs font-semibold ${form.activeDays.includes(d) ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`} style={form.activeDays.includes(d) ? { backgroundColor: theme.primary } : {}}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
            </button>
          ))}
        </div>
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Stacks With
          <input className="w-full p-3 rounded-lg border text-sm" style={{ borderColor: theme.border }} value={form.stacksWith || ''} onChange={e => setForm({ ...form, stacksWith: e.target.value })} placeholder="Comma-separated peptides" />
        </label>
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Titration Plan
          <textarea className="w-full p-3 rounded-lg border text-sm" style={{ borderColor: theme.border }} value={form.titration || ''} onChange={e => setForm({ ...form, titration: e.target.value })} placeholder="Increase/decrease schedule" />
        </label>
        <label className="block text-sm font-medium" style={{ color: theme.text }}>Notes
          <textarea className="w-full p-3 rounded-lg border text-sm" style={{ borderColor: theme.border }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </label>
      </div>
    </Modal>
  )
}

function createEmpty() {
  return {
    id: Date.now(),
    name: '',
    category: '',
    purpose: '',
    notes: '',
    startDate: '',
    endDate: '',
    activeDays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    active: true,
    frequency: { count: 1, per: 'Day', time: [] },
  }
}


