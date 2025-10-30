import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
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

  const handleThemeChange = (newTheme) => {
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
          <p className="text-sm" style={{ color: theme.mutedText }}>Add personality to your research</p>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="space-y-4">
        {/* Theme Selection */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>Color Theme</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.keys(themes).map(themeKey => {
              const themeData = themes[themeKey]
              const isSelected = selectedTheme === themeKey
              
              // Define unique swatch colors for each theme (darker to match actual theme colors)
              const swatchColors = {
                sage: { start: '#5F7F76', mid: '#7F9E95', end: '#4A6B63' },
                mauve: { start: '#6B5D62', mid: '#7D6F74', end: '#5A4C51' },
                taupe: { start: '#8B7F77', mid: '#A39890', end: '#756A62' },
                softDark: { start: '#2C2C30', mid: '#3A3A40', end: '#1A1A1D' }
              }
              
              const colors = swatchColors[themeKey] || { start: themeData.primary, mid: themeData.primaryLight, end: themeData.primaryDark }
              
              return (
                <button
                  key={themeKey}
                  onClick={() => handleThemeChange(themeKey)}
                  className="relative p-2 rounded-lg transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: theme.secondary,
                    border: isSelected ? `2px solid ${theme.accent}` : '2px solid transparent',
                    boxShadow: isSelected ? `0 4px 12px ${theme.accent}40` : '0 2px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Compact Color Swatch with Metallic Finish */}
                  <div 
                    className="w-full h-12 rounded-lg mb-2 relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.mid} 50%, ${colors.end} 100%)`,
                      boxShadow: themeKey === 'softDark' 
                        ? 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.25)'
                        : 'inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    {/* Metallic shine overlay */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: themeKey === 'softDark'
                          ? 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)'
                          : 'linear-gradient(145deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                        mixBlendMode: 'overlay'
                      }}
                    />
                    {/* Additional metallic reflection */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: themeKey === 'softDark'
                          ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 100%)'
                          : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.2) 55%, transparent 100%)',
                        mixBlendMode: 'overlay'
                      }}
                    />
                  </div>
                  
                  {/* Theme Name and Check */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold" style={{ color: theme.text }}>
                      {themeData.name}
                    </div>
                    {isSelected && (
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Check size={10} style={{ color: theme.accentText }} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Font Size Selection */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>Font Size</h4>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: '0.9', label: 'Small', preview: 'Aa' },
              { value: '1.0', label: 'Default', preview: 'Aa' },
              { value: '1.1', label: 'Large', preview: 'Aa' },
              { value: '1.25', label: 'XL', preview: 'Aa' }
            ].map(option => {
              const isSelected = (settings?.appearance?.fontScale || '1.0') === option.value
              
              return (
                <button
                  key={option.value}
                  onClick={() => update('appearance.fontScale', option.value)}
                  className="p-3 rounded-lg transition-all hover:opacity-90 text-center"
                  style={{
                    backgroundColor: isSelected ? theme.accent : theme.secondary,
                    color: isSelected ? theme.accentText : theme.text,
                    border: isSelected ? `2px solid ${theme.accent}` : '2px solid transparent'
                  }}
                >
                  <div 
                    className="font-bold mb-1"
                    style={{ fontSize: `${parseFloat(option.value) * 1.5}rem` }}
                  >
                    {option.preview}
                  </div>
                  <div className="text-xs">
                    {option.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
