import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, Home, Calendar, Calculator, Boxes, ShoppingCart, Store, FlaskConical, User, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../../assets/tpp-logo.png'

export default function MobileSidebar({ open, onClose, theme }) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const durationMs = 240
    if (open) {
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute top-0 left-0 h-full w-full bg-white shadow-xl px-4 py-2 pb-4 flex flex-col" style={{ 
        transform: visible ? 'translateX(0%)' : 'translateX(-100%)', 
        transition: 'transform 240ms ease-in-out',
        paddingTop: 'env(safe-area-inset-top, 0.5rem)'
      }}>
        <div className="flex items-center justify-between mb-6">
          {/* Left side: Close button */}
          <button onClick={onClose} className="text-gray-500" aria-label="Close Menu"><Menu className="h-5 w-5" /></button>
          
          {/* Right side: Text and Logo */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <h1 className="text-lg font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
              <p className="text-xs text-gray-500">Organize your research.</p>
            </div>
            <img src={logo} alt="The Pep Planner Logo" className="h-14 w-14 rounded-full shadow object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          </div>
        </div>
        <nav className="flex-1 bg-white overflow-y-auto flex flex-col">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 h-14 w-full px-4 sidebar-link ${isActive ? 'sidebar-link-active' : 'text-gray-700'}`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-lg font-medium truncate">{label}</span>
            </NavLink>
          ))}
          <div className="mt-auto border-t pt-2">
            {bottomLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `flex items-center gap-3 h-14 w-full px-4 sidebar-link ${isActive ? 'sidebar-link-active' : 'text-gray-700'}`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-lg font-medium truncate">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
  return createPortal(overlay, document.body)
}


