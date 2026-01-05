import React, { useState, useEffect, useRef } from 'react';
import { hapticsLight } from '../../utils/haptics';

/**
 * StickyHeader Component - Header that sticks to top and collapses on scroll
 * 
 * Props:
 * - theme: object - theme configuration
 * - title: string - header title
 * - subtitle: string (optional) - subtitle text
 * - actions: ReactNode (optional) - action buttons/content
 * - collapseOnScroll: boolean (default: true) - whether to collapse on scroll
 * - minHeight: string (default: '60px') - minimum height when collapsed
 * - maxHeight: string (default: '120px') - maximum height when expanded
 * - backgroundColor: string (optional) - custom background color
 */
export default function StickyHeader({
  theme,
  title,
  subtitle,
  actions,
  collapseOnScroll = true,
  minHeight = '60px',
  maxHeight = '120px',
  backgroundColor
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const headerRef = useRef(null);
  const lastScrollY = useRef(0);
  const lastHapticTime = useRef(0);

  useEffect(() => {
    if (!collapseOnScroll) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Collapse threshold - collapse after scrolling down 50px
      const collapseThreshold = 50;
      const shouldCollapse = currentScrollY > collapseThreshold;

      // Only update if state actually changes
      if (shouldCollapse !== isCollapsed) {
        setIsCollapsed(shouldCollapse);
        
        // Haptic feedback on collapse/expand (throttle to once per 300ms)
        const now = Date.now();
        if (now - lastHapticTime.current > 300) {
          hapticsLight();
          lastHapticTime.current = now;
        }
      }

      lastScrollY.current = currentScrollY;
    };

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [collapseOnScroll, isCollapsed]);

  const bgColor = backgroundColor || theme?.cardBackground || '#FFFFFF';
  const headerHeight = isCollapsed ? minHeight : maxHeight;
  const titleOpacity = isCollapsed ? 0.7 : 1;
  const subtitleOpacity = isCollapsed ? 0 : 1;
  const subtitleHeight = isCollapsed ? 0 : 'auto';

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-[1000] transition-all duration-300 ease-out"
      style={{
        backgroundColor: bgColor,
        borderBottom: `1px solid ${theme?.border || 'rgba(0,0,0,0.1)'}`,
        height: headerHeight,
        boxShadow: isCollapsed 
          ? theme?.isDark 
            ? '0 2px 8px rgba(0,0,0,0.4)' 
            : '0 2px 8px rgba(0,0,0,0.1)'
          : 'none',
        willChange: 'height, box-shadow'
      }}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 
            className="text-xl sm:text-2xl font-bold truncate transition-all duration-300"
            style={{ 
              color: theme?.text || '#000',
              opacity: titleOpacity,
              fontSize: isCollapsed ? '1.125rem' : '1.5rem'
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p 
              className="text-sm mt-1 truncate transition-all duration-300 overflow-hidden"
              style={{ 
                color: theme?.textLight || '#666',
                opacity: subtitleOpacity,
                height: subtitleHeight,
                marginTop: isCollapsed ? 0 : '0.25rem'
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div 
            className="flex items-center gap-2 ml-4 transition-all duration-300"
            style={{
              transform: isCollapsed ? 'scale(0.9)' : 'scale(1)',
              opacity: isCollapsed ? 0.8 : 1
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * useStickyHeaderScroll Hook - Detect if page is scrolled for custom sticky header implementations
 * 
 * Usage:
 * const { isScrolled, scrollY, isScrollingDown } = useStickyHeaderScroll();
 */
export function useStickyHeaderScroll(threshold = 50) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setIsScrolled(currentScrollY > threshold);
      setIsScrollingDown(currentScrollY > lastScrollY.current);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { isScrolled, scrollY, isScrollingDown };
}




