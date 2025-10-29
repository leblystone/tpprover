import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { themes, defaultThemeName } from '../theme/themes'
import { loadSettings, saveSettings, getDefaultSettings } from '../utils/settingsHelpers'

export default function SettingsAppearance() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const [selectedTheme, setSelectedTheme] = useState(() => {
    try { 
      const savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
      if (savedTheme === 'beekeeper') {
        localStorage.setItem('tpprover_theme', defaultThemeName);
        return defaultThemeName;
      }
      if (themes[savedTheme]) {
        return savedTheme;
      }
      return defaultThemeName;
    } catch { 
      return defaultThemeName 
    }
  })

  const [settings, setSettings] = useState(() => {
    const loadedSettings = loadSettings()
    const defaultSettings = getDefaultSettings()
    
    return {
      ...defaultSettings,
      ...loadedSettings,
      appearance: {
        ...defaultSettings.appearance,
        ...(loadedSettings?.appearance || {})
      }
    }
  })

  useEffect(() => {
    try {
      const scale = settings?.appearance?.fontScale || '1.0';
      document.documentElement.style.fontSize = `${parseFloat(scale) * 16}px`;
    } catch {}
  }, [settings?.appearance?.fontScale]);

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setSelectedTheme(newTheme);
    try { 
      localStorage.setItem('tpprover_theme', newTheme); 
      sessionStorage.setItem('tpp_theme_changing', 'true');
    } catch {}
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

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
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Appearance</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Customize your app's look and feel</p>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="space-y-4">
        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Theme</label>
          <select
            value={selectedTheme}
            onChange={handleThemeChange}
            className="w-full p-2 rounded border"
            style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
          >
            {Object.keys(themes).map(t => <option key={t} value={t}>{themes[t].name}</option>)}
          </select>
        </div>

        <SettingSelect 
          label="Font Size" 
          value={settings?.appearance?.fontScale || '1.0'} 
          onChange={e => update('appearance.fontScale', e.target.value)} 
          options={[
            { value: '0.9', label: 'Small' }, 
            { value: '1.0', label: 'Default' }, 
            { value: '1.1', label: 'Large' }, 
            { value: '1.25', label: 'XL' }
          ]} 
          theme={theme} 
        />
      </div>
    </section>
  )
}

const SettingSelect = ({ label, value, onChange, options, theme }) => (
  <div 
    className="p-4 rounded-lg"
    style={{ backgroundColor: theme.cardBackground }}
  >
    <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>{label}</label>
    <select 
      className="w-full p-2 rounded-md border" 
      value={value} 
      onChange={onChange} 
      style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
    >
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
)

