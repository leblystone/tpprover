import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'

export default function Modal({ open, onClose, onBack, title, titleExtra, theme, children, footer, maxWidth, variant }) {
  // Add keyboard shortcuts and prevent body scroll on mobile
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    // Prevent body scroll when modal is open (especially important on mobile)
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);
  
  if (!open) return null
  
  // Modern variant styling
  const isModern = variant === 'modern';
  const backdropClass = isModern ? 'bg-black/60 backdrop-blur-sm' : 'backdrop-blur-md bg-black/30';
  const modalClass = isModern ? 'rounded-2xl shadow-2xl' : 'rounded-2xl shadow-2xl';
  const headerStyle = isModern && theme ? {
    background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`,
    color: theme.textOnPrimary
  } : { 
    background: `linear-gradient(135deg, #7F9E95, #5F7F76)`,
    color: '#FFFFFF'
  };
  const titleClass = isModern ? 'text-2xl font-bold' : 'text-lg font-bold';
  const titleExtraClass = isModern ? 'text-sm opacity-90' : 'text-sm text-white/90 mt-0.5';
  
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div 
        className={`absolute inset-0 ${backdropClass}`}
        onClick={onClose}
        onTouchStart={(e) => {
          // Only close if touch starts on the backdrop, not if it's a swipe from modal content
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
      <div 
        className={`relative w-full ${maxWidth || 'max-w-lg'} ${modalClass} flex flex-col overflow-hidden`} 
        style={{ backgroundColor: '#FFFFFF', maxHeight: '90vh', minHeight: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={headerStyle}>
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-1 rounded-full -ml-2 text-white hover:bg-white/20 transition-colors">
                <ChevronLeft size={20} />
              </button>
            )}
            <h3 className={`${titleClass} text-white`}>{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {titleExtra && (
              <div className={titleExtraClass}>{titleExtra}</div>
            )}
            <button onClick={onClose} className="p-1 rounded-full text-white hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto bg-white">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-white flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(content, document.body)
}


