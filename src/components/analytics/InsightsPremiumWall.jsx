import React from 'react';
import { Lock } from 'lucide-react';
import { Sparkle } from '@phosphor-icons/react';

/**
 * Research+ paywall for Insights analytics — full tab takeover or trailing carousel slide.
 *
 * @param {'full' | 'card'} variant — full = standalone section; card = last slide in carousel (compact)
 * @param {string} sectionTitle — human-readable section name (e.g. "Inventory Analytics")
 * @param {string[]} featureBullets — optional bullets explaining what's unlocked with Research+
 * @param {function} onUpgrade — navigate or open subscription modal
 * @param {boolean} trialMode — true for trial users: renders a gold badge banner instead of full lockout
 */
export function ResearchPlusTrialBanner({ theme, sectionTitle }) {
  return (
    <>
      <style>{`
        .rp-ins-glisten {
          position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 47%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.55) 53%, transparent 70%);
          transform: translateX(-160%);
          animation: rpInsGlisten 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes rpInsGlisten {
          0%   { transform: translateX(-160%); opacity: 0; }
          8%   { opacity: 1; }
          38%  { transform: translateX(160%);  opacity: 1; }
          40%  { opacity: 0; }
          100% { transform: translateX(160%);  opacity: 0; }
        }
      `}</style>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #C8912A 0%, #E8C55A 35%, #F5D97A 50%, #E8C55A 65%, #B8822A 100%)',
            color: '#3A2B10',
            border: '1px solid rgba(255,220,120,0.6)',
            boxShadow: '0 1px 4px rgba(184,138,62,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            isolation: 'isolate',
          }}
        >
          <span className="rp-ins-glisten" aria-hidden="true" />
          <Sparkle size={9} weight="fill" style={{ position: 'relative', zIndex: 1 }} />
          <span style={{ position: 'relative', zIndex: 1 }}>Research+</span>
        </span>
        <span className="text-[11px] font-medium opacity-50" style={{ color: theme?.text }}>
          {sectionTitle} — included in your trial
        </span>
      </div>
    </>
  );
}

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
        className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center min-h-[200px] h-full"
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
