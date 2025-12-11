import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

const ExpandableTooltip = ({ content, theme, position = 'left' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tooltipRef = useRef(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isExpanded]);

  if (!content) return null;

  return (
    <div className="relative" ref={tooltipRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="p-1 rounded-full transition-all hover:opacity-80 focus:outline-none"
        style={{ 
          color: theme.textLight,
          backgroundColor: isExpanded ? (theme.isDark ? '#374151' : theme.secondary) : 'transparent'
        }}
        aria-label="Show help"
      >
        <HelpCircle size={16} />
      </button>

      {isExpanded && (
        <div
          className="absolute z-50 mt-2 p-3 rounded-lg shadow-lg"
          style={{
            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
            border: `1px solid ${theme.isDark ? '#374151' : theme.border}`,
            color: theme.text,
            right: 0, // Always open to the left (right: 0 means align to right edge of button)
            minWidth: '200px',
            maxWidth: 'min(280px, calc(100vw - 2rem))', // Responsive: use smaller of 280px or viewport width minus padding
            transform: 'translateX(0)' // Ensure it doesn't go off screen
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <HelpCircle size={14} style={{ color: theme.primary }} />
              <span className="text-xs font-semibold" style={{ color: theme.text }}>
                About this widget
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              className="p-0.5 rounded hover:opacity-70 transition-opacity"
              style={{ color: theme.textLight }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
          <div 
            className="text-xs leading-relaxed"
            style={{ color: theme.textLight }}
          >
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableTooltip;

