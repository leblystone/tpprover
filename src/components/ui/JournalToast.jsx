import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Info, X, BookOpen, PenTool } from 'lucide-react';

const JournalToast = ({ message, type, onClose, theme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Fade in with a slight delay for dramatic effect
    const fadeInTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto dismiss after 4 seconds (longer for journal reading experience)
    const dismissTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Wait for slide out animation
    }, 4000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
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
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getJournalEntry = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    switch (type) {
      case 'success':
        return {
          title: "Research Log Entry",
          subtitle: `Protocol completed successfully - ${timeString}`,
          icon: <PenTool className="w-3 h-3" />
        };
      case 'error':
        return {
          title: "Research Alert",
          subtitle: `Protocol issue detected - ${timeString}`,
          icon: <AlertTriangle className="w-3 h-3" />
        };
      case 'warning':
        return {
          title: "Research Notice",
          subtitle: `Protocol attention needed - ${timeString}`,
          icon: <Info className="w-3 h-3" />
        };
      case 'info':
        return {
          title: "Research Update",
          subtitle: `Protocol information - ${timeString}`,
          icon: <BookOpen className="w-3 h-3" />
        };
      default:
        return {
          title: "Research Log",
          subtitle: `Protocol update - ${timeString}`,
          icon: <BookOpen className="w-3 h-3" />
        };
    }
  };

  const journalEntry = getJournalEntry();
  const colors = {
    bg: theme.primary || '#7F9E95',
    text: theme.textOnPrimary || '#FFFFFF',
    border: theme.primary || '#7F9E95',
    accent: theme.secondary || '#F5F5F0'
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-300 ease-out ${
        isVisible && !isLeaving 
          ? 'opacity-100 translate-x-0 scale-100' 
          : 'opacity-0 translate-x-full scale-95'
      }`}
      style={{
        transform: isVisible && !isLeaving 
          ? 'translateX(0) scale(1)' 
          : 'translateX(100%) scale(0.95)',
      }}
    >
      {/* Journal binding rings */}
      <div className="absolute -left-2 top-2 bottom-2 w-1 bg-gradient-to-b from-amber-600 to-amber-800 rounded-l-full shadow-lg"></div>
      <div className="absolute -left-1 top-3 bottom-3 w-0.5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-l-full"></div>
      
      {/* Main journal entry */}
      <div
        className="relative flex flex-col p-4 rounded-lg shadow-2xl border-2 backdrop-blur-sm"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 10px 20px -5px rgba(0, 0, 0, 0.1)',
          background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`
        }}
      >
        {/* Journal header with date line */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {journalEntry.icon}
            <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
              {journalEntry.title}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-black hover:bg-opacity-20 transition-colors"
            style={{ color: colors.text }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
        
        {/* Date line */}
        <div className="w-full h-px mb-3 opacity-30" style={{ backgroundColor: colors.text }}></div>
        
        {/* Journal content */}
        <div className="space-y-2">
          <div className="text-xs opacity-80 font-mono">
            {journalEntry.subtitle}
          </div>
          <div className="text-sm font-medium leading-relaxed">
            {message}
          </div>
        </div>
        
        {/* Journal footer with signature line */}
        <div className="mt-3 pt-2 border-t border-opacity-20" style={{ borderColor: colors.text }}>
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-60 font-mono">
              The Pep Planner Research Log
            </div>
            <div className="flex items-center gap-1">
              {getIcon()}
            </div>
          </div>
        </div>
        
        {/* Decorative corner */}
        <div className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-opacity-30 rounded-tr-lg" 
             style={{ borderColor: colors.text }}></div>
      </div>
    </div>
  );
};

const JournalToastContainer = ({ theme }) => {
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
        <JournalToast
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

export { JournalToast, JournalToastContainer };
