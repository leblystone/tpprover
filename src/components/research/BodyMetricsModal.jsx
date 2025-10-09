import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'
import { Weight, Percent, Bed, Smile, ShieldAlert, Calendar, Activity } from 'lucide-react'
import { Zap } from '../../icons/lucide-safe'

const RatingInput = ({ label, value, onChange, theme, icon: Icon, color, type }) => {
    const getRatingOptions = (type) => {
        switch (type) {
            case 'sleep':
                return [
                    { emoji: '😴', label: 'Poor', value: 1 },
                    { emoji: '😪', label: 'Tired', value: 2 },
                    { emoji: '😐', label: 'Okay', value: 3 },
                    { emoji: '😌', label: 'Good', value: 4 },
                    { emoji: '😊', label: 'Great', value: 5 }
                ];
            case 'energy':
                return [
                    { emoji: '🔋', label: 'Drained', value: 1 },
                    { emoji: '😮', label: 'Low', value: 2 },
                    { emoji: '😐', label: 'Okay', value: 3 },
                    { emoji: '⚡', label: 'High', value: 4 },
                    { emoji: '🔥', label: 'Energized', value: 5 }
                ];
            case 'mood':
                return [
                    { emoji: '😢', label: 'Sad', value: 1 },
                    { emoji: '😔', label: 'Down', value: 2 },
                    { emoji: '😐', label: 'Neutral', value: 3 },
                    { emoji: '🙂', label: 'Happy', value: 4 },
                    { emoji: '😊', label: 'Joyful', value: 5 }
                ];
            case 'pain':
                return [
                    { emoji: '😊', label: 'None', value: 1 },
                    { emoji: '😐', label: 'Mild', value: 2 },
                    { emoji: '😬', label: 'Moderate', value: 3 },
                    { emoji: '😣', label: 'High', value: 4 },
                    { emoji: '😖', label: 'Severe', value: 5 }
                ];
            default:
                return [
                    { emoji: '1️⃣', label: 'Very Low', value: 1 },
                    { emoji: '2️⃣', label: 'Low', value: 2 },
                    { emoji: '3️⃣', label: 'Medium', value: 3 },
                    { emoji: '4️⃣', label: 'High', value: 4 },
                    { emoji: '5️⃣', label: 'Very High', value: 5 }
                ];
        }
    };

    const options = getRatingOptions(type);
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>{label}</label>
            <div className="flex rounded-lg bg-gray-100 p-1 gap-1">
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md text-sm font-medium transition-all ${
                                isSelected ? 'text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'
                            }`}
                            style={isSelected ? { backgroundColor: color || theme.primary } : {}}
                        >
                            <span className="text-sm">{option.emoji}</span>
                            <span className="text-xs hidden sm:inline">{option.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

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
    <Modal 
      open={open} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
          <Activity size={20} style={{ color: theme.primary }} />
          {metric ? 'Edit Bio-Metric Entry' : 'Add New Bio-Metric'}
        </div>
      }
      titleExtra={
        <AutoSaveIndicator 
          isSaving={isSaving} 
          lastSaved={lastSaved} 
          onClearForm={clearSavedData} 
          theme={theme}
          iconOnly={true}
        />
      }
      theme={theme}
      variant="modern"
      maxWidth="max-w-4xl"
      footer={(
        <>
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg border font-medium transition-all" 
            style={{ borderColor: theme?.border, color: theme?.text }}
          >
            Cancel
          </button>
          <button 
            onClick={onOk} 
            className="px-4 py-2 rounded-lg font-medium transition-all" 
            style={{ backgroundColor: theme?.primary, color: '#ffffff' }}
          >
            Save Entry
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        {/* ENTRY DATE Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>ENTRY DATE</h4>
        </div>

        {/* Date Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Date</label>
          <input
            type="date"
            value={form.date || ''}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.cardBackground,
              color: theme.text,
              focusRingColor: theme.primary
            }}
          />
        </div>

        {/* PHYSICAL MEASUREMENTS Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>PHYSICAL MEASUREMENTS</h4>
        </div>

        {/* Physical Measurements */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Weight (lbs)</label>
            <input
              type="text"
              value={form.weight || ''}
              onChange={e => setForm({ ...form, weight: e.target.value })}
              placeholder="e.g. 175"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Body Fat %</label>
            <input
              type="text"
              value={form.bodyfat || ''}
              onChange={e => setForm({ ...form, bodyfat: e.target.value })}
              placeholder="e.g. 15"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 transition-all"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            />
          </div>
        </div>

        {/* WELLNESS METRICS Section Header */}
        <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
          <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.primary }}>WELLNESS METRICS</h4>
        </div>

        {/* Wellness Metrics */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RatingInput 
              label="Sleep Quality" 
              value={form.sleep || 0} 
              onChange={v => setForm({ ...form, sleep: v })} 
              theme={theme}
              icon={Bed}
              color={theme.info}
              type="sleep"
            />
            <RatingInput 
              label="Energy Level" 
              value={form.energy || 0} 
              onChange={v => setForm({ ...form, energy: v })} 
              theme={theme}
              icon={Zap}
              color={theme.warning}
              type="energy"
            />
            <RatingInput 
              label="Mood" 
              value={form.mood || 0} 
              onChange={v => setForm({ ...form, mood: v })} 
              theme={theme}
              icon={Smile}
              color={theme.success}
              type="mood"
            />
            <RatingInput 
              label="Pain Level" 
              value={form.pain || 0} 
              onChange={v => setForm({ ...form, pain: v })} 
              theme={theme}
              icon={ShieldAlert}
              color={theme.error}
              type="pain"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}


