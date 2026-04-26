import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, Mail, UserPlus, Trash2,
    Check, Clock, Link2, LogIn, Shield,
    AlertCircle, ChevronRight, Pencil, X, Download, Archive,
} from 'lucide-react';
import ReactDOM from 'react-dom';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import { featureFlags } from '../config/featureFlags';
import { computeInitials, pickBuddyColor } from '../utils/buddies';
import {
    sendPartnerInvite, removePartner,
    getCachedPartner, setCachedPartner,
} from '../services/partnerInvite';

const ARCHIVE_KEY = 'tpp_buddy_archive';

export default function AccountBuddy() {
    const { theme } = useOutletContext();
    const navigate = useNavigate();
    const { user, buddies = [], addBuddy, deleteBuddy, updateBuddy } = useAppContext() || {};
    const { firebaseUser } = useFirebase();

    const enabled = featureFlags.ENABLE_BUDDY;

    const [partner, setPartner] = useState(() => {
        const cached = getCachedPartner();
        if (cached) return cached;
        if (buddies?.length > 0) {
            const b = buddies[0];
            return { status: 'local', id: b.id, name: b.name, color: b.color, initials: b.initials };
        }
        return null;
    });

    const [inviteEmail, setInviteEmail]       = useState('');
    const [localName, setLocalName]           = useState('');
    const [sending, setSending]               = useState(false);
    const [error, setError]                   = useState(null);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [showLocalForm, setShowLocalForm]   = useState(false);

    // Rename state
    const [editingName, setEditingName]   = useState(false);
    const [nameDraft, setNameDraft]       = useState('');

    // Remove flow: null | 'choose' | 'archive' | 'delete'
    const [removeStep, setRemoveStep] = useState(null);

    /* Sync from local buddies */
    useEffect(() => {
        const cached = getCachedPartner();
        if (cached) return;
        if (buddies?.length > 0 && !partner) {
            const b = buddies[0];
            setPartner({ status: 'local', id: b.id, name: b.name, color: b.color, initials: b.initials });
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
    const handleSendInvite = async () => {
        setError(null);
        setSending(true);
        try {
            const res = await sendPartnerInvite(inviteEmail.trim());
            setPartner({ status: 'pending', inviteeEmail: res.inviteeEmail, inviteId: res.inviteId });
            setShowInviteForm(false);
            setInviteEmail('');
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: `Invite sent to ${res.inviteeEmail}`, type: 'success' } }));
        } catch (e) {
            setError(e?.message || 'Could not send invite. Try again.');
        } finally {
            setSending(false);
        }
    };

    const handleAddLocal = () => {
        const name = localName.trim();
        if (!name) return;
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
        // Update in buddies store if local
        if (partner?.id && updateBuddy) updateBuddy(partner.id, { name, initials });
        const updated = { ...partner, name, initials };
        setPartner(updated);
        setCachedPartner(updated);
        setEditingName(false);
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Partner label updated', type: 'success' } }));
    };

    // Soft remove — archive for 30 days
    const handleArchive = async () => {
        setError(null);
        try {
            if (partner?.status === 'linked' || partner?.status === 'pending') await removePartner();
            const archiveData = { partner, archivedAt: Date.now(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 };
            try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archiveData)); } catch {}
            // Keep buddy data in the store — just remove the partner pointer
            setPartner(null);
            setCachedPartner(null);
            setRemoveStep(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Partner removed. Their data is kept for 30 days for export.', type: 'success' } }));
        } catch (e) {
            setError(e?.message || 'Could not remove partner.');
        }
    };

    // Hard remove — delete everything
    const handleDeletePermanently = async () => {
        setError(null);
        try {
            if (partner?.status === 'linked' || partner?.status === 'pending') await removePartner();
            if (partner?.id) deleteBuddy(partner.id);
            try { localStorage.removeItem(ARCHIVE_KEY); } catch {}
            setPartner(null);
            setCachedPartner(null);
            setRemoveStep(null);
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Partner and all their data permanently deleted.', type: 'success' } }));
        } catch (e) {
            setError(e?.message || 'Could not delete partner data.');
        }
    };

    const statusInfo = {
        linked:  { label: 'Shared tracking active', color: theme?.success || '#4CAF50', icon: <Link2 size={13} /> },
        pending: { label: 'Invite pending',          color: theme?.warning || '#F59E0B', icon: <Clock size={13} /> },
        local:   { label: 'Name label',              color: theme?.textLight,            icon: <LogIn size={13} /> },
    };

    const border = `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`;

    return (
        <section className="page-bg max-w-xl mx-auto space-y-6 pb-10">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-2">
                <button
                    onClick={() => navigate('/app/account')}
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

            {/* ── Feature off notice ── */}
            {!enabled && (
                <div className="content-section p-4 rounded-2xl flex items-start gap-3" style={{ border }}>
                    <Shield size={16} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                    <p className="text-sm" style={{ color: theme.textLight }}>
                        Buddy System is still rolling out. Data you add here is saved locally and will appear across your lists once enabled.
                    </p>
                </div>
            )}

            {/* ── PARTNER STATUS ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 w-full min-w-0">
                    <Users size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
                    <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40 shrink-0" style={{ color: theme.text }}>Research buddy</span>
                    <div
                        className="flex-1 h-px min-w-0"
                        style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
                    />
                </div>

                {partner ? (
                    <div className="content-section p-5 rounded-2xl space-y-3" style={{ border }}>
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                                style={{ backgroundColor: partner.color || theme.primary }}
                            >
                                {partner.initials || computeInitials(partner.name || partner.partnerEmail || '?')}
                            </div>

                            {/* Info / inline edit */}
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
                                            <Pencil size={12} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
                                    {partner.status === 'pending'
                                        ? `Invite sent to ${partner.inviteeEmail}`
                                        : partner.status === 'linked'
                                        ? partner.partnerEmail
                                        : 'Name label for shared record tagging'}
                                </p>
                                <div className="flex items-center gap-1 mt-1.5">
                                    <span style={{ color: statusInfo[partner.status]?.color }}>{statusInfo[partner.status]?.icon}</span>
                                    <span className="text-[11px] font-semibold" style={{ color: statusInfo[partner.status]?.color }}>
                                        {statusInfo[partner.status]?.label}
                                    </span>
                                </div>
                            </div>

                            {/* Remove trigger */}
                            <button
                                type="button"
                                onClick={() => setRemoveStep('choose')}
                                className="p-2 rounded-full hover:opacity-70 shrink-0"
                                style={{ color: theme.error || '#d64545' }}
                                aria-label="Remove buddy"
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Empty state */
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

                    {/* Invite by email */}
                    <button
                        type="button"
                        onClick={() => { setShowInviteForm(true); setShowLocalForm(false); setError(null); }}
                        className="content-section group w-full p-5 rounded-2xl transition-all text-left flex items-center gap-4"
                        style={{ border }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.primary + '18' }}>
                            <Mail size={18} style={{ color: theme.primary }} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold" style={{ color: theme.text }}>Add by email</p>
                            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                Notify your buddy — they'll be added to your shared tracking setup
                            </p>
                        </div>
                        <ChevronRight size={16} style={{ color: theme.textLight }} />
                    </button>

                    {showInviteForm && (
                        <div className="content-section p-5 rounded-2xl space-y-3" style={{ border }}>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                Enter your buddy's email. They'll get a notification that they've been added to your shared research setup.
                            </p>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                                placeholder="buddy@email.com"
                                autoFocus
                                className="w-full px-4 py-3 rounded-xl text-sm border-2 outline-none transition-all"
                                style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                            />
                            {error && (
                                <div className="flex items-center gap-2 text-xs p-3 rounded-xl" style={{ backgroundColor: (theme.error || '#d64545') + '15', color: theme.error || '#d64545' }}>
                                    <AlertCircle size={13} /> {error}
                                </div>
                            )}
                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => { setShowInviteForm(false); setError(null); }}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                    style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSendInvite}
                                    disabled={sending || !inviteEmail.trim()}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    style={{ backgroundColor: theme.primary, color: theme.white || '#fff' }}
                                >
                                    {sending ? <span className="animate-spin">⟳</span> : <Mail size={14} />}
                                    {sending ? 'Sending…' : 'Add buddy'}
                                </button>
                            </div>
                            <p className="text-[11px] text-center" style={{ color: theme.textLight }}>
                                No email?{' '}
                                <button type="button" className="underline" onClick={() => { setShowInviteForm(false); setShowLocalForm(true); }}>
                                    Add a name label instead →
                                </button>
                            </p>
                        </div>
                    )}

                    {/* Name only */}
                    <button
                        type="button"
                        onClick={() => { setShowLocalForm(true); setShowInviteForm(false); setError(null); }}
                        className="content-section group w-full p-5 rounded-2xl transition-all text-left flex items-center gap-4"
                        style={{ border }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.primary + '18' }}>
                            <UserPlus size={18} style={{ color: theme.primary }} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold" style={{ color: theme.text }}>Name label only</p>
                            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                No email needed — just a name to tag and filter records by
                            </p>
                        </div>
                        <ChevronRight size={16} style={{ color: theme.textLight }} />
                    </button>

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

            {/* ── HOW IT WORKS ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 w-full min-w-0">
                    <Shield size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
                    <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40 shrink-0" style={{ color: theme.text }}>How it works</span>
                    <div
                        className="flex-1 h-px min-w-0"
                        style={{ background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)` }}
                    />
                </div>

                {[
                    { num: '1', title: 'Add your buddy', body: 'Give them a name label — no separate account needed.' },
                    { num: '2', title: 'Tag records',    body: 'Mark any protocol, supplement, or log as "Mine" or "Theirs."' },
                    { num: '3', title: 'Filter & view',  body: 'Switch between your data and theirs — or view everything together.' },
                ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3 px-1">
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold"
                            style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
                        >
                            {step.num}
                        </div>
                        <div>
                            <p className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>{step.title}</p>
                            <p className="text-xs mt-0.5 leading-relaxed opacity-60" style={{ color: theme.text }}>{step.body}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Privacy note ── */}
            <div className="content-section p-4 rounded-2xl flex items-start gap-3" style={{ border }}>
                <Shield size={15} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                    All buddy data lives under your account. No separate logins or subscriptions needed. You control everything.
                </p>
            </div>

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
                                        Remove {partner?.name || 'buddy'}?
                                    </h3>
                                    <p className="text-sm" style={{ color: theme.textLight }}>
                                        Choose what happens to their tagged records.
                                    </p>
                                </div>
                                {error && <p className="text-xs" style={{ color: theme.error }}>{error}</p>}
                                <div className="space-y-2">
                                    {/* Archive option */}
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('archive')}
                                        className="w-full p-4 rounded-xl text-left transition-all active:scale-95 flex items-start gap-3"
                                        style={{ backgroundColor: theme.primary + '10', border: `1px solid ${theme.primary}30` }}
                                    >
                                        <Archive size={18} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: theme.text }}>Keep data for 30 days</p>
                                            <p className="text-xs mt-0.5 opacity-60" style={{ color: theme.text }}>
                                                Removes the buddy label but preserves their records for 30 days so they can export to a new account.
                                            </p>
                                        </div>
                                    </button>
                                    {/* Delete option */}
                                    <button
                                        type="button"
                                        onClick={() => setRemoveStep('delete')}
                                        className="w-full p-4 rounded-xl text-left transition-all active:scale-95 flex items-start gap-3"
                                        style={{ backgroundColor: (theme.error || '#d64545') + '10', border: `1px solid ${theme.error || '#d64545'}30` }}
                                    >
                                        <Trash2 size={18} className="shrink-0 mt-0.5" style={{ color: theme.error || '#d64545' }} />
                                        <div>
                                            <p className="font-semibold text-sm" style={{ color: theme.text }}>Delete permanently</p>
                                            <p className="text-xs mt-0.5 opacity-60" style={{ color: theme.text }}>
                                                Removes the buddy and all their tagged records immediately. This cannot be undone.
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

                        {removeStep === 'archive' && (
                            <>
                                <div>
                                    <h3 className="font-semibold text-base mb-1" style={{ color: theme.text }}>Keep for 30 days?</h3>
                                    <p className="text-sm" style={{ color: theme.textLight }}>
                                        <strong>{partner?.name || 'Their'}</strong> records stay visible for 30 days under an archived label. During this window they can export their data and import it into a fresh account if needed.
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: theme.primary + '10' }}>
                                    <Download size={14} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                                    <p className="text-xs" style={{ color: theme.textLight }}>
                                        After 30 days, archived data is automatically removed unless you export it first.
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
                                        onClick={handleArchive}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                                        style={{ backgroundColor: theme.primary, color: '#fff' }}
                                    >
                                        Archive for 30 days
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
    );
}
