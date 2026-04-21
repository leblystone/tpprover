import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Clock, PenTool, Pipette, Trash2, Edit, X, Check, Map } from 'lucide-react';
import BottomSheet from './BottomSheet';
import ConfirmationModal from '../ui/ConfirmationModal';
import { getInjectionHistory, deleteInjectionRecord, updateInjectionRecord } from '../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

// ─── Body map helpers ─────────────────────────────────────────────────────────

const ZONE_POSITIONS = {
    'left arm':          { x: 17, y: 34 },
    'right arm':         { x: 83, y: 34 },
    'left abdomen':      { x: 38, y: 47 },
    'right abdomen':     { x: 62, y: 47 },
    'left thigh':        { x: 40, y: 70 },
    'right thigh':       { x: 60, y: 70 },
    'left lower back':   { x: 38, y: 49 },
    'right lower back':  { x: 62, y: 49 },
    'left rear':         { x: 40, y: 64 },
    'right rear':        { x: 60, y: 64 },
};

const DOT_PALETTE = ['#7F9E95', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#EC4899'];

function normalizeSiteToZone(site) {
    if (!site) return null;
    const s = site.toLowerCase().trim();
    for (const zoneId of Object.keys(ZONE_POSITIONS)) {
        if (s === zoneId) return zoneId;
    }
    for (const zoneId of Object.keys(ZONE_POSITIONS)) {
        if (s.includes(zoneId)) return zoneId;
    }
    return null;
}

function daysAgo(ts) {
    if (!ts) return null;
    const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
    const diff = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff}d ago`;
}

function BodyOutlineSvg({ theme }) {
    const strokeColor = theme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
    return (
        <svg viewBox="0 0 512 512" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
            <circle fill="none" stroke={strokeColor} strokeMiterlimit="10" strokeWidth="20" cx="256" cy="56" r="40" />
            <path
                fill="none" stroke={strokeColor} strokeMiterlimit="10" strokeWidth="20"
                d="M199.3,295.62h0l-30.4,172.2a24,24,0,0,0,19.5,27.8,23.76,23.76,0,0,0,27.6-19.5l21-119.9v.2s5.2-32.5,17.5-32.5h3.1c12.5,0,17.5,32.5,17.5,32.5v-.1l21,119.9a23.92,23.92,0,1,0,47.1-8.4l-30.4-172.2-4.9-29.7c-2.9-18.1-4.2-47.6.5-59.7,4-10.4,14.13-14.2,23.2-14.2H424a24,24,0,0,0,0-48H88a24,24,0,0,0,0,48h92.5c9.23,0,19.2,3.8,23.2,14.2,4.7,12.1,3.4,41.6.5,59.7Z"
            />
        </svg>
    );
}

// ─── Site Map insights modal ───────────────────────────────────────────────────

function SiteMapModal({ isOpen, onBack, history, theme }) {
    const taskNames = useMemo(
        () => [...new Set(history.map(r => r.taskName).filter(Boolean))].sort(),
        [history]
    );

    const taskColor = (name) => DOT_PALETTE[taskNames.indexOf(name) % DOT_PALETTE.length];

    // Build per-task stats
    const taskStats = useMemo(() => {
        const map = {};
        for (const r of history) {
            if (!r.taskName) continue;
            if (!map[r.taskName]) map[r.taskName] = { latest: null, total: 0 };
            map[r.taskName].total += 1;
            const ts = typeof r.timestamp === 'number' ? r.timestamp : new Date(r.timestamp || r.date || 0).getTime();
            const zone = normalizeSiteToZone(r.injectionSite);
            if (!map[r.taskName].latest || ts > map[r.taskName].latest.ts) {
                map[r.taskName].latest = { zone, injectionSite: r.injectionSite, ts };
            }
        }
        return map;
    }, [history]);

    // Build dots
    const zoneGroups = {};
    for (const name of taskNames) {
        const zone = taskStats[name]?.latest?.zone;
        if (!zone) continue;
        if (!zoneGroups[zone]) zoneGroups[zone] = [];
        zoneGroups[zone].push(name);
    }

    const dots = [];
    for (const [zone, names] of Object.entries(zoneGroups)) {
        const base = ZONE_POSITIONS[zone];
        const n = names.length;
        names.forEach((name, i) => {
            const offsetX = n === 1 ? 0 : (i - (n - 1) / 2) * 7;
            dots.push({ name, px: base.x + offsetX, py: base.y, color: taskColor(name) });
        });
    }

    return (
        <BottomSheet
            open={isOpen}
            onClose={onBack}
            onBack={onBack}
            title="Site Map"
            theme={theme}
            maxHeight="85vh"
            centerTitle
        >
            {taskNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin size={32} style={{ color: theme.textLight }} className="mb-3 opacity-40" />
                    <p className="text-sm" style={{ color: theme.textLight }}>No mapped injection data yet.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Large body map */}
                    <div
                        className="rounded-2xl p-4 flex items-center justify-center"
                        style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : theme.secondary }}
                    >
                        <div style={{ position: 'relative', width: 170, aspectRatio: '1 / 1' }}>
                            <BodyOutlineSvg theme={theme} />
                            {dots.map((dot, i) => (
                                <div
                                    key={i}
                                    title={dot.name}
                                    style={{
                                        position: 'absolute',
                                        left: `${dot.px}%`,
                                        top: `${dot.py}%`,
                                        transform: 'translate(-50%, -50%)',
                                        width: 14,
                                        height: 14,
                                        borderRadius: '50%',
                                        backgroundColor: dot.color,
                                        boxShadow: `0 0 0 3px ${dot.color}30, 0 2px 6px rgba(0,0,0,0.25)`,
                                        zIndex: 10,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Per-protocol stat cards */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: theme.textLight }}>
                            Last Known Site Per Protocol
                        </p>
                        {taskNames.map(name => {
                            const stats = taskStats[name];
                            const color = taskColor(name);
                            const hasMapped = !!stats?.latest?.zone;
                            return (
                                <div
                                    key={name}
                                    className="flex items-center gap-3 p-3 rounded-xl border"
                                    style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                                >
                                    {/* Color dot */}
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${color}25` }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>{name}</p>
                                        <p className="text-xs capitalize mt-0.5" style={{ color: theme.textLight }}>
                                            {hasMapped
                                                ? stats.latest.injectionSite
                                                : <span className="opacity-50">Custom / unmapped site</span>
                                            }
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                        <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                                            {stats.total} inj.
                                        </span>
                                        <span className="text-[10px]" style={{ color: theme.textLight }}>
                                            {daysAgo(stats.latest?.ts) || '—'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </BottomSheet>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function InjectionHistoryModal({ isOpen, onClose, theme, filterTaskName }) {
    const [injectionHistory, setInjectionHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [dateFilter, setDateFilter] = useState('all');
    const [activeTaskFilter, setActiveTaskFilter] = useState(filterTaskName || null);
    const [showSiteMap, setShowSiteMap] = useState(false);

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editSite, setEditSite] = useState('');
    const [editSide, setEditSide] = useState('');
    const [editCustom, setEditCustom] = useState('');

    const loadHistory = () => {
        const history = getInjectionHistory();
        setInjectionHistory(history);
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            loadHistory();
            setLoading(false);
            setActiveTaskFilter(filterTaskName || null);
        } else {
            setEditingId(null);
            setShowSiteMap(false);
        }
    }, [isOpen, filterTaskName]);

    const uniqueTaskNames = useMemo(() => {
        return [...new Set(injectionHistory.map(r => r.taskName).filter(Boolean))].sort();
    }, [injectionHistory]);

    const filteredHistory = useMemo(() => {
        let base = injectionHistory;
        if (activeTaskFilter) base = base.filter(r => r.taskName === activeTaskFilter);
        if (dateFilter === 'all') return base;

        const cutoffDate = new Date();
        switch (dateFilter) {
            case 'last3days':  cutoffDate.setDate(cutoffDate.getDate() - 3);  break;
            case 'last7days':  cutoffDate.setDate(cutoffDate.getDate() - 7);  break;
            case 'last30days': cutoffDate.setDate(cutoffDate.getDate() - 30); break;
            default: return base;
        }
        cutoffDate.setHours(0, 0, 0, 0);

        return base.filter(record => {
            const d = typeof record.timestamp === 'number'
                ? new Date(record.timestamp)
                : new Date(record.date || record.timestamp);
            d.setHours(0, 0, 0, 0);
            return d >= cutoffDate;
        });
    }, [injectionHistory, dateFilter, activeTaskFilter]);

    const parseInjectionSite = (site) => {
        if (!site) return { site: '', side: '', custom: '' };
        const lowerSite = site.toLowerCase().trim();
        if (!lowerSite.includes('left') && !lowerSite.includes('right') &&
            !lowerSite.includes('abdomen') && !lowerSite.includes('arm') && !lowerSite.includes('thigh')) {
            return { site: 'other', side: '', custom: site };
        }
        const parts = lowerSite.split(' ');
        if (parts.length >= 2) {
            const side = parts[0];
            const siteType = parts.slice(1).join(' ');
            if ((side === 'left' || side === 'right') &&
                (siteType.includes('abdomen') || siteType.includes('arm') || siteType.includes('thigh'))) {
                let matchedSite = '';
                if (siteType.includes('abdomen')) matchedSite = 'abdomen';
                else if (siteType.includes('arm')) matchedSite = 'arm';
                else if (siteType.includes('thigh')) matchedSite = 'thigh';
                return { site: matchedSite, side, custom: '' };
            }
        }
        return { site: 'other', side: '', custom: site };
    };

    const handleEdit = (record) => {
        const parsed = parseInjectionSite(record.injectionSite);
        setEditingId(record.id);
        setEditSite(parsed.site);
        setEditSide(parsed.side);
        setEditCustom(parsed.custom);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditSite('');
        setEditSide('');
        setEditCustom('');
    };

    const handleSaveEdit = () => {
        if (!editingId) return;
        let injectionSite = '';
        if (editSite === 'other') {
            injectionSite = editCustom.trim();
        } else if (editSite && editSide) {
            injectionSite = `${editSide} ${editSite}`;
        } else if (editSite) {
            injectionSite = editSite;
        }
        if (!injectionSite) return;
        if (updateInjectionRecord(editingId, { injectionSite })) {
            loadHistory();
            handleCancelEdit();
        }
    };

    const isEditValid = () => {
        if (editSite === 'other') return editCustom.trim().length > 0;
        if (editSite === 'abdomen' || editSite === 'arm' || editSite === 'thigh') return editSide.length > 0;
        return false;
    };

    const handleDelete = (recordId) => {
        if (deleteInjectionRecord(recordId)) {
            loadHistory();
            setDeleteConfirmId(null);
        }
    };

    const formatDate = (dateValue) => {
        const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const formatDateShort = (dateValue) => {
        const date = typeof dateValue === 'number' ? new Date(dateValue) : new Date(dateValue);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatInjectionSite = (site) => {
        if (!site) return '';
        return site.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const getDeliveryIcon = (deliveryMethod) => {
        switch (deliveryMethod?.toLowerCase()) {
            case 'pen': return <PenTool size={14} style={{ color: theme.textLight }} />;
            default:    return <Pipette size={14} style={{ color: theme.textLight }} />;
        }
    };

    const filterOptions = [
        { value: 'last3days',  label: '3d' },
        { value: 'last7days',  label: '7d' },
        { value: 'last30days', label: '30d' },
        { value: 'all',        label: 'All' },
    ];

    const siteOptions = [
        { value: 'abdomen', label: 'Abdomen' },
        { value: 'arm',     label: 'Arm' },
        { value: 'thigh',   label: 'Thigh' },
        { value: 'other',   label: 'Other' },
    ];

    const hasHistory = !loading && isInjectionSiteTrackingEnabled() && injectionHistory.length > 0;

    return (
        <>
            <BottomSheet
                open={isOpen && !showSiteMap}
                onClose={onClose}
                title="Injection Site History"
                theme={theme}
                maxHeight="85vh"
            >
                {/* Filters row: site map button + protocol dropdown + date pills */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">

                    {/* Site Map button */}
                    {hasHistory && (
                        <button
                            onClick={() => setShowSiteMap(true)}
                            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0"
                            style={{
                                backgroundColor: `${theme.primary}18`,
                                color: theme.primary,
                                border: `1.5px solid ${theme.primary}40`,
                            }}
                        >
                            <Map size={12} />
                            Site Map
                        </button>
                    )}

                    {/* Protocol dropdown */}
                    {uniqueTaskNames.length > 0 && (
                        <div className="relative flex-shrink-0">
                            <select
                                value={activeTaskFilter || ''}
                                onChange={e => setActiveTaskFilter(e.target.value || null)}
                                className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-medium cursor-pointer outline-none transition-all"
                                style={{
                                    backgroundColor: activeTaskFilter ? theme.primary : theme.secondary,
                                    color: activeTaskFilter ? '#ffffff' : theme.textLight,
                                    border: `1.5px solid ${activeTaskFilter ? theme.primary : theme.border}`,
                                    minWidth: 100,
                                    maxWidth: 180,
                                }}
                            >
                                <option value="">All Protocols</option>
                                {uniqueTaskNames.map(name => (
                                    <option key={name} value={name}
                                        style={{ backgroundColor: theme.cardBackground, color: theme.text }}
                                    >
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <svg
                                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                                width="10" height="10" viewBox="0 0 10 10" fill="none"
                            >
                                <path d="M2 3.5L5 6.5L8 3.5" stroke={activeTaskFilter ? '#ffffff' : theme.textLight} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    )}

                    {/* Date pills */}
                    {filterOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setDateFilter(option.value)}
                            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0"
                            style={{
                                backgroundColor: dateFilter === option.value ? theme.primary : theme.secondary,
                                color: dateFilter === option.value ? '#ffffff' : theme.textLight,
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm" style={{ color: theme.textLight }}>Loading...</div>
                    </div>
                ) : !isInjectionSiteTrackingEnabled() ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}15` }}>
                            <Pipette size={32} style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Tracking Disabled</h3>
                        <p className="text-sm" style={{ color: theme.textLight }}>
                            Enable injection site tracking in Settings → App Preferences.
                        </p>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}15` }}>
                            <MapPin size={32} style={{ color: theme.primary }} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                            {injectionHistory.length === 0 ? 'No History Yet' : 'No Results'}
                        </h3>
                        <p className="text-sm" style={{ color: theme.textLight }}>
                            {injectionHistory.length === 0
                                ? 'Complete injection tasks to see your site history here.'
                                : 'No records found for the selected filters.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {filteredHistory.map((record) => (
                            <li
                                key={record.id || record.timestamp}
                                className="p-3 rounded-lg border transition-colors"
                                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                            >
                                {editingId === record.id ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-sm" style={{ color: theme.text }}>{record.taskName}</span>
                                                <span className="ml-2 text-xs" style={{ color: theme.textLight }}>{formatDateShort(record.timestamp)}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={handleCancelEdit} className="p-1.5 rounded-lg transition-colors" style={{ color: theme.textLight }}>
                                                    <X size={16} />
                                                </button>
                                                <button onClick={handleSaveEdit} disabled={!isEditValid()} className="p-1.5 rounded-lg transition-colors disabled:opacity-40" style={{ color: theme.primary }}>
                                                    <Check size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {siteOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => { setEditSite(option.value); if (option.value === 'other') setEditSide(''); }}
                                                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                                    style={{
                                                        backgroundColor: editSite === option.value ? theme.primary : 'transparent',
                                                        color: editSite === option.value ? '#ffffff' : theme.text,
                                                        border: `1px solid ${editSite === option.value ? theme.primary : theme.border}`,
                                                    }}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                        {(editSite === 'abdomen' || editSite === 'arm' || editSite === 'thigh') && (
                                            <div className="flex gap-1.5">
                                                {['left', 'right'].map((side) => (
                                                    <button
                                                        key={side}
                                                        onClick={() => setEditSide(side)}
                                                        className="px-2.5 py-1 rounded-full text-xs font-medium transition-all capitalize"
                                                        style={{
                                                            backgroundColor: editSide === side ? theme.primary : 'transparent',
                                                            color: editSide === side ? '#ffffff' : theme.text,
                                                            border: `1px solid ${editSide === side ? theme.primary : theme.border}`,
                                                        }}
                                                    >
                                                        {side}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {editSite === 'other' && (
                                            <input
                                                type="text"
                                                value={editCustom}
                                                onChange={(e) => setEditCustom(e.target.value)}
                                                placeholder="Enter custom site..."
                                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.secondary }}>
                                                {getDeliveryIcon(record.deliveryMethod)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm truncate" style={{ color: theme.text }}>{record.taskName}</div>
                                                <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: theme.textLight }}>
                                                    {record.injectionSite && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={10} />
                                                            {formatInjectionSite(record.injectionSite)}
                                                        </span>
                                                    )}
                                                    {record.dose && <span>• {record.dose} {record.unit}</span>}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: theme.textLight, opacity: 0.7 }}>
                                                    <Clock size={10} />
                                                    {formatDate(record.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); handleEdit(record); }}
                                                className="p-2 rounded-lg transition-colors touch-manipulation"
                                                style={{ color: theme.textLight }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; e.currentTarget.style.color = theme.primary; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.textLight; }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(record.id); }}
                                                className="p-2 rounded-lg transition-colors touch-manipulation"
                                                style={{ color: theme.textLight }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(220,38,38,0.2)' : 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = theme.error || '#DC2626'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = theme.textLight; }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </BottomSheet>

            {/* Site map insights — second sheet, slides in on top */}
            <SiteMapModal
                isOpen={showSiteMap}
                onBack={() => setShowSiteMap(false)}
                history={injectionHistory}
                theme={theme}
            />

            <ConfirmationModal
                open={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                title="Delete Record?"
                message="This action cannot be undone. Are you sure you want to delete this injection record?"
                confirmText="Delete"
                cancelText="Cancel"
                type="delete"
                theme={theme}
            />
        </>
    );
}
