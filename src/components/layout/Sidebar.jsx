import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ModernTooltip from '../ui/ModernTooltip';
import { Home, BarChart2, FlaskConical, Calendar, ShoppingCart, Users, Settings, Building, Megaphone, User, Boxes, Calculator, Store, LogOut, MessageSquare, BookOpen, Microscope, Pill, Bot } from 'lucide-react'
import logo from '../../assets/tpp_logo.png'
import '../../styles/sidebar.css'
import { useAppContext } from '../../context/AppContext'
import { isNative } from '../../utils/platform'
import { featureFlags } from '../../config/featureFlags'

const Sidebar = ({ theme, installPrompt, isPwaSupported, isPwaInstalled, onSupportClick }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { logout } = useAppContext();

  // Native apps (iOS/Android) always use mobile layout - no sidebar
  const nativeApp = isNative();

  useEffect(() => {
    if (nativeApp) return;
    const updateIsOpen = () => {
      setIsOpen(window.innerWidth >= 1024)
    }
    updateIsOpen()
    window.addEventListener('resize', updateIsOpen)
    return () => window.removeEventListener('resize', updateIsOpen)
  }, [nativeApp])

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const links = [
    { to: '/app/dashboard', label: 'Dashboard', icon: Home },
    { to: '/app/calendar', label: 'Calendar', icon: Calendar },
    { to: '/app/protocols', label: 'Protocols', icon: FlaskConical },
    { to: '/app/supplements', label: 'Supplements', icon: Pill },
    { to: '/app/recon', label: 'Reconstitute', icon: Calculator },
    { to: '/app/stockpile', label: 'Stockpile', icon: Boxes },
    { to: '/app/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/app/vendors', label: 'Vendors', icon: Store },
    ...(featureFlags.ENABLE_COMMUNITY ? [{ to: '/app/community', label: 'Community', icon: Users }] : []),
    ...(featureFlags.ENABLE_AI_RESEARCH ? [{ to: '/app/ai', label: 'AI Research', icon: Bot }] : []),
  ]

  const bottomLinks = [
    { to: '/app/account', icon: User, label: 'Account' },
    { to: '/app/settings', icon: Settings, label: 'Settings' },
  ]

  // Use primaryLight with transparency, or primary with low opacity
  const activeBgColor = theme.primaryLight 
    ? hexToRgba(theme.primaryLight, 0.4)
    : hexToRgba(theme.primary, 0.2)

  // Native apps always use mobile layout (bottom nav) - no sidebar even on iPad
  if (nativeApp) return null;

  return (
    <>
      <style>{`
        .sidebar-link-active {
          background-color: ${activeBgColor};
          color: ${theme.primary};
          border-radius: 0.5rem;
        }
        .sidebar-link:hover:not(.sidebar-link-active) {
          background-color: ${theme.primaryLight} !important;
          color: ${theme.textOnPrimary} !important;
          border-radius: 0.5rem;
        }
      `}</style>
      <aside 
        className="hidden lg:flex lg:w-24 lg:flex-col p-3 border-r fixed left-0 top-0 h-screen z-40 sidebar-container overflow-x-hidden overflow-y-hidden glass-bar"
        style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
      >
        <div className="mb-4 mt-2 flex flex-col items-center gap-3 flex-shrink-0">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-16 w-16 rounded-full shadow object-contain" 
            style={{
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'transform',
              WebkitTransform: 'translateZ(0)',
              msTransform: 'translateZ(0)'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} 
          />
        </div>
        <nav className="flex flex-col space-y-2 flex-1 overflow-hidden min-h-0" style={{ overflowY: 'hidden', overflowX: 'hidden' }}>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={label} 
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 flex-shrink-0 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ color: isActive ? theme.primary : theme.textLight })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="mt-auto space-y-2 flex-shrink-0 overflow-hidden" style={{
          borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}`,
          paddingTop: '0.5rem',
          overflowY: 'hidden',
          overflowX: 'hidden'
        }}>
          {/* Physical Planner Shop Link */}
          <a 
            href="https://thepepplanner.com" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Shop Planners"
            className="flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg flex-shrink-0"
            style={{ 
              color: theme.isDark ? '#a8b5a0' : theme.textLight,
              backgroundColor: theme.isDark ? '#1f2937' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <BookOpen className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-semibold ml-4 sidebar-link-label">Shop Planners</span>
          </a>
          
          {bottomLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={label}
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg flex-shrink-0 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ 
                color: isActive ? theme.primary : (theme.isDark ? '#a8b5a0' : theme.textLight),
                backgroundColor: isActive ? undefined : (theme.isDark ? '#1f2937' : 'transparent')
              })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
          
          {/* Support Button */}
          <button 
            onClick={onSupportClick}
            title="Support"
            className="flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg cursor-pointer flex-shrink-0"
            style={{ 
              color: theme.isDark ? '#a8b5a0' : theme.textLight,
              backgroundColor: theme.isDark ? '#1f2937' : 'transparent',
              border: 'none',
              textDecoration: 'none'
            }}
          >
            <Microscope className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-semibold ml-4 sidebar-link-label">Support</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar


