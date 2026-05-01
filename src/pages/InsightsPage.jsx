import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Droplets, Activity, BarChart3, Calendar, Weight, Edit, Plus, Flame, Bed, Zap, Smile, ShieldAlert } from 'lucide-react';
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
import { getWaterDayAmount, getWaterDayGoal, getHydrationStreakData } from '../utils/hydrationStreak';
import { metricDateKey, normalizeMetricRow, mergeMetricsForDay, wellnessLabel } from '../utils/metricsDisplay';
import { loadSideEffects, getSideEffectPatterns, deleteSideEffect } from '../utils/sideEffectsLog';
import SideEffectsQuickSheet from '../components/sideeffects/SideEffectsQuickSheet';
import { AlertCircle, Trash2 } from 'lucide-react';
import {
  SmileyWink, Syringe as PhSyringe, WarningCircle, BatteryLow,
  Skull, Headphones, Balloon, MoonStars,
  Brain as PhBrain, PencilSimple,
} from '@phosphor-icons/react';

const INSIGHTS_TABS = ['research', 'wellness'];

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

function parseInsightsTab(searchParams) {
  const t = searchParams.get('tab');
  if (t === 'metrics' || t === 'hydration') return 'wellness';
  if (INSIGHTS_TABS.includes(t)) return t;
  return 'research';
}

