import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft } from 'lucide-react'
import { hapticsLight, hapticsMedium } from '../../utils/haptics'

export default function Modal({ open, onClose, onBack, title, titleExtra, theme, children, footer, maxWidth, variant, hideCloseButton, disableBackdropClose }) {
  // Use internal state to persist modal open state across app lifecycle changes
  const [internalOpen, setInternalOpen] = useState(open);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const wasOpenBeforeBackground = useRef(false);
  const visibilityChangeTimeoutRef = useRef(null);
  const isInBackgroundState = useRef(false);
  const explicitCloseRequested = useRef(false);
  const previousOpenProp = useRef(open);
  const animationTimeoutRef = useRef(null);

  // Monitor document visibility AND Capacitor App state to prevent modal from closing when app is minimized
  useEffect(() => {
    let capacitorAppListener = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App is going to background - remember if modal was open
        if (internalOpen) {
          wasOpenBeforeBackground.current = true;
          isInBackgroundState.current = true;
          console.log('📱 App minimized - preserving modal state');
        }
      } else {
        // App is coming back to foreground
        // Clear any existing timeout
        if (visibilityChangeTimeoutRef.current) {
          clearTimeout(visibilityChangeTimeoutRef.current);
        }
        
        // Small delay to allow React to finish re-rendering
        visibilityChangeTimeoutRef.current = setTimeout(() => {
          // If modal was open before going to background, restore it
          // even if the parent's open prop was temporarily reset
          if (wasOpenBeforeBackground.current) {
            console.log('🔄 App returned to foreground - restoring modal state');
            setInternalOpen(true);
            // Keep flag for a bit longer to prevent premature closing
            setTimeout(() => {
              isInBackgroundState.current = false;
              wasOpenBeforeBackground.current = false;
            }, 500);
          } else {
            isInBackgroundState.current = false;
          }
        }, 200);
      }
    };

    // Add Capacitor App state listener for better Android support
    const setupCapacitorListeners = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) {
          const { App } = await import('@capacitor/app');
          
          capacitorAppListener = await App.addListener('appStateChange', ({ isActive }) => {
            if (!isActive) {
              // App going to background
              if (internalOpen) {
                wasOpenBeforeBackground.current = true;
                isInBackgroundState.current = true;
                console.log('📱 App state changed to background (Capacitor) - preserving modal state');
              }
            } else {
              // App coming to foreground
              if (visibilityChangeTimeoutRef.current) {
                clearTimeout(visibilityChangeTimeoutRef.current);
              }
              
              visibilityChangeTimeoutRef.current = setTimeout(() => {
                if (wasOpenBeforeBackground.current) {
                  console.log('🔄 App state changed to foreground (Capacitor) - restoring modal state');
                  setInternalOpen(true);
                  setTimeout(() => {
                    isInBackgroundState.current = false;
                    wasOpenBeforeBackground.current = false;
                  }, 500);
                } else {
                  isInBackgroundState.current = false;
                }
              }, 200);
            }
          });
        }
      } catch (error) {
        console.log('Capacitor App not available, using visibility API only');
      }
    };

    setupCapacitorListeners();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityChangeTimeoutRef.current) {
        clearTimeout(visibilityChangeTimeoutRef.current);
      }
      if (capacitorAppListener) {
        capacitorAppListener.remove();
      }
    };
  }, [internalOpen]);

  // Sync internal state with prop, but be smart about it
  useEffect(() => {
    // Track if this is a user-initiated close (prop changed from true to false)
    const propChangedToFalse = previousOpenProp.current === true && open === false;
    previousOpenProp.current = open;

    // Only update internal state if:
    // 1. The prop changed to true (always allow opening)
    // 2. The prop changed to false AND:
    //    - We're not in a background state recovery period
    //    - AND this isn't happening during app lifecycle changes
    //    - AND it wasn't already explicitly closed
    if (open) {
      // Opening animation
      setShouldRender(true);
      setIsAnimating(true);
      // Small delay to trigger animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      setTimeout(() => {
        setInternalOpen(true);
        setTimeout(() => setIsAnimating(false), 250);
        hapticsLight(); // Haptic feedback on modal open
      }, 10);
      wasOpenBeforeBackground.current = false; // Reset when explicitly opened
      isInBackgroundState.current = false;
      explicitCloseRequested.current = false;
    } else if (propChangedToFalse && !isInBackgroundState.current && !wasOpenBeforeBackground.current) {
      // Closing animation
      explicitCloseRequested.current = true;
      setIsAnimating(true);
      setInternalOpen(false);
      // Wait for animation to complete before removing from DOM
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
      }, 250);
    } else if (!open && !isInBackgroundState.current && !wasOpenBeforeBackground.current && explicitCloseRequested.current) {
      // Allow closing if explicitly requested and we're stable
      setIsAnimating(true);
      setInternalOpen(false);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
      }, 250);
    }
    // Otherwise, ignore prop changes during background state transitions

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [open]);

  // Detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add keyboard shortcuts and prevent body scroll on mobile
  useEffect(() => {
    if (!internalOpen) {
      return;
    }
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // User explicitly closed via Escape key
        explicitCloseRequested.current = true;
        wasOpenBeforeBackground.current = false;
        isInBackgroundState.current = false;
        setIsAnimating(true);
        setInternalOpen(false);
        // Wait for animation before calling onClose
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
        animationTimeoutRef.current = setTimeout(() => {
          setShouldRender(false);
          setIsAnimating(false);
          onClose();
        }, 250);
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
    if (disableBackdropClose) return;
    // User explicitly closed via backdrop click
    hapticsMedium(); // Haptic feedback on close
    explicitCloseRequested.current = true;
    wasOpenBeforeBackground.current = false;
    isInBackgroundState.current = false;
    setIsAnimating(true);
    setInternalOpen(false);
    // Wait for animation before calling onClose
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setShouldRender(false);
      setIsAnimating(false);
      onClose();
    }, 250);
  };
  
  if (!shouldRender) return null
  
  // Modern variant styling
  const isModern = variant === 'modern';
  const backdropClass = isModern ? 'bg-black/60 backdrop-blur-sm' : 'backdrop-blur-md bg-black/30';
  const modalClass = isModern ? 'rounded-2xl shadow-2xl' : 'rounded-2xl shadow-2xl';
  
  // Check if this is the sage/default theme
  const isSageTheme = theme?.name === 'Sage';
  
  // Header styling: dark mode uses dark slate, light mode uses theme background
  const headerStyle = theme?.isDark ? {
    background: 'rgba(20, 24, 32, 0.98)',
    color: theme.text || '#ededee'
  } : isSageTheme ? {
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
    <div 
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4 overflow-x-hidden"
      style={{
        opacity: internalOpen ? 1 : 0,
        pointerEvents: internalOpen ? 'auto' : 'none',
        transition: 'opacity 250ms ease-out'
      }}
    >
      <div 
        className={`absolute inset-0 ${backdropClass}`}
        style={{
          opacity: internalOpen ? 1 : 0,
          transition: 'opacity 250ms ease-out'
        }}
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
          backgroundColor: theme?.isDark ? 'rgba(24, 28, 36, 0.98)' : (theme?.cardBackground || '#FFFFFF'), 
          maxHeight: '90vh', 
          minHeight: 'auto',
          boxShadow: theme?.isDark 
            ? '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)' 
            : '0 20px 60px rgba(0,0,0,0.15)',
          transform: internalOpen ? 'scale(1)' : 'scale(0.95)',
          opacity: internalOpen ? 1 : 0,
          transition: 'transform 250ms ease-out, opacity 250ms ease-out',
          willChange: 'transform, opacity'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 flex-shrink-0" style={headerStyle}>
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
                className={`p-1 rounded-full -ml-2 transition-colors touch-manipulation ${theme?.isDark ? 'hover:bg-white/10' : isSageTheme ? 'hover:bg-black/10' : 'hover:bg-white/20'}`} 
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
            {!hideCloseButton && (
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBackdropClick();
                }}
                className={`p-1.5 rounded-full transition-colors touch-manipulation ${theme?.isDark ? 'hover:bg-white/10' : isSageTheme ? 'hover:bg-black/10' : 'hover:bg-white/20'}`} 
                style={{ 
                  color: headerStyle.color,
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden" style={{ backgroundColor: theme?.isDark ? 'rgba(24, 28, 36, 0.98)' : (theme?.cardBackground || '#FFFFFF') }}>
          {children}
        </div>
        {footer && (
          <div 
            className="px-6 py-3 flex items-center justify-end gap-3 flex-shrink-0 border-t" 
            style={{ 
              backgroundColor: theme?.isDark ? 'rgba(24, 28, 36, 0.98)' : (theme?.cardBackground || '#FFFFFF'), 
              borderColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : (theme?.border || 'rgba(0,0,0,0.1)'),
              // Add bottom padding for Android navigation bar on mobile devices
              // Only adds extra padding when safe-area-bottom is detected (e.g., Samsung with gesture nav)
              // Devices without overlap (e.g., Pixel) will just get normal 0.75rem padding
              paddingBottom: isMobile
                ? `max(0.75rem, calc(0.75rem + var(--safe-area-bottom, 0px)))`
                : '0.75rem'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
  return createPortal(content, document.body)
}


