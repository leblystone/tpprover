import React from 'react';
import { Star } from 'lucide-react';

const SAGE = '#7F9E95';
const EMPTY = '#DDE6DE';

/**
 * Sage-themed star rating. `interactive` enables click-to-rate (admin).
 */
export default function StarRating({
  value = 5,
  onChange,
  size = 18,
  interactive = false,
  className = '',
}) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${value} out of 5 stars`}
    >
      {stars.map((n) => {
        const filled = n <= Math.round(value);
        const El = interactive ? 'button' : 'span';
        return (
          <El
            key={n}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange?.(n) : undefined}
            className={`p-0.5 rounded transition-transform duration-200 ${
              interactive ? 'hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1' : ''
            }`}
            style={interactive ? { focusVisibleRingColor: SAGE } : undefined}
            aria-label={interactive ? `${n} stars` : undefined}
          >
            <Star
              size={size}
              strokeWidth={1.75}
              className="transition-all duration-300"
              style={{
                color: filled ? SAGE : EMPTY,
                fill: filled ? SAGE : 'transparent',
                filter: filled ? 'drop-shadow(0 1px 2px rgba(127,158,149,0.35))' : 'none',
              }}
            />
          </El>
        );
      })}
    </div>
  );
}
