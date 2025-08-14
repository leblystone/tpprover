import React from 'react'
import { NavLink } from 'react-router-dom'

export default function MobileSidebar({ open, onClose, theme }) {
  if (!open) return null
  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/research', label: 'Research' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/recon', label: 'Reconstitution' },
    { to: '/protocols', label: 'Protocols' },
    { to: '/stockpile', label: 'Stockpile' },
    { to: '/orders', label: 'Orders' },
    { to: '/vendors', label: 'Vendors' },
    { to: '/glossary', label: 'Glossary' },
    { to: '/imports', label: 'Imports' },
    { to: '/settings', label: 'Settings' },
    { to: '/account', label: 'Account' },
  ]
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute top-0 left-0 h-full w-72 bg-white shadow-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold" style={{ color: theme?.primaryDark }}>Menu</div>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} onClick={onClose} className={({ isActive }) => `block px-3 py-2 rounded ${isActive ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>{l.label}</NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}


