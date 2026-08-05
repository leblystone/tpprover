import React from 'react';
import { X } from 'lucide-react';
import { Lightbulb } from '@phosphor-icons/react';

const ICON_SIZE = 40;

/**
 * First-view page tip — lightweight bottom nudge (same family as ModeNudgeToast).
 * No backdrop, no bullet wall — title + one short line + dismiss.
 */
export default function PageIntroModal({ intro, onDismiss, theme }) {
  if (!intro) return null;
  const { title, body } = intro;

  const primary = theme?.primary || '#7F9E95';
  const bg = theme?.isDark ? 'rgba(20,25,33,0.96)' : '#ffffff';
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const border = theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      className="fixed left-3 right-3 z-[9998] max-w-md mx-auto pointer-events-none"
      style={{ bottom: 'calc(5.5rem + var(--safe-area-bottom, 0px))' }}
      role="status"
      aria-live="polite"
      aria-label={title}
    >
      <div
        className="pointer-events-auto rounded-2xl shadow-2xl border p-3.5 flex gap-3 items-start"
        style={{ backgroundColor: bg, borderColor: border }}
      >
        <Lightbulb
          className="flex-shrink-0 self-center"
          size={ICON_SIZE}
          weight="duotone"
          style={{ color: primary }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug" style={{ color: text }}>
            {title}
          </p>
          {body && (
            <p className="text-xs leading-snug mt-1" style={{ color: muted }}>
              {body}
            </p>
          )}
          <div className="mt-2.5">
            <button
              type="button"
              onClick={onDismiss}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-70"
              style={{ color: muted, background: 'transparent', border: 'none' }}
            >
              Got it
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 opacity-50 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" style={{ color: text }} />
        </button>
      </div>
    </div>
  );
}
