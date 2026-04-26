import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Palette, IconContext } from '@phosphor-icons/react'
import { themes, defaultThemeName } from '../theme/themes'

const THEME_DESCRIPTIONS = {
  sage: 'A natural, focused environment.',
  softDark: 'Perfect for late night research.',
  pearlescent: 'Iridescent calm — sky, pink, and pearl without the glare.',
}

export default function SettingsAppearance() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const [selectedTheme, setSelectedTheme] = useState(() => {
    try {
      let savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
      if (savedTheme === 'twilight' || savedTheme === 'pastel') {
        savedTheme = 'pearlescent';
        localStorage.setItem('tpprover_theme', 'pearlescent');
      }
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
    <IconContext.Provider value={{ weight: 'bold' }}>
    <section className="page-bg max-w-xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <button
          onClick={() => navigate('/app/settings')}
          className="group p-2 rounded-xl transition-all active:scale-95 shrink-0 glass-button-nav"
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Appearance</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span
              className={`text-[11px] font-semibold uppercase tracking-[0.15em] ${theme.name === 'Pearlescent' ? '' : 'opacity-40'}`}
              style={{ color: theme.name === 'Pearlescent' ? theme.textLight : theme.text }}
            >
              Visual Interface & Themes
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Palette size={16} style={{ color: theme.primary }} />
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Color Theme
            </h4>
            <div
              className="flex-1 h-px"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.keys(themes)
              .filter(themeKey => !['mauve', 'taupe', 'beekeeper'].includes(themeKey))
              .map(themeKey => {
                const themeData = themes[themeKey]
                const isSelected = selectedTheme === themeKey

                return (
                  <button
                    key={themeKey}
                    onClick={() => handleThemeChange(themeKey)}
                    className="content-section group relative flex flex-col p-4 rounded-[2rem] transition-all border-2 text-left overflow-hidden h-full"
                    style={{
                      borderColor: isSelected ? theme.primary : 'transparent',
                      boxShadow: isSelected
                        ? `0 20px 40px ${theme.primary}15, 0 8px 16px ${theme.primary}10`
                        : '0 4px 12px rgba(0,0,0,0.03)'
                    }}
                  >
                    {/* Visual Preview */}
                    <div
                      className="w-full h-24 rounded-2xl mb-4 relative overflow-hidden border border-black/[0.03]"
                      style={
                        themeKey === 'pearlescent' && themeData.lightMainGradient
                          ? { background: themeData.lightMainGradient }
                          : { backgroundColor: themeData.background }
                      }
                    >
                      {themeKey === 'pearlescent' ? (
                        <>
                          {/* Frosted glass topbar strip */}
                          <div
                            className="absolute top-0 left-0 right-0 z-[1] flex h-[22px] items-center justify-between px-2.5 border-b"
                            style={{
                              background: 'rgba(255,255,255,0.72)',
                              backdropFilter: 'blur(14px)',
                              WebkitBackdropFilter: 'blur(14px)',
                              borderColor: 'rgba(212,200,228,0.55)',
                              boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.5)',
                            }}
                          >
                            <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: themeData.text, opacity: 0.12 }} />
                            <span className="flex gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeData.primary, opacity: 0.85 }} />
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: themeData.primary, opacity: 0.45 }} />
                            </span>
                          </div>
                          <div className="absolute top-7 left-3 right-3 space-y-2">
                            <div className="flex gap-2">
                              <div
                                className="w-8 h-8 rounded-xl border"
                                style={{ backgroundColor: themeData.cardBackground, borderColor: themeData.border, boxShadow: '0 1px 2px rgba(58,61,69,0.06)' }}
                              />
                              <div className="flex-1 space-y-2 py-1">
                                <div className="w-2/3 h-2 rounded-full" style={{ backgroundColor: themeData.primary }} />
                                <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: themeData.textLight, opacity: 0.35 }} />
                              </div>
                            </div>
                            <div
                              className="w-full h-12 rounded-2xl border"
                              style={{ backgroundColor: themeData.cardBackground, borderColor: themeData.border, boxShadow: '0 1px 3px rgba(58,61,69,0.06), 0 0 0 0.5px rgba(255,255,255,0.5) inset' }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: themeData.primary }} />
                          <div className="absolute top-6 left-3 right-3 space-y-2">
                            <div className="flex gap-2">
                              <div className="w-8 h-8 rounded-lg border border-black/[0.06]" style={{ backgroundColor: `${themeData.primary}1A` }} />
                              <div className="flex-1 space-y-2 py-1">
                                <div className="w-2/3 h-2 rounded-full" style={{ backgroundColor: themeData.primary }} />
                                <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: themeData.text, opacity: 0.1 }} />
                              </div>
                            </div>
                            <div className="w-full h-12 rounded-xl" style={{ backgroundColor: themeData.cardBackground, border: `1px solid ${themeData.border}` }} />
                          </div>
                        </>
                      )}

                      {/* Selection check */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-[2]">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300"
                            style={{ backgroundColor: themeData.primary, color: themeData.textOnPrimary || '#ffffff' }}
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
                        <div className="flex gap-1.5 justify-end shrink-0">
                          {(
                            themeKey === 'pearlescent'
                              ? [themeData.primary, themeData.accent]
                              : [themeData.primary, themeData.background]
                          ).map((c, i) => (
                            <div key={i} className="w-2.5 h-2.5 rounded-full border border-black/8 shrink-0" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed opacity-50" style={{ color: theme.text }}>
                        {THEME_DESCRIPTIONS[themeKey] ?? 'A natural, focused environment.'}
                      </p>
                    </div>

                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-white/20 to-transparent dark:from-white/5" />
                  </button>
                )
              })
            }
          </div>
        </div>
      </div>
    </section>
    </IconContext.Provider>
  )
}
