import React, { useState, useEffect } from 'react';
import { formatMMDDYYYY, parseDateString, normalizeToMidnight, getLocalTimestamp } from '../../utils/date';
import { Play, CirclePlay, Clock, FileText, Repeat, CalendarClock, RotateCw, Layers, TrendingUp, Edit as EditIcon, Share2, History, Pen, Pipette, Droplets, Hand, Beaker, Pause, SkipForward, SkipBack, ChevronRight, ChevronLeft, Lock } from 'lucide-react';
import { PROTOCOL_PALETTE, getProtocolColor, getProtocolAccentHex } from '../../utils/protocolColors';
import { ProtocolPurposeGlyph } from '../../utils/protocolPurposeIcons';
import { getCurrentTitrationPhase } from '../../utils/calendarTasks';
import ShareModal from '../common/ShareModal';
import { SHARE_BASE_PATH } from '../../utils/share';
import { getChromeGradient } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import ProtocolNotesModal from './ProtocolNotesModal';
import { findActiveProtocolHistoryEntry } from '../../utils/protocolHistory';
import OwnerChip from '../buddy/OwnerChip';
import { getBuddyCardTint, OWNER_SELF } from '../../utils/buddies';

const formatIndividualFrequency = (freq) => {
    if (!freq) return 'Not set';
    if (freq.type === 'weekly' && freq.days?.length > 0) return `Weekly: ${freq.days.join(', ')}`;
    if (freq.type === 'cycle') {
        const cycleStr = `Cycle: ${freq.onDays || '-'} on / ${freq.offDays || '-'} off`;
        const timeStr = freq.time && Array.isArray(freq.time) && freq.time.length > 0 ? ` ${freq.time.join('/')}` : '';
        return cycleStr + timeStr;
    }
    if (freq.type === 'custom') {
        const customDays = freq.customDays || '';
        return customDays ? `Every ${customDays} days` : 'Every X days';
    }
    if (freq.type === 'daily') {
        if (freq.time && Array.isArray(freq.time) && freq.time.length > 0) return `Daily: ${freq.time.join(', ')}`;
        return 'Daily';
    }
    return 'Daily';
};

const formatPenType = (penType) => {
    const penTypes = {
        'savvio': '🖊️ Savvio', 'novo': '🖊️ Novo', 'v1': '🖊️ V1', 'v2': '🖊️ V2',
        'v3': '🖊️ V3', 'bird-pen': '🖊️ Bird Pen', 'luxura': '🖊️ Luxura',
        'gansulin': '🖊️ Gansulin', 'other': '✏️ Other (see notes)'
    };
    return penTypes[penType] || `🖊️ ${penType}`;
};

const getResolvedPenColor = (penColor) => {
    if (!penColor) return null;
    const raw = String(penColor).trim();
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(raw)) return raw;
    const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
    const found = penColors.find((color) => String(color.name || '').toLowerCase().replace(/\s+/g, ' ') === normalized);
    return found?.hex || null;
};

const SectionDivider = ({ label, theme, icon }) => (
    <div className="flex items-center gap-2 my-3 opacity-60">
        {icon && <div style={{ color: theme.textLight }}>{icon}</div>}
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.textLight }}>{label}</span>
        <div className="h-[1px] flex-1" style={{ backgroundColor: theme.border }} />
    </div>
);

