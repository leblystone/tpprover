import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { Bell, Palette, Settings as SettingsIcon, Trash2, ChevronRight } from 'lucide-react'

export default function Settings() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const settingsSections = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Choose how you want to be notified',
      icon: Bell,
      path: '/app/settings/notifications'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: "Customize your app's look and feel",
      icon: Palette,
      path: '/app/settings/appearance'
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      description: 'Customize language, currency, tracking, and other app settings',
      icon: SettingsIcon,
      path: '/app/settings/preferences'
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Export, import, and manage your app data',
      icon: Trash2,
      path: '/app/settings/data'
    }
  ]

  return (
    <section className="space-y-3">
      {settingsSections.map((section) => {
        const Icon = section.icon
    return (
              <button 
            key={section.id}
            onClick={() => navigate(section.path)}
            className="w-full flex items-center justify-between p-4 rounded-lg transition-all hover:opacity-80"
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: theme.accent }}
              >
                <Icon size={24} style={{ color: theme.accentText }} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base" style={{ color: theme.text }}>
                  {section.title}
                </div>
                <div className="text-sm" style={{ color: theme.mutedText }}>
                  {section.description}
                </div>
              </div>
            </div>
            <ChevronRight size={20} style={{ color: theme.mutedText }} />
                </button>
        )
      })}
       </section>
    )
  }
