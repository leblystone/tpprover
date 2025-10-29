import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

const ModernToast = ({ message, type, onClose, theme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Fade in
    const fadeInTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    // Auto dismiss after 4 seconds (increased for better UX)
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 4000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(dismissTimer);
    };
  }, [onClose, message, type]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 200);
  };

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
          bg: theme.primary || '#7F9E95',
          text: theme.textOnPrimary || '#FFFFFF',
          border: theme.primary || '#7F9E95'
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
      className="max-w-sm w-full transition-all duration-500 ease-out"
      style={{
        opacity: isVisible && !isLeaving ? 1 : 0,
        transform: isVisible && !isLeaving 
          ? 'translateY(0)' 
          : 'translateY(-100%)',
      }}
    >
      {/* Journal-style entry with clean, minimal design */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#FEFEFE',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        {/* Journal entry header with timestamp */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.bg }}></div>
            <span className="text-xs font-medium text-gray-500">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        </div>
        
        {/* Journal entry content */}
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 leading-relaxed">
                {message}
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
      const { message, type = 'info' } = event.detail;
      
      const newToast = {
        id: Date.now() + Math.random(),
        message,
        type
      };

      setToasts(prev => [...prev, newToast]);
    };

    window.addEventListener('tpp:toast', handleToast);
    return () => window.removeEventListener('tpp:toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none max-w-sm w-full">
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
          />
        </div>
      ))}
    </div>
  );
};

export { ModernToast, ModernToastContainer };
