import React, { useState, useEffect, useRef } from 'react';
import { Save, Clock } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';

const AutoSaveIndicator = ({ isSaving, lastSaved, onClearForm, theme, compact = false, iconOnly = false }) => {
  const [showTime, setShowTime] = useState(false);
  const [displayTime, setDisplayTime] = useState('');
  const lastSavedRef = useRef(null);

  useEffect(() => {
    // Only trigger time animation when lastSaved actually changes
    if (lastSaved && lastSaved.getTime() !== lastSavedRef.current?.getTime()) {
      lastSavedRef.current = lastSaved;
      
      // Show time animation for 2 seconds before showing save icon
      setShowTime(true);
      const updateTime = () => {
        const now = new Date();
        const diff = now - lastSaved;
        if (diff < 60000) {
          setDisplayTime('just now');
        } else if (diff < 3600000) {
          setDisplayTime(`${Math.floor(diff / 60000)}m ago`);
        } else {
          setDisplayTime(lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      };
      
      updateTime();
      const interval = setInterval(updateTime, 1000);
      
      // After 2 seconds, switch to save icon only
      const timeout = setTimeout(() => {
        setShowTime(false);
        clearInterval(interval);
      }, 2000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [lastSaved]);

  if (!isSaving && !lastSaved) return null;

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Compact version for headers - icon only
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isSaving ? (
          <Clock size={20} className="animate-spin" style={{ color: '#ffffff' }} />
        ) : showTime && lastSaved ? (
          <div className="flex items-center gap-1.5">
            <Clock size={20} className="animate-spin" style={{ color: '#ffffff' }} />
            {!iconOnly && (
              <span className="text-xs font-medium" style={{ color: '#ffffff', opacity: 0.9 }}>
                {displayTime || 'just now'}
              </span>
            )}
          </div>
        ) : lastSaved ? (
          <Save size={20} style={{ color: '#ffffff' }} />
        ) : null}
      </div>
    );
  }

  // Subtle version - very light and unobtrusive
  return (
    <div className="text-xs flex items-center gap-2 opacity-60" style={{ color: theme.textLight }}>
      {isSaving ? (
        <Clock size={12} className="animate-spin" />
      ) : (
        <>
          <Save size={12} />
          <span>Saved {formatTime(lastSaved)}</span>
        </>
      )}
    </div>
  );
};

export default AutoSaveIndicator;