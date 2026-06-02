/**
 * Animated cart count badge — uses shared tpp-badge-pop from micro-animations.css
 */
import React from 'react';
import { themes, defaultThemeName } from '../../theme/themes';
import BadgeBump from '../ui/BadgeBump';

const theme = themes[defaultThemeName];

export default function CartBadge({ count, className = '' }) {
  return (
    <BadgeBump
      count={count}
      className={`text-white ${className}`}
      style={{ backgroundColor: theme.primary }}
    />
  );
}
