import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Privacy</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Control data collection and usage</p>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="space-y-4">
        {/* Cookie Settings */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Cookie Preferences</h4>
          <div className="space-y-2">
            <SettingToggle 
              checked={settings.privacy.functional} 
              onChange={v => update('privacy.functional', v)} 
              label="Functional Cookies" 
              description="Required for the app to work correctly" 
              theme={theme} 
              disabled 
            />
            <SettingToggle 
              checked={settings.privacy.analytics} 
              onChange={v => update('privacy.analytics', v)} 
              label="Analytics Cookies" 
              description="Help improve the app with usage data" 
              theme={theme} 
            />
          </div>
        </div>

        {/* Data Sharing */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Data Sharing</h4>
          <div className="space-y-2">
            <SettingToggle 
              checked={settings.privacy.dataSharing} 
              onChange={v => update('privacy.dataSharing', v)} 
              label="Anonymous Usage Metrics" 
              description="Share anonymous data to help improve the app" 
              theme={theme} 
            />
          </div>
        </div>
      </div>
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


