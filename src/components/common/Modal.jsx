 import React from 'react'
 import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, theme, children, footer }) {
  if (!open) return null
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl mx-4" style={{ backgroundColor: theme?.white || '#fff' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme?.border || '#eee' }}>
          <h3 className="text-lg font-semibold" style={{ color: theme?.primaryDark || '#333' }}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-4">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t flex items-center justify-end gap-2" style={{ borderColor: theme?.border || '#eee' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(content, document.body)
 }


