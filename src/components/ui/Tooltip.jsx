import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const Tooltip = ({ 
  children, 
  content, 
  position = 'top', 
  delay = 500,
  disabled = false,
  className = '',
  theme 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    if (disabled || !content) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let top = 0;
    let left = 0;

    // Calculate position based on preferred position
    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + 8;
        break;
      default:
        top = triggerRect.top - tooltipRect.height - 8;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    }

    // Adjust for viewport boundaries
    if (left < 8) {
      left = 8;
    } else if (left + tooltipRect.width > viewport.width - 8) {
      left = viewport.width - tooltipRect.width - 8;
    }

    if (top < 8) {
      top = triggerRect.bottom + 8; // Flip to bottom if no space on top
    } else if (top + tooltipRect.height > viewport.height - 8) {
      top = triggerRect.top - tooltipRect.height - 8; // Flip to top if no space on bottom
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => hideTooltip();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipContent = isVisible && content && createPortal(
    <div
      ref={tooltipRef}
      className={`tooltip-overlay fixed px-2 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg pointer-events-none transition-opacity duration-200 ${className}`}
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        maxWidth: '200px',
        wordWrap: 'break-word',
        opacity: isVisible ? 1 : 0
      }}
    >
      {content}
      {/* Arrow - positioned based on tooltip position */}
      <div
        className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
        style={{
          top: position === 'bottom' ? '-4px' : position === 'top' ? '100%' : '50%',
          left: position === 'right' ? '-4px' : position === 'left' ? '100%' : '50%',
          marginTop: position === 'top' ? '-4px' : position === 'bottom' ? '-4px' : '-4px',
          marginLeft: position === 'left' ? '-4px' : position === 'right' ? '-4px' : '-4px',
          display: position === 'top' || position === 'bottom' ? 'block' : 'none'
        }}
      />
    </div>,
    document.body
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {tooltipContent}
    </>
  );
};

export default Tooltip;

