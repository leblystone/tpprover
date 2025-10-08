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
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="flex items-center gap-2 mb-3">
                <Icon size={16} style={{ color: color || theme.primary }} />
                <label className="text-sm font-semibold" style={{ color: theme.text }}>{label}</label>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`flex flex-col items-center justify-center min-h-[70px] min-w-[60px] p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                                isSelected ? 'scale-105 shadow-lg' : ''
                            }`}
                            style={{
                                borderColor: isSelected ? (color || theme.primary) : theme.border,
                                backgroundColor: isSelected ? (color || theme.primary) + '15' : theme.background,
                                color: theme.text
                            }}
                        >
                            <div className="text-xl mb-1 leading-none">{option.emoji}</div>
                            <div className="text-xs font-medium leading-tight text-center">{option.label}</div>
                        </button>
                    );
                })}
            </div>
            {selectedOption && (
                <div className="text-center">
                    <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: (color || theme.primary) + '20', color: color || theme.primary }}>
                        {selectedOption.emoji} {selectedOption.label}
                    </span>
                </div>
            )}
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
        />
      }
      theme={theme} 
      maxWidth="max-w-4xl"
      footer={(
        <>
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg border font-medium transition-colors" 
            style={{ borderColor: theme?.border, color: theme?.text }}
          >
            Cancel
          </button>
          <button 
            onClick={onOk} 
            className="px-4 py-2 rounded-lg font-medium transition-colors" 
            style={{ backgroundColor: theme?.primary, color: theme?.textOnPrimary }}
          >
            Save Entry
          </button>
        </>
      )}
    >
      <div className="space-y-6 p-2">
        {/* Date Selection Card */}
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} style={{ color: theme.primary }} />
            <h4 className="text-sm font-semibold" style={{ color: theme.text }}>Entry Date</h4>
          </div>
          <TextInput 
            type="date" 
            label="" 
            value={form.date || ''} 
            onChange={v => setForm({ ...form, date: v })} 
            theme={theme} 
          />
        </div>

        {/* Physical Measurements Card */}
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center gap-2 mb-4">
            <Weight size={16} style={{ color: theme.primary }} />
            <h4 className="text-sm font-semibold" style={{ color: theme.text }}>Physical Measurements</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Weight size={14} style={{ color: theme.primary }} />
                <label className="text-sm font-medium" style={{ color: theme.text }}>Weight (lbs)</label>
              </div>
              <TextInput 
                value={form.weight || ''} 
                onChange={v => setForm({ ...form, weight: v })} 
                theme={theme} 
                placeholder="e.g. 175" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Percent size={14} style={{ color: theme.success }} />
                <label className="text-sm font-medium" style={{ color: theme.text }}>Body Fat %</label>
              </div>
              <TextInput 
                value={form.bodyfat || ''} 
                onChange={v => setForm({ ...form, bodyfat: v })} 
                theme={theme} 
                placeholder="e.g. 15" 
              />
            </div>
          </div>
        </div>

        {/* Wellness Metrics */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Smile size={16} style={{ color: theme.success }} />
            <h4 className="text-sm font-semibold" style={{ color: theme.text }}>Wellness Metrics</h4>
          </div>
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


