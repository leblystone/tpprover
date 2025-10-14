import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

const ModernToast = ({ message, type, onClose, theme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Fade in
    const fadeInTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto dismiss after 3 seconds (shorter for less annoyance)
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 200); // Wait for fade out animation
    }, 3000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

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
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-200 ease-out ${
        isVisible && !isLeaving 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full'
      }`}
      style={{
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 text-sm font-medium leading-tight">
          {message}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black hover:bg-opacity-10 transition-colors"
          style={{ color: colors.text }}
        >
          <X className="w-4 h-4" />
        </button>
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
    <>
      {toasts.map(toast => (
        <ModernToast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          theme={theme}
        />
      ))}
    </>
  );
};

export { ModernToast, ModernToastContainer };
