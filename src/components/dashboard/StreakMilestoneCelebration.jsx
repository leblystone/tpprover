import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Fire } from '@phosphor-icons/react';
import milestoneImg from '../../assets/milestone.png';

const MILESTONE_META = {
  7:  { label: 'One full week!',         sub: '7-day streak unlocked',             color: '#EA580C' },
  30: { label: '30 days strong!',         sub: 'You built a real habit',            color: '#CA8A04' },
  90: { label: '90 days of excellence!',  sub: 'A full quarter of consistency',     color: '#7C3AED' },
};

const DOT_COLORS = ['#EA580C', '#F97316', '#CA8A04', '#EAB308', '#7C3AED', '#A855F7', '#059669', '#BE123C'];

function spawnDots(streak) {
  const color = MILESTONE_META[streak]?.color || '#7F9E95';
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI;
    const dist = 80 + (i % 3) * 24;
    return {
      id: `${streak}-${Date.now()}-${i}`,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      mx: `${Math.round(Math.cos(angle) * dist)}px`,
      my: `${Math.round(Math.sin(angle) * dist)}px`,
      color: DOT_COLORS[i % DOT_COLORS.length] || color,
    };
  });
}

/**
 * Extra celebration overlay at streak milestones (7 / 30 / 90 days).
 * Listens for `tpp:streak-milestone` with detail `{ streak }`.
 */
export default function StreakMilestoneCelebration({ theme }) {
  const [open, setOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [dots, setDots] = useState([]);
  const [animate, setAnimate] = useState(false);
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    const onMilestone = (e) => {
      const n = e.detail?.streak;
      if (!MILESTONE_META[n]) return;
      setStreak(n);
      setDots(spawnDots(n));
      setDevPreview(Boolean(e.detail?.devPreview));
      setOpen(true);
      requestAnimationFrame(() => setAnimate(true));
    };
    window.addEventListener('tpp:streak-milestone', onMilestone);
    return () => window.removeEventListener('tpp:streak-milestone', onMilestone);
  }, []);

  useEffect(() => {
    if (!open || devPreview) return undefined;
    const t = setTimeout(() => {
      setAnimate(false);
      setTimeout(() => {
        setOpen(false);
        setDots([]);
      }, 350);
    }, 2800);
    return () => clearTimeout(t);
  }, [open, devPreview]);

  const dismiss = () => {
    setAnimate(false);
    setTimeout(() => {
      setOpen(false);
      setDots([]);
      setDevPreview(false);
    }, 350);
  };

  if (!open) return null;

  const meta = MILESTONE_META[streak] || MILESTONE_META[7];
  const { label, sub, color } = meta;
  const primary = theme?.primary || '#7F9E95';

  return createPortal(
    <>
      {dots.map((d) => (
        <span
          key={d.id}
          className="tpp-milestone-dot"
          style={{
            left: d.x,
            top: d.y,
            backgroundColor: d.color,
            '--mx': d.mx,
            '--my': d.my,
          }}
        />
      ))}

      <div
        className="fixed inset-0 z-[301] flex items-center justify-center px-4"
        aria-live="polite"
        role="dialog"
        aria-label="Streak milestone"
        onClick={dismiss}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${animate ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: theme?.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(15, 23, 42, 0.28)',
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
            backgroundColor: theme?.isDark ? 'rgba(15,23,42,0.94)' : theme?.cardBackground || '#fff',
            borderColor: `${color}66`,
            boxShadow: `0 0 0 1px ${color}33, 0 25px 50px -12px rgba(0,0,0,0.35)`,
          }}
        >
          <div
            className="relative px-6 pt-6 pb-2 text-center"
            style={{
              background: theme?.isDark
                ? `linear-gradient(180deg, ${color}22 0%, transparent 100%)`
                : `linear-gradient(180deg, ${color}14 0%, transparent 100%)`,
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
                  src={milestoneImg}
                  alt=""
                  className="w-[148px] h-auto max-h-[160px] object-contain select-none pointer-events-none drop-shadow-sm milestone-icon-bg"
                  draggable={false}
                />
                <span
                  className="milestone-ring absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                  style={{ borderColor: color }}
                  aria-hidden
                />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color }}>
              Milestone
            </p>
            <h3 className="text-xl font-bold mb-1" style={{ color: theme?.text }}>
              {label}
            </h3>
            <p className="text-sm mb-5" style={{ color: theme?.textLight || theme?.text }}>
              {sub}
            </p>
          </div>

          <div className="relative px-6 pb-7 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-5"
              style={{
                borderColor: `${primary}40`,
                backgroundColor: theme?.isDark ? `${primary}14` : `${primary}10`,
              }}
            >
              <Fire size={18} weight="fill" className="milestone-flame" style={{ color: primary }} />
              <span className="text-2xl font-black tabular-nums" style={{ color: theme?.text }}>
                {streak}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
                day streak
              </span>
            </div>
            {devPreview && (
              <button
                type="button"
                onClick={dismiss}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
                style={{ backgroundColor: color, color: '#fff' }}
              >
                Close preview
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .milestone-ring {
          border: 2px solid;
          animation: milestoneRing 0.9s ease-out 0.2s both;
          pointer-events: none;
        }
        @keyframes milestoneRing {
          0% { transform: translate(-50%, -50%) scale(0.85); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
        }
        .milestone-icon-bg {
          animation: milestoneIconBg 0.6s ease-out 0.1s both;
        }
        @keyframes milestoneIconBg {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .milestone-flame {
          animation: milestoneFlame 0.9s ease-out 0.25s both;
        }
        @keyframes milestoneFlame {
          0% { transform: scale(0.6) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </>,
    document.body,
  );
}
