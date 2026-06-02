import React from 'react';

/**
 * Animated count badge — remounts on count change to replay pop animation.
 * @param {number} count
 * @param {string} className - positioning classes (absolute -top-1 etc.)
 * @param {object} style - extra inline styles
 * @param {boolean} pulse - gentle pulse ring (for unread indicators)
 */
export default function BadgeBump({ count, className = '', style = {}, pulse = false, max = 9 }) {
  if (!count || count <= 0) return null;
  const label = count > max ? `${max}+` : count;
  return (
    <span
      key={count}
      className={`tpp-badge-pop inline-flex items-center justify-center rounded-full text-[10px] font-bold ${pulse ? 'tpp-badge-pulse' : ''} ${className}`}
      style={{ minWidth: 18, height: 18, paddingLeft: 4, paddingRight: 4, lineHeight: 1, ...style }}
    >
      {label}
    </span>
  );
}
