/**
 * Inline quantity stepper: [−  2  +]
 * Appears on product cards/detail when the item is already in the cart.
 */
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { themes, defaultThemeName } from '../../theme/themes';

const theme = themes[defaultThemeName];

const KEYFRAMES = `
@keyframes qtyNumPop {
  0%   { transform: scale(0.7); opacity: 0.4; }
  60%  { transform: scale(1.25); }
  100% { transform: scale(1);   opacity: 1; }
}
.qty-num-pop {
  animation: qtyNumPop 0.22s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
`;

/**
 * @param {number}   qty        Current quantity in cart
 * @param {function} onInc      Called when + pressed
 * @param {function} onDec      Called when − pressed (caller handles removal at 0)
 * @param {boolean}  [compact]  Smaller variant for grid cards
 */
export default function QtyPicker({ qty, onInc, onDec, compact = false }) {
  const h = compact ? 'h-[38px]' : 'h-[42px]';
  const btnW = compact ? 'w-9' : 'w-11';
  const numW = compact ? 'w-8' : 'w-10';
  const fontSize = compact ? 'text-[11px]' : 'text-sm';

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        className={`flex items-center ${h} w-full overflow-hidden rounded-lg`}
        style={{
          backgroundColor: theme.primary,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        {/* − */}
        <button
          onClick={onDec}
          aria-label="Remove one"
          className={`${btnW} ${h} flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-75 active:opacity-50`}
          style={{ color: '#fff' }}
        >
          <Minus className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={3} />
        </button>

        {/* qty number */}
        <span
          key={qty}
          className={`qty-num-pop flex-1 text-center ${fontSize} font-bold text-white select-none`}
        >
          {qty}
        </span>

        {/* + */}
        <button
          onClick={onInc}
          aria-label="Add one more"
          className={`${btnW} ${h} flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-75 active:opacity-50`}
          style={{ color: '#fff' }}
        >
          <Plus className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={3} />
        </button>
      </div>
    </>
  );
}
