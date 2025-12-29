import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, FlaskConical, Globe, Package, Calendar as CalendarIcon, Languages, CircleDollarSign, Clock, LayoutGrid, Check, Settings } from 'lucide-react'
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
    <section className="max-w-xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-2 rounded-xl transition-all active:scale-95 border shadow-sm shrink-0"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Preferences</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Region & App Behavior
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      {/* Preference Settings */}
      <div className="space-y-4">
        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <FlaskConical size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Features
            </h4>
          </div>

          <div 
            className="px-4 rounded-2xl border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.tracking?.injectionSites ?? true} 
              onChange={v => update('tracking.injectionSites', v)} 
              label="Injection Site Tracking" 
              description="Track sites for rotation" 
              theme={theme} 
              icon={LayoutGrid}
            />
            <SettingToggle 
              checked={settings.features?.groupBuys ?? true} 
              onChange={v => update('features.groupBuys', v)} 
              label="Group Buy Features" 
              description="Enable group buy functionality" 
              theme={theme} 
              icon={CircleDollarSign}
            />
            <SettingToggle 
              checked={settings.features?.analytics ?? true} 
              onChange={v => update('features.analytics', v)} 
              label="Analytics" 
              description="Dashboard consistency and spending charts" 
              theme={theme} 
              icon={Globe}
            />
            <SettingToggle 
              checked={settings.features?.toastNotifications ?? true} 
              onChange={v => update('features.toastNotifications', v)} 
              label="In-App Notifications" 
              description="Show in-app notification toasts" 
              theme={theme} 
              icon={Globe}
            />
            <SettingToggle 
              checked={settings.features?.showWashoutIcons ?? true} 
              onChange={v => update('features.showWashoutIcons', v)} 
              label="Washout Icons"
              description="Show 'W' icons on monthly calendar"
              theme={theme} 
              icon={CalendarIcon}
              isLast={true}
            />
          </div>
        </div>

        {/* Orders & Inventory */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Package size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Orders & Inventory
            </h4>
          </div>

          <div 
            className="px-4 rounded-2xl border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.orders?.autoStockpileUpdate ?? true} 
              onChange={v => update('orders.autoStockpileUpdate', v)} 
              label="Auto Update Stockpile" 
              description="Add delivered orders to stockpile automatically" 
              theme={theme} 
              icon={Package}
            />
            <SettingToggle 
              checked={settings.orders?.lowStockAlerts ?? true} 
              onChange={v => update('orders.lowStockAlerts', v)} 
              label="Low Stock Alerts" 
              description="Alerts when inventory is running low" 
              theme={theme} 
              icon={Package}
            />
            <SettingToggle 
              checked={settings.orders?.includeShippingInCosts ?? true} 
              onChange={v => handleShippingCostToggle(v)} 
              label="Shipping in Total Spent" 
              description="Include shipping in vial/mg price averages" 
              theme={theme} 
              icon={CircleDollarSign}
              isLast={true}
            />
          </div>
        </div>

        {/* Regional Settings - Hidden until fully implemented */}
        {/* <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Globe size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Regional
            </h4>
          </div>

          <div 
            className="px-4 rounded-2xl border-2 transition-all shadow-sm"
            style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
          >
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
              icon={Languages}
            />
            <SettingSelect 
              label="Currency" 
              value={settings.region.currency} 
              onChange={e => update('region.currency', e.target.value)} 
              options={currencyOptions} 
              theme={theme} 
              icon={CircleDollarSign}
            />
            <SettingSelect 
              label="Time Zone" 
              value={settings.region.timeZone} 
              onChange={e => handleTimezoneChange(e.target.value)} 
              options={tzList.map(tz => ({ value: tz, label: getTimezoneDisplayName(tz) }))} 
              theme={theme} 
              icon={Clock}
              isLast={true}
            />
          </div>
        </div> */}

        {/* Calendar Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CalendarIcon size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Calendar
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-3">
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

const SettingToggle = ({ checked, onChange, label, description, theme, disabled, icon: Icon, isLast }) => (
  <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-3">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: (checked && !disabled) ? theme.primary + '15' : theme.secondary }}
      >
        <Icon size={16} style={{ color: (checked && !disabled) ? theme.primary : theme.text }} className={checked ? 'opacity-100' : 'opacity-40'} />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
          {label}
        </div>
        <div className="text-base font-black tracking-tight" style={{ color: theme.text }}>
          {checked ? 'Enabled' : 'Disabled'}
        </div>
        <div className="text-[11px] opacity-50" style={{ color: theme.text }}>
          {description}
        </div>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
      <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}
           style={{ 
             backgroundColor: checked ? theme.primary : '#d1d5db', 
             opacity: disabled ? 0.5 : 1
           }}></div>
    </label>
  </div>
)

const SettingSelect = ({ label, value, onChange, options, theme, icon: Icon, isLast }) => (
  <div className={`flex items-center justify-between py-4 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-3 flex-1">
      <div 
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: theme.primary + '15' }}
      >
        <Icon size={16} style={{ color: theme.primary }} />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
          {label}
        </div>
        <div className="relative">
          <select 
            className="w-full bg-transparent text-sm font-black tracking-tight focus:outline-none appearance-none cursor-pointer pr-8" 
            value={value} 
            onChange={onChange} 
            style={{ color: theme.text }}
          >
            {options.map(opt => <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-800">{opt.label}</option>)}
          </select>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
            <Clock size={12} style={{ color: theme.text }} />
          </div>
        </div>
      </div>
    </div>
  </div>
)

const SegmentedControl = ({ label, value, onChange, options, theme }) => (
  <div 
    className="p-4 rounded-2xl border-2 transition-all shadow-sm"
    style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
  >
    <div className="text-[10px] font-bold uppercase tracking-wider opacity-40 mb-3 ml-1" style={{ color: theme.text }}>
      {label}
    </div>
    <div className="flex p-1 rounded-2xl gap-1" style={{ backgroundColor: theme.secondary }}>
      {options.map(option => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all relative overflow-hidden"
            style={{
              backgroundColor: isSelected ? theme.primary : 'transparent',
              color: isSelected ? '#ffffff' : theme.text,
              opacity: isSelected ? 1 : 0.6
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  </div>
)

