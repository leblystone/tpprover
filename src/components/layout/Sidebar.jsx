import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ModernTooltip from '../ui/ModernTooltip';
import { Home, BarChart2, FlaskConical, Calendar, ShoppingCart, Users, Settings, Building, Megaphone, User, Boxes, Calculator, Store, LogOut, MessageSquare } from 'lucide-react'
import logo from '../../assets/tpp_logo.png'
import '../../styles/sidebar.css'
import { useAppContext } from '../../context/AppContext'

const Sidebar = ({ theme, installPrompt, isPwaSupported, isPwaInstalled }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { logout } = useAppContext();

  useEffect(() => {
    const updateIsOpen = () => {
      setIsOpen(window.innerWidth >= 768)
    }
    updateIsOpen()
    window.addEventListener('resize', updateIsOpen)
    return () => window.removeEventListener('resize', updateIsOpen)
  }, [])


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

  return (
    <>
      <style>{`
        .sidebar-link-active {
          background-color: ${theme.primary};
          color: ${theme.textOnPrimary};
          border-radius: 0.5rem;
        }
        .sidebar-link:hover:not(.sidebar-link-active) {
          background-color: ${theme.primaryLight} !important;
          color: ${theme.textOnPrimary} !important;
          border-radius: 0.5rem;
        }
      `}</style>
      <aside 
        className="hidden md:flex md:w-24 md:flex-col p-3 border-r card-shadow fixed left-0 top-0 h-screen z-40 sidebar-container overflow-x-hidden"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
      >
        <div className="mb-4 mt-2 flex items-center justify-center">
          <img src={logo} alt="Logo" className="h-16 w-16 rounded-full shadow object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
        <nav className="flex flex-col space-y-2 flex-1 overflow-y-auto overflow-x-hidden">
          {links.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink key={to} to={to} title={label} data-tour={tourId} 
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ color: isActive ? theme.textOnPrimary : theme.textLight })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2 flex-shrink-0 overflow-x-hidden" style={{
          borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}`,
          paddingTop: '0.5rem'
        }}>
          {bottomLinks.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink key={to} to={to} title={label} data-tour={tourId}
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 rounded-lg ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ 
                color: isActive ? theme.textOnPrimary : (theme.isDark ? '#a8b5a0' : theme.textLight),
                backgroundColor: isActive ? undefined : (theme.isDark ? '#1f2937' : 'transparent')
              })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </div>
      </aside>
    </>
  )
}

export default Sidebar


