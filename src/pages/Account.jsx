import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { User, TrendingUp, Shield, FileText, Crown, Gift, Settings, LogOut } from 'lucide-react'
import { useAppContext } from '../context/AppContext'

export default function Account() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { logout } = useAppContext()

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
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔵 Account button clicked:', section.title, '→', section.path);
                try {
                  navigate(section.path);
                  console.log('✅ Navigate called successfully');
                } catch (error) {
                  console.error('❌ Navigate failed:', error);
                }
              }}
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

      {/* Logout Section */}
      <div className="border-t pt-6" style={{ borderColor: theme.border }}>
        <button
          onClick={logout}
          className="w-full p-4 rounded-lg transition-all hover:opacity-90 text-left flex items-center gap-4"
          style={{
            backgroundColor: theme.error + '10',
            border: `1px solid ${theme.error}30`
          }}
        >
          <div 
            className="p-3 rounded-lg flex-shrink-0"
            style={{ backgroundColor: theme.error }}
          >
            <LogOut size={24} style={{ color: '#FFFFFF' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1" style={{ color: theme.error }}>
              Sign Out
            </h3>
            <p className="text-sm" style={{ color: theme.mutedText }}>
              Sign out of your account
            </p>
          </div>
        </button>
      </div>
    </section>
  )
}