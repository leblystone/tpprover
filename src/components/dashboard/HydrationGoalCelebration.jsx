import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Drop, Fire } from '@phosphor-icons/react';
import { hapticsSuccess } from '../../utils/haptics';

/**
 * Popup modal when the daily hydration goal is reached.
 * Listens for:
 * - `tpp:hydration-goal-complete` — first time today (detail `{ streak }`)
 * - `tpp:show-hydration-celebration` — reopen from streak chip (detail `{ streak }`)
 */
export default function HydrationGoalCelebration({ theme }) {
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [showKey, setShowKey] = useState(0);

  useEffect(() => {
    const show = (e, { haptic = true } = {}) => {
      const n = e.detail?.streak;
      setStreak(typeof n === 'number' ? n : 0);
      setOpen(true);
      setAnimate(false);
      setShowKey((k) => k + 1);
      if (haptic) hapticsSuccess();
      requestAnimationFrame(() => setAnimate(true));
    };
    const onComplete = (e) => show(e, { haptic: true });
    const onReplay = (e) => show(e, { haptic: false });
    window.addEventListener('tpp:hydration-goal-complete', onComplete);
    window.addEventListener('tpp:show-hydration-celebration', onReplay);
    return () => {
      window.removeEventListener('tpp:hydration-goal-complete', onComplete);
      window.removeEventListener('tpp:show-hydration-celebration', onReplay);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      setAnimate(false);
      setTimeout(() => setOpen(false), 380);
    }, 6500);
    return () => clearTimeout(t);
  }, [open, showKey]);

  const dismiss = () => {
    setAnimate(false);
    setTimeout(() => setOpen(false), 380);
  };

  if (!open) return null;

  const accent = '#0EA5E9';
  const primary = theme?.primary || accent;
  const isDark = theme?.isDark;
  const isFirst = streak <= 1;
  const title = isFirst ? 'Hydration goal complete!' : 'Hydration goal crushed!';
  const subtitle = isFirst
    ? 'Come back tomorrow to start a streak.'
    : `${streak} days in a row — keep it flowing.`;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="dialog"
      aria-label="Hydration goal reached"
      onClick={dismiss}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-out ${animate ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15, 23, 42, 0.28)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div
        className={`relative max-w-sm w-full rounded-2xl border overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: isDark ? 'rgba(15,23,42,0.94)' : theme?.cardBackground || '#fff',
          borderColor: `${accent}55`,
          boxShadow: `0 0 0 1px ${accent}22, 0 25px 50px -12px rgba(0,0,0,0.35)`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
          style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.6s ease' }}
        >
          <div
            className="absolute inset-y-0 w-1/3 blur-2xl"
            style={{
              background: `linear-gradient(105deg, transparent, ${accent}40, transparent)`,
              animation: 'hydrationGoalShine 1.2s ease-out 0.15s forwards',
            }}
          />
        </div>

        {/* Soft water-tint header band */}
        <div
          className="relative px-6 pt-8 pb-2 text-center"
          style={{
            background: isDark
              ? `linear-gradient(180deg, ${accent}22 0%, transparent 100%)`
              : `linear-gradient(180deg, ${accent}14 0%, transparent 100%)`,
          }}
        >
          <div className="flex justify-center mb-4">
            <div
              className={`relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
              style={{ transitionDelay: '60ms' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center hydration-goal-drop"
                style={{
                  background: `linear-gradient(145deg, ${accent}, #0284C7)`,
                  boxShadow: `0 8px 24px ${accent}55`,
                }}
              >
                <Drop size={34} weight="fill" color="#FFFFFF" />
              </div>
              <span
                className="hydration-goal-ring absolute inset-0 rounded-full"
                style={{ borderColor: accent }}
              />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: accent }}>
            Goal reached
          </p>
          <h3 className="text-lg font-bold mb-1" style={{ color: theme?.text }}>
            {title}
          </h3>
          <p className="text-sm mb-5" style={{ color: theme?.textLight || theme?.text }}>
            {subtitle}
          </p>
        </div>

        <div className="relative px-6 pb-7 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5"
            style={{
              borderColor: `${primary}40`,
              backgroundColor: isDark ? `${primary}14` : `${primary}10`,
            }}
          >
            <Fire size={20} weight="fill" className="hydration-goal-flame" style={{ color: primary }} />
            <span className="text-2xl font-black tabular-nums" style={{ color: theme?.text }}>
              {streak}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
              {streak === 1 ? 'day' : 'day streak'}
            </span>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: accent,
              color: '#FFFFFF',
              boxShadow: `0 4px 14px ${accent}44`,
            }}
          >
            Stay Hydrated!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes hydrationGoalShine {
          0% { transform: translateX(-120%); opacity: 0; }
          30% { opacity: 0.9; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        .hydration-goal-drop {
          animation: hydrationGoalDrop 0.7s ease-out 0.1s both;
        }
        @keyframes hydrationGoalDrop {
          0% { transform: scale(0.5) translateY(-12px); opacity: 0; }
          60% { transform: scale(1.12) translateY(2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .hydration-goal-ring {
          border: 2px solid;
          animation: hydrationGoalRing 0.9s ease-out 0.2s both;
          pointer-events: none;
        }
        @keyframes hydrationGoalRing {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        .hydration-goal-flame {
          animation: hydrationGoalFlame 0.9s ease-out 0.25s both;
        }
        @keyframes hydrationGoalFlame {
          0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
