import React, { useState, useEffect, useCallback } from 'react';
import {
    ToggleLeft, ToggleRight, FlaskConical, Cpu, Users,
    Globe, BookOpen, ArrowDownCircle, RefreshCw,
    AlertTriangle, CheckCircle2, Info, Zap, Shield,
} from 'lucide-react';
import { featureFlags } from '../../config/featureFlags';
import { getRemoteFlags, setRemoteFlag } from '../../services/remoteFlags';
import { themes } from '../../theme/themes';

const theme = themes.sage;

/**
 * Flag descriptor metadata.
 * impact: what shows / hides when this flag is OFF.
 * risk:   'low' | 'medium' | 'high' (cost/safety risk of enabling)
 */
const FLAG_META = {
    ENABLE_RESEARCH_PLUS: {
        icon: <FlaskConical size={18} />,
        label: 'Research+',
        description: 'New pricing tier visibility. Enables the Research+ upgrade path for new signups.',
        impact: 'OFF → new users cannot see or upgrade to Research+. Existing subscribers unaffected.',
        risk: 'low',
        color: '#7F9E95',
    },
    ENABLE_AI_RESEARCH: {
        icon: <Cpu size={18} />,
        label: 'AI Research',
        description: 'AI chat, protocol pre-fill, and stack analysis on the /app/ai page.',
        impact: 'OFF → entire AI page disappears. All AI buttons (prefill, analyze) hide across the app. No API cost.',
        risk: 'high',
        color: '#6366F1',
    },
    ENABLE_BUDDY: {
        icon: <Users size={18} />,
        label: 'Research Partner (Buddy)',
        description: 'The 1-partner system. Enables owner tagging + filtering across lists, and Account → Research Partner.',
        impact: 'OFF → owner tags still stored, but filter chips and the Partner page hide.',
        risk: 'low',
        color: '#EC4899',
    },
    ENABLE_COMMUNITY: {
        icon: <Globe size={18} />,
        label: 'Community Directory',
        description: 'The /app/community page for tracking research communities (Reddit, Discord, etc.).',
        impact: 'OFF → Community page + Research sub-menu entry disappear.',
        risk: 'low',
        color: '#F59E0B',
    },
    ENABLE_PAGE_INTROS: {
        icon: <BookOpen size={18} />,
        label: 'Page Intro Tips',
        description: 'First-view "Quick tip" toast shown when a user visits a page for the first time.',
        impact: 'OFF → no intro modals appear anywhere. Already-dismissed state is preserved.',
        risk: 'low',
        color: '#10B981',
    },
    ENABLE_SOFT_DOWNGRADE: {
        icon: <ArrowDownCircle size={18} />,
        label: 'Soft Downgrade',
        description: 'When enabled, expired trials/cancelled subs are silently downgraded to Free tier. Without it, they remain locked at their last tier.',
        impact: 'OFF → no automatic downgrades. Manual admin action required to change tier.',
        risk: 'medium',
        color: '#EF4444',
    },
};

const RISK_LABELS = {
    low:    { label: 'Low risk',    color: '#10B981' },
    medium: { label: 'Medium risk', color: '#F59E0B' },
    high:   { label: 'High risk',   color: '#EF4444' },
};

