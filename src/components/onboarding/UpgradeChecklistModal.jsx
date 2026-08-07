import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Rocket, User } from '@phosphor-icons/react';
import { TRACKING_MODES } from '../../utils/trackingMode';

const ICON_SIZE = 44;
const SETTINGS_PREFERENCES_PATH = '/app/settings/preferences';

const COPY = {
  [TRACKING_MODES.ADVANCED]: {
    title: "You're in Advanced",
    body: 'More data — more insight to your research',
    Icon: Rocket,
    aria: "You're in Advanced",
  },
  [TRACKING_MODES.SIMPLE]: {
    title: "You're in Simple",
    body: 'Essentials up front — a cleaner setup for focused research',
    Icon: User,
    aria: "You're in Simple",
  },
};

/**
 * Bottom nudge after switching tracking mode (Settings / Switch to Advanced).
 * Same family as ModeNudgeToast / PageIntroModal — dismiss via X, outside tap, or Settings link.
 */
export default function UpgradeChecklistModal({ theme }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(TRACKING_MODES.ADVANCED);
  const [open, setOpen] = useState(false);
  const cardRef = useRef(null);

  const showFor = (nextMode) => {
    setMode(nextMode === TRACKING_MODES.SIMPLE ? TRACKING_MODES.SIMPLE : TRACKING_MODES.ADVANCED);
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e) => {
      const next = e?.detail?.trackingMode;
      const prev = e?.detail?.previousMode;
      const source = e?.detail?.source;
      // Only real user switches — not login hydrate / onboarding
      if (source === 'hydrate' || source === 'onboarding') return;
      if (!next || next === prev) return;
      if (next === TRACKING_MODES.ADVANCED || next === 'ADVANCED') {
        showFor(TRACKING_MODES.ADVANCED);
        return;
      }
      if (next === TRACKING_MODES.SIMPLE || next === 'SIMPLE' || next === 'simple') {
        showFor(TRACKING_MODES.SIMPLE);
      }
    };
    window.addEventListener('tpp:tracking-mode-changed', handler);
    return () => window.removeEventListener('tpp:tracking-mode-changed', handler);
  }, []);

  // Dev preview — force-open (detail.mode = 'simple' | 'advanced')
  useEffect(() => {
    const forceOpen = (e) => {
      const m = e?.detail?.mode === TRACKING_MODES.SIMPLE ? TRACKING_MODES.SIMPLE : TRACKING_MODES.ADVANCED;
      showFor(m);
    };
    window.addEventListener('tpp:show-upgrade-checklist', forceOpen);
    return () => window.removeEventListener('tpp:show-upgrade-checklist', forceOpen);
  }, []);

  const handleDismiss = () => setOpen(false);

  const goToSettings = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    navigate(SETTINGS_PREFERENCES_PATH);
  };

  // Bottom nav tap clears the nudge so it doesn't sit over the bar
  useEffect(() => {
    if (!open) return undefined;
    const onNav = () => setOpen(false);
    window.addEventListener('tpp:bottom-nav-click', onNav);
    return () => window.removeEventListener('tpp:bottom-nav-click', onNav);
  }, [open]);

  // Tap / click outside the nudge card dismisses it
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  if (!open) return null;

  const copy = COPY[mode] || COPY[TRACKING_MODES.ADVANCED];
  const { title, body, Icon, aria } = copy;
  const primary = theme?.primary || '#7F9E95';
  const bg = theme?.isDark ? 'rgba(20,25,33,0.96)' : '#ffffff';
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const border = theme?.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      className="fixed left-3 right-3 z-[10050] max-w-lg mx-auto pointer-events-none"
      style={{ bottom: 'calc(5.5rem + var(--safe-area-bottom, 0px))' }}
      role="status"
      aria-live="polite"
      aria-label={aria}
    >
      <div
        ref={cardRef}
        className="pointer-events-auto rounded-2xl shadow-2xl border p-4"
        style={{ backgroundColor: bg, borderColor: border }}
      >
        <div className="flex gap-3 items-start">
          <Icon
            className="flex-shrink-0 self-center"
            size={ICON_SIZE}
            weight="duotone"
            style={{ color: primary }}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold leading-snug" style={{ color: text }}>
              {title}
            </p>
            <p className="text-xs leading-snug mt-1" style={{ color: muted }}>
              {body}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 opacity-50 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" style={{ color: text }} />
          </button>
        </div>
        <button
          type="button"
          onClick={goToSettings}
          className="mt-3 pl-[56px] text-[11px] font-medium underline-offset-2 hover:underline transition-opacity hover:opacity-80"
          style={{ color: muted }}
        >
          Change Mode in Settings
        </button>
      </div>
    </div>
  );
}
