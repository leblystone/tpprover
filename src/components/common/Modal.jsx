import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'

export default function Modal({ open, onClose, onBack, title, titleExtra, theme, children, footer, maxWidth, variant }) {
  // Use internal state to persist modal open state across app lifecycle changes
  const [internalOpen, setInternalOpen] = useState(open);
  const wasOpenBeforeBackground = useRef(false);
  const visibilityChangeTimeoutRef = useRef(null);

  // Monitor document visibility to prevent modal from closing when app is minimized
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is going to background - remember if modal was open
        if (internalOpen) {
          wasOpenBeforeBackground.current = true;
        }
      } else {
        // App is coming back to foreground
        // Clear any existing timeout
        if (visibilityChangeTimeoutRef.current) {
          clearTimeout(visibilityChangeTimeoutRef.current);
        }
        
        // Small delay to allow React to finish re-rendering
        visibilityChangeTimeoutRef.current = setTimeout(() => {
          // If modal was open before going to background, keep it open
          // even if the parent's open prop was temporarily reset
          if (wasOpenBeforeBackground.current && !open) {
            console.log('🔄 Restoring modal state after app returned to foreground');
            setInternalOpen(true);
            // Reset the flag after restoring
            wasOpenBeforeBackground.current = false;
          }
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityChangeTimeoutRef.current) {
        clearTimeout(visibilityChangeTimeoutRef.current);
      }
    };
  }, [open, internalOpen]);

  // Sync internal state with prop, but be smart about it
  useEffect(() => {
    // Only update internal state if:
    // 1. The prop changed to true (always allow opening)
    // 2. The prop changed to false AND we're not in a visibility change recovery period
    if (open) {
      setInternalOpen(true);
      wasOpenBeforeBackground.current = false; // Reset when explicitly opened
    } else if (!wasOpenBeforeBackground.current) {
      // Only close if we weren't tracking a background state
      setInternalOpen(false);
    }
  }, [open]);

  // Add keyboard shortcuts and prevent body scroll on mobile
  useEffect(() => {
    if (!internalOpen) {
      return;
    }
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setInternalOpen(false);
        wasOpenBeforeBackground.current = false;
        onClose();
      }
    };
    
    // Prevent body scroll when modal is open (especially important on mobile)
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    
    // Dispatch modal open event to hide tooltips
    window.dispatchEvent(new CustomEvent('tpp:modal-open'));
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [internalOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = () => {
    setInternalOpen(false);
    wasOpenBeforeBackground.current = false;
    onClose();
  };
  
  if (!internalOpen) return null
  
  // Modern variant styling
  const isModern = variant === 'modern';
  const backdropClass = isModern ? 'bg-black/60 backdrop-blur-sm' : 'backdrop-blur-md bg-black/30';
  const modalClass = isModern ? 'rounded-2xl shadow-2xl' : 'rounded-2xl shadow-2xl';
  
  // Check if this is the sage/default theme
  const isSageTheme = theme?.name === 'Sage';
  
  // Header styling: sage theme gets light background with dark text, others use gradient
  const headerStyle = isSageTheme ? {
    background: theme.background || '#EFF2EE',
    color: theme.text || '#2F3B3A'
  } : isModern && theme ? {
    background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`,
    color: theme.textOnPrimary
  } : { 
    background: `linear-gradient(135deg, #7F9E95, #5F7F76)`,
    color: '#FFFFFF'
  };
  const titleClass = isModern ? 'text-lg font-semibold' : 'text-lg font-bold';
  const titleExtraClass = isSageTheme 
    ? 'text-sm opacity-70 mt-0.5' 
    : isModern 
      ? 'text-sm opacity-90' 
      : 'text-sm text-white/90 mt-0.5';
  
  const content = (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 overflow-x-hidden">
      <div 
        className={`absolute inset-0 ${backdropClass}`}
        onClick={handleBackdropClick}
        onTouchStart={(e) => {
          // Only close if touch starts on the backdrop, not if it's a swipe from modal content
          if (e.target === e.currentTarget) {
            handleBackdropClick();
          }
        }}
      />
      <div 
        className={`relative w-full max-w-[calc(100vw-2rem)] ${maxWidth || 'max-w-lg'} ${maxWidth?.includes('max-w-6xl') ? 'lg:max-w-3xl' : maxWidth?.includes('max-w-4xl') ? 'lg:max-w-2xl' : maxWidth?.includes('max-w-3xl') ? 'lg:max-w-xl' : maxWidth?.includes('max-w-2xl') ? 'lg:max-w-xl' : ''} ${modalClass} flex flex-col overflow-hidden`} 
        style={{ 
          backgroundColor: theme?.cardBackground || '#FFFFFF', 
          maxHeight: '90vh', 
          minHeight: 'auto',
          boxShadow: theme?.isDark 
            ? '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.1)' 
            : '0 20px 60px rgba(0,0,0,0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={headerStyle}>
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                type="button"
                onMouseDown={(e) => {
                  // Prevent blur events on mobile
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  // Prevent blur events on touch devices
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onBack();
                }}
                className={`p-1 rounded-full -ml-2 transition-colors touch-manipulation ${isSageTheme ? 'hover:bg-black/10' : 'hover:bg-white/20'}`} 
                style={{ 
                  color: headerStyle.color,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h3 className={titleClass} style={{ color: headerStyle.color }}>{title}</h3>
          </div>
          <div className="flex items-center gap-3">
            {titleExtra && (
              <div className={titleExtraClass} style={{ color: headerStyle.color }}>{titleExtra}</div>
            )}
            <button 
              type="button"
              onMouseDown={(e) => {
                // Prevent blur events on mobile
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                // Prevent blur events on touch devices
                e.preventDefault();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBackdropClick();
              }}
              className={`p-1.5 rounded-full transition-colors touch-manipulation ${isSageTheme ? 'hover:bg-black/10' : 'hover:bg-white/20'}`} 
              style={{ 
                color: headerStyle.color,
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: theme?.cardBackground || '#FFFFFF' }}>
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0 border-t" style={{ backgroundColor: theme?.cardBackground || '#FFFFFF', borderColor: theme?.border || 'rgba(0,0,0,0.1)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(content, document.body)
}


