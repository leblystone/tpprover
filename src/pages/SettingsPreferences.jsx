import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { loadSettings, saveSettings, getDefaultSettings } from '../utils/settingsHelpers'
import { getCurrencyOptions } from '../utils/currencyUtils'
import { getTimezoneGroups, getTimezoneDisplayName, checkTimezoneChangeImpact } from '../utils/timezones'
import TimezoneChangeModal from '../components/ui/TimezoneChangeModal'

export default function SettingsPreferences() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const [showTimezoneWarning, setShowTimezoneWarning] = useState(false)
  const [timezoneChangeData, setTimezoneChangeData] = useState(null)

  const currencyOptions = getCurrencyOptions()
  const timezoneGroups = getTimezoneGroups()
  const allTimezones = Object.values(timezoneGroups).flat()

  const [settings, setSettings] = useState(() => {
    const loadedSettings = loadSettings()
    const defaultSettings = getDefaultSettings()
    
    return {
      ...defaultSettings,
      ...loadedSettings,
      region: {
        ...defaultSettings.region,
        ...(loadedSettings?.region || {})
      },
      tracking: {
        ...defaultSettings.tracking,
        ...(loadedSettings?.tracking || {})
      },
      features: {
        ...defaultSettings.features,
        ...(loadedSettings?.features || {})
      },
      calendar: {
        ...defaultSettings.calendar,
        ...(loadedSettings?.calendar || {})
      },
      orders: {
        ...defaultSettings.orders,
        ...(loadedSettings?.orders || {})
      }
    }
  })

  const tzList = Array.from(new Set([settings?.region?.timeZone, ...allTimezones].filter(Boolean)))

  const update = (path, value) => {
    const next = { ...settings }
    const segs = path.split('.')
    let ref = next
    
    for (let i = 0; i < segs.length - 1; i++) {
      if (!ref[segs[i]] || typeof ref[segs[i]] !== 'object') {
        ref[segs[i]] = {}
      }
      ref = ref[segs[i]]
    }
    
    ref[segs[segs.length - 1]] = value
    setSettings(next)
    saveSettings(next)
  }

  const handleTimezoneChange = (newTimezone) => {
    const oldTimezone = settings.region.timeZone;
    
    if (oldTimezone === newTimezone) return;
    
    const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
    const impactData = checkTimezoneChangeImpact(protocols, oldTimezone, newTimezone);
    
    if (impactData.hasImpact) {
      setTimezoneChangeData({
        oldTimezone,
        newTimezone,
        impactData
      });
      setShowTimezoneWarning(true);
    } else {
      update('region.timeZone', newTimezone);
    }
  };
  
  const confirmTimezoneChange = () => {
    if (timezoneChangeData) {
      update('region.timeZone', timezoneChangeData.newTimezone);
      setShowTimezoneWarning(false);
      setTimezoneChangeData(null);
    }
  };

  const handleShippingCostToggle = (enabled) => {
    update('orders.includeShippingInCosts', enabled);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { 
        message: enabled 
          ? 'Shipping costs will now be included in stockpile and reconstitution calculations' 
          : 'Shipping costs will be excluded from stockpile and reconstitution calculations',
        type: 'success' 
      } 
    }));
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/settings')}
          className="p-2 rounded-lg hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.secondary }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>App Preferences</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Make it work the way you want</p>
        </div>
      </div>

      {/* Preference Settings */}
      <div className="space-y-4">
        {/* Features */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Features</h4>
          <div className="space-y-2">
            <SettingToggle 
              checked={settings.tracking?.injectionSites ?? true} 
              onChange={v => update('tracking.injectionSites', v)} 
              label="Injection Site Tracking" 
              description="Track injection sites for rotation tracking" 
              theme={theme} 
            />
            <SettingToggle 
              checked={settings.features?.groupBuys ?? true} 
              onChange={v => update('features.groupBuys', v)} 
              label="Group Buy Features" 
              description="Enable group buy functionality" 
              theme={theme} 
            />
            <SettingToggle 
              checked={settings.features?.analytics ?? true} 
              onChange={v => update('features.analytics', v)} 
              label="Analytics Dashboard" 
              description="Display analytics and metrics in dashboard" 
              theme={theme} 
            />
          </div>
        </div>

        {/* Orders & Inventory */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Orders & Inventory</h4>
          <div className="space-y-2">
            <SettingToggle 
              checked={settings.orders?.autoStockpileUpdate ?? true} 
              onChange={v => update('orders.autoStockpileUpdate', v)} 
              label="Auto Stockpile Updates" 
              description="Automatically add delivered orders to stockpile" 
              theme={theme} 
            />
            <SettingToggle 
              checked={settings.orders?.lowStockAlerts ?? true} 
              onChange={v => update('orders.lowStockAlerts', v)} 
              label="Low Stock Alerts" 
              description="Alerts when inventory is running low" 
              theme={theme} 
            />
            <SettingToggle 
              checked={settings.orders?.includeShippingInCosts ?? true} 
              onChange={v => handleShippingCostToggle(v)} 
              label="Include Shipping in Costs" 
              description="Include shipping costs in stockpile and reconstitution calculations" 
              theme={theme} 
            />
          </div>
        </div>

        {/* Regional Settings */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Regional Settings</h4>
          <div className="space-y-3">
            <SettingSelect 
              label="Language" 
              value={settings.region.language} 
              onChange={e => update('region.language', e.target.value)} 
              options={[
                { value: 'en-US', label: 'English (US)' }, 
                { value: 'en-GB', label: 'English (UK)' }, 
                { value: 'es-ES', label: 'Español (ES)' }
              ]} 
              theme={theme} 
            />
            <SettingSelect 
              label="Currency" 
              value={settings.region.currency} 
              onChange={e => update('region.currency', e.target.value)} 
              options={currencyOptions} 
              theme={theme} 
            />
            <SettingSelect 
              label="Time Zone" 
              value={settings.region.timeZone} 
              onChange={e => handleTimezoneChange(e.target.value)} 
              options={tzList.map(tz => ({ value: tz, label: getTimezoneDisplayName(tz) }))} 
              theme={theme} 
            />
          </div>
        </div>

        {/* Calendar Settings */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Calendar Settings</h4>
          <div className="space-y-3">
            <SegmentedControl
              label="Week Starts On"
              value={settings.region.weekStartsOn}
              onChange={v => update('region.weekStartsOn', v)}
              options={[
                { value: 'sunday', label: 'Sunday' },
                { value: 'monday', label: 'Monday' }
              ]}
              theme={theme}
            />
            <SegmentedControl
              label="Time Format"
              value={settings.calendar?.timeFormat ?? '12h'}
              onChange={v => update('calendar.timeFormat', v)}
              options={[
                { value: '12h', label: '12 Hour' },
                { value: '24h', label: '24 Hour' }
              ]}
              theme={theme}
            />
            <SegmentedControl
              label="Default View"
              value={settings.calendar?.defaultView ?? 'month'}
              onChange={v => update('calendar.defaultView', v)}
              options={[
                { value: 'month', label: 'Month' },
                { value: 'week', label: 'Week' }
              ]}
              theme={theme}
            />
          </div>
        </div>
      </div>

      {showTimezoneWarning && timezoneChangeData && (
        <TimezoneChangeModal
          open={showTimezoneWarning}
          onClose={() => {
            setShowTimezoneWarning(false);
            setTimezoneChangeData(null);
          }}
          onConfirm={confirmTimezoneChange}
          oldTimezone={timezoneChangeData.oldTimezone}
          newTimezone={timezoneChangeData.newTimezone}
          impactData={timezoneChangeData.impactData}
          theme={theme}
        />
      )}
    </section>
  )
}

const SettingToggle = ({ checked, onChange, label, description, theme, disabled }) => (
  <div 
    className="flex items-start justify-between p-3 rounded-lg"
    style={{ backgroundColor: theme.secondary }}
  >
    <div className="flex-1 pr-4">
      <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>{label}</div>
      <div className="text-xs" style={{ color: theme.mutedText }}>{description}</div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
      <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
           style={{ 
             backgroundColor: checked ? theme.primary : '#d1d5db', 
             opacity: disabled ? 0.5 : 1
           }}></div>
    </label>
  </div>
)

const SettingSelect = ({ label, value, onChange, options, theme }) => (
  <div>
    <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>{label}</label>
    <select 
      className="w-full p-3 rounded-lg border" 
      value={value} 
      onChange={onChange} 
      style={{ 
        borderColor: theme.border, 
        backgroundColor: theme.secondary, 
        color: theme.text 
      }}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)

const SegmentedControl = ({ label, value, onChange, options, theme }) => (
  <div>
    <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>{label}</label>
    <div className="grid grid-cols-2 gap-2">
      {options.map(option => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="p-3 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{
              backgroundColor: isSelected ? theme.accent : theme.secondary,
              color: isSelected ? theme.accentText : theme.text,
              border: isSelected ? `2px solid ${theme.accent}` : '2px solid transparent'
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  </div>
)

