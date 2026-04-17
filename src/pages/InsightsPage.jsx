import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Droplets, Activity, BarChart3, Calendar, Weight, Edit, Plus, Flame, Bed, Zap, Smile, ShieldAlert } from 'lucide-react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import BodyMetricsModal from '../components/research/BodyMetricsModal';
import UpgradeModal from '../components/common/UpgradeModal';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import { saveAppData } from '../services/cloudStorage';
import { generateId } from '../utils/string';
import { recordDeletion } from '../utils/deletionTracking';
import { formatMMDDYYYY } from '../utils/date';
import { getWaterDayAmount, getWaterDayGoal, getHydrationStreakData } from '../utils/hydrationStreak';
import { metricDateKey, normalizeMetricRow, mergeMetricsForDay, wellnessLabel } from '../utils/metricsDisplay';

const INSIGHTS_TABS = ['research', 'metrics', 'hydration'];

const RESEARCH_INNER_TABS = [
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
        days.push({
          date: key,
          dateObj: d,
          amount: amt,
          goal,
          unit,
          progress: goal > 0 ? Math.min(amt / goal, 1) : 0,
        });
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
        return {
          date,
          dateObj: new Date(date),
          amount: amt,
          goal,
          unit,
          progress: goal > 0 ? Math.min(amt / goal, 1) : 0,
        };
      })
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [waterData, settingsDefaults.dailyGoal, settingsDefaults.unit]);

  const hasData = graphData.some(d => d.amount > 0);
  const goalDaysLast30 = graphData.filter(d => d.goal > 0 && d.amount >= d.goal).length;

  return (
    <div className="space-y-5">
      {/* Gamification: streak + recent wins */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={18} style={{ color: theme.primary }} />
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Hydration streak</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1" style={{ color: theme.textLight }}>Current streak</div>
            <div className="text-2xl font-black tabular-nums" style={{ color: theme.primary }}>{streakSnap.streak}</div>
            <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>consecutive days hitting goal</div>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1" style={{ color: theme.textLight }}>Last 30 days</div>
            <div className="text-2xl font-black tabular-nums" style={{ color: theme.primary }}>{goalDaysLast30}</div>
            <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>days goal completed</div>
          </div>
        </div>
        <p className="text-xs mt-2 font-medium" style={{ color: theme.text }}>
          Today: {currentUnit.abbrev === 'L' ? todayAmt.toFixed(2) : Math.round(todayAmt)} / {todayGoal} {currentUnit.abbrev}
        </p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: theme.textLight }}>
          Hit your daily target from the home water card to grow your streak. Credit counts once per day when intake meets or exceeds your goal.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} style={{ color: theme.primary }} />
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Daily Totals (Last 30 Days)</h3>
        </div>

        {hasData ? (
          <>
            <div className="h-56 sm:h-64 relative">
              <svg width="100%" height="100%" viewBox="0 0 400 256" className="rounded-lg" preserveAspectRatio="none">
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                  <line key={i} x1="40" y1={256 * r} x2="380" y2={256 * r} stroke={theme.border} strokeWidth="0.5" opacity="0.2" strokeDasharray={r === 0 || r === 1 ? '0' : '2,2'} />
                ))}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                  const maxAmt = Math.max(...graphData.map(d => d.amount), 1);
                  const val = maxAmt * (1 - r);
                  return <text key={i} x="35" y={256 * r + 4} textAnchor="end" fontSize="10" fill={theme.textLight} opacity="0.7">{val > 0 ? (currentUnit.abbrev === 'L' ? val.toFixed(1) : Math.round(val)) : '0'}</text>;
                })}
                {graphData.map((day, idx) => {
                  if (day.amount === 0) return null;
                  const maxAmt = Math.max(...graphData.map(d => d.amount), 1);
                  const bh = (day.amount / maxAmt) * 200;
                  const bw = 320 / graphData.length;
                  const x = 40 + idx * bw + bw * 0.1;
                  const y = 230 - bh;
                  return (
                    <g key={day.date}>
                      <defs><linearGradient id={`hg-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={theme.primary} stopOpacity="0.8" /><stop offset="100%" stopColor={theme.primary} stopOpacity="0.4" /></linearGradient></defs>
                      <rect x={x} y={y} width={bw * 0.8} height={bh} fill={`url(#hg-${idx})`} rx="4" style={{ transition: 'all 0.3s ease' }} />
                      {day.goal > 0 && <line x1={x} y1={230 - (day.goal / maxAmt) * 200} x2={x + bw * 0.8} y2={230 - (day.goal / maxAmt) * 200} stroke={theme.primary} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.55" />}
                      {idx % 5 === 0 && <text x={x + bw * 0.4} y="250" textAnchor="middle" fontSize="9" fill={theme.textLight} opacity="0.6">{day.dateObj.getDate()}</text>}
                    </g>
                  );
                })}
                <line x1="40" y1="230" x2="380" y2="230" stroke={theme.border} strokeWidth="1.5" />
              </svg>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: theme.border }}>
              <div className="text-center">
                <div className="text-xs opacity-60" style={{ color: theme.textLight }}>Avg Daily</div>
                <div className="text-base font-bold" style={{ color: theme.primary }}>
                  {graphData.filter(d => d.amount > 0).length > 0 ? (graphData.reduce((s, d) => s + d.amount, 0) / graphData.filter(d => d.amount > 0).length).toFixed(1) : '0'}
                </div>
                <div className="text-xs opacity-60" style={{ color: theme.textLight }}>{currentUnit.abbrev}</div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-60" style={{ color: theme.textLight }}>Best Day</div>
                <div className="text-base font-bold" style={{ color: theme.primary }}>{Math.max(...graphData.map(d => d.amount), 0).toFixed(1)}</div>
                <div className="text-xs opacity-60" style={{ color: theme.textLight }}>{currentUnit.abbrev}</div>
              </div>
              <div className="text-center">
                <div className="text-xs opacity-60" style={{ color: theme.textLight }}>Days Tracked</div>
                <div className="text-base font-bold" style={{ color: theme.primary }}>{graphData.filter(d => d.amount > 0).length}</div>
                <div className="text-xs opacity-60" style={{ color: theme.textLight }}>of 30</div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <Droplets size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No hydration data yet. Log water from the home dashboard or the hydration widget to start tracking!</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} style={{ color: theme.primary }} />
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Daily History</h3>
        </div>

        {historyData.length > 0 ? (
          <div className="space-y-1.5 max-h-[32rem] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: `${theme.border} transparent` }}>
            {historyData.map(entry => {
              const isToday = entry.date === today;
              const unit = waterUnits[entry.unit] || waterUnits.glasses;
              const display = unit.abbrev === 'L' ? entry.amount.toFixed(1) : Math.round(entry.amount);
              return (
                <div key={entry.date} className="p-2.5 rounded-lg border transition-all hover:shadow-sm" style={{ borderColor: isToday ? theme.primary : theme.border, backgroundColor: isToday ? theme.primary + '10' : theme.isDark ? 'rgba(0,0,0,0.2)' : theme.cardBackground, boxShadow: isToday ? `0 1px 4px ${theme.primary}20` : 'none' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                      <span className="text-xs font-medium truncate" style={{ color: theme.text }}>{entry.dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>Today</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: theme.text }}>{display} <span className="text-xs font-normal opacity-70">{unit.abbrev}</span></div>
                        {entry.goal > 0 && <div className="text-[10px] leading-tight" style={{ color: theme.textLight }}>{Math.round(entry.progress * 100)}% of {entry.goal}</div>}
                      </div>
                      {entry.progress >= 1 && entry.goal > 0 && <span className="text-xs" style={{ color: theme.primary }}>✓</span>}
                    </div>
                  </div>
                  {entry.goal > 0 && (
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: theme.border + '30' }}>
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(entry.progress * 100, 100)}%`, background: `linear-gradient(90deg, ${theme.primary}, ${theme.primary}dd)` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No history yet. Start tracking on the dashboard!</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Line chart series — body fat omitted from multi-axis chart (noisy / often empty); still shown per-entry when logged. */
const trendMetricColors = { weight: '#8B4513', sleep: '#4682B4', energy: '#DAA520', mood: '#CD5C5C', pain: '#708090' };
const trendMetricLabels = { weight: 'Weight', sleep: 'Sleep', energy: 'Energy', mood: 'Mood', pain: 'Pain' };

function MetricsAnalytics({ theme, metrics, onAdd, onEdit }) {
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

  const last7Days = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d);
    }
    return days;
  }, []);

  const chartData = useMemo(() => last7Days.map((date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const merged = mergeMetricsForDay(metricsByDay.get(dateStr) || []);
    return {
      date,
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      weight: merged.weight,
      sleep: merged.sleep,
      energy: merged.energy,
      mood: merged.mood,
      pain: merged.pain != null ? (6 - merged.pain) : null,
    };
  }), [last7Days, metricsByDay]);

  const available = Object.keys(trendMetricColors).filter(k => chartData.some(d => d[k] != null));
  const hasData = chartData.some(d => {
    const { date, dayLabel, ...v } = d;
    return Object.values(v).some(x => x !== null);
  });

  const weightBars = useMemo(() => {
    const ws = chartData.map(d => d.weight).filter((v) => v != null && Number.isFinite(v));
    if (!ws.length) return null;
    const minW = Math.min(...ws);
    const maxW = Math.max(...ws);
    const span = maxW - minW || 1;
    return chartData.map((d, i) => {
      const w = d.weight;
      const hPct = w == null ? 8 : 18 + ((w - minW) / span) * 82;
      return { i, hPct, w, dayLabel: d.dayLabel };
    });
  }, [chartData]);

  const normalize = (v, t) => {
    if (v == null) return null;
    switch (t) {
      case 'weight': return Math.max(0, Math.min(100, ((v - 100) / 200) * 100));
      default: return ((v - 1) / 4) * 100;
    }
  };

  const cH = 140;
  const cW = 400;
  const lH = 24;
  const xDenom = Math.max(1, chartData.length - 1);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex flex-col gap-1 mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: theme.primary }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Health trends (7 days)</h3>
          </div>
          <p className="text-[11px] leading-snug pl-0.5" style={{ color: theme.textLight }}>
            Each day merges quick weight logs and full bio-metric saves. Lines below are sleep, energy, mood, and comfort (inverted pain scale).
          </p>
        </div>

        {hasData ? (
          <>
            <div className="p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
              <svg width="100%" height={cH + lH} viewBox={`0 0 ${cW} ${cH + lH}`} preserveAspectRatio="xMidYMid meet">
                {[0, 0.5, 1].map((r) => <line key={r} x1="0" y1={cH * r} x2={cW} y2={cH * r} stroke={theme.border} strokeWidth="0.5" opacity="0.3" />)}
                {available.map((metric) => {
                  const pts = chartData.map((d, i) => ({
                    x: (i / xDenom) * cW,
                    y: d[metric] != null ? cH - (normalize(d[metric], metric) / 100) * cH : null,
                  }));
                  const valid = pts.filter((p) => p.y !== null);
                  if (valid.length < 1) return null;
                  const stroke = trendMetricColors[metric];
                  return (
                    <g key={metric}>
                      {valid.length >= 2 && (
                        <polyline fill="none" stroke={stroke} strokeWidth="2.5" opacity="0.85" points={valid.map((p) => `${p.x},${p.y}`).join(' ')} />
                      )}
                      {valid.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={stroke} stroke={theme.cardBackground} strokeWidth="1.5" />
                      ))}
                    </g>
                  );
                })}
                {chartData.map((d, i) => (
                  <text key={i} x={(i / xDenom) * cW} y={cH + 18} textAnchor="middle" fontSize="11" fill={theme.textLight} fontWeight="500">{d.dayLabel}</text>
                ))}
              </svg>
            </div>

            {weightBars && (
              <div className="mt-4 p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.03)' }}>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.textLight }}>Weight (same 7 days)</div>
                <div className="flex h-24 items-end justify-between gap-1">
                  {weightBars.map((row) => (
                    <div key={row.i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                      <div
                        className="w-full max-w-[40px] mx-auto rounded-t-md transition-all"
                        title={row.w != null ? `${row.w}` : 'No log'}
                        style={{
                          height: `${row.hPct}%`,
                          minHeight: row.w != null ? 10 : 4,
                          backgroundColor: row.w != null ? theme.primary : `${theme.border}66`,
                          opacity: row.w != null ? 0.9 : 0.35,
                        }}
                      />
                      <span className="text-[9px] mt-1.5 font-medium truncate w-full text-center" style={{ color: theme.textLight }}>{row.dayLabel.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <p className="text-sm" style={{ color: theme.textLight }}>No data for the last 7 days. Log weight from the home card or add a full entry with Log.</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: theme.primary }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>Entries</h3>
          </div>
          <button type="button" onClick={onAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold touch-manipulation active:scale-95 transition-transform" style={{ backgroundColor: `${theme.primary}18`, color: theme.primary }}>
            <Plus size={14} /> Log
          </button>
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
                  onClick={() => onEdit(m)}
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
  );
}

function ResearchAnalytics({ theme }) {
  const [innerTab, setInnerTab] = useState('compliance');
  const borderStyle = theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {RESEARCH_INNER_TABS.map(opt => {
          const isActive = innerTab === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setInnerTab(opt.value)}
              className="px-3 py-1 text-[11px] font-semibold rounded-full transition-all duration-200 focus:outline-none active:scale-95"
              style={{
                backgroundColor: isActive ? '#445952' : (theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                color: isActive ? '#fff' : (theme?.textLight || '#888'),
                boxShadow: isActive ? 'inset 0 2px 4px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="content-section p-4 sm:p-6 rounded-2xl" style={{ border: `1px solid ${borderStyle}` }}>
        <AnalyticsDashboard theme={theme} showFullScreenLink={false} fullPage activeTab={innerTab} onTabChange={setInnerTab} />
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { theme } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { firebaseUser } = useFirebase();
  const { isReadOnly } = useSubscriptionAccess();
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const openAdd = useCallback(() => {
    if (isReadOnly) { setShowUpgradeModal(true); return; }
    setEditingMetric(null);
    setShowMetricModal(true);
  }, [isReadOnly]);

  const openEdit = useCallback((metric) => {
    if (isReadOnly) { setShowUpgradeModal(true); return; }
    setEditingMetric(metric);
    setShowMetricModal(true);
  }, [isReadOnly]);

  useEffect(() => {
    const detail = {
      tabs: [
        { value: 'research', label: 'Analytics' },
        { value: 'metrics', label: 'Bio-Metrics' },
        { value: 'hydration', label: 'Hydration' },
      ],
      activeTab,
      onTabChange: setActiveTab,
    };
    if (activeTab === 'metrics') {
      detail.onActionClick = openAdd;
      detail.actionDisabled = isReadOnly;
    }
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { detail }));
    return () => { window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs')); };
  }, [activeTab, isReadOnly, openAdd, setActiveTab]);

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
    if (isReadOnly) { setShowUpgradeModal(true); return; }
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
        {activeTab === 'metrics' && <MetricsAnalytics theme={theme} metrics={metrics} onAdd={openAdd} onEdit={openEdit} />}
        {activeTab === 'hydration' && <HydrationAnalytics theme={theme} />}
      </div>

      <BodyMetricsModal
        open={showMetricModal}
        onClose={() => { setShowMetricModal(false); setEditingMetric(null); }}
        onSave={handleSave}
        onDelete={editingMetric ? handleDelete : undefined}
        theme={theme}
        metric={editingMetric}
      />

      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} theme={theme} actionAttempted="log bio-metrics" />
    </div>
  );
}
