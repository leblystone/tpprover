import React from 'react';
import { Save, Clock, Trash2 } from 'lucide-react';
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
          <ModernTooltip text="Saving..." position="bottom">
            <Clock size={16} className="animate-spin" style={{ color: theme.primary }} />
          </ModernTooltip>
        ) : (
          <ModernTooltip text={`Auto-saved ${formatTime(lastSaved)}`} position="bottom">
            <Save size={16} style={{ color: theme.success }} />
          </ModernTooltip>
        )}
        
        {onClearForm && (
          <ModernTooltip text="Clear form" position="bottom">
            <button
              onClick={onClearForm}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              style={{ color: theme.textLight }}
            >
              <Trash2 size={14} />
            </button>
          </ModernTooltip>
        )}
      </div>
    );
  }

  // Subtle version - very light and unobtrusive
  return (
    <div className="text-xs flex items-center gap-2 opacity-60" style={{ color: theme.textLight }}>
      {isSaving ? (
        <>
          <Clock size={12} className="animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <Save size={12} />
          <span>Saved {formatTime(lastSaved)}</span>
        </>
      )}
      
      {onClearForm && (
        <button
          onClick={onClearForm}
          className="ml-2 p-0.5 opacity-40 hover:opacity-80 transition-opacity"
          style={{ color: theme.textLight }}
          title="Clear form"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
};

export default AutoSaveIndicator;