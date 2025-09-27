import React from 'react';

/**
 * Modern Gmail-style tooltip component
 * Simple, clean, and consistent with modern UI patterns
 */
const ModernTooltip = ({ 
  children, 
  text, 
  position = 'top',
  disabled = false 
}) => {
  if (disabled || !text) {
    return children;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`tooltip-overlay absolute ${positionClasses[position]} px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out pointer-events-none whitespace-nowrap z-[2147483646]`}
        style={{ 
          maxWidth: '250px',
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
        }}
      >
        {text}
        {/* Arrow */}
        <div
          className={`absolute ${arrowClasses[position]} w-0 h-0 border-[5px]`}
        />
      </div>
    </div>
  );
};

export default ModernTooltip;
