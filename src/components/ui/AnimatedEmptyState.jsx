import React from 'react';

/**
 * Reusable empty state with fade-in + optional floating icon animation.
 */
export default function AnimatedEmptyState({
  icon: Icon,
  title,
  description,
  theme,
  className = '',
  children,
}) {
  return (
    <div className={`tpp-empty-state flex flex-col items-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div
          className="tpp-empty-state-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
        >
          <Icon size={32} style={{ color: theme?.textLight, opacity: 0.5 }} />
        </div>
      )}
      {title && (
        <p className="text-base font-semibold mb-1" style={{ color: theme?.text }}>
          {title}
        </p>
      )}
      {description && (
        <p className="text-sm max-w-xs" style={{ color: theme?.textLight }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