// ─── Hydration analytics ───────────────────────────────────────────────
function HydrationAnalytics({ theme }) {
  const [waterData, setWaterData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_water_tracker') || '{}'); } catch { return {}; }
  });
  const [streakSnap, setStreakSnap] = useState(() => getHydrationStreakData());

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
      return { unit: s.hydration?.unit || 'oz', dailyGoal: s.hydration?.dailyGoal ?? 64 };
    } catch {
      return { unit: 'oz', dailyGoal: 64 };
    }
  }, [waterData]);

  const today = new Date().toISOString().split('T')[0];
  const todayRow = waterData[today];
  const todayAmt = getWaterDayAmount(todayRow || {});
  const todayGoal = getWaterDayGoal(todayRow || {}, settingsDefaults.dailyGoal);
  const todayUnit = (todayRow && todayRow.unit) || settingsDefaults.unit;
  const currentUnit = waterUnits[todayUnit] || waterUnits.oz;

  const graphData = useMemo(() => {
    const defGoal = settingsDefaults.dailyGoal;
    const defUnit = settingsDefaults.unit;
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
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
  }, [waterData, settingsDefaults.dailyGoal, settingsDefaults.unit]);

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
  const goalDaysLast30 = graphData.filter(d => d.goal > 0 && d.amount >= d.goal).length;
  const todayPct = todayGoal > 0 ? Math.min(todayAmt / todayGoal, 1) : 0;
  const isGoalHit = todayPct >= 1;

  // Ring geometry
  const ringR = 40, ringCx = 50, ringCy = 50;
  const circ = 2 * Math.PI * ringR;
  const ringFill = todayPct * circ;

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets size={18} style={{ color: theme.primary }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Hydration</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${W_BLUE}20`, color: W_BLUE }}>
            <Flame size={13} />
            <span>{streakSnap.streak} day streak</span>
          </div>
        </div>

        {/* Ring + stat boxes — 3 equal columns */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center justify-center rounded-xl py-2" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
            <svg width="84" height="84" viewBox="0 0 100 100">
              <circle cx={ringCx} cy={ringCy} r={ringR} fill="none"
                stroke={theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} strokeWidth="9" />
              {todayPct > 0 && (
                <circle cx={ringCx} cy={ringCy} r={ringR} fill="none"
                  stroke={isGoalHit ? '#22c55e' : W_BLUE}
                  strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${ringFill} ${circ}`}
                  transform={`rotate(-90 ${ringCx} ${ringCy})`}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              )}
              <text x={ringCx} y={ringCy - 4} textAnchor="middle" fontSize="17" fontWeight="800" fill={isGoalHit ? '#22c55e' : theme.text}>
                {Math.round(todayPct * 100)}%
              </text>
              <text x={ringCx} y={ringCy + 13} textAnchor="middle" fontSize="9" fill={theme.textLight}>today</text>
            </svg>
          </div>

          <div className="rounded-xl p-3 flex flex-col justify-center" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Streak</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tabular-nums" style={{ color: W_BLUE }}>{streakSnap.streak}</span>
              <span className="text-xs" style={{ color: theme.textLight }}>days</span>
            </div>
          </div>

          <div className="rounded-xl p-3 flex flex-col justify-center" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.textLight }}>Goal days</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black tabular-nums" style={{ color: W_BLUE }}>{goalDaysLast30}</span>
              <span className="text-xs" style={{ color: theme.textLight }}>of 30</span>
            </div>
          </div>
        </div>

        {/* Today progress bar */}
        <div className="mt-4">
          <style>{`
            @keyframes hyd-water-flow {
              0%   { background-position: 200% 50%; }
              100% { background-position: -100% 50%; }
            }
            @keyframes hyd-goal-pulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.82; }
            }
          `}</style>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium" style={{ color: theme.text }}>Today's intake</span>
            <span className="text-xs font-semibold" style={{ color: isGoalHit ? '#22c55e' : W_BLUE }}>
              {currentUnit.abbrev === 'L' ? todayAmt.toFixed(2) : Math.round(todayAmt)} / {todayGoal} {currentUnit.abbrev}
              {isGoalHit && ' ✓'}
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.09)' : `${W_BLUE}18`, boxShadow: insetShadow }}>
            <div
              style={{
                height: '100%',
                borderRadius: '9999px',
                width: `${Math.min(todayPct * 100, 100)}%`,
                transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
                background: isGoalHit
                  ? 'linear-gradient(90deg,#22c55e,#4ade80,#22c55e)'
                  : `linear-gradient(90deg, ${W_BLUE}bb, ${W_BLUE}, #7dd3fc, #bae6fd, #7dd3fc, ${W_BLUE}, ${W_BLUE}bb)`,
                backgroundSize: '300% 100%',
                animation: isGoalHit
                  ? 'hyd-goal-pulse 1.8s ease-in-out infinite'
                  : 'hyd-water-flow 2.2s linear infinite',
              }}
            />
          </div>
        </div>

        <p className="text-[11px] mt-3 leading-relaxed text-center" style={{ color: theme.textLight }}>
          Hit your daily target from the home water card to grow your streak. Credit counts once per day when intake meets or exceeds your goal.
        </p>
      </div>

      {/* ── Card 2: Chart + History ──────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} style={{ color: W_BLUE }} />
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Daily Totals (Last 30 Days)</h3>
        </div>

        {hasData ? (() => {
          const gW = 400, gH = 110, padL = 36, padR = 8, padTop = 8, padBot = 20;
          const activeDays = graphData.filter(d => d.amount > 0);
          const maxAmt = Math.max(...graphData.map(d => d.amount), 1);
          const goalLine = settingsDefaults.dailyGoal;
          const yMax = Math.max(maxAmt, goalLine) * 1.12;
          const toX = (i) => padL + (i / 29) * (gW - padL - padR);
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
                    if (i % 5 !== 0 && i !== 29) return null;
                    return <text key={i} x={toX(i)} y={padTop + gH + 16} textAnchor="middle" fontSize="10" fill={theme.textLight} opacity="0.65">{d.dateObj.getDate()}</text>;
                  })}
                </svg>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Avg Daily', val: avgAmt > 0 ? avgAmt.toFixed(1) : '—', sub: currentUnit.abbrev },
                  { label: 'Best Day', val: bestAmt > 0 ? bestAmt.toFixed(1) : '—', sub: currentUnit.abbrev },
                  { label: 'Days Tracked', val: activeDays.length, sub: 'of 30' },
                ].map(stat => (
                  <div key={stat.label} className="text-center rounded-xl py-2.5 px-2" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
                    <div className="text-[10px] mb-0.5 opacity-60" style={{ color: theme.textLight }}>{stat.label}</div>
                    <div className="text-base font-bold tabular-nums" style={{ color: W_BLUE }}>{stat.val}</div>
                    <div className="text-[10px] opacity-60" style={{ color: theme.textLight }}>{stat.sub}</div>
                  </div>
                ))}
              </div>
            </>
          );
        })() : (
          <div className="p-8 text-center">
            <Droplets size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No hydration data yet. Log water from the home dashboard!</p>
          </div>
        )}

        {/* History merged below chart */}
        <div className="mt-5 pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} style={{ color: W_BLUE }} />
            <h4 className="text-sm font-bold" style={{ color: theme.text }}>Daily History</h4>
          </div>
          {historyData.length > 0 ? (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${theme.border} transparent` }}>
              {historyData.map(entry => {
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

/** Line chart series — body fat omitted from multi-axis chart (noisy / often empty); still shown per-entry when logged. */
const trendMetricColors = { weight: '#8B4513', sleep: '#4682B4', energy: '#DAA520', mood: '#CD5C5C', pain: '#708090' };
const trendMetricLabels = { weight: 'Weight', sleep: 'Sleep', energy: 'Energy', mood: 'Mood', pain: 'Pain' };

const TREND_RANGES = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];


// ─── Wellness (Bio-Metrics + Side Effects combined) ───────────────────
function WellnessAnalytics({ theme, protocols = [], metrics = [], onAddMetric, onEditMetric }) {
  const [wellnessSection, setWellnessSection] = useState('metrics');
  const [effects, setEffects] = useState(() => loadSideEffects());
  const [showSheet, setShowSheet] = useState(false);
  const [filter, setFilter] = useState('all');
  const [trendRange, setTrendRange] = useState(7);

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
    const cutoffStr = cutoff.toISOString().slice(0, 10);
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
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const merged = mergeMetricsForDay(metricsByDay.get(dateStr) || []);
    const dayLabel = trendRange === 7
      ? date.toLocaleDateString('en-US', { weekday: 'short' })
      : String(date.getDate());
    return {
      date,
      dayLabel,
      weight: merged.weight,
      sleep: merged.sleep,
      energy: merged.energy,
      mood: merged.mood,
      pain: merged.pain != null ? (6 - merged.pain) : null,
    };
  }), [trendDays, metricsByDay, trendRange]);

  const available = Object.keys(trendMetricColors).filter(k => chartData.some(d => d[k] != null));
  const hasMetricData = chartData.some(d => {
    const { date, dayLabel, ...v } = d;
    return Object.values(v).some(x => x !== null);
  });

  const weightChartPoints = useMemo(() =>
    chartData
      .map((d, i) => ({ i, dayLabel: d.dayLabel, w: d.weight }))
      .filter(p => p.w != null && Number.isFinite(p.w)),
  [chartData]);

  const normalize = (v, t) => {
    if (v == null) return null;
    switch (t) {
      case 'weight': return Math.max(0, Math.min(100, ((v - 100) / 200) * 100));
      default: return ((v - 1) / 4) * 100;
    }
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

  const cH = 140, cW = 400, lH = 24;
  const xDenom = Math.max(1, chartData.length - 1);
  const cardBorder = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;
  const subtleBg = theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const insetShadow = 'inset 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 2px rgba(0,0,0,0.05)';

  const SECTION_TABS = [
    { label: 'Health Trends', value: 'metrics' },
    { label: 'Hydration', value: 'hydration' },
    { label: 'Side Effects', value: 'effects' },
  ];

  return (
    <div className="space-y-4">
      {/* Section toggle */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: subtleBg, boxShadow: insetShadow }}>
        {SECTION_TABS.map(t => {
          const active = wellnessSection === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setWellnessSection(t.value)}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200"
              style={{
                backgroundColor: active ? (theme.cardBackground || '#fff') : 'transparent',
                color: active ? theme.text : theme.textLight,
                boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ══════════ HEALTH TRENDS SECTION ══════════ */}
      {wellnessSection === 'metrics' && (
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: cardBorder }}>
            <div className="flex flex-col gap-1 mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 size={18} style={{ color: theme.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>Health trends ({trendRange} days)</h3>
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
                Each day merges quick weight logs and full bio-metric saves. Lines below are sleep, energy, mood, and comfort (inverted pain scale).
              </p>
            </div>

            {hasMetricData ? (
              <>
                <div className="p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
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
                        y: d[metric] != null ? cH - (normalize(d[metric], metric) / 100) * cH : null,
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
                      return (
                        <text key={i} x={(i / xDenom) * cW} y={cH + 18} textAnchor="middle" fontSize="11" fill={theme.textLight} fontWeight="500">{d.dayLabel}</text>
                      );
                    })}
                  </svg>
                </div>

                {weightChartPoints.length > 0 && (() => {
                  const wH = 110, wW = 400, padL = 44, padR = 10, padTop = 10, padBot = 22;
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
                    <div className="mt-4 p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.03)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Weight size={12} style={{ color: theme.primary }} />
                          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>Weight trend</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]" style={{ color: theme.textLight }}>
                          <span>avg <strong style={{ color: theme.text }}>{avg}</strong></span>
                          {ws.length > 1 && (
                            <span style={{ color: delta < 0 ? '#4682B4' : delta > 0 ? '#CD5C5C' : theme.textLight, fontWeight: 700 }}>
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
                              fill={isMax ? '#CD5C5C' : isMin ? '#4682B4' : theme.primary}
                              stroke={theme.cardBackground}
                              strokeWidth={isMin || isMax ? 2 : trendRange >= 30 ? 1 : 1.5}
                            />
                          );
                        })}
                        <text x={maxPt.x} y={Math.max(maxPt.y - 9, padTop + 13)} textAnchor="middle" fontSize="10" fill="#CD5C5C" fontWeight="700">{maxPt.w}</text>
                        {minPt.i !== maxPt.i && (
                          <text x={minPt.x} y={Math.min(minPt.y + 16, padTop + wH - 3)} textAnchor="middle" fontSize="10" fill="#4682B4" fontWeight="700">{minPt.w}</text>
                        )}
                        {chartData.map((d, ci) => {
                          if (ci % xStep !== 0 && ci !== chartData.length - 1) return null;
                          return <text key={ci} x={toX(ci)} y={padTop + wH + 16} textAnchor="middle" fontSize="10" fill={theme.textLight} opacity="0.7">{d.dayLabel}</text>;
                        })}
                      </svg>
                      <div className="flex items-center gap-4 mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#CD5C5C' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#CD5C5C' }} /> High: {maxPt.w}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#4682B4' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4682B4' }} /> Low: {minPt.w}
                        </div>
                        <div className="text-[10px] ml-auto" style={{ color: theme.textLight }}>{ws.length} {ws.length === 1 ? 'entry' : 'entries'}</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap gap-3 mt-3">
                  {available.map((k) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: trendMetricColors[k] }} />
                      <span className="text-xs" style={{ color: theme.text }}>{trendMetricLabels[k]}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <Activity size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
                <p className="text-sm" style={{ color: theme.textLight }}>No data for the last {trendRange} days. Log weight from the home card or add a full entry with Log.</p>
              </div>
            )}

            {/* Entries list */}
            <div className="mt-5 pt-4 border-t" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} style={{ color: theme.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: theme.text }}>Entries</h3>
                </div>
                {onAddMetric && (
                  <button type="button" onClick={onAddMetric} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold touch-manipulation active:scale-95 transition-all duration-200" style={{ backgroundColor: theme.primary, color: '#fff', boxShadow: 'rgba(0,0,0,0.15) 0px 2px 4px inset, rgba(0,0,0,0.1) 0px 1px 2px inset' }}>
                    <Plus size={14} /> Log
                  </button>
                )}
              </div>

              {sorted.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
                  <p className="text-sm" style={{ color: theme.textLight }}>No entries recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${theme.border} transparent` }}>
                  {sorted.map((m, idx) => {
                    const n = normalizeMetricRow(m);
                    const pills = [];
                    if (n.bodyfat != null) pills.push({ key: 'bf', icon: Activity, label: 'Body fat', text: `${n.bodyfat}%` });
                    if (n.sleep != null) pills.push({ key: 'sl', icon: Bed, label: 'Sleep', text: wellnessLabel('sleep', n.sleep) });
                    if (n.energy != null) pills.push({ key: 'en', icon: Zap, label: 'Energy', text: wellnessLabel('energy', n.energy) });
                    if (n.mood != null) pills.push({ key: 'mo', icon: Smile, label: 'Mood', text: wellnessLabel('mood', n.mood) });
                    if (n.pain != null) pills.push({ key: 'pa', icon: ShieldAlert, label: 'Pain', text: wellnessLabel('pain', n.pain) });
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
                              <Calendar size={13} style={{ color: theme.primary }} />
                              {formatMMDDYYYY(new Date(m.date))}
                            </div>
                            {hasWeight && (
                              <div className="mt-2 flex items-baseline gap-1.5">
                                <Weight size={18} className="flex-shrink-0 opacity-80" style={{ color: theme.primary }} />
                                <span className="text-2xl font-black tabular-nums leading-none" style={{ color: theme.text }}>{n.weight}</span>
                                <span className="text-sm font-semibold" style={{ color: theme.textLight }}>{n.weightUnit}</span>
                              </div>
                            )}
                            {onlyWellness && (
                              <div className="mt-2 text-xs font-medium" style={{ color: theme.text }}>Wellness check-in</div>
                            )}
                          </div>
                          <span className="p-1.5 rounded-lg flex-shrink-0" style={{ color: theme.textLight, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} aria-hidden>
                            <Edit size={15} />
                          </span>
                        </div>
                        {pills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {pills.map((p) => (
                              <span
                                key={p.key}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold"
                                style={{ backgroundColor: `${theme.primary}14`, color: theme.text }}
                              >
                                <p.icon size={11} style={{ color: theme.primary, opacity: 0.85 }} />
                                {p.text}
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

      {/* ══════════ HYDRATION SECTION ══════════ */}
      {wellnessSection === 'hydration' && (
        <HydrationAnalytics theme={theme} />
      )}

      {/* ══════════ SIDE EFFECTS SECTION ══════════ */}
      {wellnessSection === 'effects' && (
        <div className="space-y-4">
          {/* Log button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-transform"
              style={{ backgroundColor: `${theme?.primary || '#7F9E95'}18`, color: theme?.primary || '#7F9E95', border: `1px solid ${theme?.primary || '#7F9E95'}40` }}
            >
              <AlertCircle size={13} />
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
                        <Trash2 size={14} />
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
  const { metrics, setMetrics, protocols, reconItems, reconHistory, supplements, orders, vendors, calendarNotes, stockpile, scheduledBuys } = useAppContext();

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
    const detail = {
      tabs: [
        { value: 'research', label: 'Overview' },
        { value: 'wellness', label: 'Wellness' },
      ],
      activeTab,
      onTabChange: setActiveTab,
    };
    if (activeTab === 'wellness') {
      detail.actionItems = [
        { label: 'Log Bio Metric', onClick: openAdd },
        { label: 'Log Side Effect', onClick: () => window.dispatchEvent(new CustomEvent('tpp:open-se-sheet')) },
      ];
      detail.actionDisabled = false;
    }
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
    <div className="min-h-full w-full max-w-full" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <h1 className="sr-only">Insights</h1>

      <div className="px-3 sm:px-4 pb-4 pt-1">
        {activeTab === 'research' && <ResearchAnalytics theme={theme} />}
        {activeTab === 'wellness' && <WellnessAnalytics theme={theme} protocols={protocols} metrics={metrics} onAddMetric={openAdd} onEditMetric={openEdit} />}
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
