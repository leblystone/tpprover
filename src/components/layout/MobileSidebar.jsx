import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, Home, Calendar, Calculator, Boxes, ShoppingCart, Store, FlaskConical, User, Settings, BookOpen, Microscope, NotebookPen } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/tpp_logo.png'

export default function MobileSidebar({ open, onClose, theme, onSupportClick, onBetaClick }) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const durationMs = 350
    if (open) {
      setMounted(true)
      // Use double RAF to ensure the DOM is painted before starting transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      try { document.body.style.overflow = 'hidden' } catch {}
    } else {
      setVisible(false)
      setTimeout(() => setMounted(false), durationMs)
      try { document.body.style.overflow = '' } catch {}
    }
  }, [open])


  if (!mounted) return null
  const links = [
    { to: '/app/dashboard', label: 'Dashboard', icon: Home },
    { to: '/app/calendar', label: 'Calendar', icon: Calendar },
    { to: '/app/recon', label: 'Reconstitute', icon: Calculator },
    { to: '/app/protocols', label: 'Protocols', icon: FlaskConical },
    { to: '/app/stockpile', label: 'Stockpile', icon: Boxes },
    { to: '/app/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/app/vendors', label: 'Vendors', icon: Store },
  ]
  const bottomLinks = [
    { to: '/app/account', label: 'Account', icon: User },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ]
  const overlay = (
    <div className="fixed inset-0 z-[10001]">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          pointerEvents: visible ? 'auto' : 'none'
        }}
      />
      <div 
        className="absolute top-0 left-0 h-full w-80 max-w-[85vw] shadow-xl px-4 pb-4 flex flex-col mobile-nav-container z-10 overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          transform: visible ? 'translateX(0%) scale(1)' : 'translateX(-100%) scale(0.95)', 
          opacity: visible ? 1 : 0,
          transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          willChange: 'transform, opacity',
          transformOrigin: 'left center',
          backgroundColor: theme.cardBackground,
          paddingTop: 'max(var(--safe-area-top, 24px), 24px)',
          paddingBottom: 'max(var(--safe-area-bottom, 16px), 16px)',
          pointerEvents: visible ? 'auto' : 'none',
          overflowY: 'hidden',
          overflowX: 'hidden'
        }}
      >
        <div className="mb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            {/* Left side: Close button and Text */}
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2" style={{ color: theme.text }} aria-label="Close Menu"><Menu className="h-7 w-7" /></button>
              <div className="text-left">
                <h1 className="text-lg font-bold" style={{ color: theme.isDark ? '#d9dbcd' : theme.primaryDark }}>The Pep Planner</h1>
                <p className="text-xs" style={{ color: theme.isDark ? '#d9dbcd' : theme.textLight }}>Organize your research.</p>
              </div>
            </div>
            
            {/* Right side: Logo */}
            <img 
              src={logo} 
              alt="The Pep Planner Logo" 
              className="h-14 w-14 rounded-full shadow object-contain" 
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
        </div>
        <nav className="flex-1 overflow-hidden flex flex-col min-h-0" style={{ backgroundColor: theme.cardBackground, overflowY: 'hidden', overflowX: 'hidden' }}>
          {links.map(({ to, label, icon: Icon }, index) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 h-14 w-full px-4 sidebar-link transition-all duration-200 flex-shrink-0 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({
                animationDelay: visible ? `${index * 50}ms` : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                color: isActive ? theme.textOnPrimary : theme.text,
                backgroundColor: isActive ? theme.primary : 'transparent'
              })}
            >
              <Icon className="h-6 w-6" />
              <span className="text-lg font-medium truncate">{label}</span>
            </NavLink>
          ))}
          
          <style>{`
            @keyframes swing-mobile {
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
            .beta-icon-mobile {
              animation: swing-mobile 2s ease-in-out infinite;
              transform-origin: top center;
            }
            .beta-chip-button-mobile {
              cursor: pointer;
              border: none;
              transition: all 0.3s ease;
            }
            .beta-chip-button-mobile:hover {
              background-color: #e8e6dd !important;
            }
            .beta-chip-button-mobile:active {
              transform: scale(0.95);
            }
            .beta-chip-button-mobile:active .beta-icon-mobile {
              animation: swing-mobile 1s ease-in-out infinite;
            }
          `}</style>
          
          <div className="mt-auto flex-shrink-0 overflow-hidden" style={{ borderColor: theme.border, overflowY: 'hidden', overflowX: 'hidden' }}>
            {/* Beta Chip - Clickable - Right ABOVE page break line */}
            <div className="flex justify-center px-4 mb-2">
              <button
                onClick={onBetaClick}
                className="beta-chip-button-mobile flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl transition-all active:scale-95 shadow-lg"
                style={{
                  backgroundColor: '#f0eee7',
                }}
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
                <NotebookPen className="beta-icon-mobile h-6 w-6 flex-shrink-0" style={{ color: '#042617' }} />
              </button>
            </div>
            
            <div className="border-t pt-2" style={{ borderColor: theme.border }}>
            {/* Physical Planner Shop Link */}
            <a
              href="https://thepepplanner.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-3 h-14 w-full px-4 sidebar-link transition-all duration-200 flex-shrink-0"
              style={{
                animationDelay: visible ? `${links.length * 50}ms` : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                color: theme.text,
                backgroundColor: 'transparent',
                textDecoration: 'none'
              }}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-lg font-medium truncate">Shop Planners</span>
            </a>
            
            {bottomLinks.map(({ to, label, icon: Icon }, index) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 h-14 w-full px-4 sidebar-link transition-all duration-200 flex-shrink-0 ${isActive ? 'sidebar-link-active' : ''}`}
                style={({ isActive }) => ({
                  animationDelay: visible ? `${(links.length + index + 1) * 50}ms` : '0ms',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                  transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                  color: isActive ? theme.textOnPrimary : theme.text,
                  backgroundColor: isActive ? theme.primary : 'transparent'
                })}
              >
                <Icon className="h-6 w-6" />
                <span className="text-lg font-medium truncate">{label}</span>
              </NavLink>
            ))}
            
            {/* Support Button */}
            <button
              onClick={() => {
                onClose()
                onSupportClick()
              }}
              className="flex items-center gap-3 h-14 w-full px-4 sidebar-link transition-all duration-200 cursor-pointer flex-shrink-0"
              style={{
                animationDelay: visible ? `${(links.length + bottomLinks.length + 1) * 50}ms` : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-20px)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
                color: theme.text,
                backgroundColor: 'transparent',
                border: 'none',
                textDecoration: 'none'
              }}
            >
              <Microscope className="h-6 w-6" />
              <span className="text-lg font-medium truncate">Support</span>
            </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
  return createPortal(overlay, document.body)
}


