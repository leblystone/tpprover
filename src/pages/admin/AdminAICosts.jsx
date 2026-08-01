import React, { useState, useEffect, useCallback } from 'react';
import {
    Cpu, Warning, CheckCircle, ArrowsClockwise, Lightning,
    TrendUp, Users, Clock, Shield, FloppyDisk, Info,
    Pulse,
} from '@phosphor-icons/react';
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { themes } from '../../theme/themes';
import { adminCacheGet, adminCacheSet } from '../../utils/adminSessionCache';

const AI_COSTS_CACHE_KEY = 'admin:aiCosts';
const AI_COSTS_CACHE_TTL = 3 * 60 * 1000; // 3 min — live monitoring data

const theme = themes.sage;
const db = () => getFirestore();

const DEFAULTS = {
    emergencyStop:        false,
    dailyQuota:           30,
    rateLimitCalls:       5,
    rateLimitWindowSecs:  60,
    monthlyTokenCap:      7500,
    globalMonthlyReqCap:  50000,
    maxPromptChars:       2000,
    halfLifeBackfillMonthlyCap: 15000,
};

/**
 * Admin AI Cost Monitor & Controls.
 *
 * Shows:
 *   - Global emergency stop toggle
 *   - This month's total call count vs cap
 *   - Configurable limits (daily per-user, monthly token cap, global req cap, rate limit)
 *   - Live top-user leaderboard for the current month
 */
