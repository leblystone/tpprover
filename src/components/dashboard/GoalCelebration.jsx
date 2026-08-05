import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { hapticsSuccess } from '../../utils/haptics';
import { getGoalCelebrationMeta } from '../../utils/goalCelebrationMeta';

/**
 * Shared celebration when a Goals-page goal is completed (auto or manual).
 * Hydration streak goals use HydrationGoalCelebration instead.
 *
 * Listens for:
 * - `tpp:goal-complete` — completion (detail: linkedType, linkedTarget, text, goalId)
 * - `tpp:show-goal-celebration` — reopen / preview (same detail shape)
 */
export default function GoalCelebration({ theme }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [animate, setAnimate] = useState(false);
  const [showKey, setShowKey] = useState(0);
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    const show = (e, { haptic = true } = {}) => {
      const d = e.detail || {};
      // Hydration has its own modal
      if (d.linkedType === 'hydrationStreak') return;
      setDetail(d);
      setDevPreview(Boolean(d.devPreview));
      setOpen(true);
      setAnimate(false);
      setShowKey((k) => k + 1);
      if (haptic) hapticsSuccess();
      requestAnimationFrame(() => setAnimate(true));
    };
    const onComplete = (e) => show(e, { haptic: true });
    const onReplay = (e) => show(e, { haptic: false });
    window.addEventListener('tpp:goal-complete', onComplete);
    window.addEventListener('tpp:show-goal-celebration', onReplay);
    return () => {
      window.removeEventListener('tpp:goal-complete', onComplete);
      window.removeEventListener('tpp:show-goal-celebration', onReplay);
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

  if (!open || !detail) return null;

  const meta = getGoalCelebrationMeta(detail);
  const { accent, Icon, image, eyebrow, title, subtitle, pillValue, pillLabel } = meta;
  const primary = theme?.primary || accent;
  const isDark = theme?.isDark;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="dialog"
      aria-label="Goal complete"
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
              animation: 'goalCelebrationShine 1.2s ease-out 0.15s forwards',
            }}
          />
        </div>

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
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="w-[148px] h-auto max-h-[160px] object-contain select-none pointer-events-none drop-shadow-sm goal-celebration-icon-bg"
                  draggable={false}
                />
              ) : (
                <div
                  className="w-[100px] h-[100px] rounded-full flex items-center justify-center goal-celebration-icon-bg"
                  style={{ backgroundColor: isDark ? `${accent}22` : `${accent}18` }}
                >
                  <Icon size={48} weight="duotone" className="goal-celebration-icon" style={{ color: accent }} />
                </div>
              )}
              <span
                className="goal-celebration-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                style={{ borderColor: accent }}
                aria-hidden
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Icon size={14} weight="fill" style={{ color: accent }} />
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {eyebrow}
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
          {meta.key !== 'manual' && (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5"
              style={{
                borderColor: `${primary}40`,
                backgroundColor: isDark ? `${primary}14` : `${primary}10`,
              }}
            >
              <Icon size={20} weight="fill" className="goal-celebration-pill-icon" style={{ color: accent }} />
              <span className="text-2xl font-black tabular-nums" style={{ color: theme?.text }}>
                {pillValue}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
                {pillLabel}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => { dismiss(); navigate('/goals'); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
            style={{
              backgroundColor: accent,
              color: '#FFFFFF',
              boxShadow: `0 4px 14px ${accent}44`,
              marginTop: meta.key === 'manual' ? 0 : undefined,
            }}
          >
            Go set a new goal!
          </button>
        </div>
      </div>

      <style>{`
        @keyframes goalCelebrationShine {
          0% { transform: translateX(-120%); opacity: 0; }
          30% { opacity: 0.9; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        .goal-celebration-ring {
          border: 2px solid;
          animation: goalCelebrationRing 0.9s ease-out 0.2s both;
          pointer-events: none;
        }
        @keyframes goalCelebrationRing {
          0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        .goal-celebration-icon-bg {
          animation: goalCelebrationIconBg 0.6s ease-out 0.1s both;
        }
        @keyframes goalCelebrationIconBg {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .goal-celebration-icon {
          animation: goalCelebrationIcon 0.7s ease-out 0.15s both;
        }
        @keyframes goalCelebrationIcon {
          0% { transform: scale(0.5) rotate(-12deg); opacity: 0; }
          65% { transform: scale(1.1) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .goal-celebration-pill-icon {
          animation: goalCelebrationPill 0.9s ease-out 0.25s both;
        }
        @keyframes goalCelebrationPill {
          0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
