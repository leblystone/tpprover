import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ModernTooltip from '../ui/ModernTooltip';
import BetaModal from '../common/BetaModal';
import { Home, BarChart2, FlaskConical, Calendar, ShoppingCart, Users, Settings, Building, Megaphone, User, Boxes, Calculator, Store, LogOut, MessageSquare, BookOpen, Microscope, NotebookPen } from 'lucide-react'
import logo from '../../assets/tpp_logo.png'
import '../../styles/sidebar.css'
import { useAppContext } from '../../context/AppContext'

const Sidebar = ({ theme, installPrompt, isPwaSupported, isPwaInstalled, onSupportClick }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showBetaModal, setShowBetaModal] = useState(false)
  const location = useLocation()
  const { logout } = useAppContext();

  useEffect(() => {
    const updateIsOpen = () => {
      setIsOpen(window.innerWidth >= 1024)
    }
    updateIsOpen()
    window.addEventListener('resize', updateIsOpen)
    return () => window.removeEventListener('resize', updateIsOpen)
  }, [])

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha = 1) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const links = [
    { to: '/app/dashboard', label: 'Dashboard', icon: Home, tourId: 'dashboard-welcome' },
    { to: '/app/calendar', label: 'Calendar', icon: Calendar, tourId: 'sidebar-calendar' },
    { to: '/app/protocols', label: 'Protocols', icon: FlaskConical, tourId: 'sidebar-protocols' },
    { to: '/app/recon', label: 'Reconstitute', icon: Calculator, tourId: 'sidebar-recon' },
    { to: '/app/stockpile', label: 'Stockpile', icon: Boxes, tourId: 'sidebar-stockpile' },
    { to: '/app/orders', label: 'Orders', icon: ShoppingCart, tourId: 'sidebar-orders' },
    { to: '/app/vendors', label: 'Vendors', icon: Store, tourId: 'sidebar-vendors' },
  ]

  const bottomLinks = [
    { to: '/app/account', icon: User, label: 'Account' },
    { to: '/app/settings', icon: Settings, label: 'Settings' },
  ]

  // Use primaryLight with transparency, or primary with low opacity
  const activeBgColor = theme.primaryLight 
    ? hexToRgba(theme.primaryLight, 0.4)
    : hexToRgba(theme.primary, 0.2)

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
        @keyframes swing {
          0%, 100% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(15deg);
          }
          40% {
            transform: rotate(-10deg);
          }
          60% {
            transform: rotate(5deg);
          }
          80% {
            transform: rotate(-5deg);
          }
        }
        .beta-icon {
          animation: swing 2s ease-in-out infinite;
          transform-origin: top center;
        }
        .beta-chip-button {
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
        }
        .beta-chip-button:hover {
          background-color: #e8e6dd !important;
          transform: scale(1.05);
        }
        .beta-chip-button:hover .beta-icon {
          animation: swing 1s ease-in-out infinite;
        }
      `}</style>
      <aside 
        className="hidden lg:flex lg:w-24 lg:flex-col p-3 border-r card-shadow fixed left-0 top-0 h-screen z-40 sidebar-container overflow-x-hidden"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
      >
        <div className="mb-4 mt-2 flex flex-col items-center gap-3">
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
        <nav className="flex flex-col space-y-2 flex-1 overflow-y-auto overflow-x-hidden">
          {links.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink key={to} to={to} title={label} data-tour={tourId} 
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ color: isActive ? theme.primary : theme.textLight })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        
        {/* Beta Chip - Clickable - Right above page break - Shows on sidebar hover */}
        <div className="flex justify-center px-2 my-3 beta-chip-container" style={{ opacity: 0, transition: 'opacity 0.2s ease-in-out' }}>
          <button
            onClick={() => setShowBetaModal(true)}
            className="beta-chip-button flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl transition-all hover:scale-105 shadow-lg"
            style={{
              backgroundColor: '#f0eee7',
            }}
            title="Click to learn about our beta program"
          >
            <span 
              className="font-bold text-lg tracking-widest"
              style={{ 
                color: '#042617',
                fontFamily: '"Inter", "SF Pro Display", -apple-system, system-ui, sans-serif',
                letterSpacing: '0.2em'
              }}
            >
              BETA
            </span>
            <NotebookPen 
              className="beta-icon h-6 w-6 flex-shrink-0" 
              style={{ color: '#042617' }} 
            />
          </button>
        </div>
        
        <div className="mt-auto space-y-2 flex-shrink-0 overflow-x-hidden" style={{
          borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}`,
          paddingTop: '0.5rem'
        }}>
          {/* Physical Planner Shop Link */}
          <a 
            href="https://thepepplanner.com" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Shop Planners"
            className="flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg"
            style={{ 
              color: theme.isDark ? '#a8b5a0' : theme.textLight,
              backgroundColor: theme.isDark ? '#1f2937' : 'transparent',
              textDecoration: 'none'
            }}
          >
            <BookOpen className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-semibold ml-4 sidebar-link-label">Shop Planners</span>
          </a>
          
          {bottomLinks.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink key={to} to={to} title={label} data-tour={tourId}
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg ${isActive ? 'sidebar-link-active' : ''}`}
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
            className="flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg cursor-pointer"
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
      
      {/* Beta Modal */}
      {showBetaModal && (
        <BetaModal 
          open={showBetaModal} 
          onClose={() => setShowBetaModal(false)} 
          theme={theme} 
        />
      )}
    </>
  )
}

export default Sidebar


