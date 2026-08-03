import React from 'react';
import logo from '../../assets/tpp_logo.png';

/**
 * Brand mark for onboarding screens.
 * - pinned (default): sits above the home indicator
 * - inline: flows with content (higher in the layout)
 */
export default function OnboardingLogoFooter({
  className = '',
  size = 'md',
  pinned = true,
}) {
  const sizeClass = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';

  const mark = (
    <img
      src={logo}
      alt="The Pep Planner"
      className={`${sizeClass} object-contain`}
      draggable={false}
      style={{ filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.18))' }}
    />
  );

  if (!pinned) {
    return (
      <div className={`pointer-events-none flex items-center justify-center ${className}`}>
        {mark}
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none flex items-end justify-center pb-3 ${className}`}
      style={{
        height: 'calc(5.25rem + var(--safe-area-bottom, 0px))',
        paddingBottom: 'calc(1.25rem + var(--safe-area-bottom, 0px))',
      }}
    >
      {mark}
    </div>
  );
}
