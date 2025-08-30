import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'

const RatingInput = ({ label, value, onChange, theme }) => (
    <div>
        <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>{label}</label>
        <div className="flex justify-between items-center gap-1">
            {[...Array(10)].map((_, i) => {
                const ratingValue = i + 1;
                return (
                    <button
                        key={ratingValue}
                        type="button"
                        onClick={() => onChange(ratingValue)}
                        className={`h-7 flex-1 text-xs rounded border transition-colors ${value === ratingValue ? 'text-white' : 'hover:bg-gray-100'}`}
                        style={value === ratingValue ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }}
                    >
                        {ratingValue}
                    </button>
                );
            })}
        </div>
    </div>
);

export default function BodyMetricsModal({ open, onClose, onSave, theme, metric }) {
  const [form, setForm] = useState({})
  useEffect(() => {
    if (open) {
      setForm(metric ? { ...metric, date: (metric.date || new Date().toISOString()).slice(0, 10) } : { date: new Date().toISOString().slice(0, 10) })
    }
  }, [open, metric])
  const onOk = () => { onSave?.(form); onClose() }
  return (
    <Modal open={open} onClose={onClose} title={metric ? 'Edit Entry' : 'New Entry'} theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={onOk} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-4">
        <TextInput type="date" label="Date" value={form.date || ''} onChange={v => setForm({ ...form, date: v })} theme={theme} />
        <div className="grid grid-cols-2 gap-4">
            <TextInput label="Weight (lbs)" value={form.weight || ''} onChange={v => setForm({ ...form, weight: v })} theme={theme} />
            <TextInput label="Body Fat %" value={form.bodyfat || ''} onChange={v => setForm({ ...form, bodyfat: v })} theme={theme} />
        </div>
        <hr style={{borderColor: theme.border}}/>
        <RatingInput label="Sleep Quality (1-10)" value={form.sleep || 0} onChange={v => setForm({ ...form, sleep: v })} theme={theme} />
        <RatingInput label="Energy Level (1-10)" value={form.energy || 0} onChange={v => setForm({ ...form, energy: v })} theme={theme} />
        <RatingInput label="Mood (1-10)" value={form.mood || 0} onChange={v => setForm({ ...form, mood: v })} theme={theme} />
        <RatingInput label="Pain/Injury Level (1-10)" value={form.pain || 0} onChange={v => setForm({ ...form, pain: v })} theme={theme} />
      </div>
    </Modal>
  )
}


