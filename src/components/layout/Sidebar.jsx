import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, matchPath } from 'react-router-dom';
import {
  House,
  CalendarDots,
  TestTube,
  Pill,
  Calculator,
  ChartLine,
  ClipboardText,
  Robot,
  Package,
  ShoppingCart,
  Storefront,
  Heart,
  NewspaperClipping,
  BookOpen,
  Microscope,
} from '@phosphor-icons/react';
import logo from '../../assets/tpp_logo.png'
import '../../styles/sidebar.css'
import { useAppContext } from '../../context/AppContext'
import { isNative } from '../../utils/platform'
import { featureFlags } from '../../config/featureFlags'

const Sidebar = ({ theme, installPrompt, isPwaSupported, isPwaInstalled, onSupportClick }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { logout } = useAppContext();

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

  const hexToRgba = (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const isMainLinkActive = (toPath) => {
    const pathname = toPath.split('?')[0];
    return !!matchPath({ path: pathname, end: false }, location.pathname);
  };

  // Mirrors the bottom nav structure exactly
  const navGroups = [
    {
      label: null,
      items: [
        { to: '/app/dashboard', label: 'Home', icon: House },
        { to: '/app/calendar', label: 'Calendar', icon: CalendarDots },
      ]
    },
    {
      label: 'Research',
      items: [
        { to: '/app/protocols', label: 'Protocols', icon: TestTube },
        { to: '/app/supplements', label: 'Supplements', icon: Pill },
        { to: '/app/recon', label: 'Peptide Calc', icon: Calculator },
        { to: '/app/insights', label: 'Analytics', icon: ChartLine },
        { to: '/app/goals', label: 'Goals', icon: ClipboardText },
        ...(featureFlags.ENABLE_AI_RESEARCH ? [{ to: '/app/ai', label: 'AI Research', icon: Robot }] : []),
      ]
    },
    {
      label: 'Inventory',
      items: [
        { to: '/app/stockpile', label: 'Stockpile', icon: Package },
        { to: '/app/orders', label: 'Orders', icon: ShoppingCart },
        { to: '/app/vendors', label: 'Vendors', icon: Storefront },
        { to: '/app/wishlist', label: 'Wishlist', icon: Heart },
      ]
    },
  ]


  const activeBgColor = theme.primaryLight 
    ? hexToRgba(theme.primaryLight, 0.4)
    : hexToRgba(theme.primary, 0.2)

  const dividerColor = theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'

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
        .sidebar-nav::-webkit-scrollbar { display: none; }
        .sidebar-nav { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
      <aside 
        className="hidden lg:flex lg:w-24 lg:flex-col px-2 pt-2 pb-1 border-r fixed left-0 top-0 h-screen z-40 sidebar-container overflow-x-hidden glass-bar"
        style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
      >
        {/* Logo */}
        <div className="mb-1 flex flex-col items-center flex-shrink-0">
          <img 
            src={logo} 
            alt="Logo" 
            className="h-[52px] w-[52px] rounded-full shadow object-contain" 
            style={{
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
              WebkitBackfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} 
          />
        </div>

        {/* Nav — groups weighted by item count so icons distribute evenly */}
        {/* flex: 11 = total nav items, footer gets flex: 3, together they fill h-screen */}
        <nav className="sidebar-nav flex flex-col min-h-0 overflow-x-hidden overflow-y-hidden" style={{ flex: 11 }}>
          {navGroups.map((group, gi) => (
            <div key={gi} className="flex flex-col min-h-0" style={{ flex: group.items.length }}>
              {/* Section divider with label */}
              {group.label && (
                <div className="flex items-center gap-0 px-1 flex-shrink-0 min-w-0" style={{ height: '18px' }}>
                  <div className="h-px flex-shrink-0 w-2" style={{ backgroundColor: dividerColor }} />
                  <span
                    className="sidebar-section-heading-label text-xs font-bold uppercase tracking-widest whitespace-nowrap flex-shrink-0"
                    style={{ color: theme.textLight }}
                  >
                    {group.label}
                  </span>
                  <div className="h-px flex-1 min-w-0" style={{ backgroundColor: dividerColor }} />
                </div>
              )}
              {group.items.map(({ to, icon: Icon, label }) => {
                const active = isMainLinkActive(to);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    title={label}
                    className={() => `flex items-center w-full sidebar-link flex-1 min-h-0 ${active ? 'sidebar-link-active' : ''}`}
                    style={() => ({ color: active ? theme.primary : theme.textLight })}
                  >
                    <Icon
                      size={26}
                      weight={active ? 'fill' : 'duotone'}
                      className="flex-shrink-0"
                      aria-hidden
                    />
                    <span className="text-sm font-semibold sidebar-link-label">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer — 3 items, weighted the same as 3 nav items */}
        <div className="sidebar-footer flex flex-col min-h-0 overflow-hidden" style={{
          flex: 3,
          borderTop: `1px solid ${dividerColor}`,
        }}>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('tpp:open-announcements'))}
            title="Announcements"
            className="flex items-center w-full sidebar-link flex-1 min-h-0 rounded-lg cursor-pointer"
            style={{ color: theme.textLight, border: 'none', background: 'transparent' }}
          >
            <NewspaperClipping size={26} weight="duotone" className="flex-shrink-0" aria-hidden />
            <span className="text-sm font-semibold sidebar-link-label">Announcements</span>
          </button>

          <a 
            href="https://thepepplanner.app/shop" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Shop Planners"
            className="flex items-center w-full sidebar-link flex-1 min-h-0 rounded-lg"
            style={{ color: theme.textLight, textDecoration: 'none' }}
          >
            <BookOpen size={26} weight="duotone" className="flex-shrink-0" aria-hidden />
            <span className="text-sm font-semibold sidebar-link-label">Shop Planners</span>
          </a>

          <button 
            type="button"
            onClick={onSupportClick}
            title="Support"
            className="flex items-center w-full sidebar-link flex-1 min-h-0 rounded-lg cursor-pointer"
            style={{ color: theme.textLight, border: 'none', background: 'transparent' }}
          >
            <Microscope size={26} weight="duotone" className="flex-shrink-0" aria-hidden />
            <span className="text-sm font-semibold sidebar-link-label">Support</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar


