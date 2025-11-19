import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'
import { Weight, Percent, Bed, Smile, ShieldAlert, Calendar, Activity, CalendarClock, Scale, Heart, CloudSunRain, Moon, MoonStar, BatteryLow, Battery, BatteryFull, Zap, Frown, Meh, CheckCircle, AlertCircle, AlertTriangle, XCircle, Trash2, ArrowLeft } from 'lucide-react'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'

const RatingInput = ({ label, value, onChange, theme, icon: Icon, color, type }) => {
    const getRatingOptions = (type) => {
        switch (type) {
            case 'sleep':
                return [
                    { icon: AlertCircle, label: 'Poor', value: 1 },
                    { icon: Moon, label: 'Okay', value: 2 },
                    { icon: MoonStar, label: 'Great', value: 3 }
                ];
            case 'energy':
                return [
                    { icon: BatteryLow, label: 'Low', value: 1 },
                    { icon: Battery, label: 'Medium', value: 2 },
                    { icon: BatteryFull, label: 'High', value: 3 }
                ];
            case 'mood':
                return [
                    { icon: Frown, label: 'Sad', value: 1 },
                    { icon: Meh, label: 'Neutral', value: 2 },
                    { icon: Smile, label: 'Happy', value: 3 }
                ];
            case 'pain':
                return [
                    { icon: CheckCircle, label: 'None', value: 1 },
                    { icon: AlertTriangle, label: 'Moderate', value: 2 },
                    { icon: XCircle, label: 'Severe', value: 3 }
                ];
            default:
                return [
                    { icon: BatteryLow, label: 'Low', value: 1 },
                    { icon: Battery, label: 'Medium', value: 2 },
                    { icon: BatteryFull, label: 'High', value: 3 }
                ];
        }
    };

    const options = getRatingOptions(type);
    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: theme.text }}>{label}</label>
            <div className="flex rounded-lg p-0.5 gap-0.5" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
            }}>
                {options.map((option) => {
                    const isSelected = value === option.value;
                    const IconComponent = option.icon;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            className={`flex-1 flex items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                isSelected ? 'text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'
                            }`}
                            style={isSelected ? { backgroundColor: color || theme.primary } : {}}
                        >
                            <IconComponent size={14} />
                            <span className="text-[10px] hidden sm:inline">{option.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default function BodyMetricsModal({ open, onClose, onSave, onDelete, theme, metric, showBackButton = false, onBack }) {
  const [form, setForm] = useState({})
  
  // Terracotta gradient for delete button
  const terracottaGradient = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
  const terracottaHoverGradient = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
  
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
  const onOk = async () => { 
    markAsSubmitted();
    try {
      await onSave?.(form);
    } catch (error) {
      console.error('Error saving metric:', error);
    }
    onClose();
  }
  const handleBack = () => {
    onClose();
    if (onBack) {
      // Small delay to ensure modal closes before reopening
      setTimeout(() => {
        onBack();
      }, 100);
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: '#ffffff' }}
              title="Back to All Entries"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span>{metric ? 'Edit Bio-Metric Entry' : 'New Bio-Metric'}</span>
        </div>
      }
      titleExtra={
        <AutoSaveIndicator 
          isSaving={isSaving} 
          lastSaved={lastSaved} 
          onClearForm={clearSavedData} 
          theme={theme}
          iconOnly={true}
          style={{ color: '#ffffff' }}
        />
      }
      theme={theme}
      variant="modern"
      maxWidth="max-w-2xl"
      footer={(
        <div className="w-full flex items-center justify-between gap-2">
          {metric ? (
          <button 
              onClick={() => onDelete?.(form)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1.5"
              style={{
                background: terracottaGradient,
                color: '#ffffff',
                border: 'none',
                boxShadow: theme?.isDark ? '0 4px 10px rgba(0,0,0,0.35)' : '0 4px 10px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = terracottaHoverGradient;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = terracottaGradient;
              }}
          >
              <Trash2 size={14} />
              Delete
          </button>
          ) : <span />}
          <button 
            onClick={onOk} 
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto" 
            style={{ backgroundColor: theme?.primary, color: '#ffffff' }}
          >
            Save Entry
          </button>
        </div>
      )}
    >
      <div className="space-y-2.5">
        {/* Date Selection */}
        <div>
          <GlassmorphismDatePicker
            value={form.date || ''}
            onChange={(dateString) => setForm({ ...form, date: dateString })}
            theme={theme}
            placeholder="Date"
          />
        </div>

        {/* PHYSICAL Section Header */}
        <div className="px-3 py-1.5 rounded-lg flex items-center justify-between mb-1.5" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '3px solid #e0ded7' }}>
          <h4 className="font-bold text-xs tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>PHYSICAL</h4>
          <Scale size={16} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
        </div>

        {/* Physical Measurements */}
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Weight (lbs)"
              value={form.weight || ''}
            onChange={v => setForm({ ...form, weight: v })}
              placeholder="e.g. 175"
            theme={theme}
            outlined={true}
            customTextColor={theme.isDark ? null : "#181A18"}
            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
          />
          <TextInput
            label="Body Fat %"
              value={form.bodyfat || ''}
            onChange={v => setForm({ ...form, bodyfat: v })}
              placeholder="e.g. 15"
            theme={theme}
            outlined={true}
            customTextColor={theme.isDark ? null : "#181A18"}
            customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
            />
        </div>

        {/* WELLNESS Section Header */}
        <div className="px-3 py-1.5 rounded-lg flex items-center justify-between mb-1.5" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '3px solid #e0ded7' }}>
          <h4 className="font-bold text-xs tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>WELLNESS</h4>
          <CloudSunRain size={16} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
        </div>

        {/* Wellness Metrics */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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


