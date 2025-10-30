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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{ color: theme.text }}>Account</h1>
        <p className="text-sm" style={{ color: theme.mutedText }}>Manage your account settings and preferences</p>
      </div>

      {/* Account Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accountSections.map((section, index) => {
          const Icon = section.icon
          return (
            <button
              key={index}
              onClick={() => navigate(section.path)}
              className="p-6 rounded-xl transition-all hover:scale-[1.02] hover:shadow-lg text-left"
              style={{
                backgroundColor: theme.cardBackground,
                border: `1px solid ${theme.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: section.color + '20' }}
                >
                  <Icon size={24} style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1" style={{ color: theme.text }}>
                    {section.title}
                  </h3>
                  <p className="text-sm" style={{ color: theme.mutedText }}>
                    {section.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}