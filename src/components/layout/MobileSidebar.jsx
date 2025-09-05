import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, Home, Calendar, Calculator, Boxes, ShoppingCart, Store, FlaskConical, Megaphone, User, Settings, LogOut, MessageSquare, DownloadCloud } from 'lucide-react'
import { NavLink, useOutletContext } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import FeedbackModal from '../common/FeedbackModal';

export default function MobileSidebar({ open, onClose, theme }) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { installPrompt } = useOutletContext();
  const { logout } = useAppContext();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/calendar', label: 'Calendar', icon: Calendar },
    { to: '/recon', label: 'Reconstitution', icon: Calculator },
    { to: '/protocols', label: 'Protocols', icon: FlaskConical },
    { to: '/stockpile', label: 'Stockpile', icon: Boxes },
    { to: '/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/vendors', label: 'Vendors', icon: Store },
  ]
  const bottomLinks = [
    { to: '/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/account', label: 'Account', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]
  const overlay = (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute top-0 left-0 h-full w-full bg-white shadow-xl p-4 flex flex-col" style={{ transform: visible ? 'translateX(0%)' : 'translateX(-100%)', transition: 'transform 240ms ease-in-out' }}>
        <div className="flex items-center justify-start mb-3">
          <button onClick={onClose} className="text-gray-500" aria-label="Close Menu"><Menu className="h-5 w-5" /></button>
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
            <button
              onClick={() => { setShowFeedbackModal(true); onClose(); }}
              className="flex items-center gap-3 h-14 w-full px-4 text-gray-700"
            >
              <MessageSquare className="h-6 w-6" />
              <span className="text-lg font-medium truncate">Feedback</span>
            </button>
            {installPrompt && (
                <button
                    onClick={() => { installPrompt.prompt(); onClose(); }}
                    className="flex items-center gap-3 h-14 w-full px-4 text-gray-700"
                >
                    <DownloadCloud className="h-6 w-6" />
                    <span className="text-lg font-medium truncate">Install App</span>
                </button>
            )}
            <button
              onClick={() => { logout(); onClose(); }}
              className="flex items-center gap-3 h-14 w-full px-4 text-gray-700"
            >
              <LogOut className="h-6 w-6" />
              <span className="text-lg font-medium truncate">Log Out</span>
            </button>
          </div>
        </nav>
      </div>
      <FeedbackModal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} theme={theme} />
    </div>
  )
  return createPortal(overlay, document.body)
}


