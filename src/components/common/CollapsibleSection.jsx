import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function CollapsibleSection({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  theme, 
  defaultExpanded = false,
  className = ""
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`rounded-lg border content-card shadow-sm ${className}`} style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-opacity-5 transition-colors"
        style={{ 
          backgroundColor: isExpanded ? 'rgba(0,0,0,0.02)' : 'transparent',
          borderBottom: isExpanded ? `1px solid ${theme.border}` : 'none'
        }}
      >
        <div className="flex items-center gap-3 text-left">
          {Icon && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
              <Icon size={16} style={{ color: theme.primary }} />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-3">
          {isExpanded ? (
            <ChevronDown size={20} style={{ color: theme.textLight }} />
          ) : (
            <ChevronRight size={20} style={{ color: theme.textLight }} />
          )}
        </div>
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}
