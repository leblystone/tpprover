import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendUp, ChartBar } from '@phosphor-icons/react';
import { AdminEmptyState } from './adminUi';
import { elegantPalette } from '../../utils/adminHelpers';

const barVariants = {
  hidden: { scaleY: 0, opacity: 0.3 },
  visible: (i) => ({
    scaleY: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      delay: i * 0.03,
      ease: [0.22, 1.4, 0.36, 1],
    },
  }),
};

/**
 * Daily signup bar chart — remount parent with key={rangeKey} so bars re-grow on date change.
 */
export default function AdminSignupBarChart({
  chartGrowth,
  totalNewUsers,
  isRangeEmpty,
  theme,
  rangeEmptyAction,
  palette = elegantPalette,
}) {
  const pal = palette;
  const reducedMotion = useReducedMotion();
  const maxNew = Math.max(...chartGrowth.map((d) => d.newUsers), 1);

  return (
    <div className="lg:col-span-2 rounded-lg border p-2" style={{ borderColor: '#d0d0d0', backgroundColor: '#ffffff' }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: '#1a1a1a' }}>
            <TrendUp size={16} style={{ color: pal.gold.metallic }} />
            User Growth
          </h2>
          <p className="text-xs" style={{ color: '#4a4a4a' }}>Daily registration &amp; activity</p>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-semibold" style={{ color: '#1a1a1a' }}>Daily New Signups</h3>
          <span className="text-xs" style={{ color: '#4a4a4a' }}>
            Total: {totalNewUsers} new users
          </span>
        </div>
        <div
          className="h-32 flex items-end justify-between gap-1 p-2 rounded-lg overflow-hidden"
          style={{ background: '#ffffff', border: '1px solid #e0e0e0' }}
        >
          {isRangeEmpty ? (
            <AdminEmptyState
              theme={theme}
              icon={ChartBar}
              title="No signup activity"
              description="The chart will appear when users register during the selected dates."
              action={rangeEmptyAction}
              compact
              className="w-full h-full flex flex-col items-center justify-center !border-0 !bg-transparent"
            />
          ) : (
            chartGrowth.map((day, barIndex) => {
              const hasNew = day.newUsers > 0;
              const barHeightPx = hasNew ? (day.newUsers / maxNew) * 80 : 2;
              const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              const barStyle = {
                height: `${barHeightPx}px`,
                minHeight: barHeightPx <= 2 ? '2px' : 0,
                transformOrigin: 'bottom center',
                background: hasNew
                  ? `linear-gradient(180deg, ${pal.gold.gradientStart} 0%, ${pal.gold.gradientEnd} 100%)`
                  : '#e0e0e0',
              };

              return (
                <div
                  key={day.date}
                  className="group relative flex flex-col items-center justify-end gap-1 flex-1 h-full min-w-0 self-stretch"
                >
                  {hasNew && (
                    <div
                      className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10"
                      style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
                    >
                      {day.newUsers} · {dateLabel}
                    </div>
                  )}
                  {reducedMotion ? (
                    <div
                      className="admin-signup-bar rounded-t-lg w-full cursor-default"
                      style={barStyle}
                    />
                  ) : (
                    <motion.div
                      className="admin-signup-bar rounded-t-lg w-full cursor-default group-hover:brightness-110"
                      custom={barIndex}
                      initial="hidden"
                      animate="visible"
                      variants={barVariants}
                      style={barStyle}
                    />
                  )}
                  <span
                    className="text-[10px] font-semibold shrink-0"
                    style={{ color: hasNew ? '#1a1a1a' : '#666666' }}
                  >
                    {new Date(day.date + 'T12:00:00').getDate()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
