import React, { useState, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { loadSettings } from '../../utils/settingsHelpers';

/** Strip emoji from message so toast shows clean text with type-based icon only. */
const stripEmoji = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const ModernToast = ({ message, type, onClose, theme, duration = 4000 }) => {
  const displayMessage = stripEmoji(message);
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    // Fade in
    const fadeInTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(dismissTimer);
    };
  }, [onClose, message, type]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 200);
  };

  // Swipe handlers
  const handleDragStart = (clientY) => {
    setIsDragging(true);
    setStartY(clientY);
  };

  const handleDragMove = (clientY) => {
    if (!isDragging) return;
    const deltaY = clientY - startY;
    // Only allow upward swipes (negative values)
    if (deltaY < 0) {
      setDragY(deltaY);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // If swiped up more than 50px, dismiss
    if (dragY < -50) {
      setIsLeaving(true);
      setTimeout(onClose, 200);
    } else {
      // Snap back
      setDragY(0);
    }
  };

  // Touch events
  const handleTouchStart = (e) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse events (for desktop)
  const handleMouseDown = (e) => {
    handleDragStart(e.clientY);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    // Only allow upward swipes (negative values)
    if (deltaY < 0) {
      setDragY(deltaY);
    }
  }, [isDragging, startY]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // If swiped up more than 50px, dismiss
    if (dragY < -50) {
      setIsLeaving(true);
      setTimeout(onClose, 200);
    } else {
      // Snap back
      setDragY(0);
    }
  }, [isDragging, dragY, onClose]);

  // Add global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: theme.isDark ? '#6B7280' : (theme.primary || '#7F9E95'),
          text: theme.isDark ? '#F9FAFB' : (theme.textOnPrimary || '#FFFFFF'),
          border: theme.isDark ? '#6B7280' : (theme.primary || '#7F9E95')
        };
      case 'error':
        return {
          bg: theme.error || '#DC2626',
          text: '#FFFFFF',
          border: theme.error || '#DC2626'
        };
      case 'warning':
        return {
          bg: theme.warning || '#F59E0B',
          text: '#FFFFFF',
          border: theme.warning || '#F59E0B'
        };
      case 'info':
        return {
          bg: theme.secondary || '#F5F5F0',
          text: theme.text || '#2F3B3A',
          border: theme.border || '#DDE6DE'
        };
      default:
        return {
          bg: theme.secondary || '#F5F5F0',
          text: theme.text || '#2F3B3A',
          border: theme.border || '#DDE6DE'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`max-w-sm w-full ${isLeaving ? 'tpp-toast-exit' : isVisible ? 'tpp-toast-enter' : ''}`}
      style={{
        transform: isDragging ? `translateY(${dragY}px)` : undefined,
        transition: isDragging ? 'none' : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Journal-style entry with clean, minimal design */}
      <div
        className="relative overflow-hidden select-none"
        style={{
          backgroundColor: theme.cardBackground || '#FFFFFF',
          border: `1px solid ${theme.border || '#E5E7EB'}`,
          borderRadius: '8px',
          boxShadow: theme.isDark 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Journal entry header with timestamp */}
        <div 
          className="flex items-center justify-between px-4 py-2 border-b transition-colors"
          style={{ 
            borderColor: theme.border || (theme.isDark ? '#3A3F47' : '#E5E7EB')
          }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.bg }}></div>
            <span 
              className="text-xs font-medium"
              style={{ color: theme.textLight || '#6B7D7A' }}
            >
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full transition-colors"
            style={{ 
              color: theme.textLight || '#9CA3AF',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.secondary || (theme.isDark ? '#3A3F47' : '#F3F4F6');
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        
        {/* Journal entry content */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5" style={{ color: colors.text || theme.text }}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <p 
                className="text-sm font-medium leading-relaxed"
                style={{ color: theme.text || '#1F2937' }}
              >
                {displayMessage}
              </p>
            </div>
          </div>
        </div>
        
        {/* Subtle accent line */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1" 
          style={{ backgroundColor: colors.bg }}
        ></div>
      </div>
    </div>
  );
};

const ModernToastContainer = ({ theme }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      // Check if toast notifications are enabled
      const settings = loadSettings();
      const toastEnabled = settings?.features?.toastNotifications ?? true;
      
      if (!toastEnabled) {
        return; // Don't show toast if disabled
      }
      
      const { message, type = 'info', duration } = event.detail;
      
      const newToast = {
        id: Date.now() + Math.random(),
        message,
        type,
        ...(duration !== undefined && { duration })
      };

      // Stack up to 3 toasts with stagger
      setToasts(prev => {
        const next = [...prev, newToast];
        return next.slice(-3);
      });
    };

    window.addEventListener('tpp:toast', handleToast);
    return () => window.removeEventListener('tpp:toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10050] flex flex-col items-center gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full"
          style={{
            position: 'relative',
          }}
        >
          <ModernToast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            theme={theme}
            duration={toast.duration}
          />
        </div>
      ))}
    </div>
  );
};

export { ModernToast, ModernToastContainer };
