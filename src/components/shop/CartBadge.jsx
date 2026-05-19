/**
 * Animated cart count badge.
 * Uses key={count} so React remounts on every change, replaying the pop keyframe.
 */
import React from 'react';
import { themes, defaultThemeName } from '../../theme/themes';

const theme = themes[defaultThemeName];

const KEYFRAMES = `
@keyframes cartBadgePop {
  0%   { transform: scale(0.5); opacity: 0.6; }
  55%  { transform: scale(1.45); opacity: 1; }
  75%  { transform: scale(0.88); }
  100% { transform: scale(1);    opacity: 1; }
}
.cart-badge-pop {
  animation: cartBadgePop 0.38s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
`;

export default function CartBadge({ count, className = '' }) {
  if (!count || count <= 0) return null;
  return (
    <>
      <style>{KEYFRAMES}</style>
      <span
        key={count}
        className={`cart-badge-pop flex items-center justify-center rounded-full text-[10px] font-bold text-white ${className}`}
        style={{ backgroundColor: theme.primary, minWidth: 18, height: 18, paddingLeft: 4, paddingRight: 4 }}
      >
        {count}
      </span>
    </>
  );
}
