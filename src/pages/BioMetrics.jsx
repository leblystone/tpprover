import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Droplets, Activity, BarChart3, Calendar, Weight, Percent, Edit, Settings, Plus, Bed, Smile, ShieldAlert } from 'lucide-react';
import { Zap } from '../icons/lucide-safe';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import BodyMetricsModal from '../components/research/BodyMetricsModal';
import UpgradeModal from '../components/common/UpgradeModal';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import { saveAppData } from '../services/cloudStorage';
import { generateId } from '../utils/string';
import { recordDeletion } from '../utils/deletionTracking';
import { formatMMDDYYYY } from '../utils/date';

const waterUnits = {
  glasses: { label: 'Glasses', abbrev: 'glasses', defaultGoal: 8, increment: 1 },
  oz: { label: 'Fluid Ounces', abbrev: 'fl oz', defaultGoal: 64, increment: 8 },
  ml: { label: 'Milliliters', abbrev: 'ml', defaultGoal: 2000, increment: 250 },
  cups: { label: 'Cups', abbrev: 'cups', defaultGoal: 8, increment: 1 },
  liters: { label: 'Liters', abbrev: 'L', defaultGoal: 2, increment: 0.25 }
};

// ─── Hydration analytics (inline, no modals) ──────────────────────────
function HydrationAnalytics({ theme }) {
  const [waterData, setWaterData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_water_tracker') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    const reload = () => {
      try {
        const saved = localStorage.getItem('tpprover_water_tracker');
        if (saved) setWaterData(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('tpp:cloud-data-loaded', reload);
    window.addEventListener('tpp:water-tracker-updated', reload);
    return () => {
      window.removeEventListener('tpp:cloud-data-loaded', reload);
      window.removeEventListener('tpp:water-tracker-updated', reload);
    };
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayData = waterData[today] || { glasses: 0, goal: 8, unit: 'glasses' };
  const currentUnit = waterUnits[todayData.unit] || waterUnits.glasses;

  const graphData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const day = waterData[key];
      if (day && day.glasses > 0) {
        days.push({ date: key, dateObj: d, amount: day.glasses, goal: day.goal || 8, unit: day.unit || todayData.unit, progress: Math.min(day.glasses / (day.goal || 8), 1) });
      } else {
        days.push({ date: key, dateObj: d, amount: 0, goal: 0, unit: todayData.unit, progress: 0 });
      }
    }
    return days;
  }, [waterData, todayData.unit]);

  const historyData = useMemo(() => {
    return Object.entries(waterData)
      .filter(([, v]) => v && v.glasses > 0)
      .map(([date, data]) => ({
        date,
        dateObj: new Date(date),
        amount: data.glasses || 0,
        goal: data.goal || 8,
        unit: data.unit || 'glasses',
        progress: Math.min((data.glasses || 0) / (data.goal || 8), 1)
      }))
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [waterData]);

  const hasData = graphData.some(d => d.amount > 0);

  return (
    <div className="space-y-5">
      {/* 30-day chart */}
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
                      {day.goal > 0 && <line x1={x} y1={230 - (day.goal / maxAmt) * 200} x2={x + bw * 0.8} y2={230 - (day.goal / maxAmt) * 200} stroke={theme.isDark ? '#60a5fa' : '#3b82f6'} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />}
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
            <p className="text-sm" style={{ color: theme.textLight }}>No hydration data yet. Use the dashboard widget to start tracking!</p>
          </div>
        )}
      </div>

      {/* History list */}
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

// ─── Metrics analytics (inline chart + all entries) ──────────────────
const metricColors = { weight: '#8B4513', bodyfat: '#D2691E', sleep: '#4682B4', energy: '#DAA520', mood: '#CD5C5C', pain: '#708090' };
const metricLabels = { weight: 'Weight', bodyfat: 'Body Fat', sleep: 'Sleep', energy: 'Energy', mood: 'Mood', pain: 'Pain' };

function MetricsAnalytics({ theme, metrics, onAdd, onEdit }) {
  const sorted = useMemo(() => [...metrics].sort((a, b) => new Date(b.date) - new Date(a.date)), [metrics]);

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

  const chartData = useMemo(() => last7Days.map(date => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const m = metrics.find(x => {
      if (!x.date) return false;
      const md = typeof x.date === 'string' ? (x.date.includes('T') ? x.date.split('T')[0] : x.date) : null;
      return md === dateStr;
    });
    return {
      date, dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      weight: m?.weight ? parseFloat(m.weight) : null,
      bodyfat: m?.bodyfat ? parseFloat(m.bodyfat) : null,
      sleep: m?.sleep ? (typeof m.sleep === 'number' ? m.sleep : parseInt(m.sleep)) : null,
      energy: m?.energy ? (typeof m.energy === 'number' ? m.energy : parseInt(m.energy)) : null,
      mood: m?.mood ? (typeof m.mood === 'number' ? m.mood : parseInt(m.mood)) : null,
      pain: m?.pain ? (6 - (typeof m.pain === 'number' ? m.pain : parseInt(m.pain))) : null,
    };
  }), [last7Days, metrics]);

  const available = Object.keys(metricColors).filter(k => chartData.some(d => d[k] != null));
  const hasData = chartData.some(d => { const { date, dayLabel, ...v } = d; return Object.values(v).some(x => x !== null); });

  const normalize = (v, t) => {
    if (v == null) return null;
    switch (t) {
      case 'weight': return Math.max(0, Math.min(100, ((v - 100) / 200) * 100));
      case 'bodyfat': return Math.max(0, Math.min(100, (v / 50) * 100));
      default: return ((v - 1) / 4) * 100;
    }
  };

  const cH = 140, cW = 400, lH = 24;

  return (
    <div className="space-y-5">
      {/* 7-day trend chart */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} style={{ color: theme.primary }} />
          <h3 className="text-sm font-bold" style={{ color: theme.text }}>Health Trends (7 days)</h3>
        </div>

        {hasData ? (
          <>
            <div className="p-3 rounded-xl border" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }}>
              <svg width="100%" height={cH + lH} viewBox={`0 0 ${cW} ${cH + lH}`} preserveAspectRatio="xMidYMid meet">
                {[0, 0.5, 1].map(r => <line key={r} x1="0" y1={cH * r} x2={cW} y2={cH * r} stroke={theme.border} strokeWidth="0.5" opacity="0.3" />)}
                {available.map(metric => {
                  const pts = chartData.map((d, i) => ({ x: (i / (chartData.length - 1)) * cW, y: d[metric] != null ? cH - (normalize(d[metric], metric) / 100) * cH : null }));
                  const valid = pts.filter(p => p.y !== null);
                  if (valid.length < 1) return null;
                  return (
                    <g key={metric}>
                      {valid.length >= 2 && <polyline fill="none" stroke={metricColors[metric]} strokeWidth="2.5" opacity="0.8" points={valid.map(p => `${p.x},${p.y}`).join(' ')} />}
                      {valid.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={metricColors[metric]} stroke={theme.cardBackground} strokeWidth="1.5" />)}
                    </g>
                  );
                })}
                {chartData.map((d, i) => <text key={i} x={(i / (chartData.length - 1)) * cW} y={cH + 18} textAnchor="middle" fontSize="11" fill={theme.textLight} fontWeight="500">{d.dayLabel}</text>)}
              </svg>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {available.map(k => (
                <div key={k} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metricColors[k] }} />
                  <span className="text-xs" style={{ color: theme.text }}>{metricLabels[k]}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <Activity size={40} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No data for the last 7 days. Log metrics from the dashboard!</p>
          </div>
        )}
      </div>

      {/* All entries */}
      <div className="rounded-2xl overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.06)] p-4 sm:p-5" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: theme.primary }} />
            <h3 className="text-sm font-bold" style={{ color: theme.text }}>All Entries</h3>
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
            {sorted.map((m, idx) => (
              <div key={m.id || idx} className="p-3 rounded-xl border hover:shadow-sm transition-all cursor-pointer" style={{ borderColor: theme.border, backgroundColor: theme.isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)' }} onClick={() => onEdit(m)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} style={{ color: theme.primary }} />
                    <span className="text-xs font-semibold" style={{ color: theme.text }}>{formatMMDDYYYY(new Date(m.date))}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(m); }} className="p-1 rounded transition-all" style={{ color: theme.textLight }}><Edit size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
                    <Weight size={14} className="mx-auto mb-0.5" style={{ color: theme.primary }} />
                    <div className="text-[10px] font-medium" style={{ color: theme.textLight }}>Weight</div>
                    <div className="font-bold text-sm" style={{ color: theme.text }}>{m.weight ? `${m.weight} lbs` : '—'}</div>
                  </div>
                  <div className="text-center p-2 rounded-lg" style={{ backgroundColor: (theme.success || theme.primary) + '10' }}>
                    <Percent size={14} className="mx-auto mb-0.5" style={{ color: theme.success || theme.primary }} />
                    <div className="text-[10px] font-medium" style={{ color: theme.textLight }}>Body Fat</div>
                    <div className="font-bold text-sm" style={{ color: theme.text }}>{m.bodyfat ? `${m.bodyfat}%` : '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────
export default function BioMetrics() {
  const { theme } = useOutletContext();
  const { firebaseUser } = useFirebase();
  const { isReadOnly } = useSubscriptionAccess();
  const { metrics, setMetrics, protocols, reconItems, reconHistory, supplements, orders, vendors, calendarNotes, stockpile, scheduledBuys } = useAppContext();

  const [activeTab, setActiveTab] = useState('hydration');
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

  // Topbar tabs — Add only on metrics tab
  useEffect(() => {
    const detail = {
      tabs: [
        { value: 'hydration', label: 'Hydration' },
        { value: 'metrics', label: 'Bio-Metrics' },
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
  }, [activeTab, isReadOnly, openAdd]);

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
      <h1 className="sr-only">Bio-Metrics</h1>

      <div className="px-3 sm:px-4 pb-4 pt-1">
        {activeTab === 'hydration' && <HydrationAnalytics theme={theme} />}
        {activeTab === 'metrics' && <MetricsAnalytics theme={theme} metrics={metrics} onAdd={openAdd} onEdit={openEdit} />}
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
