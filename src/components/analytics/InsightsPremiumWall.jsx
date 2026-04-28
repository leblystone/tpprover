import React from 'react';
import { Lock } from 'lucide-react';

/**
 * Research+ paywall for Insights analytics — full tab takeover or trailing carousel slide.
 *
 * @param {'full' | 'card'} variant — full = standalone section; card = last slide in carousel (compact)
 * @param {string} sectionTitle — human-readable section name (e.g. "Inventory Analytics")
 * @param {string[]} featureBullets — optional bullets explaining what's unlocked with Research+
 * @param {function} onUpgrade — navigate or open subscription modal
 */
export default function InsightsPremiumWall({
  variant = 'full',
  theme,
  borderColor,
  sectionTitle = 'Advanced analytics',
  featureBullets = [],
  onUpgrade,
}) {
  const border = borderColor || (theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');

  const body = (
    <>
      <div
        className={variant === 'full' ? 'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto' : 'w-10 h-10 rounded-xl flex items-center justify-center mx-auto shrink-0'}
        style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
      >
        <Lock size={variant === 'full' ? 26 : 20} style={{ color: theme?.primary }} />
      </div>
      <div className={variant === 'full' ? 'text-center space-y-2 max-w-md mx-auto' : 'text-center space-y-1.5'}>
        <p className={`font-semibold ${variant === 'full' ? 'text-base' : 'text-sm'}`} style={{ color: theme?.text }}>
          {sectionTitle} is Research+
        </p>
        <p className={`leading-relaxed ${variant === 'full' ? 'text-sm max-w-sm mx-auto' : 'text-xs'}`} style={{ color: theme?.textLight }}>
          Unlock deeper analytics, breakdowns, and trends tied to your research data.
        </p>
        {featureBullets.length > 0 && (
          <ul className={`text-left space-y-1.5 ${variant === 'full' ? 'max-w-xs mx-auto' : 'max-w-[260px] mx-auto'} pt-1`}>
            {featureBullets.map((f, i) => (
              <li key={i} className={`flex items-start gap-2 ${variant === 'full' ? 'text-sm' : 'text-[11px]'}`} style={{ color: theme?.textLight }}>
                <span className="mt-0.5 shrink-0 text-base leading-none" style={{ color: theme?.primary }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
      {typeof onUpgrade === 'function' && (
        <button
          type="button"
          onClick={onUpgrade}
          className={`w-full rounded-xl font-semibold active:scale-95 transition-all ${variant === 'full' ? 'py-3 text-sm max-w-xs mx-auto' : 'py-2.5 text-xs'}`}
          style={{ backgroundColor: theme?.primary, color: '#fff' }}
        >
          Upgrade to Research+
        </button>
      )}
    </>
  );

  if (variant === 'card') {
    return (
      <div
        className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]"
        style={{
          border: `1px solid ${border}`,
          background: theme?.isDark
            ? 'linear-gradient(135deg, rgba(127,158,149,0.08) 0%, rgba(127,158,149,0.03) 100%)'
            : 'linear-gradient(135deg, rgba(127,158,149,0.1) 0%, rgba(127,158,149,0.04) 100%)',
        }}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center justify-center gap-4 text-center"
      style={{
        border: `1px solid ${border}`,
        background: theme?.isDark
          ? 'linear-gradient(135deg, rgba(127,158,149,0.1) 0%, rgba(127,158,149,0.04) 100%)'
          : 'linear-gradient(135deg, rgba(127,158,149,0.12) 0%, rgba(127,158,149,0.05) 100%)',
      }}
    >
      {body}
    </div>
  );
}
