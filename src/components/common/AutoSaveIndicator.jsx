import React from 'react';
import { Save, Clock } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';

const AutoSaveIndicator = ({ isSaving, lastSaved, onClearForm, theme, compact = false }) => {
  if (!isSaving && !lastSaved) return null;

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Compact version for headers
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isSaving ? (
          <Clock size={16} className="animate-spin" style={{ color: theme.primary }} />
        ) : (
          <Save size={16} style={{ color: theme.success }} />
        )}
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