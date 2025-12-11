import React, { useState, useRef, useEffect } from 'react';
import { 
  HelpCircle, 
  X, 
  CheckSquare, 
  CheckCircle,
  Zap, 
  Truck, 
  ShoppingCart, 
  BookOpen, 
  BookAlert,
  Package, 
  DollarSign, 
  Pill, 
  Droplets, 
  FlaskConical, 
  Lightbulb, 
  Heart, 
  BarChart3, 
  Award, 
  Target, 
  Activity, 
  Pipette, 
  FileText 
} from 'lucide-react';

// Icon mapping for tooltip bullets - matches widget header icons
const ICON_MAP = {
  'CheckSquare': CheckSquare,
  'CheckCircle': CheckCircle,
  'Zap': Zap,
  'Truck': Truck,
  'ShoppingCart': ShoppingCart,
  'BookOpen': BookOpen,
  'BookAlert': BookAlert,
  'Package': Package,
  'DollarSign': DollarSign,
  'Pill': Pill,
  'Droplets': Droplets,
  'FlaskConical': FlaskConical,
  'Lightbulb': Lightbulb,
  'Heart': Heart,
  'BarChart3': BarChart3,
  'Award': Award,
  'Target': Target,
  'Activity': Activity,
  'Pipette': Pipette,
  'FileText': FileText,
};

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
          className="absolute z-50 p-2.5 rounded-lg shadow-lg"
          style={{
            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
            border: `1px solid ${theme.isDark ? '#374151' : theme.border}`,
            color: theme.text,
            right: '100%', // Position to the left of the button
            top: 0,
            marginRight: '8px', // Small gap from button
            minWidth: '200px',
            maxWidth: 'min(280px, calc(100vw - 2rem))',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
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
            className="text-xs leading-tight"
            style={{ color: theme.textLight, wordWrap: 'break-word', overflowWrap: 'break-word' }}
          >
            {content.split('\n').map((line, index) => {
              if (!line.trim()) return null;
              
              // Check if line starts with [IconName] format
              const iconMatch = line.match(/^\[([^\]]+)\]\s*(.+)$/);
              
              if (iconMatch) {
                const [, iconName, text] = iconMatch;
                const IconComponent = ICON_MAP[iconName];
                
                return (
                  <div key={index} className="flex items-start gap-1.5 mb-1">
                    {IconComponent && (
                      <IconComponent 
                        size={13} 
                        className="flex-shrink-0 mt-0.5" 
                        style={{ color: theme.primary }} 
                      />
                    )}
                    <span className="break-words" style={{ wordBreak: 'break-word' }}>{text.trim()}</span>
                  </div>
                );
              }
              
              // Regular line without icon
              return (
                <div key={index} className="mb-1 break-words" style={{ wordBreak: 'break-word' }}>
                  {line.trim()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpandableTooltip;

