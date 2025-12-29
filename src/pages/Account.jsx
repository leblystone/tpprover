import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { User, TrendingUp, FileText, LogOut, ChevronRight } from 'lucide-react'
import { useAppContext } from '../context/AppContext'

export default function Account() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { logout } = useAppContext()

  const accountSections = [
    {
      title: 'Profile',
      description: 'Manage account, password, and security',
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
      title: 'Legal & Agreements',
      description: 'View agreement history and legal documents',
      icon: FileText,
      path: '/app/account/legal',
      color: theme.mutedText
    }
  ]

  return (
    <section className="max-w-xl mx-auto space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary + '15' }}>
          <User size={32} style={{ color: theme.primary }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Account</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Profile, Subscription & Legal
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

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
              className="group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
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
                <div className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                  <ChevronRight size={24} style={{ color: theme.text }} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Logout Section */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.isDark ? '#374151' : theme.border }}>
        <button
          onClick={logout}
          className="group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
          style={{
            backgroundColor: theme.error + '10',
            border: `1px solid ${theme.error}30`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: theme.error }}
              >
                <LogOut size={22} style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black tracking-tight" style={{ color: theme.error }}>
                  Sign Out
                </h3>
                <p className="text-[13px] font-medium opacity-50" style={{ color: theme.text }}>
                  Sign out of your account
                </p>
              </div>
            </div>
            <div className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <ChevronRight size={24} style={{ color: theme.error }} />
            </div>
          </div>
        </button>
      </div>
    </section>
  )
}