export default function AdminSettingsFlags() {
    const [remoteFlags, setRemoteFlags] = useState({});
    const [localFlags, setLocalFlags] = useState({ ...featureFlags });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({}); // { [flagName]: bool }
    const [toast, setToast] = useState(null);
    const [error, setError] = useState(null);

    const loadFlags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const remote = await getRemoteFlags();
            setRemoteFlags(remote);
            setLocalFlags((prev) => ({ ...prev, ...remote }));
        } catch (e) {
            setError('Could not load remote flags from Firestore. Showing local/env defaults below.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFlags(); }, [loadFlags]);

    const handleToggle = async (flagName, newValue) => {
        setSaving((s) => ({ ...s, [flagName]: true }));
        setError(null);
        try {
            await setRemoteFlag(flagName, newValue);
            setRemoteFlags((prev) => ({ ...prev, [flagName]: newValue }));
            setLocalFlags((prev) => ({ ...prev, [flagName]: newValue }));
            setToast({ message: `${FLAG_META[flagName]?.label || flagName} turned ${newValue ? 'ON' : 'OFF'}`, type: newValue ? 'success' : 'warning' });
            setTimeout(() => setToast(null), 3000);
        } catch (e) {
            setError(`Failed to save ${flagName}: ${e?.message || 'unknown error'}`);
        } finally {
            setSaving((s) => ({ ...s, [flagName]: false }));
        }
    };

    const overriddenByRemote = (flagName) => flagName in remoteFlags;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: theme.text }}>Feature Flag Control</h1>
                    <p className="text-sm mt-0.5" style={{ color: theme.textLight }}>
                        Live kill-switches for Research+ Wave features. Changes apply globally within seconds — no redeploy needed.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={loadFlags}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium active:scale-95"
                    style={{ border: `1px solid ${theme.border}`, color: theme.text, backgroundColor: theme.cardBackground }}
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Info banner */}
            <div className="rounded-2xl p-3 flex items-start gap-3 text-sm" style={{ backgroundColor: theme.primary + '15', border: `1px solid ${theme.primary + '30'}` }}>
                <Info size={16} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                <div style={{ color: theme.textLight }}>
                    <span className="font-semibold" style={{ color: theme.text }}>Firestore-backed.</span>{' '}
                    Toggling here writes to <code className="text-xs bg-black/10 px-1 rounded">config/featureFlags</code> in Firestore. The app reads it on load and subscribes to live updates — all users see the change immediately without refreshing.
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-2xl p-3 flex items-start gap-2 text-sm" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444430', color: '#EF4444' }}>
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    {error}
                </div>
            )}

            {/* Flag cards */}
            <div className="space-y-3">
                {Object.entries(FLAG_META).map(([flagName, meta]) => {
                    const isOn = Boolean(localFlags[flagName]);
                    const isSaving = Boolean(saving[flagName]);
                    const hasRemoteOverride = overriddenByRemote(flagName);
                    const risk = RISK_LABELS[meta.risk];

                    return (
                        <div
                            key={flagName}
                            className="rounded-2xl p-4 space-y-2.5"
                            style={{
                                backgroundColor: theme.cardBackground || theme.white,
                                border: `1px solid ${theme.border}`,
                                opacity: isSaving ? 0.7 : 1,
                            }}
                        >
                            {/* Top row */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    {/* Icon badge */}
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: meta.color + '18', color: meta.color }}>
                                        {meta.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm" style={{ color: theme.text }}>{meta.label}</span>
                                            {/* Risk badge */}
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide" style={{ backgroundColor: risk.color + '18', color: risk.color }}>
                                                {risk.label}
                                            </span>
                                            {/* Source badge */}
                                            {hasRemoteOverride ? (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: '#6366F118', color: '#6366F1' }}>Firestore</span>
                                            ) : (
                                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ backgroundColor: theme.border, color: theme.textLight }}>Local / env</span>
                                            )}
                                        </div>
                                        <code className="text-[10px] font-mono opacity-50" style={{ color: theme.text }}>{flagName}</code>
                                    </div>
                                </div>
                                {/* Toggle */}
                                <button
                                    type="button"
                                    onClick={() => handleToggle(flagName, !isOn)}
                                    disabled={isSaving}
                                    className="shrink-0 active:scale-90 transition-transform"
                                    aria-label={isOn ? `Disable ${meta.label}` : `Enable ${meta.label}`}
                                    style={{ color: isOn ? meta.color : theme.textLight }}
                                >
                                    {isSaving ? (
                                        <RefreshCw size={28} className="animate-spin" />
                                    ) : isOn ? (
                                        <ToggleRight size={36} strokeWidth={1.5} />
                                    ) : (
                                        <ToggleLeft size={36} strokeWidth={1.5} />
                                    )}
                                </button>
                            </div>

                            {/* Description */}
                            <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>{meta.description}</p>

                            {/* Impact */}
                            <div className="flex items-start gap-2 rounded-xl p-2.5" style={{ backgroundColor: isOn ? '#10B98110' : '#EF444410' }}>
                                {isOn ? (
                                    <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                                ) : (
                                    <Zap size={13} className="shrink-0 mt-0.5" style={{ color: '#EF4444' }} />
                                )}
                                <p className="text-[11px] leading-relaxed" style={{ color: isOn ? '#10B981' : '#EF4444' }}>
                                    {meta.impact}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global status summary */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                    <Shield size={15} style={{ color: theme.primary }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.textLight }}>Current status</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(FLAG_META).map(([flagName, meta]) => {
                        const isOn = Boolean(localFlags[flagName]);
                        return (
                            <div key={flagName} className="flex items-center gap-2 p-2 rounded-xl" style={{ backgroundColor: isOn ? meta.color + '12' : theme.background }}>
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isOn ? meta.color : theme.border }} />
                                <span className="text-xs font-medium truncate" style={{ color: isOn ? meta.color : theme.textLight }}>{meta.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div
                    className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium"
                    style={{
                        backgroundColor: toast.type === 'success' ? '#10B981' : '#F59E0B',
                        color: '#fff',
                    }}
                >
                    {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
