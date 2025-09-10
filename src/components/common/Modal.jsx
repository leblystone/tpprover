import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'

export default function Modal({ open, onClose, onBack, title, theme, children, footer, maxWidth }) {
  // Add keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);
  
  if (!open) return null
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div 
        className={`relative w-full ${maxWidth || 'max-w-lg'} rounded-xl shadow-2xl flex flex-col`} 
        style={{ backgroundColor: theme.cardBackground, maxHeight: '90vh', minHeight: 'auto' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-1 rounded-full -ml-2" style={{ color: theme.textLight }}>
                <ChevronLeft size={20} />
              </button>
            )}
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full" style={{ color: theme.textLight }}>
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 border-t flex items-center justify-end gap-2 flex-shrink-0" style={{ borderColor: theme.border }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(content, document.body)
}


