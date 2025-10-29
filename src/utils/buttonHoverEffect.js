/**
 * Utility functions for consistent button hover effects across the app
 */

export const getButtonHoverHandlers = (theme, customBg = null) => {
  const defaultBg = customBg || (theme.isDark ? '#1f2937' : theme.secondary);
  const hoverBg = theme.isDark ? '#374151' : (theme.primary + '15');
  
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = hoverBg;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = defaultBg;
    }
  };
};

export const getPrimaryButtonHoverHandlers = (theme) => {
  const defaultBg = theme.primary;
  const hoverBg = theme.isDark ? theme.primary + 'dd' : theme.primary + 'cc';
  
  return {
    onMouseEnter: (e) => {
      e.currentTarget.style.backgroundColor = hoverBg;
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.backgroundColor = defaultBg;
    }
  };
};

