import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    IconContext,
    ArrowLeft, Users, UserPlus, Trash,
    Check, Clock, LinkSimple, Shield,
    WarningCircle, CaretRight, PencilSimple, X, DownloadSimple, Archive, Lock,
    PauseCircle, PlayCircle,
} from '@phosphor-icons/react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import { featureFlags } from '../config/featureFlags';
import { useTierAccess } from '../utils/useSubscriptionAccess';
import { computeInitials, pickBuddyColor, OWNER_SELF } from '../utils/buddies';
import {
    removePartner,
    getCachedPartner, setCachedPartner,
} from '../services/partnerInvite';
import UpgradeModal from '../components/common/UpgradeModal';
import { BUDDY_SYSTEM_SHORT } from '../data/buddySystemLimits';
import { MAX_BUDDIES } from '../utils/buddies';

const ARCHIVE_KEY = 'tpp_buddy_archive';

export default function AccountBuddy() {
    const { theme } = useOutletContext();
    const navigate = useNavigate();
    const {
        user, buddies = [], addBuddy, deleteBuddy, updateBuddy,
        archiveBuddyRecords, restoreBuddyRecords, deleteBuddyRecords, hideBuddyStockpile,
        protocols = [], setProtocols,
        supplements = [], setSupplements,
        stockpile = [], setStockpile,
        orders = [],
    } = useAppContext() || {};
    const { firebaseUser } = useFirebase();
    const { hasBuddyAccess } = useTierAccess();

    const enabled = featureFlags.ENABLE_BUDDY;
    const [showUpgrade, setShowUpgrade] = useState(false);

    // Derive partner from buddies array first (source of truth), then fall back to cache.
    // Spread the full buddy record so fields like `paused` survive a page reload.
    const partnerFromBuddies = buddies?.length > 0
        ? { status: 'local', ...buddies[0] }
        : null;

    const [partner, setPartner] = useState(() => {
        const cached = getCachedPartner();
        // Prefer the live buddies array if available, otherwise use the invite cache
        if (partnerFromBuddies) return partnerFromBuddies;
        if (cached) return cached;
        return null;
    });

    const [localName, setLocalName]           = useState('');
    const [sending, setSending]               = useState(false);
    const [error, setError]                   = useState(null);
    const [showLocalForm, setShowLocalForm]   = useState(false);

    // Rename state
    const [editingName, setEditingName]   = useState(false);
    const [nameDraft, setNameDraft]       = useState('');

    // Remove flow: null | 'choose' | 'pause' | 'remove' | 'delete'
    const [removeStep, setRemoveStep] = useState(null);

    // Previous Buddies history panel
    const [showHistory, setShowHistory] = useState(false);

    // Archived buddy — read from localStorage on mount
    const [archivedBuddy, setArchivedBuddy] = useState(() => {
        try {
            const raw = localStorage.getItem(ARCHIVE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (Date.now() > data.expiresAt) { localStorage.removeItem(ARCHIVE_KEY); return null; }
            return data;
        } catch { return null; }
    });

    /* Detect orphaned ownerId references — protocols/supplements tagged to a buddy
       ID that no longer exists in the buddies array. Offers one-tap restore.
       We intentionally exclude orders and vendors: historical purchase records with
       an old buddy's ownerId are permanent reference data and should not keep the
       "Previous" chip lit years after a clean removal. */
    const orphanedBuddyId = React.useMemo(() => {
        if (buddies?.length > 0) return null; // buddy record exists, nothing to restore
        const knownIds = new Set((buddies || []).map(b => b.id));
        const trackingItems = [
            ...(protocols || []),
            ...(supplements || []),
        ];
        for (const item of trackingItems) {
            if (item?.ownerId && item.ownerId !== OWNER_SELF && !knownIds.has(item.ownerId)) {
                return item.ownerId;
            }
        }
        return null;
    }, [buddies, protocols, supplements]);

    const [restoreName, setRestoreName] = useState('');

    const handleRestoreBuddy = () => {
        const name = restoreName.trim();
        if (!name || !orphanedBuddyId) return;
        const buddyId = orphanedBuddyId;
        // Re-create the buddy record using the SAME id so all ownerId references reconnect
        addBuddy({
            id: buddyId,
            name,
            initials: computeInitials(name),
            color: pickBuddyColor(),
            relationship: '',
            note: '',
            createdAt: new Date().toISOString(),
        });
        // Reactivate protocols/supplements and sync to cloud via the context function
        if (restoreBuddyRecords) restoreBuddyRecords(buddyId);
        setRestoreName('');
        setShowRestoreForm(false);
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `Buddy "${name}" restored — all their records are reconnected.`, type: 'success' } }));
    };

    /* Build a flat JSON export of all records tagged to a buddyId */
    const buildBuddyExport = (buddyId) => ({
        exportedAt: new Date().toISOString(),
        buddy: buddies.find(b => b.id === buddyId) || archivedBuddy?.partner || { id: buddyId },
        protocols: protocols.filter(r => r?.ownerId === buddyId),
        supplements: supplements.filter(r => r?.ownerId === buddyId),
        stockpile: stockpile.filter(r => r?.ownerId === buddyId),
        orders: orders.filter(r => r?.ownerId === buddyId),
    });

    const handleExport = (buddyId) => {
        const data = buildBuddyExport(buddyId);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tpp-buddy-export-${(data.buddy?.name || buddyId).replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Buddy data exported successfully', type: 'success' } }));
    };

    /* Sync from local buddies — keep partner state fresh if buddies array changes */
    useEffect(() => {
        if (buddies?.length > 0) {
            const b = buddies[0];
            setPartner(prev => {
                // If we already have a non-local (linked/pending) partner, don't overwrite
                if (prev && prev.status !== 'local') return prev;
                return { status: 'local', id: b.id, name: b.name, color: b.color, initials: b.initials };
            });
        }
    }, [buddies]);

    /* Sync from Firestore user doc */
    useEffect(() => {
        if (user?.partnerId && user?.partnerEmail) {
            const linked = { status: 'linked', partnerId: user.partnerId, partnerEmail: user.partnerEmail, linkedAt: user.partnerLinkedAt };
            setPartner(linked);
            setCachedPartner(linked);
        } else if (user?.partnerInvitePending) {
            const pending = { status: 'pending', inviteeEmail: user.partnerInvitePending.inviteeEmail, inviteId: user.partnerInvitePending.inviteId };
            setPartner(pending);
            setCachedPartner(pending);
        }
    }, [user?.partnerId, user?.partnerEmail, user?.partnerInvitePending]);

    /* ── handlers ── */
    const handleAddLocal = () => {
        const name = localName.trim();
        if (!name) return;
        if ((buddies || []).length >= MAX_BUDDIES && !partner) {
            window.dispatchEvent(new CustomEvent('tpp:toast', {
                detail: { message: `Only ${MAX_BUDDIES} buddy allowed per account. Remove the current buddy first.`, type: 'warning' },
            }));
            return;
        }
        (buddies || []).forEach((b) => deleteBuddy(b.id));
        const color    = pickBuddyColor([]);
        const initials = computeInitials(name);
        const id       = `local_${Date.now()}`;
        addBuddy({ id, name, initials, color, relationship: '', note: '' });
        setPartner({ status: 'local', id, name, color, initials });
        setShowLocalForm(false);
        setLocalName('');
    };

    const handleSaveName = () => {
        const name = nameDraft.trim();
        if (!name || name === partner?.name) { setEditingName(false); return; }
        const initials = computeInitials(name);
        // updateBuddy expects the full buddy object
        if (partner?.id && updateBuddy) {
            updateBuddy({ ...partner, name, initials });
        }
        const updated = { ...partner, name, initials };
        setPartner(updated);
        setCachedPartner(updated);
        setEditingName(false);
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Buddy label updated', type: 'success' } }));
    };

    // Pause tracking — stops protocols/supplements, buddy stays in account
    const handlePause = async () => {
        setError(null);
        try {
            if (partner?.id) {
                await archiveBuddyRecords(partner.id);
                const buddyRecord = (buddies || []).find(b => b.id === partner.id);
                if (buddyRecord) updateBuddy({ ...buddyRecord, paused: true });
                const updated = { ...partner, paused: true };
                setPartner(updated);
                setCachedPartner(updated);
            }
            setRemoveStep(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Tracking paused — protocols and supplements stopped. Resume anytime.', type: 'success' } }));
        } catch (e) {
            setError(e?.message || 'Could not pause tracking.');
        }
    };

    // Resume tracking after a pause
    const handleResume = async () => {
        if (!partner?.id) return;
        await restoreBuddyRecords(partner.id);
        const buddyRecord = (buddies || []).find(b => b.id === partner.id);
        if (buddyRecord) updateBuddy({ ...buddyRecord, paused: false });
        const updated = { ...partner, paused: false };
        setPartner(updated);
        setCachedPartner(updated);
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Tracking resumed — all protocols and supplements reactivated.', type: 'success' } }));
    };

    // Remove from account — deactivates tasks, hides inventory from views, keeps 30-day export window
    const handleRemoveFromAccount = async () => {
        setError(null);
        try {
            if (partner?.status === 'linked' || partner?.status === 'pending') await removePartner();
            const archiveData = { partner, archivedAt: Date.now(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
            try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archiveData)); } catch {}
            if (partner?.id) {
                await archiveBuddyRecords(partner.id);
                // Hide stockpile items from list views — force-synced to Firestore via context function
                await hideBuddyStockpile(partner.id);
                deleteBuddy(partner.id);
            }
            setPartner(null);
            setCachedPartner(null);
            setRemoveStep(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Buddy removed. Their data is kept for 30 days for export.', type: 'success' } }));
        } catch (e) {
            setError(e?.message || 'Could not remove buddy.');
        }
    };

    // Hard remove — delete everything including tagged records
    const handleDeletePermanently = async () => {
        setError(null);
        try {
            const buddyId = partner?.id;
            if (partner?.status === 'linked' || partner?.status === 'pending') await removePartner();
            if (buddyId) {
                // deleteBuddyRecords stamps protection windows and force-syncs to Firestore
                // so the cloud listener cannot restore records within the 30s window
                await deleteBuddyRecords(buddyId);
                deleteBuddy(buddyId);
            }
            try { localStorage.removeItem(ARCHIVE_KEY); } catch {}
            setArchivedBuddy(null);
            setPartner(null);
            setCachedPartner(null);
            setRemoveStep(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Partner and all their data permanently deleted.', type: 'success' } }));
        } catch (e) {
            setError(e?.message || 'Could not delete partner data.');
        }
    };

    const statusInfo = {
        linked:  { label: 'Co-tracking active', color: theme?.success || '#4CAF50', icon: <LinkSimple size={13} /> },
        pending: { label: 'Invite pending',     color: theme?.warning || '#F59E0B', icon: <Clock size={13} /> },
        local:   { label: 'Co-tracking active', color: theme?.success || '#4CAF50', icon: <Users size={13} /> },
    };

    const border = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;

    return (
        <IconContext.Provider value={{ weight: 'duotone' }}>
        <section className="page-bg max-w-xl mx-auto space-y-6 pb-10">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => navigate('/app/settings')}
                    className="group p-2 rounded-full hover:opacity-80 transition-all active:scale-95 shrink-0"
                    style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                >
                    <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Buddy System</h1>
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                            Co-track research under one account
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-px w-full opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

            {/* ── Paywall — Research+ only ── */}
            {!hasBuddyAccess && (
                <div className="space-y-4">
                    <div
                        className="rounded-2xl p-6 text-center space-y-4"
                        style={{
                            background: theme.isDark
                                ? 'linear-gradient(135deg, rgba(127,158,149,0.1) 0%, rgba(127,158,149,0.04) 100%)'
                                : 'linear-gradient(135deg, rgba(127,158,149,0.12) 0%, rgba(127,158,149,0.05) 100%)',
                            border: `1px solid ${theme.primary}30`,
                        }}
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                            style={{ backgroundColor: theme.primary + '18' }}
                        >
                            <Lock size={26} style={{ color: theme.primary }} />
                        </div>
                        <div>
                            <p className="font-semibold text-base mb-1" style={{ color: theme.text }}>Buddy System is Research+</p>
                            <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: theme.textLight }}>
                                {BUDDY_SYSTEM_SHORT}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowUpgrade(true)}
                            className="w-full py-3 rounded-xl text-sm font-semibold active:scale-95 transition-all"
                            style={{ backgroundColor: theme.primary, color: '#fff' }}
                        >
                            Upgrade to Research+
                        </button>
                    </div>

                    {/* Greyed-out preview */}
                    <div className="rounded-2xl overflow-hidden relative" style={{ border }}>
                        <div className="p-5 space-y-3 opacity-30 pointer-events-none select-none">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full" style={{ backgroundColor: theme.primary + '40' }} />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 rounded-full w-24" style={{ backgroundColor: theme.text + '30' }} />
                                    <div className="h-2.5 rounded-full w-40" style={{ backgroundColor: theme.text + '20' }} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: theme.text + '10' }} />
                                <div className="flex-1 h-9 rounded-xl" style={{ backgroundColor: theme.text + '10' }} />
                            </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'transparent' }}>
                            <Lock size={22} className="opacity-20" style={{ color: theme.text }} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Feature off notice ── */}
            {hasBuddyAccess && !enabled && (
                <div className="content-section p-4 rounded-2xl flex items-start gap-3" style={{ border }}>
                    <Shield size={16} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                    <p className="text-sm" style={{ color: theme.textLight }}>
                        Buddy System is still rolling out. Data you add here is saved locally and will appear across your lists once enabled.
                    </p>
                </div>
            )}

            {/* ── Main content — Research+ only ── */}
            {hasBuddyAccess && <div className="space-y-6">

            {/* ── PARTNER STATUS ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 w-full min-w-0">
                    <Users size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
                    <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40 shrink-0" style={{ color: theme.text }}>Research buddy</span>
                    <div
                        className="flex-1 h-px min-w-0"
                        style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
                    />
                    {/* Previous Buddies chip — only show if there's history to review */}
                    {(orphanedBuddyId || archivedBuddy) && (
                        <button
                            type="button"
                            onClick={() => setShowHistory(true)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-all active:scale-95"
                            style={{ backgroundColor: theme.primary + '15', border: `1px solid ${theme.primary}30`, color: theme.primary }}
                        >
                            <Clock size={10} weight="bold" />
                            Previous
                        </button>
                    )}
                </div>

                {partner ? (
                    <div className="content-section p-5 rounded-2xl space-y-4" style={{ border }}>
                        {/* Top row — avatar + info */}
                        <div className="flex items-center gap-4">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                                style={{ backgroundColor: partner.color || theme.primary }}
                            >
                                {partner.initials || computeInitials(partner.name || partner.partnerEmail || '?')}
                            </div>

                            <div className="flex-1 min-w-0">
                                {editingName ? (
                                    <div className="flex items-center gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={nameDraft}
                                            onChange={(e) => setNameDraft(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                                            className="flex-1 px-3 py-1.5 rounded-lg text-sm border-2 outline-none"
                                            style={{ backgroundColor: theme.background, borderColor: theme.primary, color: theme.text }}
                                        />
                                        <button type="button" onClick={handleSaveName} className="p-1.5 rounded-lg" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                                            <Check size={14} />
                                        </button>
                                        <button type="button" onClick={() => setEditingName(false)} className="p-1.5 rounded-lg opacity-50" style={{ color: theme.text }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold" style={{ color: theme.text }}>
                                            {partner.name || partner.partnerEmail || 'Research buddy'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => { setNameDraft(partner.name || ''); setEditingName(true); }}
                                            className="p-1 rounded opacity-30 hover:opacity-70 transition-opacity"
                                            style={{ color: theme.text }}
                                            title="Rename"
                                        >
                                            <PencilSimple size={12} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
                                    {partner.status === 'pending'
                                        ? `Invite sent to ${partner.inviteeEmail}`
                                        : partner.status === 'linked'
                                        ? partner.partnerEmail
                                        : 'Records can be tagged to this buddy'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <span style={{ color: statusInfo[partner.status]?.color }}>{statusInfo[partner.status]?.icon}</span>
                                    <span className="text-[11px] font-semibold" style={{ color: statusInfo[partner.status]?.color }}>
                                        {statusInfo[partner.status]?.label}
                                    </span>
                                    {partner.paused && (
                                        <span
                                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                                            style={{ backgroundColor: 'rgba(180,130,0,0.15)', color: '#b48200' }}
                                        >
                                            Paused
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Spot the difference — above export/remove */}
                        <div className="flex items-start gap-3 pt-1">
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[15px] leading-none select-none"
                                style={{ background: `linear-gradient(135deg, ${theme.primary}30 0%, ${theme.primary}90 100%)` }}
                            >
                                ☯
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>Spot the difference</p>
                                <p className="text-xs mt-0.5 mb-3 leading-relaxed opacity-60" style={{ color: theme.text }}>Your cards stay light. Buddy cards go dark — tinted in their protocol's own color.</p>
                                <div className="flex gap-2">
                                    <div
                                        className="flex-1 rounded-xl p-3 space-y-2"
                                        style={{
                                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.92)',
                                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}`,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold" style={{ color: theme.text }}>BPC-157</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>You</span>
                                        </div>
                                        <div className="h-1 rounded-full w-3/4" style={{ backgroundColor: theme.primary + '40' }} />
                                        <p className="text-[9px] opacity-40" style={{ color: theme.text }}>500 mcg · Day 12</p>
                                    </div>
                                    <div
                                        className="flex-1 rounded-xl p-3 space-y-2"
                                        style={{
                                            backgroundColor: '#2a3830',
                                            border: '1px solid rgba(127,158,149,0.35)',
                                            boxShadow: 'inset 0 0 0 1px rgba(127,158,149,0.2)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>Cagrilintide</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(127,158,149,0.3)', color: 'rgba(255,255,255,0.85)' }}>
                                                {partner?.initials || 'HU'}
                                            </span>
                                        </div>
                                        <div className="h-1 rounded-full w-1/2" style={{ backgroundColor: 'rgba(127,158,149,0.5)' }} />
                                        <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.45)' }}>250 mcg · Day 0</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Paused banner */}
                        {partner.paused && (
                            <div
                                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                style={{ backgroundColor: theme.isDark ? 'rgba(255,200,50,0.08)' : 'rgba(180,130,0,0.07)', border: '1px solid rgba(180,130,0,0.18)' }}
                            >
                                <PauseCircle size={14} weight="duotone" style={{ color: '#b48200', flexShrink: 0 }} />
                                <p className="text-xs flex-1" style={{ color: theme.isDark ? 'rgba(255,200,50,0.85)' : '#7a5800' }}>
                                    Tracking paused — all active protocols and supplements are stopped.
                                </p>
                            </div>
                        )}

                        {/* Action row */}
                        <div className="flex gap-2 pt-1">
                            {partner.paused ? (
                                <button
                                    type="button"
                                    onClick={handleResume}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                                    style={{ backgroundColor: theme.primary + '15', border: `1px solid ${theme.primary}40`, color: theme.primary }}
                                >
                                    <PlayCircle size={15} weight="duotone" />
                                    Resume tracking
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => partner?.id && handleExport(partner.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
                                    style={{ border: `1px solid ${theme.border}`, color: theme.textLight, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                                >
                                    <DownloadSimple size={14} />
                                    Export data
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setRemoveStep('choose')}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
                                style={{ border: `1px solid ${(theme.error || '#d64545')}30`, color: theme.error || '#d64545', backgroundColor: `${theme.error || '#d64545'}08` }}
                            >
                                <Trash size={14} />
                                Remove buddy
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Empty state */
                    <div className="space-y-3">

                        <div className="content-section p-6 rounded-2xl text-center" style={{ border }}>
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                                style={{ backgroundColor: theme.primary + '18' }}
                            >
                                <Users size={26} style={{ color: theme.primary }} />
                            </div>
                            <p className="font-semibold mb-1" style={{ color: theme.text }}>No research buddy yet</p>
                            <p className="text-sm max-w-xs mx-auto" style={{ color: theme.textLight }}>
                                Add a buddy to tag records as "Mine" or "Theirs" and filter your lists by person.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── ADD BUDDY ── (only when none set) */}
            {!partner && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1 w-full min-w-0">
                        <UserPlus size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
                        <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40 shrink-0" style={{ color: theme.text }}>Add a buddy</span>
                        <div
                            className="flex-1 h-px min-w-0"
                            style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
                        />
                    </div>

                    {/* Name only — only option (single-account model, no email needed) */}
                    {!showLocalForm && (
                        <button
                            type="button"
                            onClick={() => { setShowLocalForm(true); setError(null); }}
                            className="content-section group w-full p-5 rounded-2xl transition-all text-left flex items-center gap-4"
                            style={{ border }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.primary + '18' }}>
                                <UserPlus size={18} style={{ color: theme.primary }} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold" style={{ color: theme.text }}>Add a buddy</p>
                                <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                    Give them a name — tag and filter all records by person
                                </p>
                            </div>
                            <CaretRight size={16} style={{ color: theme.textLight }} />
                        </button>
                    )}

                    {showLocalForm && (
                        <div className="content-section p-5 rounded-2xl space-y-3" style={{ border }}>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                Give your buddy a name. You can always rename it later from their card.
                            </p>
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLocal()}
                                placeholder="e.g. Husband, Partner, Mom…"
                                autoFocus
                                className="w-full px-4 py-3 rounded-xl text-sm border-2 outline-none transition-all"
                                style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                            />
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowLocalForm(false)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                    style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddLocal}
                                    disabled={!localName.trim()}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-50"
                                    style={{ backgroundColor: theme.primary, color: theme.white || '#fff' }}
                                >
                                    Add buddy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Compact scope note ── */}
            <div className="content-section p-3.5 rounded-2xl flex items-start gap-3" style={{ border }}>
                <Shield size={15} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                    One co-tracking slot — tag Mine/Theirs and filter by person. Not a second login; analytics & AI stay with your account.
                </p>
            </div>

            {/* ── Previous Buddies history modal ── */}
            {showHistory && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-[99999]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowHistory(false)}
                >
                    <div
                        className="content-section w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
                        style={{ backgroundColor: theme.cardBackground || theme.white || '#fff', border }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <div className="flex items-center gap-2">
                                <Clock size={15} weight="duotone" style={{ color: theme.primary }} />
                                <h3 className="font-semibold text-sm" style={{ color: theme.text }}>Previous Buddies</h3>
                            </div>
                            <button type="button" onClick={() => setShowHistory(false)} className="p-1 rounded-lg opacity-40 hover:opacity-70 transition-opacity" style={{ color: theme.text }}>
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Orphaned buddy — has data but no buddy record */}
                            {orphanedBuddyId && (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: theme.primary + '0c', border: `1px solid ${theme.primary}25` }}>
                                        <WarningCircle size={16} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold" style={{ color: theme.text }}>Orphaned data found</p>
                                            <p className="text-xs mt-0.5 opacity-70 leading-snug" style={{ color: theme.text }}>
                                                Protocols, supplements, or stockpile items are tagged to a buddy that no longer exists. Enter their name to reconnect.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={restoreName}
                                            onChange={e => setRestoreName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleRestoreBuddy()}
                                            placeholder="Buddy's name…"
                                            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                                            style={{ backgroundColor: theme.surface || theme.background, border: `1px solid ${theme.border}`, color: theme.text }}
                                        />
                                        <button
                                            onClick={() => { handleRestoreBuddy(); setShowHistory(false); }}
                                            disabled={!restoreName.trim()}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 active:scale-95"
                                            style={{ backgroundColor: theme.primary, color: '#fff' }}
                                        >
                                            Restore
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Archived buddy — soft-removed with 30-day window */}
                            {archivedBuddy && (
                                <div className="space-y-3">
                                    {orphanedBuddyId && <div className="h-px w-full" style={{ backgroundColor: theme.border }} />}
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: archivedBuddy.partner?.color || theme.primary }}>
                                            {archivedBuddy.partner?.initials || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm" style={{ color: theme.text }}>
                                                {archivedBuddy.partner?.name || 'Removed buddy'}
                                            </p>
                                            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                                Archived · expires {new Date(archivedBuddy.expiresAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0" style={{ backgroundColor: theme.primary + '15', color: theme.primary }}>
                                            {Math.max(0, Math.ceil((archivedBuddy.expiresAt - Date.now()) / 86400000))}d left
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { handleExport(archivedBuddy.partner?.id); setShowHistory(false); }}
                                            className="flex-1 py-2 rounded-xl text-xs font-semibold active:scale-95 flex items-center justify-center gap-1.5"
                                            style={{ backgroundColor: theme.primary, color: '#fff' }}
                                        >
                                            <DownloadSimple size={12} /> Export data
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { try { localStorage.removeItem(ARCHIVE_KEY); } catch {} setArchivedBuddy(null); setShowHistory(false); }}
                                            className="px-4 py-2 rounded-xl text-xs font-medium active:scale-95"
                                            style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                        >
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Fallback — nothing left to show */}
                            {!orphanedBuddyId && !archivedBuddy && (
                                <p className="text-sm text-center py-2 opacity-50" style={{ color: theme.text }}>No previous buddy history found.</p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            </div>} {/* end hasBuddyAccess main content */}

            {/* ── Upgrade modal ── */}
            <UpgradeModal
                isOpen={showUpgrade}
                onClose={() => setShowUpgrade(false)}

                theme={theme}
            />

            {/* ── Remove flow portal ── */}
            {removeStep && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setRemoveStep(null)}
                >
                    <div
                        className="content-section w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4"
                        style={{
                            backgroundColor: theme.cardBackground || theme.white || '#fff',
                            border,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {removeStep === 'choose' && (
                            <>
                                <div>
                                    <h3 className="font-semibold text-base mb-1" style={{ color: theme.text }}>
                                        What would you like to do?
                                    </h3>
                                    <p className="text-xs opacity-60" style={{ color: theme.text }}>
                                        Choose how to handle {partner?.name || 'your buddy'}'s records.
                                    </p>
                                </div>
                                {error && <p className="text-xs" style={{ color: theme.error }}>{error}</p>}
                                <div className="space-y-2">
                                    {/* Pause option */}
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('pause')}
                                        className="w-full p-3.5 rounded-xl text-left transition-all active:scale-95 flex items-start gap-3"
                                        style={{ backgroundColor: 'rgba(180,130,0,0.07)', border: '1px solid rgba(180,130,0,0.2)' }}
                                    >
                                        <PauseCircle size={18} weight="duotone" className="shrink-0 mt-0.5" style={{ color: '#b48200' }} />
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: theme.text }}>Pause tracking</p>
                                            <p className="text-xs mt-0.5 opacity-60 leading-snug" style={{ color: theme.text }}>
                                                Stop all active protocols and supplements. Buddy stays in your account — resume anytime.
                                            </p>
                                        </div>
                                    </button>
                                    {/* Remove from account option */}
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('remove')}
                                        className="w-full p-3.5 rounded-xl text-left transition-all active:scale-95 flex items-start gap-3"
                                        style={{ backgroundColor: theme.primary + '10', border: `1px solid ${theme.primary}30` }}
                                    >
                                        <Archive size={18} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: theme.text }}>Remove from account</p>
                                            <p className="text-xs mt-0.5 opacity-60 leading-snug" style={{ color: theme.text }}>
                                                Stop tasks and hide their data from all views. Records kept 30 days for export.
                                            </p>
                                        </div>
                                    </button>
                                    {/* Delete option */}
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('delete')}
                                        className="w-full p-3.5 rounded-xl text-left transition-all active:scale-95 flex items-start gap-3"
                                        style={{ backgroundColor: (theme.error || '#d64545') + '10', border: `1px solid ${theme.error || '#d64545'}30` }}
                                    >
                                        <Trash size={18} className="shrink-0 mt-0.5" style={{ color: theme.error || '#d64545' }} />
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: theme.text }}>Delete permanently</p>
                                            <p className="text-xs mt-0.5 opacity-60 leading-snug" style={{ color: theme.text }}>
                                                Wipe buddy and all their tagged records immediately. Cannot be undone.
                                            </p>
                                        </div>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRemoveStep(null)}
                                    className="w-full py-2.5 rounded-xl text-sm font-medium"
                                    style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                >
                                    Cancel
                                </button>
                            </>
                        )}

                        {removeStep === 'pause' && (
                            <>
                                <div>
                                    <h3 className="font-semibold text-base mb-1" style={{ color: theme.text }}>Pause tracking?</h3>
                                    <p className="text-sm" style={{ color: theme.textLight }}>
                                        All active protocols and supplements tagged to <strong>{partner?.name || 'your buddy'}</strong> will be stopped. Their data stays visible and you can resume anytime.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: 'rgba(180,130,0,0.07)', border: '1px solid rgba(180,130,0,0.15)' }}>
                                    <PlayCircle size={14} weight="duotone" className="shrink-0 mt-0.5" style={{ color: '#b48200' }} />
                                    <p className="text-xs" style={{ color: theme.textLight }}>
                                        Stockpile, orders, and other records remain visible. Resume tracking to reactivate everything.
                                    </p>
                                </div>
                                {error && <p className="text-xs" style={{ color: theme.error }}>{error}</p>}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('choose')}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                        style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePause}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                                        style={{ backgroundColor: '#b48200', color: '#fff' }}
                                    >
                                        Pause tracking
                                    </button>
                                </div>
                            </>
                        )}

                        {removeStep === 'remove' && (
                            <>
                                <div>
                                    <h3 className="font-semibold text-base mb-1" style={{ color: theme.text }}>Remove from account?</h3>
                                    <p className="text-sm" style={{ color: theme.textLight }}>
                                        <strong>{partner?.name || 'Their'}</strong>'s protocols stop and their data is hidden from all views. Records are kept for 30 days so they can export to a new account if needed.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: theme.primary + '10' }}>
                                    <DownloadSimple size={14} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                                    <p className="text-xs" style={{ color: theme.textLight }}>
                                        Use the Export button before removing if your buddy wants to keep their data.
                                    </p>
                                </div>
                                {error && <p className="text-xs" style={{ color: theme.error }}>{error}</p>}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('choose')}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                        style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRemoveFromAccount}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                                        style={{ backgroundColor: theme.primary, color: '#fff' }}
                                    >
                                        Remove from account
                                    </button>
                                </div>
                            </>
                        )}

                        {removeStep === 'delete' && (
                            <>
                                <div>
                                    <h3 className="font-semibold text-base mb-1" style={{ color: theme.error || '#d64545' }}>Permanently delete?</h3>
                                    <p className="text-sm" style={{ color: theme.textLight }}>
                                        All records tagged to <strong>{partner?.name || 'this buddy'}</strong> will be permanently removed. This cannot be undone.
                                    </p>
                                </div>
                                {error && <p className="text-xs" style={{ color: theme.error }}>{error}</p>}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('choose')}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                        style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeletePermanently}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                                        style={{ backgroundColor: theme.error || '#d64545', color: '#fff' }}
                                    >
                                        Yes, delete everything
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </section>
        </IconContext.Provider>
    );
}
