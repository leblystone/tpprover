import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modern Gmail-style tooltip component
 * Simple, clean, and consistent with modern UI patterns
 */
const ModernTooltip = ({ 
  children, 
  text, 
  position = 'top',
  disabled = false,
  theme = null,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  if (disabled || !text) {
    return children;
  }

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

  const showTooltip = () => {
    setIsVisible(true);
    updatePosition();
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  // Global tooltip hiding when modals open or user clicks elsewhere
  useEffect(() => {
    const handleGlobalClick = (event) => {
      // Hide tooltip if user clicks anywhere (except on the tooltip itself)
      if (isVisible && !event.target.closest('.tooltip-overlay')) {
        setIsVisible(false);
      }
    };

    const handleModalOpen = () => {
      // Hide tooltip when any modal opens
      if (isVisible) {
        setIsVisible(false);
      }
    };

    const handleMouseDown = () => {
      // Hide tooltip on any mouse down (more aggressive)
      if (isVisible) {
        setIsVisible(false);
      }
    };

    // Listen for modal open events and clicks
    window.addEventListener('tpp:modal-open', handleModalOpen);
    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    
    return () => {
      window.removeEventListener('tpp:modal-open', handleModalOpen);
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [isVisible]);

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

  // Prefer theme primaryDark (darker brand accent) — never hardcode sage
  const tooltipBg = theme?.primaryDark || theme?.primary || '#374151';
  const tooltipFg = theme?.textOnPrimary || '#FFFFFF';

  const tooltipContent = isVisible && createPortal(
    <div
      ref={tooltipRef}
      className="tooltip-overlay fixed px-3 py-2 text-xs font-medium rounded-lg shadow-xl pointer-events-none transition-opacity duration-200 whitespace-nowrap"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        maxWidth: '250px',
        zIndex: 2147483647,
        backgroundColor: tooltipBg,
        color: tooltipFg,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {text}
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

export default ModernTooltip;
