import React, { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  Bell,
  Palette,
  GearSix as SettingsIcon,
  Trash,
  CaretRight as ChevronRight,
  Question as HelpCircle,
  User,
  UserPlus,
  Repeat,
  HardDrives,
  SignOut,
  Warning,
  IconContext,
} from '@phosphor-icons/react'
import { APP_VERSION } from '../utils/appVersion'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { featureFlags } from '../config/featureFlags'
import FounderBadge from '../components/common/FounderBadge'
import ResearchPlusBadge from '../components/common/ResearchPlusBadge'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'

function getUserInitials(email) {
  if (!email) return 'U'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

function SectionLabel({ icon: Icon, children, theme }) {
  return (
    <div className="flex items-center gap-2 px-1 w-full min-w-0 pt-1">
      {Icon ? (
        <Icon size={14} weight="regular" className="opacity-40 shrink-0" style={{ color: theme.text }} />
      ) : null}
      <h2
        className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0"
        style={{ color: theme.text }}
      >
        {children}
      </h2>
      <div
        className="flex-1 h-px min-w-0"
        style={{
          background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
        }}
      />
    </div>
  )
}

function SettingsRow({ section, theme, isLocked, onNavigate }) {
  const Icon = section.icon
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onNavigate(section.path)
      }}
      className="content-section group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        opacity: isLocked ? 0.75 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors group-hover:bg-opacity-20"
            style={{ backgroundColor: theme.primary + '10' }}
          >
            <Icon size={22} style={{ color: isLocked ? theme.textLight : theme.primary }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold tracking-tight" style={{ color: theme.text }}>
                {section.title === 'Research+' ? (
                  <>
                    Research
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '1.35em',
                        lineHeight: 1,
                        verticalAlign: 'middle',
                        display: 'inline-block',
                        background:
                          'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.9) 55%, transparent 80%) no-repeat, linear-gradient(135deg, #C8912A 0%, #E8C55A 35%, #F5D97A 50%, #E8C55A 65%, #B8822A 100%)',
                        backgroundSize: '60% 100%, 100% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: 'plusShine 3.2s ease-in-out infinite',
                      }}
                    >
                      +
                    </span>
                  </>
                ) : (
                  section.title
                )}
              </h3>
              {isLocked && <ResearchPlusBadge size="sm" />}
            </div>
            <p className="text-[13px] font-medium opacity-50" style={{ color: theme.text }}>
              {section.description}
            </p>
          </div>
        </div>
        <ChevronRight
          size={24}
          className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
          style={{ color: theme.text }}
        />
      </div>
    </button>
  )
}