const ProtocolCard = React.memo(function ProtocolCard({ item: p, theme, isActive, onStartClick, onEditClick, onHistoryClick, isPublicView = false, hasDraftStart = false, compact = false, onUpdateProtocol, freeLocked = false, slotOpen = false }) {
    const [isShareModalOpen, setShareModalOpen] = useState(false);
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [notesCount, setNotesCount] = useState(0);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const isBuddyOwned = p?.ownerId && p.ownerId !== OWNER_SELF;

    // Protocol-level accent: pen / saved color / palette (consistent across app)
    const protocolAccent = getProtocolAccentHex(p);
    const buddyTint = isBuddyOwned ? getBuddyCardTint(protocolAccent, theme?.isDark) : {};

    // Persist color once on first active render
    useEffect(() => {
        if (isActive && p?.id && !p.protocolColor && onUpdateProtocol) {
            onUpdateProtocol({ ...p, protocolColor: getProtocolAccentHex(p) });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, p?.id]);

    // Load notes count
    useEffect(() => {
        if (isActive && p?.id) {
            const activeEntry = findActiveProtocolHistoryEntry(p.id);
            setNotesCount(activeEntry && Array.isArray(activeEntry.notes) ? activeEntry.notes.length : 0);
        }
    }, [isActive, p?.id]);

    useEffect(() => {
        const handle = () => {
            if (isActive && p?.id) {
                const activeEntry = findActiveProtocolHistoryEntry(p.id);
                if (activeEntry && Array.isArray(activeEntry.notes)) setNotesCount(activeEntry.notes.length);
            }
        };
        window.addEventListener('tpp:protocol-history-updated', handle);
        return () => window.removeEventListener('tpp:protocol-history-updated', handle);
    }, [isActive, p?.id]);

    // Single-peptide logic
    const isSinglePeptide = (p.peptides?.length ?? 0) === 1;
    const singlePeptide = isSinglePeptide ? p.peptides[0] : null;
    const isSinglePeptideActive = isSinglePeptide && isActive;

    // Current dose for single-peptide header pill
    let singleCurrentDose = null;
    if (isSinglePeptideActive && singlePeptide) {
        const cp = getCurrentTitrationPhase(p, singlePeptide);
        if (cp) {
            singleCurrentDose = `${cp.dose} ${cp.unit || 'mg'}`;
        } else if (singlePeptide.dosage?.amount) {
            singleCurrentDose = `${singlePeptide.dosage.amount} ${singlePeptide.dosage.unit || 'mg'}`;
        }
    }

    // Days active + next-dose countdown (used for ring)
    let daysActive = 0;
    let daysUntilNext = null;
    let intervalDays = 1;
    if (isActive && p.startDate) {
        const todayD = new Date(); todayD.setHours(0,0,0,0);
        const start = parseDateString(p.startDate); start.setHours(0,0,0,0);
        daysActive = Math.floor((todayD - start) / 86400000);
        const freq = (isSinglePeptideActive ? singlePeptide : p.peptides?.[0])?.frequency;
        if (freq) {
            if (freq.type === 'custom' && freq.customDays) {
                intervalDays = parseInt(freq.customDays) || 1;
                const cycleDay = daysActive % intervalDays;
                daysUntilNext = cycleDay === 0 ? 0 : intervalDays - cycleDay;
            } else if (freq.type === 'daily') {
                daysUntilNext = 0; intervalDays = 1;
            } else if (freq.type === 'cycle') {
                const on = parseInt(freq.onDays) || 1;
                const off = parseInt(freq.offDays) || 0;
                intervalDays = on + off;
                const pos = daysActive % intervalDays;
                daysUntilNext = pos < on ? 0 : intervalDays - pos;
            }
        }
    }

    const handleShare = () => setShareModalOpen(true);

    // ── Compact inactive layout ──────────────────────────────────────────
    if (compact && !isActive) {
        // ── Held by free plan — locked overlay ──────────────────────────
        if (freeLocked) {
            return (
                <div
                    className="p-4 rounded-lg flex flex-col relative overflow-hidden"
                    style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        border: slotOpen ? `1px solid ${theme.primary}55` : `1px solid ${theme.border}`,
                        opacity: slotOpen ? 1 : 0.75,
                        minHeight: '120px',
                        boxShadow: slotOpen ? `0 0 0 2px ${theme.primary}30, 0 6px 18px ${theme.primary}14` : undefined,
                    }}
                >
                    {/* Lock badge */}
                    <div className="absolute top-2 right-2">
                        <Lock size={12} style={{ color: theme.textLight }} />
                    </div>

                    <div className="flex-grow">
                        <div className="font-semibold text-sm mb-1 pr-5" style={{ color: theme.text }}>
                            {p.protocolName || p.name || 'Unnamed Protocol'}
                        </div>
                        <div className="text-xs mb-2 line-clamp-2" style={{ color: theme.textLight }}>
                            {p.purpose || 'No purpose defined'}
                        </div>
                    </div>

                    {slotOpen ? (
                        <button
                            type="button"
                            className="mt-2 w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:opacity-95 shadow-sm"
                            style={{
                                backgroundColor: theme.primary,
                                color: theme.textOnPrimary || '#ffffff',
                                boxShadow: `0 2px 10px ${theme.primary}45, inset 0 1px 0 rgba(255,255,255,0.2)`,
                            }}
                            onClick={(e) => { e.stopPropagation(); onStartClick(p); }}
                        >
                            Resume
                        </button>
                    ) : (
                        <div
                            className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium text-center"
                            style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                color: theme.textLight,
                            }}
                        >
                            Slot occupied
                        </div>
                    )}
                </div>
            );
        }

        return (
            <>
                <div
                    className={`p-4 rounded-lg glass-panel-minimal shadow-md flex flex-col widget-card-hover cursor-pointer ${isBuddyOwned ? 'buddy-owned' : ''}`}
                    style={isBuddyOwned ? {
                        '--buddy-bg': buddyTint.backgroundColor,
                        '--buddy-border': `${protocolAccent}55`,
                        '--buddy-shadow': buddyTint.boxShadow || 'none',
                    } : {}}
                    onClick={() => !isPublicView && onEditClick(p)}
                >
                    <div className="flex-grow">
                        <div className="font-semibold text-base mb-2" style={{ color: theme.text }}>
                            {p.protocolName || 'Unnamed Protocol'}
                        </div>
                        <div className="text-sm mb-3" style={{ color: theme.textLight }}>
                            <div className="flex items-center gap-2">
                                <ProtocolPurposeGlyph
                                    protocol={p}
                                    size={22}
                                    className="flex-shrink-0"
                                    style={{ color: theme.primary }}
                                />
                                <span className="line-clamp-2">{p.purpose || 'No purpose defined'}</span>
                            </div>
                        </div>
                    </div>
                    {!isPublicView && (
                        <div className="mt-3 flex items-center justify-center gap-1.5">
                            <button
                                className="px-4 py-1.5 rounded-lg action-button-hover flex items-center justify-center min-w-[60px] transition-all"
                                style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: `0 2px 8px ${theme.primary}30` }}
                                onClick={(e) => { e.stopPropagation(); onStartClick(p, { manage: false }); }}
                            >
                                <span className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{hasDraftStart ? 'RESUME' : 'START'}</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-2 rounded-md action-button-hover" style={{ color: theme.textLight }}>
                                <Share2 className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onHistoryClick(p); }} className="p-2 rounded-md action-button-hover" style={{ color: theme.textLight }}>
                                <History className="h-4 w-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onEditClick(p); }} className="p-2 rounded-md action-button-hover" style={{ color: theme.textLight }}>
                                <EditIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
                <ShareModal
                    open={isShareModalOpen}
                    onClose={() => setShareModalOpen(false)}
                    theme={theme}
                    title="Protocol"
                    shareUrl={`${window.location.origin}${SHARE_BASE_PATH}/protocols/${p.id}`}
                    CardComponent={ProtocolCard}
                    cardProps={{ item: p, theme, isPublicView: true }}
                    shareData={{ ...p, type: 'protocol' }}
                    allowProgressMode={isActive}
                />
            </>
        );
    }

    // ── Full card ────────────────────────────────────────────────────────
    return (
        <>
            <div
                className={`relative p-4 rounded-lg glass-panel-minimal shadow-md flex flex-col widget-card-hover cursor-pointer transition-all ${isActive ? 'ring-1' : ''} ${isBuddyOwned && !isActive ? 'buddy-owned' : ''}`}
                style={{
                    borderColor: isActive ? `${protocolAccent}40` : undefined,
                    background: isActive ? `linear-gradient(170deg, ${protocolAccent}22 0%, transparent 50%)` : undefined,
                    ...(isBuddyOwned && !isActive ? {
                        '--buddy-bg': buddyTint.backgroundColor,
                        '--buddy-border': `${protocolAccent}55`,
                        '--buddy-shadow': buddyTint.boxShadow || 'none',
                    } : {}),
                }}
                onClick={() => {
                    if (isPublicView) return;
                    if (isActive) onStartClick(p, { manage: true });
                    else onEditClick(p);
                }}
            >
                <div className="flex-grow">
                    {/* ── Header ── */}
                    <div className="mb-2">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {/* Row 1 — Name + dose on same line */}
                                <div className="flex items-baseline gap-2.5 flex-wrap">
                                    <h3 className="font-bold text-xl leading-tight" style={{ color: theme.text }}>
                                        {p.protocolName || 'Unnamed Protocol'}
                                    </h3>
                                    <OwnerChip ownerId={p.ownerId} theme={theme} compact />
                                    {isSinglePeptideActive && singleCurrentDose && (
                                        <span
                                            className="inline-flex items-baseline gap-1.5 rounded-lg px-2.5 py-1 flex-shrink-0"
                                            style={{
                                                backgroundColor: protocolAccent + (theme.isDark ? '20' : '12'),
                                                border: `1px solid ${protocolAccent}30`,
                                            }}
                                        >
                                            <span className="text-[15px] font-black tabular-nums leading-none" style={{ color: protocolAccent }}>
                                                {singleCurrentDose}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {/* Row 2 — Purpose whisper */}
                                {p.purpose && (() => (
                                        <div className="flex items-center gap-2 mt-1">
                                            <ProtocolPurposeGlyph
                                                protocol={p}
                                                size={20}
                                                className="flex-shrink-0"
                                                style={{ color: theme.textLight, opacity: 0.45 }}
                                            />
                                            <span className="text-xs font-medium" style={{ color: theme.textLight, opacity: 0.5 }}>
                                                {p.purpose}
                                            </span>
                                        </div>
                                ))()}

                                {/* Link Vials prompt */}
                                {isActive && p.quickStart && (!p.linkedItems || Object.keys(p.linkedItems).length === 0) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onStartClick(p, { manage: true, tab: 'edit' }); }}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 mt-1"
                                        style={{ backgroundColor: `${protocolAccent}26`, color: protocolAccent, border: `1px solid ${protocolAccent}55` }}
                                    >
                                        🔗 Link Vials
                                    </button>
                                )}
                            </div>

                            {/* Next-dose countdown ring */}
                            {isActive && (() => {
                                const SIZE = 52; const STROKE = 4;
                                const R = (SIZE - STROKE) / 2;
                                const CIRC = 2 * Math.PI * R;
                                const progress = daysUntilNext !== null && intervalDays > 0
                                    ? Math.max(0, Math.min(1, (intervalDays - daysUntilNext) / intervalDays))
                                    : 0;
                                const dashOffset = CIRC * (1 - progress);
                                const inner = theme.isDark ? '#1a2826' : '#ffffff';
                                return (
                                    <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
                                        <div className="relative" style={{ width: SIZE, height: SIZE }}>
                                            <svg width={SIZE} height={SIZE} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke={protocolAccent + '30'} strokeWidth={STROKE} />
                                                <circle
                                                    cx={SIZE/2} cy={SIZE/2} r={R}
                                                    fill="none"
                                                    stroke={protocolAccent}
                                                    strokeWidth={STROKE}
                                                    strokeLinecap="round"
                                                    strokeDasharray={CIRC}
                                                    strokeDashoffset={dashOffset}
                                                />
                                            </svg>
                                            {/* Inner fill circle for contrast */}
                                            <div className="absolute rounded-full" style={{ inset: STROKE + 2, backgroundColor: inner, opacity: 0.85 }} />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-[14px] font-black leading-none tabular-nums" style={{ color: protocolAccent }}>
                                                    {daysUntilNext !== null ? daysUntilNext : daysActive}
                                                </span>
                                                <span className="text-[7px] font-bold uppercase tracking-wider leading-none mt-0.5" style={{ color: protocolAccent, opacity: 0.65 }}>
                                                    {daysUntilNext !== null ? (daysUntilNext === 0 ? 'today' : 'days') : 'days'}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[8px] uppercase tracking-wider opacity-45 text-center" style={{ color: theme.text }}>
                                            {daysUntilNext !== null ? 'next dose' : 'active'}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Subtle divider after header */}
                        {isActive && <div className="mt-2 border-t" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />}
                    </div>

                    {isActive ? (
                        <>
                            {/* ── Active card: peptides ── */}
                            {!isSinglePeptide && (
                                <SectionDivider label="PEPTIDES" theme={theme} icon={<Beaker size={12} />} />
                            )}
                            <div className="space-y-4 px-1 mt-2">
                                {p.peptides && p.peptides.length > 0 ? (
                                    p.peptides.map((peptide, index) => {
                                        const isSingle = isSinglePeptide;
                                        const color = isSingle ? protocolAccent : (peptide.capColor || protocolAccent);
                                        const currentPhase = getCurrentTitrationPhase(p, peptide);
                                        const hasTitration = Array.isArray(peptide.titration) && peptide.titration.length > 0;

                                        // Days / duration milestone helpers
                                        const SEGMENTS = [
                                            { label: '30d', start: 0, end: 30 },
                                            { label: '60d', start: 30, end: 60 },
                                            { label: '90d', start: 60, end: 90 },
                                            { label: '6mo', start: 90, end: 180 },
                                            { label: '1yr', start: 180, end: 365 },
                                        ];
                                        const hasFixedDuration = p.duration && !p.duration.noEnd && p.duration.count > 0;
                                        let totalDays = 0; let progressPct = 0; let daysLeft = 0;
                                        if (hasFixedDuration) {
                                            const unit = p.duration.unit || 'weeks'; const count = parseInt(p.duration.count) || 0;
                                            totalDays = unit === 'days' ? count : unit === 'weeks' ? count * 7 : count * 30;
                                            progressPct = totalDays > 0 ? Math.min(100, (daysActive / totalDays) * 100) : 0;
                                            daysLeft = Math.max(0, totalDays - daysActive);
                                        }

                                        return (
                                            <div key={peptide.id || index} className="flex items-stretch gap-3">
                                                {/* Colored bar */}
                                                <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.85 }} />

                                                <div className="flex-1 py-0.5">
                                                    {/* Peptide name (multi only) */}
                                                    {!isSingle && (
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-1" style={{ color: theme.text }}>
                                                            <span className="font-semibold text-sm">{peptide.name || 'Unnamed Peptide'}</span>
                                                            {peptide.emoji && <span className="text-base leading-none">{peptide.emoji}</span>}
                                                        </div>
                                                    )}

                                                    {/* ── Titration track ── */}
                                                    {hasTitration && currentPhase && (
                                                        <div className="flex flex-col gap-1.5 pt-1 pb-1 w-full">
                                                            {/* Track header */}
                                                            <div className="flex items-end justify-between">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-[12px] font-bold leading-none" style={{ color }}>
                                                                        {currentPhase.dose} {currentPhase.unit || 'mg'}
                                                                    </span>
                                                                    <span className="text-[10px] font-medium leading-none opacity-60" style={{ color: theme.text }}>
                                                                        Phase {currentPhase.phaseIndex + 1}/{currentPhase.totalPhases}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] font-semibold leading-none opacity-50" style={{ color: theme.text }}>
                                                                    {currentPhase.isHeld ? 'HELD' : currentPhase.daysRemainingInPhase !== null ? `${currentPhase.daysRemainingInPhase}d left` : 'maintenance'}
                                                                </span>
                                                            </div>

                                                            {/* Segmented bar */}
                                                            <div className="flex items-center gap-[2px] h-[6px] w-full">
                                                                {peptide.titration.map((phase, idx) => {
                                                                    const isPast = idx < currentPhase.phaseIndex;
                                                                    const isCurr = idx === currentPhase.phaseIndex;
                                                                    let fillPct = 0;
                                                                    if (isCurr && currentPhase.daysRemainingInPhase !== null) {
                                                                        const count = parseInt(phase.durationCount) || 1;
                                                                        const unit = phase.durationUnit || 'weeks';
                                                                        const pd = unit === 'days' ? count : unit === 'weeks' ? count * 7 : count * 30;
                                                                        fillPct = Math.max(5, Math.min(95, Math.round(((pd - currentPhase.daysRemainingInPhase) / pd) * 100)));
                                                                    } else if (isCurr) {
                                                                        fillPct = 50;
                                                                    }
                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            className="h-full flex-1 rounded-full overflow-hidden relative"
                                                                            style={{ backgroundColor: isPast ? color : isCurr ? color + '25' : color + '15', opacity: isPast ? 0.55 : 1 }}
                                                                        >
                                                                            {isCurr && (
                                                                                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${fillPct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}80` }} />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Dose labels */}
                                                            <div className="flex items-center">
                                                                {peptide.titration.map((phase, idx) => {
                                                                    const isPast = idx < currentPhase.phaseIndex;
                                                                    const isCurr = idx === currentPhase.phaseIndex;
                                                                    return (
                                                                        <span key={idx} className="flex-1 text-center text-[8px] font-medium truncate"
                                                                            style={{ color: isCurr ? color : theme.textLight, opacity: isPast ? 0.55 : isCurr ? 1 : 0.35 }}>
                                                                            {phase.dose}{phase.doseUnit || 'mg'}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Phase controls — segmented control */}
                                                            {onUpdateProtocol && (
                                                                <div className="flex w-full mt-1.5 overflow-hidden rounded-xl"
                                                                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {/* Back Phase */}
                                                                    {currentPhase.phaseIndex > 0 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const prevPhase = peptide.titration[currentPhase.phaseIndex - 1];
                                                                                const count = parseInt(prevPhase?.durationCount) || 0;
                                                                                const unit = prevPhase?.durationUnit || 'weeks';
                                                                                const prevDays = unit === 'days' ? count : unit === 'weeks' ? count * 7 : count * 30;
                                                                                const daysIntoPhase = currentPhase.daysRemainingInPhase !== null
                                                                                    ? (() => {
                                                                                        const pc = parseInt(peptide.titration[currentPhase.phaseIndex]?.durationCount) || 0;
                                                                                        const pu = peptide.titration[currentPhase.phaseIndex]?.durationUnit || 'weeks';
                                                                                        const pd = pu === 'days' ? pc : pu === 'weeks' ? pc * 7 : pc * 30;
                                                                                        return pd - currentPhase.daysRemainingInPhase;
                                                                                    })() : 0;
                                                                                const updatedPeptides = p.peptides.map(pep => {
                                                                                    if (pep.id !== peptide.id && pep.name !== peptide.name) return pep;
                                                                                    return { ...pep, titrationHeldAt: null, titrationDaysOffset: (Number(pep.titrationDaysOffset) || 0) - daysIntoPhase - prevDays };
                                                                                });
                                                                                onUpdateProtocol({ ...p, peptides: updatedPeptides }, { phaseEvent: { type: 'back_phase', peptideId: peptide.id, peptideName: peptide.name, phaseIndex: currentPhase.phaseIndex, date: getLocalTimestamp() } });
                                                                            }}
                                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: '0.15s', flex: 1, color: theme.textLight, backgroundColor: 'transparent', border: 'none', borderRight: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                                                                        >
                                                                            <SkipBack size={11} /> Back
                                                                        </button>
                                                                    )}

                                                                    {/* Hold / Resume — hidden in maintenance */}
                                                                    {!currentPhase.isMaintenancePhase && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const isResuming = !!peptide.titrationHeldAt;
                                                                                const updatedPeptides = p.peptides.map(pep => {
                                                                                    if (pep.id !== peptide.id && pep.name !== peptide.name) return pep;
                                                                                    if (pep.titrationHeldAt) {
                                                                                        const heldDays = Math.floor((new Date() - new Date(pep.titrationHeldAt)) / 86400000);
                                                                                        return { ...pep, titrationHeldAt: null, titrationDaysOffset: (Number(pep.titrationDaysOffset) || 0) - heldDays };
                                                                                    }
                                                                                    const t = new Date();
                                                                                    return { ...pep, titrationHeldAt: `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}` };
                                                                                });
                                                                                onUpdateProtocol({ ...p, peptides: updatedPeptides }, { phaseEvent: { type: isResuming ? 'resumed' : 'held', peptideId: peptide.id, peptideName: peptide.name, phaseIndex: currentPhase.phaseIndex, date: getLocalTimestamp() } });
                                                                            }}
                                                                            style={{
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                                                padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: '0.15s', flex: 2, border: 'none',
                                                                                borderLeft: currentPhase.phaseIndex > 0 ? 'none' : 'none',
                                                                                borderRight: (!currentPhase.isMaintenancePhase && currentPhase.phaseIndex < currentPhase.totalPhases - 1) ? `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` : 'none',
                                                                                backgroundColor: currentPhase.isHeld ? `${theme.success || '#22c55e'}15` : 'transparent',
                                                                                color: currentPhase.isHeld ? (theme.success || '#22c55e') : theme.textLight,
                                                                            }}
                                                                        >
                                                                            {currentPhase.isHeld ? <><Play size={12} /><span>Resume</span></> : <><Pause size={12} /><span>Hold Dose</span></>}
                                                                        </button>
                                                                    )}

                                                                    {/* Next Phase */}
                                                                    {!currentPhase.isMaintenancePhase && currentPhase.phaseIndex < currentPhase.totalPhases - 1 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const updatedPeptides = p.peptides.map(pep => {
                                                                                    if (pep.id !== peptide.id && pep.name !== peptide.name) return pep;
                                                                                    return { ...pep, titrationHeldAt: null, titrationDaysOffset: (Number(pep.titrationDaysOffset) || 0) + (currentPhase.daysRemainingInPhase || 0) };
                                                                                });
                                                                                onUpdateProtocol({ ...p, peptides: updatedPeptides }, { phaseEvent: { type: 'next_phase', peptideId: peptide.id, peptideName: peptide.name, phaseIndex: currentPhase.phaseIndex, date: getLocalTimestamp() } });
                                                                            }}
                                                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: '0.15s', flex: 1, color: color, backgroundColor: 'transparent', border: 'none' }}
                                                                        >
                                                                            Next <SkipForward size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ── Non-titration milestone / duration track ── */}
                                                    {!hasTitration && (
                                                        <div className="flex flex-col gap-1.5 pt-1 pb-1 w-full">
                                                            <div className="flex items-end justify-between">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-[12px] font-bold leading-none" style={{ color }}>Day {daysActive}</span>
                                                                    <span className="text-[10px] font-medium leading-none opacity-60" style={{ color: theme.text }}>
                                                                        {hasFixedDuration ? `of ${totalDays}d` : 'ongoing'}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] font-semibold leading-none opacity-50" style={{ color: theme.text }}>
                                                                    {hasFixedDuration
                                                                        ? `${daysLeft}d left`
                                                                        : (() => {
                                                                            const next = SEGMENTS.find(s => daysActive < s.end);
                                                                            return next ? `${next.end - daysActive}d to ${next.label}` : '1yr+';
                                                                        })()
                                                                    }
                                                                </span>
                                                            </div>

                                                            {hasFixedDuration ? (
                                                                <div className="h-[6px] rounded-full overflow-hidden w-full" style={{ backgroundColor: color + '20' }}>
                                                                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, progressPct)}%`, background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)` }} />
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-[2px] h-[6px] w-full">
                                                                    {SEGMENTS.map((seg, si) => {
                                                                        const isPast = daysActive >= seg.end;
                                                                        const isCurr = !isPast && daysActive >= seg.start;
                                                                        const fillPct = isCurr ? Math.max(5, Math.min(100, Math.round(((daysActive - seg.start) / (seg.end - seg.start)) * 100))) : 0;
                                                                        return (
                                                                            <div key={seg.label} className="h-full flex-1 rounded-full overflow-hidden relative"
                                                                                style={{ backgroundColor: isPast ? color : isCurr ? color + '25' : color + '15', opacity: isPast ? 0.55 : 1 }}>
                                                                                {isCurr && <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${fillPct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}80` }} />}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {!hasFixedDuration && (
                                                                <div className="flex items-center">
                                                                    {SEGMENTS.map((seg, si) => {
                                                                        const passed = daysActive >= seg.end;
                                                                        const isCurr = !passed && daysActive >= seg.start;
                                                                        return (
                                                                            <span key={seg.label} className="flex-1 text-center text-[8px] font-medium"
                                                                                style={{ color: isCurr ? color : theme.textLight, opacity: passed ? 0.55 : isCurr ? 1 : 0.35 }}>
                                                                                {seg.label}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Frequency chips (multi-peptide or non-custom) */}
                                                    {!isSingle && peptide.frequency && (
                                                        <div className="mt-1">
                                                            {(() => {
                                                                const chipStyle = { backgroundColor: color + '20', color, border: `1px solid ${color}35` };
                                                                const chipClass = "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md";
                                                                const freq = peptide.frequency;
                                                                if (freq.type === 'daily') return <span className={chipClass} style={chipStyle}>Daily</span>;
                                                                if (freq.type === 'custom' && freq.customDays) return <span className={chipClass} style={chipStyle}>Every {freq.customDays}d</span>;
                                                                if (freq.type === 'cycle') return <span className={chipClass} style={chipStyle}>{freq.onDays}on/{freq.offDays}off</span>;
                                                                return null;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs italic opacity-50">No peptides defined</p>
                                )}
                            </div>

                            {/* ── Compact detail pills ── */}
                            {(() => {
                                const deliveryMethods = p.peptides?.length > 0 ? [...new Set(p.peptides.map(pep => pep.deliveryMethod || 'pipette'))] : [];
                                const penDeliveryColors = p.peptides?.length > 0
                                    ? [...new Set(
                                        p.peptides
                                            .filter((pep) => (pep.deliveryMethod || 'pipette') === 'pen' && pep.penColor)
                                            .map((pep) => String(pep.penColor).trim())
                                            .filter(Boolean)
                                    )]
                                    : [];
                                const primaryPenColor = penDeliveryColors[0] || '';
                                const primaryPenColorHex = getResolvedPenColor(primaryPenColor);
                                const iconMap = { pipette: Pipette, pen: Pen, nasal: Droplets, topical: Hand };
                                const labelMap = { pipette: 'Syringe', pen: 'Pen Delivery', nasal: 'Nasal', topical: 'Topical' };
                                const primaryDelivery = deliveryMethods[0];
                                const DeliveryIcon = iconMap[primaryDelivery] || Pipette;
                                const deliveryLabel = deliveryMethods.length === 1
                                    ? (labelMap[primaryDelivery] || 'Syringe')
                                    : 'Mixed Delivery';
                                const pillBase = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, fontSize: 10, fontWeight: 600, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: theme.textLight };
                                return (
                                    <div className="flex items-center gap-1.5 flex-wrap mt-3 px-0.5 pb-1">
                                        {p.duration && (
                                            <span style={pillBase}><CalendarClock size={10} />{p.duration?.noEnd ? 'Ongoing' : `${p.duration.count} ${p.duration.unit}`}</span>
                                        )}
                                        {deliveryMethods.length > 0 && (
                                            <span style={pillBase}>
                                                <DeliveryIcon size={10} />
                                                {deliveryLabel}
                                                {primaryDelivery === 'pen' && primaryPenColorHex && (
                                                    <span
                                                        aria-hidden
                                                        style={{
                                                            width: 9,
                                                            height: 9,
                                                            borderRadius: 3,
                                                            backgroundColor: primaryPenColorHex,
                                                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)'}`,
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                )}
                                            </span>
                                        )}
                                        {p.washout?.enabled && (
                                            <span style={pillBase}><RotateCw size={10} />{p.washout.count} {p.washout.unit} washout</span>
                                        )}
                                    </div>
                                );
                            })()}

                            {p.notes && (
                                <div className="mt-2 px-3 py-2 rounded-md text-[11px] italic" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', color: theme.textLight }}>
                                    {p.notes}
                                </div>
                            )}

                            {/* ── Footer with color picker + Manage ── */}
                            <div className="mt-4 pt-3 border-t relative flex items-center justify-center" style={{ borderColor: theme.border }}>
                                {/* Color picker — left */}
                                {!isPublicView && (
                                    <div className="absolute left-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                                        {showColorPicker && (
                                            <div
                                                className="absolute bottom-full mb-2 left-0 flex items-center gap-1.5 px-2 py-1.5 rounded-lg z-10"
                                                style={{ backgroundColor: theme.isDark ? 'rgba(20,30,28,0.97)' : 'rgba(255,255,255,0.98)', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', border: `1px solid ${theme.border}` }}
                                            >
                                                {PROTOCOL_PALETTE.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => { onUpdateProtocol && onUpdateProtocol({ ...p, protocolColor: c }); setShowColorPicker(false); }}
                                                        className="rounded-full transition-all"
                                                        style={{ width: 18, height: 18, backgroundColor: c, transform: c === protocolAccent ? 'scale(1.3)' : 'scale(1)', boxShadow: c === protocolAccent ? `0 0 0 2px ${c}60` : 'none' }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setShowColorPicker(v => !v)}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg"
                                            style={{ backgroundColor: protocolAccent + '15', color: protocolAccent, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.12)' }}
                                        >
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: protocolAccent }} />
                                            {showColorPicker ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                                        </button>
                                    </div>
                                )}

                                {/* Manage */}
                                <div
                                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.15em] opacity-40 hover:opacity-100 transition-opacity cursor-pointer mx-auto"
                                    onClick={(e) => { e.stopPropagation(); onStartClick(p, { manage: isActive }); }}
                                >
                                    <span>Manage</span>
                                    <TrendingUp size={12} className="rotate-90" />
                                </div>

                                {/* Share — right */}
                                <div className="absolute right-0 flex items-center">
                                    <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-1.5 rounded-full" style={{ color: theme.textLight }}>
                                        <Share2 size={16} className="opacity-40 hover:opacity-100" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* ── Inactive card ── */
                        <>
                            {p.peptides && p.peptides.length > 0 && (
                                <div className="mb-2 pb-2 border-b" style={{ borderColor: theme.border }}>
                                    <div className="space-y-1.5">
                                        {p.peptides.map((peptide, index) => (
                                            <div key={peptide.id || index} className="flex items-start gap-2">
                                                <Beaker size={14} style={{ color: theme.textLight }} className="mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm" style={{ color: theme.text }}>{peptide.name || 'Unnamed Peptide'}</div>
                                                    <div className="text-xs space-y-0.5 mt-0.5" style={{ color: theme.textLight }}>
                                                        {peptide.dosage?.amount > 0 && <div>{peptide.dosage.amount} {peptide.dosage.unit}{peptide.unitValue && ` (${peptide.unitValue} units)`}</div>}
                                                        {peptide.frequency && (
                                                            <div className="flex items-center gap-1.5">
                                                                <CalendarClock size={12} className="flex-shrink-0" />
                                                                <span>{formatIndividualFrequency(peptide.frequency)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 text-sm mb-2 pb-2 border-b" style={{ borderColor: theme.border }}>
                                {p.duration && (
                                    <div className="flex items-center gap-2">
                                        <CalendarClock size={14} style={{ color: theme.textLight }} />
                                        <span style={{ color: theme.text }}>{p.duration?.noEnd ? 'Ongoing' : (p.duration?.count && p.duration?.unit ? `${p.duration.count} ${p.duration.unit}${p.duration.count > 1 ? 's' : ''}` : 'Duration not set')}</span>
                                    </div>
                                )}
                                {p.washout?.enabled && p.washout?.count > 0 && (
                                    <div className="flex items-center gap-2">
                                        <RotateCw size={14} style={{ color: theme.textLight }} />
                                        <span style={{ color: theme.text }}>Washout: {p.washout.count} {p.washout.unit}{p.washout.count > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </div>
                            {p.notes && (
                                <div className="mb-2 flex items-start gap-2">
                                    <FileText size={14} style={{ color: theme.textLight }} className="mt-0.5" />
                                    <span className="text-sm" style={{ color: theme.text }}>{p.notes}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <ShareModal
                open={isShareModalOpen}
                onClose={() => setShareModalOpen(false)}
                theme={theme}
                title="Protocol"
                shareUrl={`${window.location.origin}${SHARE_BASE_PATH}/protocols/${p.id}`}
                CardComponent={ProtocolCard}
                cardProps={{ item: p, theme, isPublicView: true }}
                shareData={{ ...p, type: 'protocol' }}
                allowProgressMode={isActive}
            />

            {isActive && (
                <ProtocolNotesModal
                    open={isNotesModalOpen}
                    onClose={() => setIsNotesModalOpen(false)}
                    protocol={p}
                    theme={theme}
                />
            )}
        </>
    );
});

function renderDateRange(p, isActive) {
    if (!p?.startDate) {
        if (!isActive) return '';
        return 'Not started';
    }
    const start = parseDateString(p.startDate);
    if (!start) return 'Invalid date';
    const startNormalized = normalizeToMidnight(start);
    let end = p.endDate ? parseDateString(p.endDate) : null;
    if (end) end = normalizeToMidnight(end);
    if (!end && p.duration && !p.duration.noEnd && p.duration.count > 0 && p.duration.unit) {
        end = new Date(startNormalized);
        const unit = String(p.duration.unit).toLowerCase();
        const count = Number(p.duration.count) || 0;
        if (unit.includes('day')) end.setDate(end.getDate() + count - 1);
        else if (unit.includes('week')) end.setDate(end.getDate() + (count * 7) - 1);
        else if (unit.includes('month')) { end.setMonth(end.getMonth() + count); end.setDate(end.getDate() - 1); }
    }
    if (end && normalizeToMidnight(end) < startNormalized) end = new Date(startNormalized);
    if (isActive && (!end || p.duration?.noEnd)) return '';
    if (!isActive && !end) return '';
    return `${formatMMDDYYYY(startNormalized)} - ${formatMMDDYYYY(end)}`;
}

export default ProtocolCard;
