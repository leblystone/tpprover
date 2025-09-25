import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'
import { Weight, Percent, Bed, Zap, Smile, ShieldAlert, Calendar, Activity } from 'lucide-react'

const RatingInput = ({ label, value, onChange, theme, icon: Icon, color }) => (
    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-2 mb-3">
            <Icon size={16} style={{ color: color || theme.primary }} />
            <label className="text-sm font-semibold" style={{ color: theme.text }}>{label}</label>
        </div>
        <div className="flex justify-between items-center gap-1 mb-2">
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
                                    : 'hover:scale-105'
                        }`}
                        style={
                            isSelected 
                                ? { backgroundColor: color || theme.primary, borderColor: color || theme.primary }
                                : isInRange
                                    ? { backgroundColor: (color || theme.primary) + '80', borderColor: color || theme.primary }
                                    : { borderColor: theme.border, color: theme.textLight, backgroundColor: theme.background }
                        }
                    >
                        {ratingValue}
                    </button>
                );
            })}
        </div>
        {value && (
            <div className="text-center">
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: (color || theme.primary) + '20', color: color || theme.primary }}>
                    {value}/10 {getRatingText(value)}
                </span>
            </div>
        )}
    </div>
);

const getRatingText = (value) => {
    if (value <= 3) return "Poor";
    if (value <= 5) return "Fair";
    if (value <= 7) return "Good";
    if (value <= 9) return "Great";
    return "Excellent";
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
      maxWidth="3xl"
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
            />
            <RatingInput 
              label="Energy Level" 
              value={form.energy || 0} 
              onChange={v => setForm({ ...form, energy: v })} 
              theme={theme}
              icon={Zap}
              color={theme.warning}
            />
            <RatingInput 
              label="Mood" 
              value={form.mood || 0} 
              onChange={v => setForm({ ...form, mood: v })} 
              theme={theme}
              icon={Smile}
              color={theme.success}
            />
            <RatingInput 
              label="Pain Level" 
              value={form.pain || 0} 
              onChange={v => setForm({ ...form, pain: v })} 
              theme={theme}
              icon={ShieldAlert}
              color={theme.error}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}


