import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
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

/** One-time eye-catcher on Settings → User Settings (Simple & Advanced Mode) */
const USER_SETTINGS_MODE_SPOTLIGHT_KEY = 'tpp_user_settings_mode_spotlight_done_v1'

function isUserSettingsModeSpotlightDone() {
  try {
    return localStorage.getItem(USER_SETTINGS_MODE_SPOTLIGHT_KEY) === '1'
  } catch {
    return true
  }
}

function markUserSettingsModeSpotlightDone() {
  try {
    localStorage.setItem(USER_SETTINGS_MODE_SPOTLIGHT_KEY, '1')
  } catch {
    /* ignore */
  }
}

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
        <Icon size={18} weight="regular" className="opacity-40 shrink-0" style={{ color: theme.text }} />
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

function SettingsRow({ section, theme, isLocked, onNavigate, buttonRef, spotlight }) {
  const Icon = section.icon
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onNavigate(section.path)
      }}
      className={`content-section group w-full p-4 rounded-[2rem] transition-all hover:shadow-md hover:translate-y-[-1px] active:scale-[0.99] text-left overflow-hidden relative ${spotlight ? 'tpp-user-settings-mode-spotlight-btn' : ''}`}
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

  const [showModeSpotlight, setShowModeSpotlight] = useState(false)
  const [modeSpotlightAnchor, setModeSpotlightAnchor] = useState(null)
  const userSettingsRowRef = useRef(null)
  const modeTipRef = useRef(null)

  const dismissModeSpotlight = useCallback(() => {
    markUserSettingsModeSpotlightDone()
    setShowModeSpotlight(false)
    setModeSpotlightAnchor(null)
  }, [])

  useEffect(() => {
    if (!firebaseUser) return undefined
    if (isUserSettingsModeSpotlightDone()) return undefined
    const t = setTimeout(() => setShowModeSpotlight(true), 700)
    return () => clearTimeout(t)
  }, [firebaseUser])

  useEffect(() => {
    const onPreview = () => {
      try {
        localStorage.removeItem(USER_SETTINGS_MODE_SPOTLIGHT_KEY)
      } catch {
        /* ignore */
      }
      setShowModeSpotlight(true)
    }
    window.addEventListener('tpp:dev-preview-user-settings-mode-spotlight', onPreview)
    return () => window.removeEventListener('tpp:dev-preview-user-settings-mode-spotlight', onPreview)
  }, [])

  useEffect(() => {
    if (!showModeSpotlight) {
      setModeSpotlightAnchor(null)
      return undefined
    }
    const measure = () => {
      const el = userSettingsRowRef.current
      if (!el) {
        setModeSpotlightAnchor(null)
        return
      }
      try {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      } catch {
        /* ignore */
      }
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) {
        setModeSpotlightAnchor(null)
        return
      }
      setModeSpotlightAnchor({
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      })
    }
    measure()
    const t = setTimeout(measure, 100)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [showModeSpotlight])

  useEffect(() => {
    if (!showModeSpotlight) return undefined
    const onPointerDown = (e) => {
      const tip = modeTipRef.current
      const row = userSettingsRowRef.current
      const target = e.target
      if (tip && tip.contains(target)) return
      if (row && (row === target || row.contains(target))) return
      dismissModeSpotlight()
    }
    const attach = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true)
    }, 50)
    return () => {
      clearTimeout(attach)
      document.removeEventListener('pointerdown', onPointerDown, true)
    }
  }, [showModeSpotlight, dismissModeSpotlight])

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
      <section className="page-bg max-w-xl mx-auto space-y-4 px-3 sm:px-4 pt-4 pb-6 !min-h-0">
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
          {appSections.map((section) => {
            const isUserSettings = section.path === '/app/settings/preferences'
            return (
              <SettingsRow
                key={section.path}
                section={section}
                theme={theme}
                isLocked={false}
                buttonRef={isUserSettings ? userSettingsRowRef : undefined}
                spotlight={isUserSettings && showModeSpotlight}
                onNavigate={(path) => {
                  if (isUserSettings && showModeSpotlight) dismissModeSpotlight()
                  navigate(path)
                }}
              />
            )
          })}
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

      {showModeSpotlight && modeSpotlightAnchor && createPortal(
        (() => {
          const primary = theme?.primary || '#7F9E95'
          const tipBg = theme?.isDark ? 'rgba(20,25,33,0.98)' : '#ffffff'
          const tipText = theme?.text || '#1f2937'
          const tipBorder = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
          const tipW = 210
          const padX = 14
          const padY = 12
          const rowCx = modeSpotlightAnchor.left + modeSpotlightAnchor.width / 2
          const ovalLeft = Math.max(4, modeSpotlightAnchor.left - padX)
          const ovalTop = Math.max(4, modeSpotlightAnchor.top - padY)
          const ovalW = modeSpotlightAnchor.width + padX * 2
          const ovalH = Math.max(modeSpotlightAnchor.height + padY * 2, 56)
          let tipLeft = rowCx - tipW / 2
          tipLeft = Math.max(8, Math.min(tipLeft, window.innerWidth - tipW - 8))
          const arrowLeft = Math.max(14, Math.min(rowCx - tipLeft, tipW - 14))
          const spaceBelow = window.innerHeight - modeSpotlightAnchor.bottom
          const tipAbove = spaceBelow < 110
          const tipTop = tipAbove
            ? Math.max(8, modeSpotlightAnchor.top - padY - 88)
            : modeSpotlightAnchor.bottom + padY + 12
          return (
            <>
              <div
                aria-hidden
                className="fixed z-[10039] pointer-events-none tpp-user-settings-mode-spotlight-oval"
                style={{
                  top: ovalTop,
                  left: ovalLeft,
                  width: ovalW,
                  height: ovalH,
                  borderRadius: 36,
                  boxShadow: `0 0 0 2.5px ${primary}`,
                }}
              />
              <div
                className="fixed z-[10040] pointer-events-none"
                style={{ top: tipTop, left: tipLeft, width: tipW }}
                role="status"
                aria-live="polite"
              >
                <div
                  ref={modeTipRef}
                  className="pointer-events-auto rounded-xl shadow-2xl border px-3.5 pt-3 pb-3.5 relative text-center"
                  style={{ backgroundColor: tipBg, borderColor: tipBorder }}
                >
                  <span
                    aria-hidden
                    className={`absolute w-3 h-3 rotate-45 ${tipAbove ? '-bottom-1.5 border-r border-b' : '-top-1.5 border-l border-t'}`}
                    style={{
                      backgroundColor: tipBg,
                      borderColor: tipBorder,
                      left: arrowLeft,
                      transform: 'translateX(-50%) rotate(45deg)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      dismissModeSpotlight()
                    }}
                    className="absolute top-2 right-2 p-0.5 opacity-40 hover:opacity-70 transition-opacity"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: tipText }} />
                  </button>
                  <div className="flex flex-col items-center gap-1.5 px-1">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(90,110,101,0.85)' : '#4a5f56',
                        color: 'rgba(255,255,255,0.95)',
                      }}
                    >
                      New
                    </span>
                    <p className="text-sm font-semibold leading-snug" style={{ color: tipText }}>
                      Simple & Advanced Mode
                    </p>
                  </div>
                </div>
              </div>
              <style>{`
                @keyframes tppUserSettingsModeOval {
                  0%, 100% { transform: scale(1, 1); opacity: 0.95; }
                  50% { transform: scale(1.02, 1.06); opacity: 0.4; }
                }
                .tpp-user-settings-mode-spotlight-oval {
                  animation: tppUserSettingsModeOval 1.4s ease-out infinite;
                  transform-origin: center center;
                }
                @keyframes tppUserSettingsModeBtn {
                  0%, 100% { transform: scale(1); }
                  40% { transform: scale(1.01); }
                  70% { transform: scale(1.005); }
                }
                .tpp-user-settings-mode-spotlight-btn {
                  animation: tppUserSettingsModeBtn 1.4s ease-in-out infinite;
                }
              `}</style>
            </>
          )
        })(),
        document.body
      )}
    </IconContext.Provider>
  )
}
