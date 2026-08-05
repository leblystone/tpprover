import React from 'react';
import { ChevronLeft } from 'lucide-react';

/**
 * Subtle back control for onboarding screens.
 */
export default function OnboardingBackButton({ onClick, theme, label = 'Back' }) {
  if (!onClick) return null;
  const muted = theme?.isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-100 active:scale-95 relative z-0"
      style={{ color: muted, opacity: 0.8 }}
      onMouseEnter={e => { e.currentTarget.style.color = theme?.text || (theme?.isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)'); e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={e => { e.currentTarget.style.color = muted; e.currentTarget.style.opacity = '0.8'; }}
      aria-label={label}
    >
      <ChevronLeft className="w-4 h-4" strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