export default function AdminAICosts() {
    const monthKey = new Date().toISOString().slice(0, 7);
    // Month-scoped cache key so data auto-refreshes on the 1st of each month
    const cacheKey = `${AI_COSTS_CACHE_KEY}:${monthKey}`;

    const [limits, setLimits] = useState(() => adminCacheGet(cacheKey)?.limits ?? { ...DEFAULTS });
    const [draft, setDraft]   = useState(() => adminCacheGet(cacheKey)?.limits ?? { ...DEFAULTS });
    const [globalStats, setGlobalStats] = useState(() => adminCacheGet(cacheKey)?.globalStats ?? null);
    const [backfillStats, setBackfillStats] = useState(() => adminCacheGet(cacheKey)?.backfillStats ?? null);
    const [topUsers, setTopUsers] = useState(() => adminCacheGet(cacheKey)?.topUsers ?? []);
    const [loading, setLoading] = useState(() => !adminCacheGet(cacheKey));
    const [saving, setSaving] = useState(false);
    const [toast, setToast]   = useState(null);
    const [error, setError]   = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const loadData = useCallback(async (force = false) => {
        if (!force) {
            const cached = adminCacheGet(cacheKey);
            if (cached) {
                setLimits(cached.limits);
                setDraft(cached.limits);
                setGlobalStats(cached.globalStats);
                setBackfillStats(cached.backfillStats);
                setTopUsers(cached.topUsers);
                setLoading(false);
                return;
            }
        }
        setLoading(true);
        setError(null);
        try {
            const d = db();

            // Load cost limit config
            const configSnap = await getDoc(doc(d, 'config', 'aiCostLimits'));
            const limitsData = configSnap.exists() ? { ...DEFAULTS, ...configSnap.data() } : { ...DEFAULTS };
            setLimits(limitsData);
            setDraft(limitsData);

            // Load global stats
            const globalSnap = await getDoc(doc(d, 'aiGlobalStats', monthKey));
            const globalData = globalSnap.exists() ? globalSnap.data() : { totalCalls: 0, month: monthKey };
            setGlobalStats(globalData);

            // Load half-life backfill migration stats
            const bfSnap = await getDoc(doc(d, 'aiMigrationStats', monthKey));
            const bfData = bfSnap.exists() ? bfSnap.data() : null;
            setBackfillStats(bfData);

            // Load top users this month
            const q = query(collection(d, 'aiMonthlyUsage'), orderBy('estimatedTokens', 'desc'), limit(10));
            const usersSnap = await getDocs(q);
            const users = usersSnap.docs
                .map((d) => d.data())
                .filter((u) => u.month === monthKey);
            setTopUsers(users);

            adminCacheSet(cacheKey, { limits: limitsData, globalStats: globalData, backfillStats: bfData, topUsers: users }, AI_COSTS_CACHE_TTL);
        } catch (e) {
            setError(`Failed to load AI stats: ${e?.message || 'unknown error'}`);
        } finally {
            setLoading(false);
        }
    }, [monthKey, cacheKey]);

    useEffect(() => { loadData(false); }, [loadData]);

    const handleSaveLimits = async () => {
        setSaving(true);
        setError(null);
        try {
            await setDoc(doc(db(), 'config', 'aiCostLimits'), draft, { merge: true });
            setLimits({ ...draft });
            showToast('AI cost limits saved.');
        } catch (e) {
            setError(`Save failed: ${e?.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleEmergencyStop = async (value) => {
        setSaving(true);
        try {
            await setDoc(doc(db(), 'config', 'aiCostLimits'), { emergencyStop: value }, { merge: true });
            setLimits((p) => ({ ...p, emergencyStop: value }));
            setDraft((p) => ({ ...p, emergencyStop: value }));
            showToast(value ? '🛑 AI Emergency Stop ACTIVATED' : '✅ AI Emergency Stop cleared', value ? 'error' : 'success');
        } catch (e) {
            setError(`Failed: ${e?.message}`);
        } finally {
            setSaving(false);
        }
    };

    const globalPct = globalStats
        ? Math.min(100, Math.round((globalStats.totalCalls / limits.globalMonthlyReqCap) * 100))
        : 0;

    const usageColor = globalPct >= 90 ? '#EF4444' : globalPct >= 70 ? '#F59E0B' : '#10B981';

    return (
        <div className="space-y-4">
            <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: theme.text }}>AI Cost Controls</h1>
                    <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
                        Monitor spend, set limits, and emergency-stop AI instantly.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => loadData(true)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium active:scale-95"
                    style={{ border: `1px solid ${theme.border}`, color: theme.text, backgroundColor: theme.cardBackground }}
                >
                    <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-2xl p-3 flex items-start gap-2 text-sm" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444430', color: '#EF4444' }}>
                    <Warning size={15} className="shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {/* Emergency Stop */}
            <div
                className="rounded-2xl p-4 flex items-center justify-between gap-4"
                style={{
                    backgroundColor: limits.emergencyStop ? '#EF444418' : (theme.cardBackground || theme.white),
                    border: `2px solid ${limits.emergencyStop ? '#EF4444' : theme.border}`,
                }}
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: limits.emergencyStop ? '#EF444422' : '#10B98118', color: limits.emergencyStop ? '#EF4444' : '#10B981' }}>
                        <Lightning size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-sm" style={{ color: theme.text }}>Emergency Stop</div>
                        <div className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                            {limits.emergencyStop
                                ? '🛑 ALL AI calls are currently blocked globally.'
                                : 'Instantly halts all AI calls for every user. Use if costs spike unexpectedly.'}
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => handleEmergencyStop(!limits.emergencyStop)}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-50 shrink-0"
                    style={{
                        backgroundColor: limits.emergencyStop ? '#10B981' : '#EF4444',
                        color: '#fff',
                    }}
                >
                    {limits.emergencyStop ? 'Clear Stop' : 'Activate Stop'}
                </button>
            </div>

            {/* Global usage gauge */}
            {globalStats && (
                <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Pulse size={16} style={{ color: theme.primary }} />
                            <span className="text-sm font-semibold" style={{ color: theme.text }}>Global usage — {monthKey}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: usageColor }}>
                            {globalPct}% of cap
                        </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${globalPct}%`, backgroundColor: usageColor }} />
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: theme.textLight }}>
                        <span>{(globalStats.totalCalls || 0).toLocaleString()} requests used</span>
                        <span>{limits.globalMonthlyReqCap.toLocaleString()} cap</span>
                    </div>
                </div>
            )}

            {/* Limit controls */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
                    <Shield size={15} style={{ color: theme.primary }} />
                    <span className="text-sm font-semibold" style={{ color: theme.text }}>Cost limit configuration</span>
                </div>
                <div className="p-4 space-y-4">
                    {[
                        { key: 'globalMonthlyReqCap',  label: 'Global monthly request cap',     desc: 'Total AI calls allowed across all users per month.',          icon: <TrendUp size={14} />, min: 1000 },
                        { key: 'dailyQuota',           label: 'Global daily quota ceiling',     desc: 'Safety ceiling on daily AI calls. Tier caps apply first (free 3 / Research+ 15 / Founder 30).', icon: <Users size={14} />,     min: 1 },
                        { key: 'monthlyTokenCap',      label: 'Per-user monthly token cap',      desc: 'Estimated tokens (prompt+completion) allowed per user/month.',icon: <Cpu size={14} />,       min: 100 },
                        { key: 'rateLimitCalls',       label: 'Rate limit calls',                desc: `Max calls per user per rate-limit window.`,                  icon: <Clock size={14} />,     min: 1 },
                        { key: 'rateLimitWindowSecs',  label: 'Rate limit window (seconds)',     desc: 'Rolling window for the per-call rate limit above.',          icon: <Clock size={14} />,     min: 10 },
                        { key: 'maxPromptChars',       label: 'Max prompt characters',           desc: 'Prompts longer than this are truncated before sending.',     icon: <Info size={14} />,      min: 200 },
                        { key: 'halfLifeBackfillMonthlyCap', label: 'Half-life backfill monthly cap', desc: 'Max Gemini backfill calls per month (one-time per user).', icon: <Lightning size={14} />,       min: 100 },
                    ].map(({ key, label, desc, icon, min }) => (
                        <div key={key} className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: theme.primary + '18', color: theme.primary }}>
                                {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <div className="text-xs font-semibold" style={{ color: theme.text }}>{label}</div>
                                        <div className="text-[11px]" style={{ color: theme.textLight }}>{desc}</div>
                                    </div>
                                    <input
                                        type="number"
                                        value={draft[key]}
                                        min={min}
                                        onChange={(e) => setDraft((p) => ({ ...p, [key]: Number(e.target.value) }))}
                                        className="w-24 px-2 py-1.5 rounded-lg text-sm font-mono text-right"
                                        style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t flex justify-end" style={{ borderColor: theme.border }}>
                    <button
                        type="button"
                        onClick={handleSaveLimits}
                        disabled={saving || JSON.stringify(draft) === JSON.stringify(limits)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: theme.primary, color: theme.white }}
                    >
                        {saving ? <ArrowsClockwise size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                        Save limits
                    </button>
                </div>
            </div>

            {/* Half-life backfill stats */}
            {backfillStats && (
                <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                    <div className="flex items-center gap-2 mb-1">
                        <Lightning size={16} style={{ color: theme.primary }} />
                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Half-Life Backfill — {monthKey}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Users backfilled', value: backfillStats.halfLifeBackfillCalls || 0 },
                            { label: 'Peptides queried', value: backfillStats.halfLifeBackfillPeptides || 0 },
                            { label: 'Peptides matched', value: backfillStats.halfLifeBackfillMatched || 0 },
                        ].map(({ label, value }) => (
                            <div key={label} className="text-center">
                                <div className="text-lg font-bold" style={{ color: theme.text }}>{value.toLocaleString()}</div>
                                <div className="text-[10px]" style={{ color: theme.textLight }}>{label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1" style={{ color: theme.textLight }}>
                        <span>{backfillStats.halfLifeBackfillCalls || 0} of {(draft.halfLifeBackfillMonthlyCap || 15000).toLocaleString()} monthly cap</span>
                        <span>{Math.min(100, Math.round(((backfillStats.halfLifeBackfillCalls || 0) / (draft.halfLifeBackfillMonthlyCap || 15000)) * 100))}%</span>
                    </div>
                </div>
            )}

            {/* Top users */}
            {topUsers.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                    <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: theme.border }}>
                        <TrendUp size={15} style={{ color: theme.primary }} />
                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Top users by estimated tokens — {monthKey}</span>
                    </div>
                    <ul className="divide-y" style={{ borderColor: theme.border }}>
                        {topUsers.map((u, i) => {
                            const pct = Math.min(100, Math.round(((u.estimatedTokens || 0) / limits.monthlyTokenCap) * 100));
                            return (
                                <li key={u.uid || i} className="flex items-center gap-3 p-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: theme.primary + '18', color: theme.primary }}>
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-mono truncate" style={{ color: theme.text }}>{u.uid || '—'}</div>
                                        <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: theme.border }}>
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? '#EF4444' : theme.primary }} />
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs font-semibold" style={{ color: theme.text }}>{(u.estimatedTokens || 0).toLocaleString()}</div>
                                        <div className="text-[10px]" style={{ color: theme.textLight }}>{u.calls || 0} calls</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium"
                    style={{ backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444', color: '#fff' }}
                >
                    {toast.type === 'success' ? <CheckCircle size={15} /> : <Warning size={15} />}
                    {toast.message}
                </div>
            )}
            </div>
        </div>
    );
}