export default function Settings() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { logout, user } = useAppContext()
  const { firebaseUser } = useFirebase()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      setIsLoggingOut(false)
    }
  }

  const forceSignOut = async () => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {}
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
        FirebaseAuthentication.signOut().catch(() => {})
      }
    } catch {}
    window.location.href = '/login'
  }

  const isNativeIOS =
    typeof window !== 'undefined' && typeof window.__capacitorNative !== 'undefined'
  const { subscriptionStatus } = useSubscriptionAccess()
  const isTrial = subscriptionStatus === 'trialing'
  const isFree = subscriptionStatus === 'expired' || subscriptionStatus === 'error'
  const showPremiumBadge = isTrial || isFree
  const userForFounder = {
    ...user,
    createdAt: user?.createdAt || firebaseUser?.metadata?.creationTime || null,
  }
  const email = user?.email || firebaseUser?.email || ''
  const displayName =
    user?.displayName || firebaseUser?.displayName || (email ? email.split('@')[0] : 'Account')

  const accountSections = [
    {
      title: 'Profile & Security',
      description: 'Email, password, and two-factor auth',
      icon: User,
      path: '/app/account/profile',
    },
    {
      title: 'Research+',
      description: 'Manage subscription and billing',
      icon: Repeat,
      path: '/app/account/subscription',
    },
    ...(featureFlags.ENABLE_BUDDY
      ? [
          {
            title: 'Buddy System',
            description: 'Co-track one research partner',
            icon: UserPlus,
            path: '/app/account/buddy',
            premiumRequired: true,
          },
        ]
      : []),
    {
      title: 'Legal & Agreements',
      description: 'View agreement history and legal documents',
      icon: HardDrives,
      path: '/app/account/legal',
    },
  ]

  const appSections = [
    {
      title: 'Notifications',
      description: 'Choose how you want to be notified',
      icon: Bell,
      path: '/app/settings/notifications',
    },
    {
      title: 'User Settings',
      description: 'App behavior and preferences',
      icon: SettingsIcon,
      path: '/app/settings/preferences',
    },
    {
      title: 'Color Themes',
      description: 'Choose your research theme',
      icon: Palette,
      path: '/app/settings/appearance',
    },
    {
      title: 'Data Management',
      description: 'Export, import, and manage your data',
      icon: Trash,
      path: '/app/settings/data',
    },
    {
      title: 'Help Center',
      description: 'FAQ, quick guides, and contact support',
      icon: HelpCircle,
      path: '/app/settings/help',
    },
  ]

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
      <section className="page-bg max-w-xl mx-auto space-y-4 pt-4 pb-6 !min-h-0">
        <style>{`
          @keyframes plusShine {
            0%   { background-position: -250% center, center center; }
            35%  { background-position: 250% center, center center; }
            100% { background-position: 250% center, center center; }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center gap-4 mb-1">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.primary }}>
            <SettingsIcon size={32} style={{ color: '#FFFFFF' }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: theme.text }}>
              Settings
            </h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-40"
                style={{ color: theme.text }}
              >
                Account & Preferences
              </span>
            </div>
          </div>
        </div>
        <div
          className="h-px w-full mb-4 opacity-10"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        />

        {/* Identity chip */}
        <button
          type="button"
          onClick={() => navigate('/app/account/profile')}
          className="content-section group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: theme.primary + '18', color: theme.primary }}
              >
                {getUserInitials(email)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold tracking-tight truncate" style={{ color: theme.text }}>
                    {displayName}
                  </p>
                  <FounderBadge user={userForFounder} theme={theme} size="sm" />
                </div>
                {email && (
                  <p className="text-[13px] font-medium opacity-50 truncate" style={{ color: theme.text }}>
                    {email}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight
              size={22}
              className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0"
              style={{ color: theme.text }}
            />
          </div>
        </button>

        {/* Account */}
        <div className="space-y-3">
          <SectionLabel icon={User} theme={theme}>Account</SectionLabel>
          {accountSections.map((section) => (
            <SettingsRow
              key={section.path}
              section={section}
              theme={theme}
              isLocked={section.premiumRequired && showPremiumBadge}
              onNavigate={navigate}
            />
          ))}
        </div>

        {/* App */}
        <div className="space-y-3">
          <SectionLabel icon={SettingsIcon} theme={theme}>App</SectionLabel>
          {appSections.map((section) => (
            <SettingsRow
              key={section.path}
              section={section}
              theme={theme}
              isLocked={false}
              onNavigate={navigate}
            />
          ))}
        </div>

        {/* Sign out */}
        <div
          className="mt-2 pt-4 border-t"
          style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        >
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative disabled:opacity-60"
            style={{
              backgroundColor: theme.primary,
              border: `1.5px solid ${theme.primaryDark || theme.primary}`,
              boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
              color: theme.textOnPrimary || '#FFFFFF',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
                  }}
                >
                  <SignOut size={22} style={{ color: 'currentColor' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'currentColor' }}>
                    {isLoggingOut ? 'Signing out…' : 'Sign Out'}
                  </h3>
                  <p className="text-[13px] font-medium" style={{ color: 'currentColor', opacity: 0.65 }}>
                    Sign out of your account
                  </p>
                </div>
              </div>
              <div className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                <ChevronRight size={24} style={{ color: 'currentColor' }} />
              </div>
            </div>
          </button>

          {isNativeIOS && (
            <button
              onClick={forceSignOut}
              className="w-full mt-2 py-2 text-xs font-medium opacity-40 hover:opacity-70 transition-opacity touch-manipulation"
              style={{ color: theme.text }}
            >
              <Warning size={12} className="inline mr-1" />
              Force sign out (clear local data)
            </button>
          )}
        </div>

        <p className="text-center pt-2 pb-2 text-[9px] opacity-30 select-all" style={{ color: theme.text }}>
          v{APP_VERSION}
        </p>
      </section>
    </IconContext.Provider>
  )
}
