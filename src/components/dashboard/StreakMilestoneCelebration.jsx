import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Fire, Trophy } from '@phosphor-icons/react';

const MILESTONE_META = {
  7: { label: 'One full week!', sub: '7-day streak unlocked', color: '#EA580C', Icon: Fire },
  30: { label: '30 days strong!', sub: 'You built a real habit', color: '#CA8A04', Icon: Trophy },
  90: { label: '90 days of excellence!', sub: 'A full quarter of consistency', color: '#7C3AED', Icon: Trophy },
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

  useEffect(() => {
    const onMilestone = (e) => {
      const n = e.detail?.streak;
      if (!MILESTONE_META[n]) return;
      setStreak(n);
      setDots(spawnDots(n));
      setOpen(true);
      requestAnimationFrame(() => setAnimate(true));
    };
    window.addEventListener('tpp:streak-milestone', onMilestone);
    return () => window.removeEventListener('tpp:streak-milestone', onMilestone);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      setAnimate(false);
      setTimeout(() => {
        setOpen(false);
        setDots([]);
      }, 350);
    }, 2800);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const meta = MILESTONE_META[streak] || MILESTONE_META[7];
  const { label, sub, color, Icon } = meta;
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
        className="fixed inset-0 z-[301] flex items-center justify-center px-4 pointer-events-none"
        aria-live="polite"
      >
        <div
          className={`relative max-w-sm w-full rounded-2xl border overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-auto ${
            animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
          }`}
          style={{
            backgroundColor: theme?.isDark ? 'rgba(15,23,42,0.94)' : theme?.cardBackground || '#fff',
            borderColor: `${color}66`,
            boxShadow: `0 0 0 1px ${color}33, 0 25px 50px -12px rgba(0,0,0,0.35)`,
          }}
        >
          <div className="relative px-6 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="tpp-success-pop relative inline-flex">
                <Icon size={52} weight="duotone" style={{ color }} />
                <span className="tpp-success-ring" style={{ borderColor: color }} />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1" style={{ color }}>
              Milestone
            </p>
            <h3 className="text-xl font-bold mb-1" style={{ color: theme?.text }}>
              {label}
            </h3>
            <p className="text-sm mb-4" style={{ color: theme?.textLight || theme?.text }}>
              {sub}
            </p>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{
                borderColor: `${primary}40`,
                backgroundColor: theme?.isDark ? `${primary}14` : `${primary}10`,
              }}
            >
              <Fire size={18} weight="fill" style={{ color: primary }} />
              <span className="text-2xl font-black tabular-nums" style={{ color: theme?.text }}>
                {streak}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
                day streak
              </span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
