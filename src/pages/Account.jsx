import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight } from 'lucide-react'
import { User, UserPlus, Repeat, HardDrives } from '@phosphor-icons/react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { featureFlags } from '../config/featureFlags'
import FounderBadge from '../components/common/FounderBadge'

export default function Account() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { logout, user } = useAppContext()
  const { firebaseUser } = useFirebase()
  // Merge Firebase Auth creationTime so FounderBadge works even when
  // the AppContext user object doesn't yet have createdAt populated.
  const userForFounder = {
    ...user,
    createdAt: user?.createdAt || firebaseUser?.metadata?.creationTime || null,
  }

  const accountSections = [
    {
      title: 'Profile',
      description: 'Manage account, password, and security',
      icon: User,
      phosphor: true,
      path: '/app/account/profile',
      color: theme.primary
    },
    {
      title: 'Research+',
      description: 'Manage subscription and billing',
      icon: Repeat,
      phosphor: true,
      path: '/app/account/subscription',
      color: theme.accent
    },
    ...(featureFlags.ENABLE_BUDDY ? [{
      title: 'Buddy System',
      description: 'Co-track a partner\'s research under your account',
      icon: UserPlus,
      phosphor: true,
      path: '/app/account/buddy',
      color: theme.primary
    }] : []),
    {
      title: 'Legal & Agreements',
      description: 'View agreement history and legal documents',
      icon: HardDrives,
      phosphor: true,
      path: '/app/account/legal',
      color: theme.mutedText
    }
  ]

  return (
    <section className="page-bg max-w-xl mx-auto space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-1">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary }}>
          <User size={32} weight="bold" style={{ color: '#FFFFFF' }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.text }}>Account</h1>
            <FounderBadge user={userForFounder} theme={theme} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Profile, Subscription & Legal
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

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
              className="content-section group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
              style={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-opacity-20"
                    style={{ backgroundColor: theme.primary + '10' }}
                  >
                    <Icon size={22} style={{ color: theme.primary }} {...(section.phosphor ? { weight: section.phosphorWeight || 'bold' } : {})} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold tracking-tight" style={{ color: theme.text }}>
                      {section.title === 'Research+' ? (
                        <>Research<span style={{ color: '#D4A030', fontWeight: 700, fontSize: '1.35em', lineHeight: 1, verticalAlign: 'middle' }}>+</span></>
                      ) : section.title}
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
      <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
        <button
          onClick={logout}
          className="group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
          style={{
            backgroundColor: '#5F7F76',
            border: '1.5px solid #4F6B63',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <LogOut size={22} style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: '#FFFFFF' }}>
                  Sign Out
                </h3>
                <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Sign out of your account
                </p>
              </div>
            </div>
            <div className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
              <ChevronRight size={24} style={{ color: '#FFFFFF' }} />
            </div>
          </div>
        </button>
      </div>
    </section>
  )
}