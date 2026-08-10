import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import BodyMetricsModal from '../components/research/BodyMetricsModal';
import { useTierAccess, useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import UpgradeModal from '../components/common/UpgradeModal';
import { saveAppData } from '../services/cloudStorage';
import { generateId } from '../utils/string';
import { recordDeletion } from '../utils/deletionTracking';
import { formatMMDDYYYY, getLocalDateString } from '../utils/date';
import { getWaterDayAmount, getWaterDayGoal, getHydrationStreakData, tryHydrationGoalRewards } from '../utils/hydrationStreak';
import {
  metricDateKey,
  normalizeMetricRow,
  mergeMetricsForDay,
  wellnessLabel,
  getMergedMetricForDay,
  groupMetricsByDay,
  upsertMetricForDay,
} from '../utils/metricsDisplay';
import { loadSideEffects, getSideEffectPatterns, deleteSideEffect, getSideEffectsForDate } from '../utils/sideEffectsLog';
import SideEffectsQuickSheet from '../components/sideeffects/SideEffectsQuickSheet';
import LabEntryModal from '../components/labs/LabEntryModal';
import LabScanReviewModal from '../components/labs/LabScanReviewModal';
import {
  getLabResults,
  addLabResult,
  updateLabResult,
  deleteLabResult,
  getLoggedMarkerKeys,
  getMarkerSeries,
  LAB_RESULTS_EVENT,
} from '../utils/labResults';
import { calculateScheduledTasksForDate } from '../utils/calendarTasks';
import { generateTaskId, getCompletedTasks } from '../utils/taskCompletion';
import { getOneOffDosesForDate } from '../utils/oneOffDoses';
import { getCalendarNoteText } from '../utils/calendarNotesMigration';
import {
  Drop, Pulse as ActivityPulse, ChartBar, CalendarBlank, CalendarDot, Scales, SunHorizon,
  Plus, Minus, Flame, Bed, Lightning, Smiley, ShieldWarning,
  SmileyWink, Syringe as PhSyringe, WarningCircle, BatteryLow,
  Skull, Headphones, Balloon, MoonStars,
  Brain as PhBrain, PencilSimple, NotePencil, Flask, DropHalf, UserCheck, X, Scan, PintGlass, Leaf,
} from '@phosphor-icons/react';

const INSIGHTS_TABS = ['wellness', 'research'];

const RESEARCH_INNER_TABS = [
  { label: 'Overview', value: 'overview' },
  { label: 'Consistency', value: 'compliance' },
  { label: 'Spending', value: 'spending' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Protocols', value: 'protocols' },
  { label: 'Half-Life', value: 'halflife' },
];

const waterUnits = {
  glasses: { label: 'Glasses', abbrev: 'glasses', defaultGoal: 8, increment: 1 },
  oz: { label: 'Fluid Ounces', abbrev: 'fl oz', defaultGoal: 64, increment: 8 },
  ml: { label: 'Milliliters', abbrev: 'ml', defaultGoal: 2000, increment: 250 },
  cups: { label: 'Cups', abbrev: 'cups', defaultGoal: 8, increment: 1 },
  liters: { label: 'Liters', abbrev: 'L', defaultGoal: 2, increment: 0.25 }
};

const TREND_RANGES = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

function parseInsightsTab(searchParams) {
  const t = searchParams.get('tab');
  if (t === 'metrics' || t === 'hydration' || t === 'labs') return 'wellness';
  if (INSIGHTS_TABS.includes(t)) return t;
  return 'wellness';
}

// ─── Hydration analytics ───────────────────────────────────────────────
function HydrationAnalytics({ theme }) {
  const [waterData, setWaterData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_water_tracker') || '{}'); } catch { return {}; }
  });
  const [streakSnap, setStreakSnap] = useState(() => getHydrationStreakData());
  const [hydRange, setHydRange] = useState(30);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    const reload = () => {
      try {
        const saved = localStorage.getItem('tpprover_water_tracker');
        if (saved) setWaterData(JSON.parse(saved));
      } catch {}
      setStreakSnap(getHydrationStreakData());
    };
    window.addEventListener('tpp:cloud-data-loaded', reload);
    window.addEventListener('tpp:water-tracker-updated', reload);
    window.addEventListener('tpp:hydration-streak-updated', reload);
    window.addEventListener('tpp:hydration-goal-complete', reload);
    return () => {
      window.removeEventListener('tpp:cloud-data-loaded', reload);
      window.removeEventListener('tpp:water-tracker-updated', reload);
      window.removeEventListener('tpp:hydration-streak-updated', reload);
      window.removeEventListener('tpp:hydration-goal-complete', reload);
    };
  }, []);

  const settingsDefaults = useMemo(() => {
    try {
      const s = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
      return {
        unit: s.hydration?.unit || 'oz',
        dailyGoal: s.hydration?.dailyGoal ?? 64,
        cupSize: s.hydration?.cupSize || 8,
      };
    } catch {
      return { unit: 'oz', dailyGoal: 64, cupSize: 8 };
    }
  }, [waterData]);

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayRow = waterData[today];
  const todayAmt = getWaterDayAmount(todayRow || {});
  const todayGoal = getWaterDayGoal(todayRow || {}, settingsDefaults.dailyGoal);
  const todayUnit = (todayRow && todayRow.unit) || settingsDefaults.unit;
  const currentUnit = waterUnits[todayUnit] || waterUnits.oz;
  const cupStep = settingsDefaults.cupSize || currentUnit.increment || 8;

  const adjustWater = useCallback((delta) => {
    setWaterData((prev) => {
      const updated = { ...prev };
      const row = updated[today] || {};
      const prevAmt = getWaterDayAmount(row);
      const goal = getWaterDayGoal(row, settingsDefaults.dailyGoal);
      const unit = row.unit || settingsDefaults.unit;
      const newAmt = Math.max(0, prevAmt + delta);
      const dayData = {
        ...row,
        amount: newAmt,
        glasses: newAmt,
        goal,
        unit,
      };
      updated[today] = dayData;
      try {
        localStorage.setItem('tpprover_water_tracker', JSON.stringify(updated));
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent('tpp:water-tracker-updated', { detail: { waterData: updated } }));
      } catch {}
      queueMicrotask(() => tryHydrationGoalRewards(today, dayData));
      return updated;
    });
  }, [today, settingsDefaults.dailyGoal, settingsDefaults.unit]);

  const graphData = useMemo(() => {
    const defGoal = settingsDefaults.dailyGoal;
    const defUnit = settingsDefaults.unit;
    const days = [];
    const now = new Date();
    const span = Math.max(1, hydRange);
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const day = waterData[key];
      const amt = getWaterDayAmount(day || {});
      const goal = getWaterDayGoal(day || {}, defGoal);
      const unit = (day && day.unit) || defUnit;
      if (day && amt > 0) {
        days.push({ date: key, dateObj: d, amount: amt, goal, unit, progress: goal > 0 ? Math.min(amt / goal, 1) : 0 });
      } else {
        days.push({ date: key, dateObj: d, amount: 0, goal: 0, unit: defUnit, progress: 0 });
      }
    }
    return days;
  }, [waterData, settingsDefaults.dailyGoal, settingsDefaults.unit, hydRange]);

  /** Goal-days badge on the summary card stays a fixed 30-day window */
  const goalDaysLast30 = useMemo(() => {
    const defGoal = settingsDefaults.dailyGoal;
    const now = new Date();
    let count = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const day = waterData[key];
      const amt = getWaterDayAmount(day || {});
      const goal = getWaterDayGoal(day || {}, defGoal);
      if (goal > 0 && amt >= goal) count += 1;
    }
    return count;
  }, [waterData, settingsDefaults.dailyGoal]);

  const historyData = useMemo(() => {
    const defGoal = settingsDefaults.dailyGoal;
    return Object.entries(waterData)
      .filter(([, v]) => v && getWaterDayAmount(v) > 0)
      .map(([date, data]) => {
        const amt = getWaterDayAmount(data);
        const goal = getWaterDayGoal(data, defGoal);
        const unit = data.unit || settingsDefaults.unit;
        return { date, dateObj: new Date(date), amount: amt, goal, unit, progress: goal > 0 ? Math.min(amt / goal, 1) : 0 };
      })
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [waterData, settingsDefaults.dailyGoal, settingsDefaults.unit]);

  const hasData = graphData.some(d => d.amount > 0);
  const todayPct = todayGoal > 0 ? Math.min(todayAmt / todayGoal, 1) : 0;
  const waterFillPct = Math.max(todayPct, todayPct > 0 ? 0.06 : 0);

  // Smooth path helper
  const mkSmooth = (pts) => {
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cx} ${pts[i - 1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  };

  const W_BLUE = '#3b9ed8';
  const cardBorder = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.05)';
  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  return (
    <div className="space-y-4">

      {/* ── Card 1: Today + Streak ───────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
        <style>{`
          @keyframes hyd-bubble-rise {
            0%   { transform: translateY(6px) scale(0.45); opacity: 0; }
            15%  { opacity: 0.95; }
            100% { transform: translateY(-58px) scale(1.05); opacity: 0; }
          }
          @keyframes hyd-circle-wave {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes hyd-circle-wave-slow {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Drop size={18} weight="duotone" style={{ color: W_BLUE }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Water Intake</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('tpp:show-hydration-celebration', {
                  detail: { streak: streakSnap.streak },
                }));
              } catch { /* ignore */ }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full touch-manipulation active:scale-95 transition-transform"
            style={{ backgroundColor: `${W_BLUE}20`, color: W_BLUE }}
            aria-label="View hydration streak"
          >
            <Flame size={13} weight="duotone" />
            <span>{streakSnap.streak} day streak</span>
          </button>
        </div>

        <div className="grid grid-cols-[1.55fr_1fr] gap-3 sm:gap-4 items-center">
          {/* Col 1: circle gauge + side controls */}
          <div className="min-w-0 flex items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => adjustWater(-cupStep)}
              disabled={todayAmt <= 0}
              aria-label={`Remove ${cupStep} ${currentUnit.abbrev}`}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center touch-manipulation active:scale-90 transition-transform disabled:opacity-30 shrink-0"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                color: theme.text,
                boxShadow: insetShadow,
              }}
            >
              <Minus size={16} weight="bold" />
            </button>

            <div
              className="relative w-[118px] h-[118px] sm:w-[132px] sm:h-[132px] shrink-0"
              style={{
                filter: theme.isDark
                  ? `drop-shadow(0 8px 18px ${W_BLUE}33)`
                  : `drop-shadow(0 10px 20px ${W_BLUE}28)`,
              }}
            >
              <svg width="100%" height="100%" viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" aria-hidden>
                <defs>
                  <clipPath id="hyd-circle-inner">
                    <circle cx="60" cy="60" r="46" />
                  </clipPath>
                  <linearGradient id="hyd-circle-water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.98">
                      <animate attributeName="stop-color" values="#e0f2fe;#7dd3fc;#bae6fd;#e0f2fe" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.95">
                      <animate attributeName="stop-color" values="#7dd3fc;#38bdf8;#0ea5e9;#7dd3fc" dur="3s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#0369a1" stopOpacity="0.98">
                      <animate attributeName="stop-color" values="#0284c7;#0369a1;#0c4a6e;#0284c7" dur="3s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>
                  <linearGradient id="hyd-circle-rim" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" />
                    <stop offset="50%" stopColor={W_BLUE} />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <filter id="hyd-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Track ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(59,158,216,0.14)'}
                  strokeWidth="5.5"
                />
                {/* Progress arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="url(#hyd-circle-rim)"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(0.01, todayPct) * 326.73} 326.73`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                  filter="url(#hyd-soft-glow)"
                />

                {/* Bowl */}
                <circle
                  cx="60"
                  cy="60"
                  r="46"
                  fill={theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(224,242,254,0.55)'}
                  stroke={theme.isDark ? `${W_BLUE}55` : `${W_BLUE}40`}
                  strokeWidth="1.5"
                />

                <g clipPath="url(#hyd-circle-inner)">
                  <rect
                    x="8"
                    y={112 - waterFillPct * 92}
                    width="104"
                    height={waterFillPct * 92 + 16}
                    fill="url(#hyd-circle-water)"
                    style={{ transition: 'y 0.65s ease, height 0.65s ease' }}
                  />
                  {waterFillPct > 0.04 && (
                    <>
                      <g style={{ animation: 'hyd-circle-wave 2.6s linear infinite' }}>
                        <path
                          d={`M-30 ${112 - waterFillPct * 92 + 1} C-5 ${112 - waterFillPct * 92 - 6} 20 ${112 - waterFillPct * 92 + 7} 45 ${112 - waterFillPct * 92} C70 ${112 - waterFillPct * 92 - 6} 95 ${112 - waterFillPct * 92 + 6} 120 ${112 - waterFillPct * 92} C145 ${112 - waterFillPct * 92 - 5} 170 ${112 - waterFillPct * 92 + 5} 195 ${112 - waterFillPct * 92} L195 130 L-30 130 Z`}
                          fill="#bae6fd"
                          opacity="0.5"
                        />
                      </g>
                      <g style={{ animation: 'hyd-circle-wave-slow 3.8s linear infinite reverse' }}>
                        <path
                          d={`M-30 ${112 - waterFillPct * 92 + 4} C0 ${112 - waterFillPct * 92 - 2} 30 ${112 - waterFillPct * 92 + 8} 60 ${112 - waterFillPct * 92 + 2} C90 ${112 - waterFillPct * 92 - 3} 120 ${112 - waterFillPct * 92 + 7} 150 ${112 - waterFillPct * 92 + 1} C180 ${112 - waterFillPct * 92 - 2} 210 ${112 - waterFillPct * 92 + 5} 240 ${112 - waterFillPct * 92 + 1} L240 130 L-30 130 Z`}
                          fill="#ffffff"
                          opacity="0.22"
                        />
                      </g>
                    </>
                  )}
                  {/* Glass highlight */}
                  <ellipse cx="42" cy="42" rx="10" ry="16" fill="rgba(255,255,255,0.28)" transform="rotate(-28 42 42)" />
                </g>
              </svg>

              <div
                className="absolute inset-[14%] rounded-full overflow-hidden pointer-events-none"
                aria-hidden
              >
                {[
                  { left: '22%', size: 4, delay: '0s', dur: '2.4s' },
                  { left: '48%', size: 5, delay: '0.5s', dur: '2.9s' },
                  { left: '36%', size: 3.5, delay: '1.1s', dur: '2.2s' },
                  { left: '62%', size: 4, delay: '0.8s', dur: '2.6s' },
                  { left: '74%', size: 3, delay: '1.5s', dur: '2.8s' },
                ].map((b, i) => (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      bottom: `${Math.max(14, waterFillPct * 38)}%`,
                      left: b.left,
                      width: b.size,
                      height: b.size,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: `0 0 0 1px ${W_BLUE}55`,
                      animation: waterFillPct > 0.08 ? `hyd-bubble-rise ${b.dur} ease-in infinite` : 'none',
                      animationDelay: b.delay,
                      opacity: waterFillPct > 0.08 ? 1 : 0,
                    }}
                  />
                ))}
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none leading-none px-3">
                <div
                  className="text-2xl sm:text-[1.75rem] font-black tabular-nums tracking-tight"
                  style={{
                    color: todayPct >= 0.42 ? '#0c4a6e' : W_BLUE,
                    textShadow: todayPct >= 0.2
                      ? '0 1px 0 rgba(255,255,255,0.7), 0 2px 8px rgba(255,255,255,0.35)'
                      : undefined,
                  }}
                >
                  {Math.round(todayPct * 100)}%
                </div>
                <div
                  className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] mt-1"
                  style={{
                    color: todayPct >= 0.42 ? 'rgba(12,74,110,0.78)' : theme.textLight,
                    textShadow: todayPct >= 0.2 ? '0 1px 1px rgba(255,255,255,0.65)' : undefined,
                  }}
                >
                  today
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => adjustWater(cupStep)}
              aria-label={`Add ${cupStep} ${currentUnit.abbrev}`}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center touch-manipulation active:scale-90 transition-transform shrink-0"
              style={{
                backgroundColor: `${W_BLUE}28`,
                color: W_BLUE,
                boxShadow: `0 2px 8px ${W_BLUE}22`,
              }}
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>

          {/* Col 2: Today + Goal days */}
          <div className="min-w-0 flex flex-col gap-2 self-stretch justify-center">
            <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: theme.textLight }}>Today</div>
              <div className="flex items-baseline justify-end gap-1 flex-wrap">
                <span className="text-2xl font-black tabular-nums leading-none" style={{ color: W_BLUE }}>
                  {currentUnit.abbrev === 'L' ? todayAmt.toFixed(2) : Math.round(todayAmt)}
                </span>
                <span className="text-xs leading-none" style={{ color: theme.textLight }}>
                  / {todayGoal} {currentUnit.abbrev}
                </span>
              </div>
            </div>
            <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: theme.textLight }}>Goal days</div>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-2xl font-black tabular-nums leading-none" style={{ color: W_BLUE }}>{goalDaysLast30}</span>
                <span className="text-xs leading-none" style={{ color: theme.textLight }}>of 30</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Chart + History ──────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <PintGlass size={18} weight="bold" style={{ color: W_BLUE }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Daily Totals</h3>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {TREND_RANGES.map(({ label, value }) => {
              const active = hydRange === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHydRange(value)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all duration-200 focus:outline-none active:scale-95"
                  style={{
                    backgroundColor: active ? W_BLUE : (theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                    color: active ? '#fff' : theme.textLight,
                    boxShadow: active ? `0 1px 4px ${W_BLUE}40` : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {hasData ? (() => {
          const dayCount = graphData.length;
          const lastIdx = Math.max(dayCount - 1, 1);
          const xStep = hydRange >= 90 ? 15 : hydRange >= 30 ? 5 : 1;
          const gW = 400, gH = 110, padL = 36, padR = 8, padTop = 8, padBot = 20;
          const activeDays = graphData.filter(d => d.amount > 0);
          const maxAmt = Math.max(...graphData.map(d => d.amount), 1);
          const goalLine = settingsDefaults.dailyGoal;
          const yMax = Math.max(maxAmt, goalLine) * 1.12;
          const toX = (i) => padL + (i / lastIdx) * (gW - padL - padR);
          const toY = (v) => padTop + (1 - v / yMax) * gH;
          const chartPts = graphData.map((d, i) => d.amount > 0 ? { x: toX(i), y: toY(d.amount) } : null).filter(Boolean);
          const linePath = mkSmooth(chartPts);
          const areaPath = chartPts.length >= 2
            ? `${linePath} L ${chartPts[chartPts.length - 1].x} ${padTop + gH} L ${chartPts[0].x} ${padTop + gH} Z`
            : '';
          const goalY = toY(goalLine);
          const yTicks = [yMax * 0.9, yMax * 0.45];
          const avgAmt = activeDays.length > 0 ? graphData.reduce((s, d) => s + d.amount, 0) / activeDays.length : 0;
          const bestAmt = Math.max(...graphData.map(d => d.amount), 0);
          const totalH = padTop + gH + padBot;
          return (
            <>
              <div className="p-3 rounded-xl" style={{ backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.025)', boxShadow: insetShadow, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                <svg width="100%" height={totalH} viewBox={`0 0 ${gW} ${totalH}`} preserveAspectRatio="xMidYMid meet">
                  <defs>
                    <linearGradient id="hyd-area-g" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={W_BLUE} stopOpacity="0.32" />
                      <stop offset="100%" stopColor={W_BLUE} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {yTicks.map((v, ti) => (
                    <line key={ti} x1={padL} y1={toY(v)} x2={gW - padR} y2={toY(v)} stroke={theme.border} strokeWidth="0.5" opacity="0.3" strokeDasharray="4,4" />
                  ))}
                  <line x1={padL} y1={goalY} x2={gW - padR} y2={goalY} stroke={W_BLUE} strokeWidth="1" strokeDasharray="5,3" opacity="0.4" />
                  <text x={gW - padR - 3} y={goalY - 3} textAnchor="end" fontSize="9" fill={W_BLUE} opacity="0.7">goal</text>
                  {yTicks.map((v, ti) => (
                    <text key={ti} x={padL - 4} y={toY(v) + 4} textAnchor="end" fontSize="10" fill={theme.textLight} opacity="0.75">
                      {currentUnit.abbrev === 'L' ? v.toFixed(0) : Math.round(v)}
                    </text>
                  ))}
                  <line x1={padL} y1={padTop + gH} x2={gW - padR} y2={padTop + gH} stroke={theme.border} strokeWidth="1" opacity="0.4" />
                  {areaPath && <path d={areaPath} fill="url(#hyd-area-g)" />}
                  {chartPts.length >= 2 && <path d={linePath} fill="none" stroke={W_BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />}
                  {chartPts.map((p, pi) => (
                    <circle key={pi} cx={p.x} cy={p.y} r={chartPts.length > 12 ? 2 : 3.5} fill={W_BLUE} stroke={theme.cardBackground} strokeWidth={chartPts.length > 12 ? 1 : 1.5} />
                  ))}
                  {graphData.map((d, i) => {
                    if (i % xStep !== 0 && i !== dayCount - 1) return null;
                    const label = hydRange === 7
                      ? d.dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                      : String(d.dateObj.getDate());
                    return <text key={i} x={toX(i)} y={padTop + gH + 16} textAnchor="middle" fontSize="10" fill={theme.textLight} opacity="0.65">{label}</text>;
                  })}
                </svg>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Avg Daily', val: avgAmt > 0 ? avgAmt.toFixed(1) : '—', sub: currentUnit.abbrev },
                  { label: 'Best Day', val: bestAmt > 0 ? bestAmt.toFixed(1) : '—', sub: currentUnit.abbrev },
                  { label: 'Days Tracked', val: activeDays.length, sub: `of ${hydRange}` },
                ].map(stat => (
                  <div key={stat.label} className="text-center rounded-lg py-1.5 px-1.5 leading-tight" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
                    <div className="text-[9px] opacity-60" style={{ color: theme.textLight }}>{stat.label}</div>
                    <div className="text-sm font-bold tabular-nums" style={{ color: W_BLUE }}>{stat.val}</div>
                    <div className="text-[9px] opacity-60" style={{ color: theme.textLight }}>{stat.sub}</div>
                  </div>
                ))}
              </div>
            </>
          );
        })() : (
          <div className="p-8 text-center">
            <Drop size={40} weight="duotone" className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No hydration data yet. Log water from the home dashboard!</p>
          </div>
        )}

        {/* History merged below chart */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDot size={15} weight="bold" style={{ color: W_BLUE }} />
            <h4 className="text-sm font-bold" style={{ color: theme.text }}>Daily History</h4>
          </div>
          {historyData.length > 0 ? (
            <div className="space-y-2">
              {(showAllHistory ? historyData : historyData.slice(0, 5)).map(entry => {
                const isToday = entry.date === today;
                const unit = waterUnits[entry.unit] || waterUnits.glasses;
                const display = unit.abbrev === 'L' ? entry.amount.toFixed(1) : Math.round(entry.amount);
                const hitGoal = entry.progress >= 1 && entry.goal > 0;
                const pct = entry.goal > 0 ? Math.round(Math.min(entry.progress * 100, 100)) : 0;
                return (
                  <div key={entry.date} className="p-3 rounded-xl border transition-all"
                    style={{
                    borderColor: isToday ? W_BLUE : theme.border,
                    backgroundColor: isToday ? `${W_BLUE}0d` : theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.02)',
                    boxShadow: isToday ? `0 0 0 1px ${W_BLUE}40` : insetShadow,
                  }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border"
                          style={{
                            backgroundColor: `${W_BLUE}14`,
                            borderColor: `${W_BLUE}33`,
                            color: W_BLUE,
                          }}>
                          <span className="text-[8px] leading-none font-semibold uppercase">
                            {entry.dateObj.toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <span className="text-[11px] leading-none font-bold mt-0.5">
                            {entry.dateObj.getDate()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold" style={{ color: theme.text }}>
                              {entry.dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                            </span>
                            {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${W_BLUE}20`, color: W_BLUE }}>Today</span>}
                            {hitGoal && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#22c55e22', color: '#16a34a' }}>Goal hit</span>}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                            {entry.goal > 0 ? `${pct}% of ${entry.goal} ${unit.abbrev}` : 'No goal set'}
                          </div>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0"
                        style={{ backgroundColor: hitGoal ? '#22c55e1f' : `${W_BLUE}1a`, color: hitGoal ? '#16a34a' : W_BLUE }}>
                        <span className="text-sm font-bold tabular-nums leading-none">{display}</span>
                        <span className="text-[10px] font-semibold opacity-80">{unit.abbrev}</span>
                      </div>
                    </div>
                    {entry.goal > 0 && (
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.1)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(entry.progress * 100, 100)}%`, background: hitGoal ? 'linear-gradient(90deg,#22c55e,#16a34a)' : `linear-gradient(90deg,${W_BLUE},${W_BLUE}cc)` }} />
                      </div>
                    )}
                  </div>
                );
              })}
              {historyData.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((v) => !v)}
                  className="w-full py-2 text-center text-xs font-semibold touch-manipulation active:opacity-70"
                  style={{ color: W_BLUE }}
                >
                  {showAllHistory ? 'Show less' : `+show more (${historyData.length - 5})`}
                </button>
              )}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm" style={{ color: theme.textLight }}>No history yet. Start tracking on the dashboard!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Wellness rating series — each metric gets its own sparkline (1–5 scale). */
const WELLNESS_TREND_KEYS = ['sleep', 'energy', 'mood', 'pain'];
const trendMetricColors = { sleep: '#4682B4', energy: '#DAA520', mood: '#CD5C5C', pain: '#708090' };
const trendMetricLabels = { sleep: 'Sleep', energy: 'Energy', mood: 'Mood', pain: 'Pain' };
const trendMetricIcons = { sleep: Bed, energy: Lightning, mood: Smiley, pain: ShieldWarning };


/** Best-effort display name from a stored task completion id. */
function friendlyNameFromTaskId(taskId) {
  let s = String(taskId || '');
  s = s.replace(/-catchup-.*$/i, '');
  s = s.replace(/^(peptide|supplement|medication|recon)-/i, '');
  // Drop trailing slot + protocol/peptide ids (new format)
  s = s.replace(/-(am|pm)(?:-[a-z0-9]+(?:-[a-z0-9]+)*)?$/i, '');
  s = s.replace(/-(am|pm)$/i, '');
  const cleaned = s.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || 'Dose';
}

function buildDayResearchContext(dateKey, dateObj, { protocols, supplements, reconItems, medications, oneOffDoses, calendarNotes }) {
  const scheduled = calculateScheduledTasksForDate(
    dateObj,
    protocols || [],
    supplements || [],
    reconItems || [],
    medications || []
  );

  // Map current schedule → display names (best match for completion IDs)
  const nameByTaskId = new Map();
  const bySlot = scheduled?.bySlot || {};
  Object.keys(bySlot).forEach((slot) => {
    const slotData = bySlot[slot] || {};
    (slotData.peptides || []).forEach((p) => {
      if (p?._skipped || p?._rescheduled) return;
      const task = {
        name: p.name,
        type: 'peptide',
        time: slot,
        protocolId: p.protocolId,
        peptideId: p.peptideId || p.id,
        _extraSlot: p._extraSlot,
        isCatchUp: p.isCatchUp,
        _fromDateKey: p._fromDateKey,
        fromDateKey: p.fromDateKey,
        _extraId: p._extraId,
      };
      nameByTaskId.set(generateTaskId(task), p.name || 'Peptide');
    });
    (slotData.supplements || []).forEach((s) => {
      if (typeof s === 'object' && (s._skipped || s._rescheduled)) return;
      const name = typeof s === 'string' ? s : s?.name;
      if (!name) return;
      const task = { name, type: 'supplement', time: slot };
      nameByTaskId.set(generateTaskId(task), name);
    });
  });

  // Source of truth: what the user actually checked off (calendar / dashboard completions)
  const completedEntries = getCompletedTasks(dateKey);
  const seen = new Set();
  const items = [];
  completedEntries.forEach(({ taskId, timeSlot }) => {
    const name = nameByTaskId.get(taskId) || friendlyNameFromTaskId(taskId);
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({
      id: taskId,
      name,
      slot: timeSlot,
      kind: String(taskId).startsWith('supplement') ? 'supplement' : 'peptide',
      completed: true,
    });
  });

  // One-off doses logged that day (always "done")
  getOneOffDosesForDate(dateKey, oneOffDoses).forEach((d) => {
    const name = d.peptideName || 'One-off dose';
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({
      id: `oneoff-${d.id}`,
      name,
      slot: d.timeSlot || 'AM',
      kind: 'one_off',
      completed: true,
    });
  });

  return {
    items,
    sideEffects: getSideEffectsForDate(dateKey),
    note: getCalendarNoteText(calendarNotes, dateKey) || '',
  };
}

// ─── Wellness (Bio-Metrics + Side Effects combined) ───────────────────
function WellnessAnalytics({
  theme,
  protocols = [],
  supplements = [],
  reconItems = [],
  medications = [],
  oneOffDoses = [],
  calendarNotes = {},
  metrics = [],
  labResults: labResultsProp = [],
  onAddMetric,
  onEditMetric,
  onLabResultsChange,
}) {
  const [wellnessSection, setWellnessSection] = useState(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (t === 'labs') return 'labs';
      if (t === 'hydration') return 'hydration';
    } catch { /* ignore */ }
    return 'metrics';
  });
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);
  const [completionTick, setCompletionTick] = useState(0);
  const onThisDayRef = useRef(null);
  const [effects, setEffects] = useState(() => loadSideEffects());
  const [showSheet, setShowSheet] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [seRange, setSeRange] = useState(30);
  const [trendRange, setTrendRange] = useState(7);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const logsListRef = useRef(null);
  const [logsBoxHeight, setLogsBoxHeight] = useState(null);
  const [labResults, setLabResultsLocal] = useState(() =>
    Array.isArray(labResultsProp) && labResultsProp.length ? labResultsProp : getLabResults()
  );
  const [showLabModal, setShowLabModal] = useState(false);
  const [showLabScan, setShowLabScan] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState(null);

  useEffect(() => {
    if (Array.isArray(labResultsProp)) setLabResultsLocal(labResultsProp);
  }, [labResultsProp]);

  useEffect(() => {
    const handler = (e) => {
      if (Array.isArray(e?.detail?.labResults)) setLabResultsLocal(e.detail.labResults);
      else setLabResultsLocal(getLabResults());
    };
    window.addEventListener(LAB_RESULTS_EVENT, handler);
    return () => window.removeEventListener(LAB_RESULTS_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = () => { setShowLabModal(true); setWellnessSection('labs'); };
    window.addEventListener('tpp:open-lab-sheet', handler);
    return () => window.removeEventListener('tpp:open-lab-sheet', handler);
  }, []);

  useEffect(() => {
    const handler = () => { setShowLabScan(true); setWellnessSection('labs'); };
    window.addEventListener('tpp:open-lab-scan', handler);
    return () => window.removeEventListener('tpp:open-lab-scan', handler);
  }, []);

  const loggedMarkers = useMemo(() => getLoggedMarkerKeys(labResults), [labResults]);

  useEffect(() => {
    if (!selectedSeriesKey && loggedMarkers.length > 0) {
      setSelectedSeriesKey(loggedMarkers[0].seriesKey);
    }
  }, [loggedMarkers, selectedSeriesKey]);

  const activeMarker = useMemo(
    () => loggedMarkers.find((m) => m.seriesKey === selectedSeriesKey) || loggedMarkers[0] || null,
    [loggedMarkers, selectedSeriesKey]
  );

  const labSeries = useMemo(() => {
    if (!activeMarker) return [];
    return getMarkerSeries(labResults, {
      markerKey: activeMarker.key,
      markerName: activeMarker.markerName,
    });
  }, [labResults, activeMarker]);

  const labChart = useMemo(() => {
    if (labSeries.length < 1) return null;
    const values = labSeries.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = max === min ? Math.abs(max) * 0.1 || 1 : (max - min) * 0.15;
    const yMin = min - pad;
    const yMax = max + pad;
    const w = 400;
    const h = 120;
    const pts = labSeries.map((p, i) => {
      const x = labSeries.length === 1 ? w / 2 : (i / (labSeries.length - 1)) * w;
      const y = h - ((p.value - yMin) / (yMax - yMin || 1)) * h;
      return { ...p, x, y };
    });
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { pts, path, w, h, unit: activeMarker?.unit || labSeries[0]?.unit || '' };
  }, [labSeries, activeMarker]);

  const recentLabs = useMemo(
    () => [...(labResults || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 40),
    [labResults]
  );

  const refreshLabs = useCallback(() => {
    const next = getLabResults();
    setLabResultsLocal(next);
    onLabResultsChange?.(next);
  }, [onLabResultsChange]);

  const handleLabSave = useCallback(
    async (data) => {
      if (data?._delete && data.id) {
        deleteLabResult(data.id);
        refreshLabs();
        setShowLabModal(false);
        setEditingLab(null);
        return;
      }
      if (data?.id && editingLab?.id) updateLabResult(data.id, data);
      else addLabResult(data);
      refreshLabs();
      setShowLabModal(false);
      setEditingLab(null);
    },
    [editingLab, refreshLabs]
  );

  useEffect(() => {
    const handler = () => setEffects(loadSideEffects());
    window.addEventListener('tpp:side-effects-updated', handler);
    return () => window.removeEventListener('tpp:side-effects-updated', handler);
  }, []);

  useEffect(() => {
    const handler = () => { setShowSheet(true); setWellnessSection('effects'); };
    window.addEventListener('tpp:open-se-sheet', handler);
    return () => window.removeEventListener('tpp:open-se-sheet', handler);
  }, []);

  const patterns = useMemo(() => getSideEffectPatterns(30), [effects]);
  const repeatPatterns = useMemo(
    () => (patterns || []).filter((p) => (p.count || 0) >= 2),
    [patterns]
  );
  const patternMaxCount = useMemo(
    () => Math.max(1, ...repeatPatterns.map((p) => p.count || 0)),
    [repeatPatterns]
  );

  const last30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    return effects.filter(e => e.date >= cutoffStr);
  }, [effects]);

  // Daily side-effect counts for frequency chart
  const seGraphData = useMemo(() => {
    const byDay = new Map();
    for (const e of effects || []) {
      if (!e?.date || e.effect === 'none') continue;
      byDay.set(e.date, (byDay.get(e.date) || 0) + 1);
    }
    const days = [];
    const now = new Date();
    const span = Math.max(1, seRange);
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ date: key, dateObj: d, count: byDay.get(key) || 0 });
    }
    return days;
  }, [effects, seRange]);

  const seStats = useMemo(() => {
    const total = seGraphData.reduce((s, d) => s + d.count, 0);
    const daysWith = seGraphData.filter((d) => d.count > 0).length;
    const peak = Math.max(0, ...seGraphData.map((d) => d.count));
    const cutoff = seGraphData[0]?.date;
    const counts = {};
    for (const e of effects || []) {
      if (!e?.date || e.effect === 'none') continue;
      if (cutoff && e.date < cutoff) continue;
      const k = e.label || e.effect || 'Other';
      counts[k] = (counts[k] || 0) + 1;
    }
    let top = null;
    let topN = 0;
    for (const [k, n] of Object.entries(counts)) {
      if (n > topN) {
        top = k;
        topN = n;
      }
    }
    return { total, daysWith, peak, top, topN };
  }, [seGraphData, effects]);

  const handleDeleteEffect = useCallback((id) => {
    deleteSideEffect(id);
    setEffects(loadSideEffects());
    setConfirmDeleteId(null);
  }, []);

  const EFFECT_ICONS = {
    none:     { Icon: SmileyWink,         color: '#22c55e' },
    pip:      { Icon: PhSyringe,          color: '#f97316' },
    isr:      { Icon: WarningCircle,  color: '#ef4444' },
    fatigue:  { Icon: BatteryLow,         color: '#a855f7' },
    nausea:   { Icon: Skull,              color: '#eab308' },
    headache: { Icon: Headphones,         color: '#f97316' },
    bloating: { Icon: Balloon,            color: '#64748b' },
    insomnia: { Icon: MoonStars,          color: '#6366f1' },
    mood:     { Icon: PhBrain,            color: '#8b5cf6' },
    other:    { Icon: PencilSimple,       color: '#94a3b8' },
  };
  const fallbackIcon = { Icon: PencilSimple, color: '#94a3b8' };

  // ── Bio-Metrics data ──
  // One card per calendar day (wellness + weight merged)
  const sorted = useMemo(() => groupMetricsByDay(metrics), [metrics]);

  // Lock Daily Logs list height to the collapsed (~5) view so "show more" scrolls in-place
  useEffect(() => {
    if (showAllLogs) return;
    const el = logsListRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    if (h > 0) setLogsBoxHeight(h);
  }, [showAllLogs, sorted]);

  const metricsByDay = useMemo(() => {
    const map = new Map();
    for (const m of metrics || []) {
      const k = metricDateKey(m);
      if (!k) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    }
    return map;
  }, [metrics]);

  const trendDays = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d);
    }
    return days;
  }, [trendRange]);

  const chartData = useMemo(() => trendDays.map((date) => {
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const merged = mergeMetricsForDay(metricsByDay.get(dateKey) || []);
    // 7d: weekday names. 30d/90d: month + day so labels stay clear across month boundaries.
    const dayLabel = trendRange === 7
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      date,
      dateKey,
      dayLabel,
      weight: merged.weight,
      sleep: merged.sleep,
      energy: merged.energy,
      mood: merged.mood,
      pain: merged.pain != null ? (6 - merged.pain) : null,
      painRaw: merged.pain,
      bodyfat: merged.bodyfat,
      weightUnit: merged.weightUnit || 'lbs',
    };
  }), [trendDays, metricsByDay, trendRange]);

  useEffect(() => {
    setSelectedDayIdx(null);
  }, [trendRange]);

  useEffect(() => {
    const bump = () => setCompletionTick((n) => n + 1);
    window.addEventListener('tpp:task-completion-changed', bump);
    return () => window.removeEventListener('tpp:task-completion-changed', bump);
  }, []);

  const selectedDay = selectedDayIdx != null ? chartData[selectedDayIdx] : null;

  const selectedDayDetail = useMemo(() => {
    if (!selectedDay) return null;
    const research = buildDayResearchContext(selectedDay.dateKey, selectedDay.date, {
      protocols,
      supplements,
      reconItems,
      medications,
      oneOffDoses,
      calendarNotes,
    });
    return {
      ...selectedDay,
      fullLabel: selectedDay.date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      research,
    };
  }, [selectedDay, protocols, supplements, reconItems, medications, oneOffDoses, calendarNotes, completionTick]);

  // Smooth open/close + day-switch for "On this day" (grid expand + content crossfade)
  const [otdMounted, setOtdMounted] = useState(false);
  const [otdExpanded, setOtdExpanded] = useState(false);
  const [otdShown, setOtdShown] = useState(null);
  const [otdBodyIn, setOtdBodyIn] = useState(true);
  const otdShownKeyRef = useRef(null);
  const otdPrefersReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const hasOtdSelection = !!(selectedDayIdx != null && selectedDayDetail);

  // Expand / collapse the card shell
  useEffect(() => {
    const reduce = otdPrefersReduced.current;
    const closeMs = reduce ? 0 : 420;
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;

    if (hasOtdSelection) {
      setOtdMounted(true);
      if (reduce) {
        setOtdExpanded(true);
      } else {
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => setOtdExpanded(true));
        });
      }
    } else {
      setOtdExpanded(false);
      timer = window.setTimeout(() => {
        setOtdMounted(false);
        setOtdShown(null);
        otdShownKeyRef.current = null;
        setOtdBodyIn(true);
      }, closeMs);
    }

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (timer) window.clearTimeout(timer);
    };
  }, [hasOtdSelection]);

  // Crossfade body when switching days (card stays open)
  useEffect(() => {
    if (!selectedDayDetail) return;
    const reduce = otdPrefersReduced.current;
    const fadeMs = reduce ? 0 : 200;
    const nextKey = selectedDayDetail.dateKey;
    const prevKey = otdShownKeyRef.current;
    let timer = 0;
    let raf1 = 0;

    if (!prevKey || prevKey === nextKey) {
      otdShownKeyRef.current = nextKey;
      setOtdShown(selectedDayDetail);
      setOtdBodyIn(true);
      return undefined;
    }

    setOtdBodyIn(false);
    timer = window.setTimeout(() => {
      otdShownKeyRef.current = nextKey;
      setOtdShown(selectedDayDetail);
      raf1 = requestAnimationFrame(() => setOtdBodyIn(true));
    }, fadeMs);

    return () => {
      if (timer) window.clearTimeout(timer);
      if (raf1) cancelAnimationFrame(raf1);
    };
  }, [selectedDayDetail]);

  useEffect(() => {
    if (!otdExpanded || !otdMounted) return;
    const el = onThisDayRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: otdPrefersReduced.current ? 'auto' : 'smooth', block: 'nearest' });
    }, 140);
    return () => window.clearTimeout(t);
  }, [otdExpanded, otdMounted]);

  const available = WELLNESS_TREND_KEYS.filter(k => chartData.some(d => d[k] != null));
  const weightChartPoints = useMemo(() =>
    chartData
      .map((d, i) => ({ i, dayLabel: d.dayLabel, w: d.weight }))
      .filter(p => p.w != null && Number.isFinite(p.w)),
  [chartData]);
  const hasWellnessData = available.length > 0;
  const hasWeightData = weightChartPoints.length > 0;
  const hasMetricData = hasWellnessData || hasWeightData;

  const normalize = (v) => {
    if (v == null) return null;
    // Ratings are 1–5 (pain stored inverted as comfort); map to 0–100 chart height
    return ((v - 1) / 4) * 100;
  };

  const mkSmoothPath = (pts) => {
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cx} ${pts[i - 1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  };

  const sparkH = 32;
  const sparkW = 400;
  const xDenom = Math.max(1, chartData.length - 1);
  const cardBorder = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;
  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.05)';
  const labelStep = trendRange === 90 ? 15 : trendRange === 30 ? 5 : 1;

  const SECTION_TABS = [
    { label: 'Health Trends', value: 'metrics' },
    { label: 'Hydration', value: 'hydration' },
    { label: 'Side Effects', value: 'effects' },
    { label: 'Labs', value: 'labs' },
  ];

  const sectionTabIndex = Math.max(0, SECTION_TABS.findIndex((t) => t.value === wellnessSection));
  const sectionTabCount = SECTION_TABS.length;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden gap-4">
      {/* Section toggle — matches Settings Simple/Advanced SegmentedControl */}
      <div
        role="group"
        aria-label="Wellness sections"
        className="flex-shrink-0 relative grid p-1 rounded-full"
        style={{
          gridTemplateColumns: `repeat(${sectionTabCount}, minmax(0, 1fr))`,
          backgroundColor: theme.isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(47,59,58,0.09)',
          boxShadow: theme.isDark
            ? 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04)'
            : 'inset 0 2px 5px rgba(47,59,58,0.14), inset 0 1px 2px rgba(47,59,58,0.08), 0 1px 0 rgba(255,255,255,0.7)',
        }}
      >
        <div
          className="absolute top-1 bottom-1 left-1 rounded-full pointer-events-none"
          style={{
            width: `calc((100% - 8px) / ${sectionTabCount})`,
            transform: `translateX(calc(${sectionTabIndex} * 100%))`,
            transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            backgroundColor: theme.primary || '#7F9E95',
            boxShadow: theme.isDark
              ? `0 4px 14px ${theme.primary}77, 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22)`
              : `0 4px 14px ${theme.primary}55, 0 2px 4px rgba(47,59,58,0.16), inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
          aria-hidden="true"
        />
        {SECTION_TABS.map((t) => {
          const active = wellnessSection === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setWellnessSection(t.value)}
              aria-pressed={active}
              className="relative z-[1] py-2 px-1 rounded-full text-[11px] sm:text-xs font-semibold transition-colors duration-200 leading-tight"
              style={{
                color: active
                  ? (theme.textOnPrimary || '#ffffff')
                  : theme.isDark
                    ? 'rgba(255,255,255,0.45)'
                    : 'rgba(47,59,58,0.45)',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════════ HEALTH TRENDS SECTION ══════════ */}
      {wellnessSection === 'metrics' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-y-contain gap-4">
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-3 sm:p-4 flex-shrink-0" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
            <div>
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ChartBar size={18} weight="duotone" style={{ color: theme.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>Health Trends</h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {TREND_RANGES.map(({ label, value }) => {
                    const active = trendRange === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTrendRange(value)}
                        className="min-w-[2.75rem] px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 focus:outline-none active:scale-95"
                        style={{
                          backgroundColor: active ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                          color: active ? '#fff' : theme.textLight,
                          boxShadow: active ? `0 1px 4px ${theme.primary}40` : 'none',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {hasMetricData ? (
              <>
                {/* Weight — first-class trend (own scale; from check-in or Home quick log) */}
                {hasWeightData ? (() => {
                  const wH = 64, wW = 400, padL = 40, padR = 10, padTop = 6, padBot = 16;
                  const ws = weightChartPoints.map(p => p.w);
                  const minW = Math.min(...ws), maxW = Math.max(...ws);
                  const buf = Math.max((maxW - minW) * 0.2, 1.5);
                  const yMin = minW - buf, yMax = maxW + buf, ySpan = yMax - yMin;
                  const toX = (idx) => padL + (idx / Math.max(1, chartData.length - 1)) * (wW - padL - padR);
                  const toY = (w) => padTop + (1 - (w - yMin) / ySpan) * wH;
                  const svgPts = weightChartPoints.map(p => ({ ...p, x: toX(p.i), y: toY(p.w) }));
                  const linePath = mkSmoothPath(svgPts);
                  const areaPath = svgPts.length >= 2
                    ? `${linePath} L ${svgPts[svgPts.length - 1].x} ${padTop + wH} L ${svgPts[0].x} ${padTop + wH} Z`
                    : '';
                  const minPt = svgPts.reduce((a, b) => a.w < b.w ? a : b);
                  const maxPt = svgPts.reduce((a, b) => a.w > b.w ? a : b);
                  const avg = (ws.reduce((a, b) => a + b, 0) / ws.length).toFixed(1);
                  const delta = ws[ws.length - 1] - ws[0];
                  const yTicks = [maxW, (minW + maxW) / 2, minW];
                  const xStep = trendRange >= 90 ? 15 : trendRange >= 30 ? 5 : 1;
                  const totalH = padTop + wH + padBot;
                  return (
                    <div className="mb-3 p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <Scales size={22} weight="duotone" style={{ color: theme.primary }} />
                          <span className="text-base font-bold uppercase tracking-wide" style={{ color: theme.text }}>Weight</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: theme.textLight }}>
                          <span>avg <strong className="text-sm tabular-nums" style={{ color: theme.text }}>{avg}</strong></span>
                          {ws.length > 1 && (
                            <span className="text-xs font-bold tabular-nums" style={{ color: delta < 0 ? '#4682B4' : delta > 0 ? '#CD5C5C' : theme.textLight }}>
                              {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'} {Math.abs(delta).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <svg width="100%" height={totalH} viewBox={`0 0 ${wW} ${totalH}`} preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="wl-wt-area-g" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={theme.primary} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={theme.primary} stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        {yTicks.map((v, ti) => (
                          <g key={ti}>
                            <line x1={padL} y1={toY(v)} x2={wW - padR} y2={toY(v)} stroke={theme.border} strokeWidth="0.5" opacity="0.4" strokeDasharray={ti === 1 ? '4,4' : '0'} />
                            <text x={padL - 4} y={toY(v) + 4} textAnchor="end" fontSize="10" fill={theme.textLight} opacity="0.85">{v.toFixed(1)}</text>
                          </g>
                        ))}
                        <line x1={padL} y1={padTop + wH} x2={wW - padR} y2={padTop + wH} stroke={theme.border} strokeWidth="1" opacity="0.4" />
                        {areaPath && <path d={areaPath} fill="url(#wl-wt-area-g)" />}
                        {svgPts.length >= 2 && <path d={linePath} fill="none" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />}
                        {svgPts.map((p, pi) => {
                          const isMin = p.i === minPt.i, isMax = p.i === maxPt.i;
                          return (
                            <circle key={pi} cx={p.x} cy={p.y}
                              r={isMin || isMax ? 5 : trendRange >= 30 ? 2 : 3.5}
                              fill={isMax ? '#CD5C5C' : isMin ? '#3D8B6E' : theme.primary}
                              stroke={theme.cardBackground}
                              strokeWidth={isMin || isMax ? 2 : trendRange >= 30 ? 1 : 1.5}
                            />
                          );
                        })}
                        <text x={maxPt.x} y={Math.max(maxPt.y - 9, padTop + 13)} textAnchor="middle" fontSize="10" fill="#CD5C5C" fontWeight="700">{maxPt.w}</text>
                        {minPt.i !== maxPt.i && (
                          <text x={minPt.x} y={Math.min(minPt.y + 16, padTop + wH - 3)} textAnchor="middle" fontSize="10" fill="#3D8B6E" fontWeight="700">{minPt.w}</text>
                        )}
                        {chartData.map((d, ci) => {
                          if (ci % xStep !== 0 && ci !== chartData.length - 1) return null;
                          return <text key={ci} x={toX(ci)} y={padTop + wH + 16} textAnchor="middle" fontSize="10" fill={theme.textLight} opacity="0.7">{d.dayLabel}</text>;
                        })}
                        {chartData.map((d, ci) => {
                          const x = toX(ci);
                          const span = (wW - padL - padR) / Math.max(1, chartData.length);
                          const colW = Math.max(span, 8);
                          const isSel = selectedDayIdx === ci;
                          return (
                            <rect
                              key={`whit-${d.dateKey}`}
                              x={x - colW / 2}
                              y={0}
                              width={colW}
                              height={totalH}
                              fill={isSel ? `${theme.primary}14` : 'transparent'}
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSelectedDayIdx((prev) => (prev === ci ? null : ci))}
                            />
                          );
                        })}
                      </svg>
                      <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#CD5C5C' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#CD5C5C' }} /> High: {maxPt.w}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#3D8B6E' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3D8B6E' }} /> Low: {minPt.w}
                        </div>
                        <div className="text-[10px]" style={{ color: theme.textLight }}>{ws.length} {ws.length === 1 ? 'entry' : 'entries'}</div>
                      </div>
                    </div>
                  );
                })() : (
                  <div
                    className="mb-3 px-3 py-2.5 rounded-xl border flex items-center gap-2"
                    style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.03)' }}
                  >
                    <Scales size={16} weight="duotone" style={{ color: theme.primary, opacity: 0.7 }} />
                    <p className="text-[11px] leading-snug" style={{ color: theme.textLight }}>
                      No weight logged in this range. Tap Check-In to add one.
                    </p>
                  </div>
                )}

                {hasWellnessData && (
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <ActivityPulse size={22} weight="duotone" style={{ color: theme.primary }} />
                      <span className="text-base font-bold uppercase tracking-wide" style={{ color: theme.text }}>Wellness</span>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>Tap a day</span>
                  </div>

                  <div className="space-y-2.5">
                    {available.map((metric) => {
                      const MIcon = trendMetricIcons[metric];
                      const stroke = trendMetricColors[metric];
                      const pts = chartData.map((d, i) => ({
                        i,
                        x: (i / xDenom) * sparkW,
                        y: d[metric] != null ? sparkH - 4 - (normalize(d[metric]) / 100) * (sparkH - 8) : null,
                        raw: metric === 'pain' ? d.painRaw : d[metric],
                      }));
                      const valid = pts.filter((p) => p.y !== null);
                      const linePath = mkSmoothPath(valid);
                      const latest = [...chartData].reverse().find((d) => d[metric] != null);
                      const latestRaw = latest
                        ? (metric === 'pain' ? latest.painRaw : latest[metric])
                        : null;
                      return (
                        <div key={metric} className="flex items-center gap-2 min-w-0">
                          <div className="w-[4.5rem] shrink-0 flex items-center gap-1.5">
                            <MIcon size={14} weight="duotone" className="shrink-0" style={{ color: stroke }} />
                            <span className="text-[11px] font-semibold truncate" style={{ color: theme.text }}>
                              {trendMetricLabels[metric]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 relative" style={{ height: sparkH }}>
                            <svg
                              width="100%"
                              height={sparkH}
                              viewBox={`0 0 ${sparkW} ${sparkH}`}
                              preserveAspectRatio="none"
                              className="block"
                            >
                              <line
                                x1="0" y1={sparkH / 2} x2={sparkW} y2={sparkH / 2}
                                stroke={theme.border} strokeWidth="1" opacity="0.35" strokeDasharray="3 3"
                              />
                              {valid.length >= 2 && (
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke={stroke}
                                  strokeWidth="2"
                                  opacity="0.9"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  vectorEffect="non-scaling-stroke"
                                />
                              )}
                              {valid.map((p) => (
                                <circle
                                  key={p.i}
                                  cx={p.x}
                                  cy={p.y}
                                  r={selectedDayIdx === p.i ? 4 : 3}
                                  fill={stroke}
                                  stroke={theme.cardBackground || '#fff'}
                                  strokeWidth="1.5"
                                  vectorEffect="non-scaling-stroke"
                                />
                              ))}
                              {selectedDayIdx != null && (
                                <line
                                  x1={(selectedDayIdx / xDenom) * sparkW}
                                  y1={0}
                                  x2={(selectedDayIdx / xDenom) * sparkW}
                                  y2={sparkH}
                                  stroke={theme.primary}
                                  strokeWidth="1.25"
                                  strokeDasharray="3 2"
                                  opacity="0.7"
                                  vectorEffect="non-scaling-stroke"
                                />
                              )}
                              {/* Day hit columns */}
                              {chartData.map((d, i) => {
                                const x = (i / xDenom) * sparkW;
                                const colW = Math.max(sparkW / Math.max(1, chartData.length), 8);
                                return (
                                  <rect
                                    key={`hit-${metric}-${d.dateKey}`}
                                    x={x - colW / 2}
                                    y={0}
                                    width={colW}
                                    height={sparkH}
                                    fill={selectedDayIdx === i ? `${theme.primary}12` : 'transparent'}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedDayIdx((prev) => (prev === i ? null : i))}
                                  />
                                );
                              })}
                            </svg>
                          </div>
                          <span
                            className="w-14 shrink-0 text-right text-[10px] font-semibold truncate"
                            style={{ color: latestRaw != null ? stroke : theme.textLight }}
                          >
                            {latestRaw != null ? wellnessLabel(metric, latestRaw) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Shared day labels */}
                  <div className="mt-2 pt-2 border-t relative" style={{ borderColor: theme.border, marginLeft: '4.5rem', marginRight: '3.5rem' }}>
                    <div className="relative h-4">
                      {chartData.map((d, i) => {
                        if (i % labelStep !== 0 && i !== chartData.length - 1) return null;
                        const isSel = selectedDayIdx === i;
                        return (
                          <button
                            key={`lbl-${d.dateKey}`}
                            type="button"
                            onClick={() => setSelectedDayIdx((prev) => (prev === i ? null : i))}
                            className="absolute text-[10px] font-medium -translate-x-1/2 touch-manipulation"
                            style={{
                              left: `${(i / xDenom) * 100}%`,
                              color: isSel ? theme.primary : theme.textLight,
                              fontWeight: isSel ? 700 : 500,
                            }}
                          >
                            {d.dayLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                )}

                {/* Selected day — check-in + research connections */}
                {otdMounted && otdShown && (
                  <div
                    ref={onThisDayRef}
                    className="otd-shell"
                    style={{
                      display: 'grid',
                      gridTemplateRows: otdExpanded ? '1fr' : '0fr',
                      opacity: otdExpanded ? 1 : 0,
                      marginTop: otdExpanded ? '0.75rem' : 0,
                      transition: otdPrefersReduced.current
                        ? 'none'
                        : 'grid-template-rows 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease, margin-top 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <div style={{ overflow: 'hidden', minHeight: 0 }}>
                      <div
                        className="p-3 rounded-xl border"
                        style={{
                          borderColor: `${theme.primary}55`,
                          backgroundColor: theme.isDark ? `${theme.primary}12` : `${theme.primary}0d`,
                          opacity: otdBodyIn ? 1 : 0,
                          transform: otdBodyIn ? 'translateY(0)' : 'translateY(8px)',
                          transition: otdPrefersReduced.current
                            ? 'none'
                            : 'opacity 0.2s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      >
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-2 w-full min-w-0 flex-1">
                        <SunHorizon size={22} weight="duotone" className="shrink-0" style={{ color: '#EAB308' }} />
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
                          On this day
                        </span>
                        <div
                          className="flex-1 h-px min-w-0"
                          style={{
                            background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                          }}
                        />
                        <span className="text-xs font-semibold shrink-0 tabular-nums" style={{ color: theme.text }}>
                          {formatMMDDYYYY(otdShown.date)}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Clear day"
                        onClick={() => setSelectedDayIdx(null)}
                        className="p-1.5 rounded-lg touch-manipulation flex-shrink-0"
                        style={{ color: theme.textLight }}
                      >
                        <X size={16} weight="bold" />
                      </button>
                    </div>

                    {/* Wellness snapshot */}
                    <div className="mb-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                        Check-in
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { key: 'sleep', label: 'Sleep', val: otdShown.sleep },
                          { key: 'energy', label: 'Energy', val: otdShown.energy },
                          { key: 'mood', label: 'Mood', val: otdShown.mood },
                          { key: 'pain', label: 'Pain', val: otdShown.painRaw },
                        ].map((f) => (
                          <span
                            key={f.key}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                            style={{
                              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                              color: f.val != null ? theme.text : theme.textLight,
                              border: `1px solid ${theme.border}`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: trendMetricColors[f.key] || theme.primary }}
                            />
                            {f.label}: {f.val != null ? wellnessLabel(f.key, f.val) : '—'}
                          </span>
                        ))}
                        {otdShown.weight != null && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                            style={{
                              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                              color: theme.text,
                              border: `1px solid ${theme.border}`,
                            }}
                          >
                            <Scales size={12} weight="duotone" style={{ color: theme.primary }} />
                            {otdShown.weight} {otdShown.weightUnit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Research — completed check-offs from calendar / dashboard */}
                    {(() => {
                      const names = (otdShown.research.items || [])
                        .map((item) => item.name)
                        .filter(Boolean);
                      return (
                        <div className="mb-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                            Research tracked
                          </p>
                          {names.length === 0 ? (
                            <p className="text-[11px]" style={{ color: theme.textLight }}>Nothing marked done this day.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {names.map((name) => (
                                <span
                                  key={name}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                                  style={{
                                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                                    color: theme.text,
                                    border: `1px solid ${theme.border}`,
                                  }}
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Side effects */}
                    {otdShown.research.sideEffects.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                          Side effects
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {otdShown.research.sideEffects.map((se) => (
                            <span
                              key={se.id || `${se.effect}-${se.date}`}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold"
                              style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              {se.label || se.effect || 'Effect'}
                              {se.severity ? ` · ${se.severity}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {otdShown.research.note ? (
                      <p className="text-[11px] leading-snug mt-1" style={{ color: theme.textLight }}>
                        Note: {otdShown.research.note}
                      </p>
                    ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-5 px-3 text-center">
                <ActivityPulse size={36} weight="duotone" className="mx-auto mb-2 opacity-30" style={{ color: theme.textLight }} />
                <p className="text-xs sm:text-sm leading-snug" style={{ color: theme.textLight }}>No data for the last {trendRange} days. Use Daily Check-In or the Home weight card to start tracking.</p>
              </div>
            )}
            </div>
          </div>

          {/* Daily Logs — own card, separate from Health Trends */}
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-3 sm:p-4 flex-shrink-0" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SunHorizon size={18} weight="duotone" style={{ color: theme.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>Daily Logs</h3>
                </div>
                {onAddMetric && (
                  <button type="button" onClick={onAddMetric} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold touch-manipulation active:scale-95 transition-all duration-200" style={{ backgroundColor: theme.primary, color: '#fff', boxShadow: 'rgba(0,0,0,0.15) 0px 2px 4px inset, rgba(0,0,0,0.1) 0px 1px 2px inset' }}>
                    <UserCheck size={18} weight="duotone" /> Check-In
                  </button>
                )}
              </div>

              {sorted.length === 0 ? (
                <div className="py-5 px-3 text-center">
                  <ActivityPulse size={36} weight="duotone" className="mx-auto mb-2 opacity-30" style={{ color: theme.textLight }} />
                  <p className="text-xs sm:text-sm" style={{ color: theme.textLight }}>No entries recorded yet.</p>
                </div>
              ) : (
                <div className="flex flex-col min-h-0">
                  <div
                    ref={logsListRef}
                    className="space-y-2 overflow-y-auto overscroll-y-contain pr-0.5"
                    style={{
                      height: showAllLogs && logsBoxHeight ? logsBoxHeight : undefined,
                      maxHeight: showAllLogs && logsBoxHeight ? logsBoxHeight : undefined,
                      scrollbarWidth: 'thin',
                      scrollbarColor: `${theme.border} transparent`,
                    }}
                  >
                  {(showAllLogs ? sorted : sorted.slice(0, 5)).map((m, idx) => {
                    const n = normalizeMetricRow(m);
                    const pills = [];
                    if (n.bodyfat != null) pills.push({ key: 'bf', field: 'bodyfat', icon: ActivityPulse, label: 'Body fat', text: `${n.bodyfat}%`, color: '#D2691E' });
                    if (n.sleep != null) pills.push({ key: 'sl', field: 'sleep', icon: Bed, label: 'Sleep', text: wellnessLabel('sleep', n.sleep), color: trendMetricColors.sleep });
                    if (n.energy != null) pills.push({ key: 'en', field: 'energy', icon: Lightning, label: 'Energy', text: wellnessLabel('energy', n.energy), color: trendMetricColors.energy });
                    if (n.mood != null) pills.push({ key: 'mo', field: 'mood', icon: Smiley, label: 'Mood', text: wellnessLabel('mood', n.mood), color: trendMetricColors.mood });
                    if (n.pain != null) pills.push({ key: 'pa', field: 'pain', icon: ShieldWarning, label: 'Pain', text: wellnessLabel('pain', n.pain), color: trendMetricColors.pain });
                    const hasWeight = n.weight != null;
                    const onlyWellness = !hasWeight && pills.length > 0;
                    const entryTitle = hasWeight ? 'Weight check-in' : onlyWellness ? 'Wellness check-in' : null;
                    return (
                      <button
                        key={m.id || idx}
                        type="button"
                        className="w-full text-left p-3.5 rounded-xl border transition-all hover:shadow-md active:scale-[0.99] touch-manipulation"
                        style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.55)' }}
                        onClick={() => onEditMetric?.(m)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 w-full min-w-0">
                              {entryTitle === 'Wellness check-in' && (
                                <Leaf size={22} weight="duotone" className="shrink-0" style={{ color: '#22c55e' }} />
                              )}
                              {entryTitle === 'Weight check-in' && (
                                <Scales size={22} weight="duotone" className="shrink-0" style={{ color: theme.primary }} />
                              )}
                              {entryTitle ? (
                                <span className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
                                  {entryTitle}
                                </span>
                              ) : (
                                <CalendarBlank size={13} weight="duotone" className="shrink-0 opacity-40" style={{ color: theme.text }} />
                              )}
                              <div
                                className="flex-1 h-px min-w-0"
                                style={{
                                  background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                                }}
                              />
                              <span className="text-xs font-semibold shrink-0 tabular-nums" style={{ color: theme.text }}>
                                {formatMMDDYYYY(m.date)}
                              </span>
                            </div>
                            {hasWeight && (
                              <div className="mt-2 flex items-baseline gap-1.5">
                                <span className="text-2xl font-black tabular-nums leading-none" style={{ color: theme.text }}>{n.weight}</span>
                                <span className="text-sm font-semibold" style={{ color: theme.textLight }}>{n.weightUnit}</span>
                              </div>
                            )}
                          </div>
                          <span className="p-1.5 rounded-lg flex-shrink-0" style={{ color: theme.primary, backgroundColor: `${theme.primary}18` }} aria-hidden>
                            <NotePencil size={20} weight="duotone" />
                          </span>
                        </div>
                        {pills.length > 0 && (
                          <div className="mt-2.5 flex gap-1.5 w-full">
                            {pills.map((p) => (
                              <span
                                key={p.key}
                                className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-semibold"
                                style={{
                                  backgroundColor: `${p.color}22`,
                                  color: theme.text,
                                  border: `1px solid ${p.color}55`,
                                }}
                              >
                                <p.icon size={15} weight="duotone" className="shrink-0" style={{ color: p.color }} />
                                <span className="truncate">
                                  <span style={{ color: p.color, fontWeight: 700 }}>{p.label}</span>
                                  {' · '}
                                  {p.text}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                  </div>
                  {sorted.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllLogs((v) => !v)}
                      className="w-full py-2 text-center text-xs font-semibold touch-manipulation active:opacity-70 flex-shrink-0"
                      style={{ color: theme.primary }}
                    >
                      {showAllLogs ? 'Show less' : `+show more (${sorted.length - 5})`}
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* ══════════ LABS SECTION ══════════ */}
      {wellnessSection === 'labs' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: theme.text }}>
                <Flask size={18} weight="duotone" style={{ color: theme.primary }} />
                Blood / Lab Logs
              </h3>
              <p className="text-xs mt-1 leading-snug" style={{ color: theme.textLight }}>
                Your numbers only — not medical advice.
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowLabScan(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <Scan size={13} weight="bold" />
                Scan
              </button>
              <button
                type="button"
                onClick={() => { setEditingLab(null); setShowLabModal(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95"
                style={{ backgroundColor: `${theme.primary}18`, color: theme.primary, border: `1px solid ${theme.primary}40` }}
              >
                <Plus size={13} weight="bold" />
                Log value
              </button>
            </div>
          </div>

          {loggedMarkers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {loggedMarkers.map((m) => {
                const active = m.seriesKey === (activeMarker?.seriesKey);
                return (
                  <button
                    key={m.seriesKey}
                    type="button"
                    onClick={() => setSelectedSeriesKey(m.seriesKey)}
                    className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: active ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                      color: active ? (theme.textOnPrimary || '#fff') : theme.textLight,
                    }}
                  >
                    {m.markerName}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className="rounded-2xl p-3 sm:p-4"
            style={{ backgroundColor: theme.cardBackground, border: cardBorder }}
          >
            {labChart ? (
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: theme.text }}>
                    {activeMarker?.markerName}
                  </span>
                  {labChart.unit && (
                    <span className="text-[11px]" style={{ color: theme.textLight }}>{labChart.unit}</span>
                  )}
                </div>
                <svg viewBox={`0 0 ${labChart.w} ${labChart.h}`} className="w-full h-[120px]" preserveAspectRatio="none">
                  <path d={labChart.path} fill="none" stroke={theme.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {labChart.pts.map((p) => (
                    <circle key={p.id || `${p.date}-${p.value}`} cx={p.x} cy={p.y} r="4" fill={theme.primary} />
                  ))}
                </svg>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: theme.textLight }}>{labSeries[0]?.date}</span>
                  <span className="text-[10px]" style={{ color: theme.textLight }}>{labSeries[labSeries.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <div className="py-8 px-2 flex flex-col items-center gap-3 text-center">
                <p className="text-sm" style={{ color: theme.textLight }}>
                  No lab values yet. Scan a PDF/photo or log one manually.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLabScan(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)`,
                      color: theme.textOnPrimary || '#fff',
                      border: 'none',
                    }}
                  >
                    <Scan size={14} weight="bold" />
                    Scan report
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingLab(null); setShowLabModal(true); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    <Plus size={14} weight="bold" />
                    Log value
                  </button>
                </div>
              </div>
            )}
          </div>

          {recentLabs.length > 0 && (
            <div className="space-y-3 pb-4">
              <div className="flex items-center gap-2 px-1 w-full min-w-0">
                <Flask size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme.text }} />
                <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
                  Recent entries ({recentLabs.length})
                </h2>
                <div
                  className="flex-1 h-px min-w-0"
                  style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
                />
              </div>
              {recentLabs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setEditingLab(r); setShowLabModal(true); }}
                  className="w-full text-left rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: cardBorder,
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: theme.text }}>{r.markerName}</div>
                    <div className="text-[11px]" style={{ color: theme.textLight }}>{r.date}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold tabular-nums" style={{ color: theme.text }}>
                      {r.value}
                      {r.unit ? <span className="text-xs font-medium ml-1 opacity-60">{r.unit}</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <LabEntryModal
            open={showLabModal}
            onClose={() => { setShowLabModal(false); setEditingLab(null); }}
            theme={theme}
            entry={editingLab}
            onSave={handleLabSave}
          />
          <LabScanReviewModal
            open={showLabScan}
            onClose={() => setShowLabScan(false)}
            theme={theme}
            onSaved={() => refreshLabs()}
          />
        </div>
      )}

      {/* ══════════ HYDRATION SECTION ══════════ */}
      {wellnessSection === 'hydration' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-y-contain">
          <HydrationAnalytics theme={theme} />
        </div>
      )}

      {/* ══════════ SIDE EFFECTS SECTION ══════════ */}
      {wellnessSection === 'effects' && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-4">
          {/* Frequency chart — Hydration / Health Trends style */}
          <div
            className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-3 sm:p-4 flex-shrink-0"
            style={{ backgroundColor: theme.cardBackground, border: cardBorder }}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <ChartBar size={18} weight="duotone" style={{ color: theme.primary }} />
                <h3 className="text-sm font-bold" style={{ color: theme.text }}>Frequency</h3>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {TREND_RANGES.map(({ label, value }) => {
                  const active = seRange === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSeRange(value)}
                      className="min-w-[2.75rem] px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 focus:outline-none active:scale-95"
                      style={{
                        backgroundColor: active ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                        color: active ? '#fff' : theme.textLight,
                        boxShadow: active ? `0 1px 4px ${theme.primary}40` : 'none',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {seStats.total === 0 ? (
              <div className="py-8 px-3 text-center">
                <WarningCircle size={32} weight="duotone" className="mx-auto mb-2 opacity-30" style={{ color: theme.textLight }} />
                <p className="text-xs sm:text-sm" style={{ color: theme.textLight }}>
                  No side effects in the last {seRange} days. Tap Log to start tracking patterns.
                </p>
              </div>
            ) : (() => {
              const dayCount = seGraphData.length;
              const lastIdx = Math.max(dayCount - 1, 1);
              const xStep = seRange >= 90 ? 15 : seRange >= 30 ? 5 : 1;
              const gW = 400;
              const gH = 110;
              const padL = 28;
              const padR = 8;
              const padTop = 8;
              const padBot = 20;
              const yMax = Math.max(seStats.peak, 1) * 1.25;
              const toX = (i) => padL + (i / lastIdx) * (gW - padL - padR);
              const toY = (v) => padTop + (1 - v / yMax) * gH;
              const chartPts = seGraphData.map((d, i) => ({ x: toX(i), y: toY(d.count), count: d.count, i }));
              const linePts = chartPts;
              const linePath = mkSmoothPath(linePts);
              const areaPath = linePts.length >= 2
                ? `${linePath} L ${linePts[linePts.length - 1].x} ${padTop + gH} L ${linePts[0].x} ${padTop + gH} Z`
                : '';
              const totalH = padTop + gH + padBot;
              const barW = Math.max(2, Math.min(10, ((gW - padL - padR) / dayCount) * 0.55));
              const yTicks = [Math.ceil(yMax), Math.ceil(yMax / 2)].filter((v, i, a) => a.indexOf(v) === i && v > 0);
              return (
                <>
                  <div
                    className="p-3 rounded-xl mb-3"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.025)',
                      boxShadow: insetShadow,
                      border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    <svg width="100%" height={totalH} viewBox={`0 0 ${gW} ${totalH}`} preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="se-area-g" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={theme.primary} stopOpacity="0.28" />
                          <stop offset="100%" stopColor={theme.primary} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {yTicks.map((v) => (
                        <g key={v}>
                          <line
                            x1={padL}
                            y1={toY(v)}
                            x2={gW - padR}
                            y2={toY(v)}
                            stroke={theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                            strokeDasharray="3 3"
                          />
                          <text
                            x={padL - 4}
                            y={toY(v) + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill={theme.textLight}
                            opacity="0.7"
                          >
                            {v}
                          </text>
                        </g>
                      ))}
                      {areaPath && <path d={areaPath} fill="url(#se-area-g)" />}
                      {seGraphData.map((d, i) => {
                        if (d.count <= 0) return null;
                        const x = toX(i) - barW / 2;
                        const y = toY(d.count);
                        const h = padTop + gH - y;
                        return (
                          <rect
                            key={`bar-${d.date}`}
                            x={x}
                            y={y}
                            width={barW}
                            height={Math.max(h, 1)}
                            rx={2}
                            fill={theme.primary}
                            opacity="0.35"
                          />
                        );
                      })}
                      {linePts.length >= 2 && (
                        <path
                          d={linePath}
                          fill="none"
                          stroke={theme.primary}
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.95"
                        />
                      )}
                      {chartPts.map((p) => (
                        p.count > 0 ? (
                          <circle
                            key={`pt-${p.i}`}
                            cx={p.x}
                            cy={p.y}
                            r={seRange >= 30 ? 2.5 : 3.5}
                            fill={theme.cardBackground}
                            stroke={theme.primary}
                            strokeWidth="1.5"
                          />
                        ) : null
                      ))}
                      {seGraphData.map((d, i) => {
                        if (i % xStep !== 0 && i !== dayCount - 1) return null;
                        return (
                          <text
                            key={`lbl-${d.date}`}
                            x={toX(i)}
                            y={padTop + gH + 14}
                            textAnchor="middle"
                            fontSize="9"
                            fill={theme.textLight}
                            opacity="0.75"
                          >
                            {seRange === 7
                              ? d.dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                              : d.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </text>
                        );
                      })}
                    </svg>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Total', value: seStats.total, sub: `in ${seRange}d` },
                      { label: 'Days hit', value: seStats.daysWith, sub: `of ${seRange}` },
                      {
                        label: 'Most common',
                        value: seStats.top ? (seStats.top.length > 10 ? `${seStats.top.slice(0, 9)}…` : seStats.top) : '—',
                        sub: seStats.topN ? `${seStats.topN}×` : '—',
                        small: true,
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl px-2.5 py-2 text-center"
                        style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: theme.textLight }}>
                          {stat.label}
                        </div>
                        <div
                          className={`${stat.small ? 'text-sm' : 'text-lg'} font-black tabular-nums leading-tight truncate`}
                          style={{ color: theme.text }}
                          title={stat.label === 'Most common' ? seStats.top || undefined : undefined}
                        >
                          {stat.value}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>{stat.sub}</div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Pattern summary — only repeats (count >= 2) */}
          {repeatPatterns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 w-full min-w-0">
                <ChartBar size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme?.text }} />
                <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme?.text }}>
                  Patterns ({repeatPatterns.length > 6 ? '6+' : repeatPatterns.length} in 30 days)
                </h2>
                <div
                  className="flex-1 h-px min-w-0"
                  style={{ background: `linear-gradient(to right, ${theme?.primary}55 0%, ${theme?.primary}22 45%, transparent 100%)` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {repeatPatterns.slice(0, 6).map((p) => {
                  const ei = EFFECT_ICONS[p.effect] || fallbackIcon;
                  const EIcon = ei.Icon;
                  const barPct = Math.round(((p.count || 0) / patternMaxCount) * 100);
                  return (
                    <div
                      key={p.effect}
                      className="rounded-xl p-3"
                      style={{ backgroundColor: theme?.cardBackground || '#fff', border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}` }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${ei.color}18`, color: ei.color }}>
                          <EIcon size={16} weight="duotone" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold truncate block" style={{ color: theme?.text }}>{p.label}</span>
                          <p className="text-[11px] tabular-nums" style={{ color: theme?.textLight }}>
                            {p.count}×{p.lastDate ? ` · last ${formatMMDDYYYY(p.lastDate)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: theme?.isDark ? `${ei.color}22` : `${ei.color}18` }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barPct}%`, backgroundColor: ei.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent log */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1 w-full min-w-0">
              <WarningCircle size={14} weight="duotone" className="opacity-40 shrink-0" style={{ color: theme?.text }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme?.text }}>
                Recent ({last30.length} in 30 days)
              </h2>
              <div
                className="flex-1 h-px min-w-0"
                style={{ background: `linear-gradient(to right, ${theme?.primary}55 0%, ${theme?.primary}22 45%, transparent 100%)` }}
              />
              <button
                type="button"
                onClick={() => setShowSheet(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0 touch-manipulation active:scale-95 transition-all duration-200"
                style={{
                  backgroundColor: theme?.primary || '#7F9E95',
                  color: '#fff',
                  boxShadow: 'rgba(0,0,0,0.15) 0px 2px 4px inset, rgba(0,0,0,0.1) 0px 1px 2px inset',
                }}
              >
                <Plus size={16} weight="bold" />
                Log
              </button>
            </div>
            {last30.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ backgroundColor: theme?.cardBackground || '#fff', border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}` }}>
                <p className="text-sm" style={{ color: theme?.textLight }}>No side effects logged yet. Tap Log to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {last30.slice(0, 20).map((e) => {
                  const ei = EFFECT_ICONS[e.effect] || fallbackIcon;
                  const EIcon = ei.Icon;
                  const confirming = confirmDeleteId === e.id;
                  const pills = [];
                  if (e.severity) {
                    pills.push({
                      key: 'sev',
                      label: 'Severity',
                      text: e.severity,
                      color: e.severity === 'severe' ? '#ef4444' : e.severity === 'moderate' ? '#f97316' : '#22c55e',
                    });
                  }
                  if (e.protocolName) {
                    pills.push({
                      key: 'proto',
                      label: 'Protocol',
                      text: e.protocolName,
                      color: theme.primary || '#7F9E95',
                    });
                  }
                  if (e.source === 'ai_chat') {
                    pills.push({
                      key: 'src',
                      label: 'Source',
                      text: 'via PiP',
                      color: '#8b5cf6',
                    });
                  }
                  return (
                    <div
                      key={e.id}
                      className="w-full text-left p-3.5 rounded-xl border transition-all"
                      style={{
                        borderColor: theme.border,
                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 w-full min-w-0">
                            <EIcon size={22} weight="duotone" className="shrink-0" style={{ color: ei.color }} />
                            <span className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0 truncate" style={{ color: theme.text }}>
                              {e.label || e.effect}
                            </span>
                            <div
                              className="flex-1 h-px min-w-0"
                              style={{
                                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                              }}
                            />
                            <span className="text-xs font-semibold shrink-0 tabular-nums" style={{ color: theme.text }}>
                              {formatMMDDYYYY(e.date)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirming) handleDeleteEffect(e.id);
                            else setConfirmDeleteId(e.id);
                          }}
                          onBlur={() => {
                            if (confirming) setConfirmDeleteId(null);
                          }}
                          className={`py-1.5 px-1 text-[11px] font-semibold shrink-0 touch-manipulation transition-all ${confirming ? 'tap-confirm-pop' : ''}`}
                          style={{ color: confirming ? '#8B5335' : '#C67A5C' }}
                        >
                          {confirming ? 'Tap Again to Confirm!' : 'Delete'}
                        </button>
                      </div>
                      {pills.length > 0 && (
                        <div className="mt-2.5 flex gap-1.5 w-full flex-wrap">
                          {pills.map((p) => (
                            <span
                              key={p.key}
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-semibold"
                              style={{
                                backgroundColor: `${p.color}22`,
                                color: theme.text,
                                border: `1px solid ${p.color}55`,
                              }}
                            >
                              <span className="truncate">
                                <span style={{ color: p.color, fontWeight: 700 }}>{p.label}</span>
                                {' · '}
                                {p.text}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      {e.notes ? (
                        <p className="mt-2 text-xs leading-snug" style={{ color: theme.textLight }}>
                          {e.notes}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <SideEffectsQuickSheet open={showSheet} onClose={() => setShowSheet(false)} theme={theme} />
    </div>
  );
}

function ResearchAnalytics({ theme }) {
  const { hasAdvancedInsights } = useTierAccess();
  const { subscriptionStatus } = useSubscriptionAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isTrialUser = subscriptionStatus === 'trialing';
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <AnalyticsDashboard
        theme={theme}
        showFullScreenLink={false}
        fullPage
        allSections
        isPremium={hasAdvancedInsights}
        isTrialUser={isTrialUser}
        onUpgradeClick={() => setShowUpgradeModal(true)}
      />
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        theme={theme}
      />
    </div>
  );
}

export default function InsightsPage() {
  const { theme } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { firebaseUser } = useFirebase();
  const { metrics, setMetrics, protocols, reconItems, reconHistory, supplements, orders, vendors, calendarNotes, stockpile, scheduledBuys, labResults, setLabResults, medications, oneOffDoses } = useAppContext();

  const activeTab = parseInsightsTab(searchParams);

  const setActiveTab = useCallback((tab) => {
    if (!INSIGHTS_TABS.includes(tab)) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [showMetricModal, setShowMetricModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState(null);

  const openAdd = useCallback(() => {
    const today = getLocalDateString();
    const existing = getMergedMetricForDay(metrics, today);
    setEditingMetric(existing || null);
    setShowMetricModal(true);
  }, [metrics]);

  const openEdit = useCallback((metric) => {
    const dateKey = metricDateKey(metric) || metric?.date;
    const merged = dateKey ? getMergedMetricForDay(metrics, dateKey) : null;
    setEditingMetric(merged || metric);
    setShowMetricModal(true);
  }, [metrics]);

  useEffect(() => {
    // FAB + topbar + only offer Insights data entry — never global protocol/order/stockpile actions
    const insightActions = [
      { label: 'Daily Check-In', Icon: ActivityPulse, onClick: openAdd },
      { label: 'Scan Lab Report', Icon: Scan, onClick: () => window.dispatchEvent(new CustomEvent('tpp:open-lab-scan')) },
      { label: 'Log Lab Value', Icon: DropHalf, onClick: () => window.dispatchEvent(new CustomEvent('tpp:open-lab-sheet')) },
      { label: 'Log Side Effect', Icon: WarningCircle, onClick: () => window.dispatchEvent(new CustomEvent('tpp:open-se-sheet')) },
    ];
    const detail = {
      tabs: [
        { value: 'wellness', label: 'Wellness' },
        { value: 'research', label: 'Analytics' },
      ],
      activeTab,
      onTabChange: setActiveTab,
      actionItems: insightActions,
      actionDisabled: false,
    };
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { detail }));
    return () => { window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs')); };
  }, [activeTab, openAdd, setActiveTab]);

  const buildAppData = useCallback((next) => ({
    protocols: protocols || [], reconItems: reconItems || [], reconHistory: reconHistory || [],
    supplements: supplements || [], orders: orders || [], metrics: next,
    vendors: vendors || [], calendarNotes: calendarNotes || {}, stockpile: stockpile || [], scheduledBuys: scheduledBuys || [],
  }), [protocols, reconItems, reconHistory, supplements, orders, vendors, calendarNotes, stockpile, scheduledBuys]);

  const syncCloud = useCallback(async (next) => {
    if (!firebaseUser) return;
    try { await saveAppData(firebaseUser.uid, buildAppData(next), { skipMerge: true }); } catch {}
  }, [firebaseUser, buildAppData]);

  const handleSave = async (metric) => {
    const now = new Date().toISOString();
    const keepId = editingMetric?.id || metric?.id || generateId();
    const payload = { ...metric, id: keepId };
    delete payload._dayEntryIds;
    const updated = upsertMetricForDay(metrics, payload, { keepId, now });
    // Record deletions for collapsed same-day duplicates (sync)
    const dateKey = metricDateKey(payload) || payload.date;
    if (dateKey) {
      const keptIds = new Set(updated.filter((m) => metricDateKey(m) === dateKey).map((m) => m.id));
      (metrics || []).forEach((m) => {
        if (metricDateKey(m) === dateKey && m.id && !keptIds.has(m.id)) {
          recordDeletion('metrics', m.id, m);
        }
      });
    }
    setMetrics(updated);
    setShowMetricModal(false);
    setEditingMetric(null);
    await syncCloud(updated);
  };

  const handleDelete = async () => {
    if (!editingMetric?.id) return;
    const dateKey = metricDateKey(editingMetric) || editingMetric.date;
    const idsToRemove = new Set(
      (editingMetric._dayEntryIds?.length
        ? editingMetric._dayEntryIds
        : (metrics || []).filter((m) => metricDateKey(m) === dateKey).map((m) => m.id)
      ).filter(Boolean)
    );
    if (idsToRemove.size === 0) idsToRemove.add(editingMetric.id);

    (metrics || []).forEach((m) => {
      if (idsToRemove.has(m.id)) recordDeletion('metrics', m.id, m);
    });
    const updated = (metrics || []).filter((m) => !idsToRemove.has(m.id));
    setMetrics(updated);
    setShowMetricModal(false);
    setEditingMetric(null);
    await syncCloud(updated);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full max-w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <h1 className="sr-only">Insights</h1>

      <div className="px-3 sm:px-4 pb-4 pt-3 flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === 'research' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <ResearchAnalytics theme={theme} />
          </div>
        )}
        {activeTab === 'wellness' && (
          <WellnessAnalytics
            theme={theme}
            protocols={protocols}
            supplements={supplements}
            reconItems={reconItems}
            medications={medications}
            oneOffDoses={oneOffDoses}
            calendarNotes={calendarNotes}
            metrics={metrics}
            labResults={labResults}
            onAddMetric={openAdd}
            onEditMetric={openEdit}
            onLabResultsChange={setLabResults}
          />
        )}
      </div>

      <BodyMetricsModal
        open={showMetricModal}
        onClose={() => { setShowMetricModal(false); setEditingMetric(null); }}
        onSave={handleSave}
        onDelete={editingMetric ? handleDelete : undefined}
        theme={theme}
        metric={editingMetric}
      />
    </div>
  );
}
