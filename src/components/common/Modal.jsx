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
  const isModern = variant === 'modern'
  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-0">
      <div 
        className={`absolute inset-0 ${isModern ? 'bg-black/60 backdrop-blur-sm' : 'backdrop-blur-md bg-black/30'}`} 
        onClick={onClose}
        onTouchStart={(e) => {
          // Only close if touch starts on the backdrop, not if it's a swipe from modal content
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
      <div 
        className={`relative w-full ${maxWidth || 'max-w-lg'} rounded-2xl shadow-2xl flex flex-col overflow-hidden`} 
        style={{ backgroundColor: '#FFFFFF', maxHeight: '90vh', minHeight: 'auto' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {isModern ? (
          <div className="relative p-6 pb-8 flex-shrink-0" style={{ 
            background: `linear-gradient(135deg, ${theme?.primary}, ${theme?.primaryDark || theme?.primary})`,
            color: theme?.textOnPrimary
          }}>
            {onBack && (
              <button onClick={onBack} className="absolute left-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors" style={{ color: theme?.textOnPrimary }}>
                <ChevronLeft size={20} />
              </button>
            )}
            <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors" style={{ color: theme?.textOnPrimary }}>
              <X size={20} />
            </button>
            <div className="pr-12">
              <h3 className="text-2xl font-bold mb-2">{title}</h3>
              {titleExtra && (
                <div className="text-sm opacity-90">{titleExtra}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ backgroundColor: '#A3B18A' }}>
            <div className="flex items-center gap-3">
              {onBack && (
                <button onClick={onBack} className="p-1 rounded-full -ml-2 text-white hover:bg-white/20 transition-colors">
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                {titleExtra && (
                  <div className="text-sm text-white/90 mt-0.5">{titleExtra}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1 rounded-full text-white hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        )}
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


