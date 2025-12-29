import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Bell, Palette, Settings as SettingsIcon, Trash2, ChevronRight, Eye, ShieldCheck, Microscope } from 'lucide-react'

export default function Settings() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const settingsSections = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Choose how you want to be notified',
      icon: Bell,
      path: '/app/settings/notifications',
      color: theme.primary
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: "Customize your app's look and feel",
      icon: Palette,
      path: '/app/settings/appearance',
      color: theme.primary
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      description: 'Language, currency, and app behavior',
      icon: SettingsIcon,
      path: '/app/settings/preferences',
      color: theme.primary
    },
    {
      id: 'privacy',
      title: 'Privacy',
      description: 'Control data sharing and preferences',
      icon: Eye,
      path: '/app/settings/privacy',
      color: theme.primary
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Export, import, and manage your data',
      icon: Trash2,
      path: '/app/settings/data',
      color: theme.primary
    }
  ]

  return (
    <section className="max-w-xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary + '15' }}>
          <SettingsIcon size={32} style={{ color: theme.primary }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Settings</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Environment Configuration
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      {/* Navigation Sections */}
      <div className="space-y-4">
        {settingsSections.map((section, index) => {
          const Icon = section.icon
          return (
            <button
              key={index}
              type="button"
              onClick={() => navigate(section.path)}
              className="group w-full p-5 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
              style={{
                backgroundColor: theme.cardBackground,
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-opacity-20"
                    style={{ backgroundColor: theme.primary + '10' }}
                  >
                    <Icon size={22} style={{ color: theme.primary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-black tracking-tight" style={{ color: theme.text }}>
                      {section.title}
                    </h3>
                    <p className="text-[13px] font-medium opacity-50" style={{ color: theme.text }}>
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight 
                  size={18} 
                  className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
                  style={{ color: theme.text }} 
                />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
