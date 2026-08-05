import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Eye, Database, Info, IconContext } from '@phosphor-icons/react'
import { loadSettings, saveSettings, getDefaultSettings } from '../utils/settingsHelpers'

export default function SettingsPrivacy() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const [settings, setSettings] = useState(() => {
    const loadedSettings = loadSettings()
    const defaultSettings = getDefaultSettings()
    
    return {
      ...defaultSettings,
      ...loadedSettings,
      privacy: {
        ...defaultSettings.privacy,
        ...(loadedSettings?.privacy || {})
      }
    }
  })

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

  return (
    <IconContext.Provider value={{ weight: 'bold' }}>
    <section className="page-bg max-w-xl mx-auto space-y-4 px-3 sm:px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-2.5 rounded-full hover:opacity-80 transition-all active:scale-95 shrink-0"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Privacy</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Data Protection & cookies
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      {/* Privacy Settings */}
      <div className="space-y-6">
        {/* Cookie Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Shield size={18} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Cookie Preferences
            </h4>
          </div>

          <div 
            className="content-section px-6 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.privacy.functional} 
              onChange={v => update('privacy.functional', v)} 
              label="Functional Cookies" 
              description="Required for the app to work correctly" 
              theme={theme} 
              disabled 
              icon={Database}
            />
            <SettingToggle 
              checked={settings.privacy.analytics} 
              onChange={v => update('privacy.analytics', v)} 
              label="Analytics Cookies" 
              description="Help improve the app with usage data" 
              theme={theme} 
              icon={Eye}
              isLast={true}
            />
          </div>
        </div>

        {/* Data Sharing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Info size={18} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Data Sharing
            </h4>
          </div>

          <div 
            className="content-section px-6 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            <SettingToggle 
              checked={settings.privacy.dataSharing} 
              onChange={v => update('privacy.dataSharing', v)} 
              label="Anonymous Usage Metrics" 
              description="Share anonymous data to help improve the app" 
              theme={theme} 
              icon={Info}
              isLast={true}
            />
          </div>
        </div>
      </div>
    </section>
    </IconContext.Provider>
  )
}

const SettingToggle = ({ checked, onChange, label, description, theme, disabled, icon: Icon, isLast }) => (
  <div className={`flex items-center justify-between py-6 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-4">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: (checked && !disabled) ? theme.primary + '15' : theme.secondary }}
      >
        <Icon size={18} style={{ color: (checked && !disabled) ? theme.primary : theme.text }} className={checked ? 'opacity-100' : 'opacity-40'} />
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
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


