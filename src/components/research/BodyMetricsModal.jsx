import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'

const RatingInput = ({ label, value, onChange, theme }) => (
    <div className="space-y-2">
        <label className="text-sm font-semibold block" style={{ color: theme.text }}>{label}</label>
        <div className="flex justify-between items-center gap-1">
            {[...Array(10)].map((_, i) => {
                const ratingValue = i + 1;
                const isSelected = value === ratingValue;
                const isInRange = value && ratingValue <= value;
                return (
                    <button
                        key={ratingValue}
                        type="button"
                        onClick={() => onChange(ratingValue)}
                        className={`h-8 w-8 text-xs rounded-full border-2 transition-all duration-200 font-medium ${
                            isSelected 
                                ? 'text-white scale-110 shadow-lg' 
                                : isInRange 
                                    ? 'text-white' 
                                    : 'hover:bg-gray-100 hover:scale-105'
                        }`}
                        style={
                            isSelected 
                                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                : isInRange
                                    ? { backgroundColor: theme.primary + '80', borderColor: theme.primary }
                                    : { borderColor: theme.border, color: theme.textLight }
                        }
                    >
                        {ratingValue}
                    </button>
                );
            })}
        </div>
        {value && (
            <div className="text-center">
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                    {value}/10
                </span>
            </div>
        )}
    </div>
);

export default function BodyMetricsModal({ open, onClose, onSave, theme, metric }) {
  const [form, setForm] = useState({})
  
  // Auto-save functionality
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `metrics_form_${metric?.id || 'new'}`,
    form,
    setForm
  )
  useEffect(() => {
    if (open) {
      setForm(metric ? { ...metric, date: (metric.date || new Date().toISOString()).slice(0, 10) } : { date: new Date().toISOString().slice(0, 10) })
    }
  }, [open, metric])
  const onOk = () => { 
    markAsSubmitted();
    onSave?.(form); 
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title={metric ? 'Edit Bio-Metric Entry' : 'Add New Bio-Metric'} theme={theme} footer={(
      <>
        <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Cancel</button>
        <button onClick={onOk} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Save</button>
      </>
    )}>
      <div className="space-y-6">
        {/* Auto-save indicator */}
        <AutoSaveIndicator 
          isSaving={isSaving} 
          lastSaved={lastSaved} 
          onClearForm={clearSavedData} 
          theme={theme} 
        />
        
        {/* Date Selection */}
        <div>
          <TextInput type="date" label="Date" value={form.date || ''} onChange={v => setForm({ ...form, date: v })} theme={theme} />
        </div>

        {/* Physical Measurements */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold" style={{ color: theme.text }}>Physical Measurements</h4>
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Weight (lbs)" value={form.weight || ''} onChange={v => setForm({ ...form, weight: v })} theme={theme} placeholder="e.g. 175" />
            <TextInput label="Body Fat %" value={form.bodyfat || ''} onChange={v => setForm({ ...form, bodyfat: v })} theme={theme} placeholder="e.g. 15" />
          </div>
        </div>

        {/* Wellness Metrics */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold" style={{ color: theme.text }}>Wellness Metrics</h4>
          <div className="space-y-4">
            <RatingInput label="Sleep Quality (1-10)" value={form.sleep || 0} onChange={v => setForm({ ...form, sleep: v })} theme={theme} />
            <RatingInput label="Energy Level (1-10)" value={form.energy || 0} onChange={v => setForm({ ...form, energy: v })} theme={theme} />
            <RatingInput label="Mood (1-10)" value={form.mood || 0} onChange={v => setForm({ ...form, mood: v })} theme={theme} />
            <RatingInput label="Pain/Injury Level (1-10)" value={form.pain || 0} onChange={v => setForm({ ...form, pain: v })} theme={theme} />
          </div>
        </div>
      </div>
    </Modal>
  )
}


