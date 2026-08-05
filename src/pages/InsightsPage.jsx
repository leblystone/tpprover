import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import BodyMetricsModal from '../components/research/BodyMetricsModal';
import CustomDropdown from '../components/common/inputs/CustomDropdown';
import { useTierAccess, useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import UpgradeModal from '../components/common/UpgradeModal';
import { saveAppData } from '../services/cloudStorage';
import { generateId } from '../utils/string';
import { recordDeletion } from '../utils/deletionTracking';
import { formatMMDDYYYY } from '../utils/date';
import { getWaterDayAmount, getWaterDayGoal, getHydrationStreakData, tryHydrationGoalRewards } from '../utils/hydrationStreak';
import { metricDateKey, normalizeMetricRow, mergeMetricsForDay, wellnessLabel } from '../utils/metricsDisplay';
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
import { generateTaskId, isTaskCompleted, getCompletionStats } from '../utils/taskCompletion';
import { getOneOffDosesForDate } from '../utils/oneOffDoses';
import { getCalendarNoteText } from '../utils/calendarNotesMigration';
import {
  Drop, Pulse as ActivityPulse, ChartBar, CalendarBlank, CalendarDot, Scales, SunHorizon,
  Plus, Minus, Flame, Bed, Lightning, Smiley, ShieldWarning, Trash,
  SmileyWink, Syringe as PhSyringe, WarningCircle, BatteryLow,
  Skull, Headphones, Balloon, MoonStars,
  Brain as PhBrain, PencilSimple, NotePencil, Flask, DropHalf, UserCheck, CheckCircle, Circle, X, Scan, PintGlass,
} from '@phosphor-icons/react';
import hydrationGoalsImg from '../assets/hydration_goals.png';

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
            0%   { transform: translateY(6px) scale(0.5); opacity: 0; }
            18%  { opacity: 0.9; }
            100% { transform: translateY(-48px) scale(1); opacity: 0; }
          }
          @keyframes hyd-cup-wave {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Drop size={18} weight="duotone" style={{ color: W_BLUE }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Water Intake</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${W_BLUE}20`, color: W_BLUE }}>
            <Flame size={13} weight="duotone" />
            <span>{streakSnap.streak} day streak</span>
          </div>
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr] gap-2 sm:gap-3 items-center">
          {/* Col 1 (2fr): water cup + controls */}
          <div className="min-w-0 flex flex-col items-center justify-center">
            <div className="relative w-[64px] h-[92px] sm:w-[72px] sm:h-[104px]">
              <svg width="100%" height="100%" viewBox="0 0 80 118" className="absolute inset-0 w-full h-full" aria-hidden>
                <defs>
                  <clipPath id="hyd-cup-inner">
                    <path d="M22 20 L26 96 Q40 106 54 96 L58 20 Z" />
                  </clipPath>
                  <linearGradient id="hyd-cup-water" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95">
                      <animate attributeName="stop-color" values="#e0f2fe;#7dd3fc;#bae6fd;#e0f2fe" dur="2.8s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="45%" stopColor="#7dd3fc" stopOpacity="0.9">
                      <animate attributeName="stop-color" values="#7dd3fc;#38bdf8;#3b9ed8;#7dd3fc" dur="2.8s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95">
                      <animate attributeName="stop-color" values="#0369a1;#0284c7;#0c4a6e;#0369a1" dur="2.8s" repeatCount="indefinite" />
                    </stop>
                  </linearGradient>
                  <linearGradient id="hyd-cup-glass" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={theme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)'} />
                    <stop offset="35%" stopColor="rgba(255,255,255,0)" />
                    <stop offset="100%" stopColor={theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(59,158,216,0.08)'} />
                  </linearGradient>
                </defs>

                <path
                  d="M20 18 L24 98 Q40 110 56 98 L60 18 Z"
                  fill={theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(186,230,253,0.22)'}
                  stroke={W_BLUE}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />

                <g clipPath="url(#hyd-cup-inner)">
                  <rect
                    x="18"
                    y={108 - waterFillPct * 88}
                    width="44"
                    height={waterFillPct * 88 + 8}
                    fill="url(#hyd-cup-water)"
                    style={{ transition: 'y 0.6s ease, height 0.6s ease' }}
                  />
                  {waterFillPct > 0.04 && (
                    <g style={{ animation: 'hyd-cup-wave 2.4s linear infinite' }}>
                      <path
                        d={`M10 ${108 - waterFillPct * 88 + 2} C22 ${108 - waterFillPct * 88 - 3} 34 ${108 - waterFillPct * 88 + 6} 46 ${108 - waterFillPct * 88 + 1} C58 ${108 - waterFillPct * 88 - 3} 70 ${108 - waterFillPct * 88 + 5} 90 ${108 - waterFillPct * 88 + 1} L90 118 L10 118 Z`}
                        fill="#bae6fd"
                        opacity="0.55"
                      />
                    </g>
                  )}
                </g>

                <path d="M24 24 L27 90" stroke="url(#hyd-cup-glass)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
                <ellipse cx="40" cy="18" rx="21" ry="5.5" fill="none" stroke={W_BLUE} strokeWidth="2.4" />
                <ellipse cx="40" cy="18" rx="16" ry="3.2" fill={theme.isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.45)'} stroke={W_BLUE} strokeWidth="1" opacity="0.7" />
              </svg>

              <div
                className="absolute left-[18%] right-[18%] top-[20%] bottom-[12%] overflow-hidden pointer-events-none"
                style={{ clipPath: 'polygon(8% 0%, 92% 0%, 82% 100%, 18% 100%)' }}
                aria-hidden
              >
                {[
                  { left: '28%', size: 3, delay: '0s', dur: '2.3s' },
                  { left: '52%', size: 4, delay: '0.6s', dur: '2.7s' },
                  { left: '40%', size: 3, delay: '1.2s', dur: '2.1s' },
                ].map((b, i) => (
                  <span
                    key={i}
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: b.left,
                      width: b.size,
                      height: b.size,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      boxShadow: `0 0 0 1px ${W_BLUE}44`,
                      animation: waterFillPct > 0.08 ? `hyd-bubble-rise ${b.dur} ease-in infinite` : 'none',
                      animationDelay: b.delay,
                      opacity: waterFillPct > 0.08 ? 1 : 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <button
                type="button"
                onClick={() => adjustWater(-cupStep)}
                disabled={todayAmt <= 0}
                aria-label={`Remove ${cupStep} ${currentUnit.abbrev}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center touch-manipulation active:scale-90 transition-transform disabled:opacity-30"
                style={{
                  backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: theme.text,
                }}
              >
                <Minus size={13} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => adjustWater(cupStep)}
                aria-label={`Add ${cupStep} ${currentUnit.abbrev}`}
                className="w-7 h-7 rounded-lg flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
                style={{
                  backgroundColor: `${W_BLUE}28`,
                  color: W_BLUE,
                }}
              >
                <Plus size={13} weight="bold" />
              </button>
            </div>

            <div className="mt-1 text-center leading-none">
              <div className="text-sm font-black tabular-nums" style={{ color: W_BLUE }}>
                {Math.round(todayPct * 100)}%
              </div>
              <div className="text-[9px] font-medium" style={{ color: theme.textLight }}>today</div>
            </div>
          </div>

          {/* Col 2 (1fr): Today + Goal days */}
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

          {/* Col 3 (1fr): illustration */}
          <div className="min-w-0 self-stretch overflow-hidden flex items-end justify-center rounded-xl">
            <img
              src={hydrationGoalsImg}
              alt=""
              className="w-full h-full max-h-[140px] object-contain object-bottom select-none pointer-events-none"
              draggable={false}
            />
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

/** Wellness rating series for the multi-line chart. Weight has its own scale/chart below. */
const WELLNESS_TREND_KEYS = ['sleep', 'energy', 'mood', 'pain'];
const trendMetricColors = { sleep: '#4682B4', energy: '#DAA520', mood: '#CD5C5C', pain: '#708090' };
const trendMetricLabels = { sleep: 'Sleep', energy: 'Energy', mood: 'Mood', pain: 'Pain' };


function buildDayResearchContext(dateKey, dateObj, { protocols, supplements, reconItems, medications, oneOffDoses, calendarNotes }) {
  const scheduled = calculateScheduledTasksForDate(
    dateObj,
    protocols || [],
    supplements || [],
    reconItems || [],
    medications || []
  );
  const stats = getCompletionStats(dateKey, scheduled);
  const items = [];
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
      };
      const taskId = generateTaskId(task);
      items.push({
        id: taskId,
        name: p.name || 'Peptide',
        detail: [p.dose, p.unit].filter(Boolean).join(''),
        slot,
        kind: 'peptide',
        completed: isTaskCompleted(taskId, dateKey, slot),
      });
    });
    (slotData.supplements || []).forEach((s) => {
      if (typeof s === 'object' && (s._skipped || s._rescheduled)) return;
      const name = typeof s === 'string' ? s : s?.name;
      if (!name) return;
      const task = { name, type: 'supplement', time: slot };
      const taskId = generateTaskId(task);
      items.push({
        id: taskId,
        name,
        detail: typeof s === 'object' ? [s.dose, s.unit].filter(Boolean).join('') : '',
        slot,
        kind: 'supplement',
        completed: isTaskCompleted(taskId, dateKey, slot),
      });
    });
  });
  const oneOffs = getOneOffDosesForDate(dateKey, oneOffDoses).map((d) => ({
    id: `oneoff-${d.id}`,
    name: d.peptideName || 'One-off dose',
    detail: [d.dose, d.unit].filter(Boolean).join(''),
    slot: d.timeSlot || 'AM',
    kind: 'one_off',
    completed: true,
  }));
  return {
    items: [...items, ...oneOffs],
    stats,
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
  const [effects, setEffects] = useState(() => loadSideEffects());
  const [showSheet, setShowSheet] = useState(false);
  const [filter, setFilter] = useState('all');
  const [trendRange, setTrendRange] = useState(7);
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

  const filtered = useMemo(() => {
    if (filter === 'all') return effects;
    return effects.filter(e => e.protocolId === filter);
  }, [effects, filter]);

  const last30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
    return filtered.filter(e => e.date >= cutoffStr);
  }, [filtered]);

  const handleDeleteEffect = useCallback((id) => {
    deleteSideEffect(id);
    setEffects(loadSideEffects());
  }, []);

  const activeProtocols = protocols.filter(p => p.active !== false);

  const filterOptions = [
    { label: 'All protocols', value: 'all' },
    ...activeProtocols.map(p => ({ label: p.protocolName || 'Untitled', value: p.id })),
  ];

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
  const sorted = useMemo(() => [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date)), [metrics]);

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
  }, [selectedDay, protocols, supplements, reconItems, medications, oneOffDoses, calendarNotes]);

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

  const cH = 72, cW = 400, lH = 18;
  const xDenom = Math.max(1, chartData.length - 1);
  const cardBorder = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;
  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.05)';

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
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-3 sm:p-4 flex flex-col flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
            <div className="flex-shrink-0">
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ChartBar size={18} weight="duotone" style={{ color: theme.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>Health trends</h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {TREND_RANGES.map(({ label, value }) => {
                    const active = trendRange === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTrendRange(value)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all duration-200 focus:outline-none active:scale-95"
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
              <p className="text-[11px] leading-snug pl-0.5" style={{ color: theme.textLight }}>
                Weight and daily check-ins, merged by day. Tap a day to connect check-in with research.
              </p>
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
                      No weight in this range — add it in Daily Check-In or the Home weight card.
                    </p>
                  </div>
                )}

                {hasWellnessData && (
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <ActivityPulse size={22} weight="duotone" style={{ color: theme.primary }} />
                      <span className="text-base font-bold uppercase tracking-wide" style={{ color: theme.text }}>Wellness</span>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>Tap a day</span>
                  </div>
                  <svg width="100%" height={cH + lH} viewBox={`0 0 ${cW} ${cH + lH}`} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      {available.map(metric => (
                        <linearGradient key={metric} id={`wt-${metric}-g`} x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={trendMetricColors[metric]} stopOpacity="0.2" />
                          <stop offset="100%" stopColor={trendMetricColors[metric]} stopOpacity="0" />
                        </linearGradient>
                      ))}
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map((r) => (
                      <line key={r} x1="0" y1={cH * r} x2={cW} y2={cH * r} stroke={theme.border} strokeWidth="0.5"
                        opacity={r === 0 || r === 1 ? 0.45 : 0.18} strokeDasharray={r === 0 || r === 1 ? '0' : '4,4'} />
                    ))}
                    {available.map((metric) => {
                      const pts = chartData.map((d, i) => ({
                        x: (i / xDenom) * cW,
                        y: d[metric] != null ? cH - (normalize(d[metric]) / 100) * cH : null,
                      }));
                      const valid = pts.filter((p) => p.y !== null);
                      if (valid.length < 1) return null;
                      const stroke = trendMetricColors[metric];
                      const linePath = mkSmoothPath(valid);
                      const areaPath = valid.length >= 2
                        ? `${linePath} L ${valid[valid.length - 1].x} ${cH} L ${valid[0].x} ${cH} Z`
                        : '';
                      return (
                        <g key={metric}>
                          {areaPath && <path d={areaPath} fill={`url(#wt-${metric}-g)`} />}
                          {valid.length >= 2 && (
                            <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.5" opacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                          {valid.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r={trendRange >= 30 ? 2 : 3.5} fill={stroke} stroke={theme.cardBackground} strokeWidth={trendRange >= 30 ? 1 : 1.5} />
                          ))}
                        </g>
                      );
                    })}
                    {chartData.map((d, i) => {
                      const step = trendRange === 90 ? 15 : trendRange === 30 ? 5 : 1;
                      if (i % step !== 0 && i !== chartData.length - 1) return null;
                      const isSel = selectedDayIdx === i;
                      return (
                        <text
                          key={i}
                          x={(i / xDenom) * cW}
                          y={cH + 18}
                          textAnchor="middle"
                          fontSize="11"
                          fill={isSel ? theme.primary : theme.textLight}
                          fontWeight={isSel ? 700 : 500}
                        >
                          {d.dayLabel}
                        </text>
                      );
                    })}
                    {/* Invisible day hit columns — tap to inspect check-in + research */}
                    {chartData.map((d, i) => {
                      const x = (i / xDenom) * cW;
                      const colW = Math.max(cW / Math.max(1, chartData.length), trendRange >= 90 ? 6 : 12);
                      const isSel = selectedDayIdx === i;
                      return (
                        <g key={`hit-${d.dateKey}`}>
                          {isSel && (
                            <line
                              x1={x}
                              y1={0}
                              x2={x}
                              y2={cH}
                              stroke={theme.primary}
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                              opacity="0.75"
                            />
                          )}
                          <rect
                            x={x - colW / 2}
                            y={0}
                            width={colW}
                            height={cH + lH}
                            fill={isSel ? `${theme.primary}14` : 'transparent'}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedDayIdx((prev) => (prev === i ? null : i))}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex flex-wrap justify-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                    {available.map((k) => (
                      <div key={k} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: trendMetricColors[k] }} />
                        <span className="text-xs" style={{ color: theme.text }}>{trendMetricLabels[k]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Selected day — check-in + research connections */}
                {selectedDayDetail && (
                  <div
                    className="mt-3 p-3 rounded-xl border"
                    style={{
                      borderColor: `${theme.primary}55`,
                      backgroundColor: theme.isDark ? `${theme.primary}12` : `${theme.primary}0d`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: theme.text }}>
                          {selectedDayDetail.fullLabel}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: theme.textLight }}>
                          Check-in + what you tracked that day
                        </p>
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
                          { key: 'sleep', label: 'Sleep', val: selectedDayDetail.sleep },
                          { key: 'energy', label: 'Energy', val: selectedDayDetail.energy },
                          { key: 'mood', label: 'Mood', val: selectedDayDetail.mood },
                          { key: 'pain', label: 'Pain', val: selectedDayDetail.painRaw },
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
                        {selectedDayDetail.weight != null && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
                            style={{
                              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                              color: theme.text,
                              border: `1px solid ${theme.border}`,
                            }}
                          >
                            <Scales size={12} weight="duotone" style={{ color: theme.primary }} />
                            {selectedDayDetail.weight} {selectedDayDetail.weightUnit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Research / doses */}
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>
                          Research tracked
                        </p>
                        {selectedDayDetail.research.stats.total > 0 && (
                          <span className="text-[10px] font-semibold tabular-nums" style={{ color: theme.primary }}>
                            {selectedDayDetail.research.stats.completed}/{selectedDayDetail.research.stats.total} done
                          </span>
                        )}
                      </div>
                      {selectedDayDetail.research.items.length === 0 ? (
                        <p className="text-[11px]" style={{ color: theme.textLight }}>No doses scheduled this day.</p>
                      ) : (
                        <ul className="space-y-1 max-h-36 overflow-y-auto">
                          {selectedDayDetail.research.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px]"
                              style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
                                border: `1px solid ${theme.border}`,
                              }}
                            >
                              {item.completed ? (
                                <CheckCircle size={14} weight="fill" style={{ color: theme.primary }} className="flex-shrink-0" />
                              ) : (
                                <Circle size={14} weight="regular" style={{ color: theme.textLight }} className="flex-shrink-0" />
                              )}
                              <span className="font-semibold truncate min-w-0 flex-1" style={{ color: theme.text }}>
                                {item.name}
                                {item.detail ? ` · ${item.detail}` : ''}
                              </span>
                              <span className="text-[10px] font-medium flex-shrink-0" style={{ color: theme.textLight }}>
                                {item.slot}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Side effects */}
                    {selectedDayDetail.research.sideEffects.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.textLight }}>
                          Side effects
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedDayDetail.research.sideEffects.map((se) => (
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

                    {selectedDayDetail.research.note ? (
                      <p className="text-[11px] leading-snug mt-1" style={{ color: theme.textLight }}>
                        Note: {selectedDayDetail.research.note}
                      </p>
                    ) : null}
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

            {/* Entries — scroll inside card; main Insights column does not scroll */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
              <div className="flex-shrink-0 flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <SunHorizon size={18} weight="duotone" style={{ color: theme.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>Daily Logs</h3>
                </div>
                {onAddMetric && (
                  <button type="button" onClick={onAddMetric} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold touch-manipulation active:scale-95 transition-all duration-200" style={{ backgroundColor: theme.primary, color: '#fff', boxShadow: 'rgba(0,0,0,0.15) 0px 2px 4px inset, rgba(0,0,0,0.1) 0px 1px 2px inset' }}>
                    <UserCheck size={18} weight="duotone" /> Check-In
                  </button>
                )}
              </div>

              {sorted.length === 0 ? (
                <div className="flex-shrink-0 py-5 px-3 text-center">
                  <ActivityPulse size={36} weight="duotone" className="mx-auto mb-2 opacity-30" style={{ color: theme.textLight }} />
                  <p className="text-xs sm:text-sm" style={{ color: theme.textLight }}>No entries recorded yet.</p>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${theme.border} transparent` }}>
                  {sorted.map((m, idx) => {
                    const n = normalizeMetricRow(m);
                    const pills = [];
                    if (n.bodyfat != null) pills.push({ key: 'bf', field: 'bodyfat', icon: ActivityPulse, label: 'Body fat', text: `${n.bodyfat}%`, color: '#D2691E' });
                    if (n.sleep != null) pills.push({ key: 'sl', field: 'sleep', icon: Bed, label: 'Sleep', text: wellnessLabel('sleep', n.sleep), color: trendMetricColors.sleep });
                    if (n.energy != null) pills.push({ key: 'en', field: 'energy', icon: Lightning, label: 'Energy', text: wellnessLabel('energy', n.energy), color: trendMetricColors.energy });
                    if (n.mood != null) pills.push({ key: 'mo', field: 'mood', icon: Smiley, label: 'Mood', text: wellnessLabel('mood', n.mood), color: trendMetricColors.mood });
                    if (n.pain != null) pills.push({ key: 'pa', field: 'pain', icon: ShieldWarning, label: 'Pain', text: wellnessLabel('pain', n.pain), color: trendMetricColors.pain });
                    const hasWeight = n.weight != null;
                    const onlyWellness = !hasWeight && pills.length > 0;
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
                            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: theme.textLight }}>
                              <CalendarBlank size={13} weight="duotone" style={{ color: theme.primary }} />
                              {formatMMDDYYYY(new Date(m.date))}
                            </div>
                            {hasWeight && (
                              <div className="mt-2 flex items-baseline gap-1.5">
                                <Scales size={18} weight="duotone" className="flex-shrink-0 opacity-80" style={{ color: theme.primary }} />
                                <span className="text-2xl font-black tabular-nums leading-none" style={{ color: theme.text }}>{n.weight}</span>
                                <span className="text-sm font-semibold" style={{ color: theme.textLight }}>{n.weightUnit}</span>
                              </div>
                            )}
                            {onlyWellness && (
                              <div className="mt-2 text-xs font-medium" style={{ color: theme.text }}>Wellness check-in</div>
                            )}
                          </div>
                          <span className="p-1.5 rounded-lg flex-shrink-0" style={{ color: theme.primary, backgroundColor: `${theme.primary}18` }} aria-hidden>
                            <NotePencil size={20} weight="duotone" />
                          </span>
                        </div>
                        {pills.length > 0 && (
                          <div className="mt-2.5 flex flex-nowrap justify-center gap-1 overflow-x-auto">
                            {pills.map((p) => (
                              <span
                                key={p.key}
                                className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap flex-shrink-0"
                                style={{
                                  backgroundColor: `${p.color}22`,
                                  color: theme.text,
                                  border: `1px solid ${p.color}55`,
                                }}
                              >
                                <p.icon size={12} weight="duotone" style={{ color: p.color }} />
                                <span>
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
              )}
            </div>
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
            <div className="space-y-2 pb-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>
                Recent entries
              </p>
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
          {/* Log button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
              style={{ backgroundColor: `${theme?.primary || '#7F9E95'}18`, color: theme?.primary || '#7F9E95', border: `1px solid ${theme?.primary || '#7F9E95'}40` }}
            >
              <WarningCircle size={13} weight="duotone" />
              Log side effect
            </button>
          </div>

          {/* Filter by protocol */}
          {activeProtocols.length > 1 && (
            <CustomDropdown value={filter} onChange={setFilter} options={filterOptions} theme={theme} outlined customShadow />
          )}

          {/* Pattern summary cards */}
          {effects.length > 0 && patterns.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>Patterns (last 30 days)</p>
              <div className="grid grid-cols-2 gap-2">
                {patterns.slice(0, 6).map(p => {
                  const ei = EFFECT_ICONS[p.effect] || fallbackIcon;
                  const EIcon = ei.Icon;
                  return (
                    <div
                      key={p.effect}
                      className="rounded-xl p-3"
                      style={{ backgroundColor: theme?.cardBackground || '#fff', border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${ei.color}18`, color: ei.color }}>
                          <EIcon size={16} weight="duotone" />
                        </div>
                        <span className="text-sm font-semibold truncate" style={{ color: theme?.text }}>{p.label}</span>
                      </div>
                      <p className="text-[11px]" style={{ color: theme?.textLight }}>
                        {p.count}× logged{p.lastDate ? ` · last ${p.lastDate}` : ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent log */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>
              Recent ({last30.length} in 30 days)
            </p>
            {last30.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ backgroundColor: theme?.cardBackground || '#fff', border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}` }}>
                <p className="text-sm" style={{ color: theme?.textLight }}>No side effects logged yet. Tap "Log side effect" to start tracking.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {last30.slice(0, 20).map(e => {
                  const ei = EFFECT_ICONS[e.effect] || fallbackIcon;
                  const EIcon = ei.Icon;
                  return (
                    <div
                      key={e.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ backgroundColor: theme?.cardBackground || '#fff', border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}` }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${ei.color}18`, color: ei.color }}>
                        <EIcon size={18} weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: theme?.text }}>{e.label || e.effect}</p>
                        <p className="text-[10px]" style={{ color: theme?.textLight }}>
                          {e.date}{e.severity ? ` · ${e.severity}` : ''}{e.protocolName ? ` · ${e.protocolName}` : ''}{e.source === 'ai_chat' ? ' · via PiP' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEffect(e.id)}
                        className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                        style={{ color: theme?.textLight }}
                        title="Delete"
                      >
                        <Trash size={14} weight="duotone" />
                      </button>
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
    <>
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
    </>
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
    setEditingMetric(null);
    setShowMetricModal(true);
  }, []);

  const openEdit = useCallback((metric) => {
    setEditingMetric(metric);
    setShowMetricModal(true);
  }, []);

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
    let updated;
    if (editingMetric?.id) {
      updated = metrics.map(m => m.id === editingMetric.id ? { ...m, ...metric, id: editingMetric.id, updatedAt: now } : m);
    } else if (metric.id) {
      updated = metrics.map(m => m.id === metric.id ? { ...m, ...metric, updatedAt: now } : m);
    } else {
      updated = [...metrics, { ...metric, id: generateId(), createdAt: now, updatedAt: now }];
    }
    setMetrics(updated);
    setShowMetricModal(false);
    setEditingMetric(null);
    await syncCloud(updated);
  };

  const handleDelete = async () => {
    if (!editingMetric?.id) return;
    recordDeletion('metrics', editingMetric.id, editingMetric);
    const updated = metrics.filter(m => m.id !== editingMetric.id);
    setMetrics(updated);
    setShowMetricModal(false);
    setEditingMetric(null);
    await syncCloud(updated);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden w-full max-w-full h-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <h1 className="sr-only">Insights</h1>

      <div className="px-3 sm:px-4 pb-4 pt-1 flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === 'research' && (
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scrollbar-hide">
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
