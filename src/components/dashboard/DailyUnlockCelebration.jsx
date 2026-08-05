import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Fire } from '@phosphor-icons/react';
import dailyUnlockImg from '../../assets/CHECK.png';

/**
 * Listens for `tpp:daily-tasks-unlock` with detail `{ streak }`.
 * Shows a short CSS-driven unlock celebration (no canvas).
 */
export default function DailyUnlockCelebration({ theme }) {
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [showKey, setShowKey] = useState(0);
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    const onUnlock = (e) => {
      const n = e.detail?.streak;
      setStreak(typeof n === 'number' ? n : 0);
      setDevPreview(Boolean(e.detail?.devPreview));
      setOpen(true);
      setAnimate(false);
      setShowKey((k) => k + 1);
      requestAnimationFrame(() => setAnimate(true));
    };
    window.addEventListener('tpp:daily-tasks-unlock', onUnlock);
    return () => window.removeEventListener('tpp:daily-tasks-unlock', onUnlock);
  }, []);

  useEffect(() => {
    if (!open || devPreview) return undefined;
    const t = setTimeout(() => {
      setAnimate(false);
      setTimeout(() => setOpen(false), 380);
    }, 7500);
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

  const primary = theme?.primary || '#7F9E95';
  const isDark = theme?.isDark;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      role="dialog"
      aria-label="Day complete"
      onClick={dismiss}
    >
      {/* Backdrop */}
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
          backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : theme?.cardBackground || '#fff',
          borderColor: `${primary}55`,
          boxShadow: `0 0 0 1px ${primary}22, 0 25px 50px -12px rgba(0,0,0,0.35)`,
        }}
      >
        {/* Shine sweep */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
          style={{ opacity: animate ? 1 : 0, transition: 'opacity 0.6s ease' }}
        >
          <div
            className="absolute inset-y-0 w-1/3 blur-2xl"
            style={{
              background: `linear-gradient(105deg, transparent, ${primary}35, transparent)`,
              animation: 'dailyUnlockShine 1.2s ease-out 0.15s forwards',
            }}
          />
        </div>

        {/* Gradient header band */}
        <div
          className="relative px-6 pt-6 pb-2 text-center"
          style={{
            background: isDark
              ? `linear-gradient(180deg, ${primary}22 0%, transparent 100%)`
              : `linear-gradient(180deg, ${primary}14 0%, transparent 100%)`,
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
                src={dailyUnlockImg}
                alt=""
                className="w-[148px] h-auto max-h-[160px] object-contain select-none pointer-events-none drop-shadow-sm daily-unlock-icon-bg"
                draggable={false}
              />
              {/* Pulsing ring */}
              <span
                className="daily-unlock-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                style={{ borderColor: primary }}
                aria-hidden
              />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: primary }}>
            Day complete
          </p>
          <h3 className="text-lg font-bold mb-1" style={{ color: theme?.text }}>
            Today&apos;s research is done!
          </h3>
          <p className="text-sm mb-5" style={{ color: theme?.textLight || theme?.text }}>
            Come back tomorrow to keep your streak alive.
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
            <Fire size={20} weight="fill" className="daily-unlock-flame" style={{ color: primary }} />
            <span className="text-2xl font-black tabular-nums" style={{ color: theme?.text }}>
              {streak}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
              day streak
            </span>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes dailyUnlockShine {
          0% { transform: translateX(-120%); opacity: 0; }
          30% { opacity: 0.9; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        .daily-unlock-ring {
          border: 2px solid;
          animation: dailyUnlockRing 0.9s ease-out 0.2s both;
          pointer-events: none;
        }
        @keyframes dailyUnlockRing {
          0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        .daily-unlock-icon-bg {
          animation: dailyUnlockIconBg 0.6s ease-out 0.1s both;
        }
        @keyframes dailyUnlockIconBg {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .daily-unlock-flame {
          animation: dailyUnlockFlame 0.9s ease-out 0.25s both;
        }
        @keyframes dailyUnlockFlame {
          0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
