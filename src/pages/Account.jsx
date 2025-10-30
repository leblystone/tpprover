import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { User, TrendingUp, Shield, FileText, Crown, Gift, Settings } from 'lucide-react'

export default function Account() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  const accountSections = [
    {
      title: 'Profile',
      description: 'Manage account information and settings',
      icon: User,
      path: '/app/account/profile',
      color: theme.primary
    },
    {
      title: 'Research Subscription',
      description: 'Manage subscription and billing',
      icon: TrendingUp,
      path: '/app/account/subscription',
      color: theme.accent
    },
    {
      title: 'Security & Privacy',
      description: 'Two-factor authentication and privacy settings',
      icon: Shield,
      path: '/app/account/security',
      color: theme.secondary
    },
    {
      title: 'Legal & Agreements',
      description: 'View agreement history and legal documents',
      icon: FileText,
      path: '/app/account/legal',
      color: theme.mutedText
    }
  ]

  return (
    <section className="space-y-6">
      {/* Account Sections */}
      <div className="space-y-3">
        {accountSections.map((section, index) => {
          const Icon = section.icon
          return (
            <button
              key={index}
              onClick={() => navigate(section.path)}
              className="w-full p-4 rounded-lg transition-all hover:opacity-90 text-left"
              style={{
                backgroundColor: theme.cardBackground
              }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Icon size={24} style={{ color: theme.accentText }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: theme.text }}>
                    {section.title}
                  </h3>
                  <p className="text-sm" style={{ color: theme.mutedText }}>
                    {section.description}
                  </p>
                </div>
                <div className="text-lg" style={{ color: theme.mutedText }}>
                  ›
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}