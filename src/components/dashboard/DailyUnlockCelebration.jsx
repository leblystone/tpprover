import React, { useEffect, useState } from 'react';
import { Flame, Sparkles } from 'lucide-react';

/**
 * Listens for `tpp:daily-tasks-unlock` with detail `{ streak }`.
 * Shows a short CSS-driven unlock celebration (no canvas).
 */
export default function DailyUnlockCelebration({ theme }) {
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const onUnlock = (e) => {
      const n = e.detail?.streak;
      setStreak(typeof n === 'number' ? n : 0);
      setOpen(true);
      requestAnimationFrame(() => setAnimate(true));
    };
    window.addEventListener('tpp:daily-tasks-unlock', onUnlock);
    return () => window.removeEventListener('tpp:daily-tasks-unlock', onUnlock);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      setAnimate(false);
      setTimeout(() => setOpen(false), 380);
    }, 7500);
    return () => clearTimeout(t);
  }, [open]);

  const dismiss = () => {
    setAnimate(false);
    setTimeout(() => setOpen(false), 380);
  };

  if (!open) return null;

  const primary = theme?.primary || '#7F9E95';
  const isDark = theme?.isDark;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
      onClick={dismiss}
    >
      {/* Backdrop fade */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ease-out ${animate ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(47, 59, 58, 0.12)',
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
            className="absolute inset-y-0 w-1/3 blur-2xl daily-unlock-shine"
            style={{
              background: `linear-gradient(105deg, transparent, ${primary}35, transparent)`,
              animation: 'dailyUnlockShine 1.2s ease-out 0.15s forwards',
            }}
          />
        </div>

        <div className="relative px-6 py-8 text-center">
          <div className="flex justify-center mb-4">
            <div
              className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${animate ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-12'}`}
              style={{ transitionDelay: '60ms' }}
            >
              <Sparkles size={48} strokeWidth={2} style={{ color: primary }} />
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color: primary }}>
            Day complete
          </p>
          <h3 className="text-lg font-bold mb-1" style={{ color: theme?.text }}>
            Today&apos;s research is done
          </h3>
          <p className="text-sm mb-4" style={{ color: theme?.textLight || theme?.text }}>
            Streak updated — keep it going tomorrow.
          </p>

          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              borderColor: `${primary}40`,
              backgroundColor: isDark ? `${primary}14` : `${primary}10`,
            }}
          >
            <Flame size={20} className="daily-unlock-flame" style={{ color: primary }} />
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
        .daily-unlock-flame {
          animation: dailyUnlockFlame 0.9s ease-out 0.2s both;
        }
        @keyframes dailyUnlockFlame {
          0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
