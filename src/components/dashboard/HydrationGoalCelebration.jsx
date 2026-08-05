import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Drop, Fire } from '@phosphor-icons/react';
import { hapticsSuccess } from '../../utils/haptics';
import hydrationGoalsImg from '../../assets/hydration_goals.png';

/**
 * Popup modal when the daily hydration goal is reached.
 * Listens for:
 * - `tpp:hydration-goal-complete` — first time today (detail `{ streak }`)
 * - `tpp:show-hydration-celebration` — reopen from streak chip (detail `{ streak }`)
 */
export default function HydrationGoalCelebration({ theme }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [showKey, setShowKey] = useState(0);
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    const show = (e, { haptic = true } = {}) => {
      const n = e.detail?.streak;
      setStreak(typeof n === 'number' ? n : 0);
      setDevPreview(Boolean(e.detail?.devPreview));
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
    if (!open || devPreview) return undefined;
    const t = setTimeout(() => {
      setAnimate(false);
      setTimeout(() => setOpen(false), 380);
    }, 6500);
    return () => clearTimeout(t);
  }, [open, showKey, devPreview]);

  const dismiss = () => {
    setAnimate(false);
    setTimeout(() => {
      setOpen(false);
      setDevPreview(false);
    }, 380);
  };

  if (!open) return null;

  const accent = '#0EA5E9';
  const primary = theme?.primary || accent;
  const isDark = theme?.isDark;
  const title = 'Hydration goal crushed!';
  const subtitle = streak > 1
    ? `You hit your ${streak}-day hydration goal — time to set the next one.`
    : 'You hit your hydration goal — time to set the next one.';

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
          className="relative px-6 pt-6 pb-2 text-center"
          style={{
            background: isDark
              ? `linear-gradient(180deg, ${accent}22 0%, transparent 100%)`
              : `linear-gradient(180deg, ${accent}14 0%, transparent 100%)`,
          }}
        >
          <div className="flex justify-center mb-3">
            <div
              className={`relative transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                animate ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
              style={{ transitionDelay: '60ms' }}
            >
              <img
                src={hydrationGoalsImg}
                alt=""
                className="w-[148px] h-auto max-h-[160px] object-contain select-none pointer-events-none drop-shadow-sm"
                draggable={false}
              />
              <span
                className="hydration-goal-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                style={{ borderColor: accent }}
                aria-hidden
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Drop size={14} weight="fill" style={{ color: accent }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
              Goal reached
            </p>
          </div>
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
            <Drop size={20} weight="fill" className="hydration-goal-flame" style={{ color: accent }} />
            <span className="text-2xl font-black tabular-nums" style={{ color: theme?.text }}>
              {streak}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
              {streak === 1 ? 'day goal' : 'day goal'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => { dismiss(); navigate('/goals'); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: accent,
              color: '#FFFFFF',
              boxShadow: `0 4px 14px ${accent}44`,
            }}
          >
            Go set a new goal!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes hydrationGoalShine {
          0% { transform: translateX(-120%); opacity: 0; }
          30% { opacity: 0.9; }
          100% { transform: translateX(220%); opacity: 0; }
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
