import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Palette, Sparkles } from 'lucide-react'
import { themes, defaultThemeName } from '../theme/themes'

export default function SettingsAppearance() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const [selectedTheme, setSelectedTheme] = useState(() => {
    try { 
      const savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
      // Migrate from deprecated themes - wait, if they are hidden, keep migration
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

  return (
    <section className="max-w-xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-3 rounded-2xl transition-all active:scale-95 shadow-sm"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <ArrowLeft size={22} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.text }}>Appearance</h1>
          <p className="text-sm font-medium opacity-60" style={{ color: theme.text }}>Add personality to your research</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Theme Selection Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Palette size={16} style={{ color: theme.primary }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Color Theme
            </h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(themes)
              // Only showing Sage and Dark for now as requested/implied by "ugly" selection
              .filter(themeKey => !['mauve', 'taupe', 'beekeeper'].includes(themeKey)) 
              .map(themeKey => {
                const themeData = themes[themeKey]
                const isSelected = selectedTheme === themeKey
                
                return (
                  <button
                    key={themeKey}
                    onClick={() => handleThemeChange(themeKey)}
                    className="group relative flex flex-col p-5 rounded-[2rem] transition-all border-2 text-left overflow-hidden h-full"
                    style={{
                      backgroundColor: theme.cardBackground,
                      borderColor: isSelected ? theme.primary : 'transparent',
                      boxShadow: isSelected 
                        ? `0 20px 40px ${theme.primary}15, 0 8px 16px ${theme.primary}10` 
                        : '0 4px 12px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Visual Preview */}
                    <div 
                      className="w-full h-24 rounded-2xl mb-4 relative overflow-hidden border border-black/[0.03]"
                      style={{ backgroundColor: themeData.background }}
                    >
                      {/* Mini App UI Elements */}
                      <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: themeData.primary }} />
                      <div className="absolute top-6 left-3 right-3 space-y-2">
                        <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: themeData.primary, opacity: 0.1 }} />
                          <div className="flex-1 space-y-2 py-1">
                            <div className="w-2/3 h-2 rounded-full" style={{ backgroundColor: themeData.primary }} />
                            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: themeData.text, opacity: 0.1 }} />
                          </div>
                        </div>
                        <div className="w-full h-12 rounded-xl" style={{ backgroundColor: themeData.cardBackground, border: `1px solid ${themeData.border}` }} />
                      </div>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300"
                            style={{ backgroundColor: themeData.primary, color: '#ffffff' }}
                          >
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="px-1 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg" style={{ color: theme.text }}>
                          {themeData.name}
                        </span>
                        <div className="flex gap-1">
                          {[themeData.primary, themeData.background].map((c, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/5" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed opacity-50" style={{ color: theme.text }}>
                        {themeKey === 'softDark' 
                          ? 'Perfect for late night research.' 
                          : 'A natural, focused environment.'}
                      </p>
                    </div>

                    {/* Subtle Gradient Overlay on Hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-white/20 to-transparent dark:from-white/5" />
                  </button>
                )
              })
            }
            
            {/* "More Coming" Placeholder Card */}
            <div 
              className="flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-dashed opacity-40"
              style={{ borderColor: theme.border }}
            >
              <Sparkles size={24} style={{ color: theme.textLight }} className="mb-2" />
              <p className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: theme.textLight }}>
                Sequencing New<br/>Color Chains
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
