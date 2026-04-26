import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, Mail, UserPlus, Trash2,
    Check, X, Clock, Link2, LogIn, Shield,
    AlertCircle, ChevronRight,
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

export default function AccountBuddy() {
    const { theme } = useOutletContext();
    const navigate = useNavigate();
    const { user, buddies = [], addBuddy, deleteBuddy } = useAppContext() || {};
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

    const [inviteEmail, setInviteEmail] = useState('');
    const [localName, setLocalName]   = useState('');
    const [sending, setSending]       = useState(false);
    const [error, setError]           = useState(null);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [showLocalForm, setShowLocalForm]   = useState(false);
    const [confirmRemove, setConfirmRemove]   = useState(false);

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

    const handleRemove = async () => {
        setError(null);
        try {
            if (partner?.status === 'linked' || partner?.status === 'pending') await removePartner();
            if (partner?.id) deleteBuddy(partner.id);
            setPartner(null);
            setCachedPartner(null);
            setConfirmRemove(false);
        } catch (e) {
            setError(e?.message || 'Could not remove partner.');
            setConfirmRemove(false);
        }
    };

    const statusInfo = {
        linked:  { label: 'Linked account',  color: theme?.success || '#4CAF50', icon: <Link2 size={13} /> },
        pending: { label: 'Invite pending',   color: theme?.warning || '#F59E0B', icon: <Clock size={13} /> },
        local:   { label: 'Local label only', color: theme?.textLight,            icon: <LogIn size={13} /> },
    };

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
                    <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Research Partner</h1>
                    <div className="flex items-center gap-2">
                        <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                            Link your research partner
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-px w-full opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />

            {/* ── Feature off notice ── */}
            {!enabled && (
                <div className="content-section p-4 rounded-2xl flex items-start gap-3" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
                    <Shield size={16} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                    <p className="text-sm" style={{ color: theme.textLight }}>
                        Research Partner is still rolling out. Data you add here is saved locally and will show across list pages once enabled.
                    </p>
                </div>
            )}

            {/* ── PARTNER STATUS ── */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1 w-full min-w-0">
                    <Users size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
                    <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40 shrink-0" style={{ color: theme.text }}>Partner status</span>
                    <div
                        className="flex-1 h-px min-w-0"
                        style={{
                            background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                        }}
                    />
                </div>

                {partner ? (
                    /* Partner card */
                    <div
                        className="content-section p-5 rounded-2xl flex items-center gap-4"
                        style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                    >
                        {/* Avatar */}
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                            style={{ backgroundColor: partner.color || theme.primary }}
                        >
                            {partner.initials || computeInitials(partner.name || partner.partnerEmail || '?')}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold" style={{ color: theme.text }}>
                                {partner.name || partner.partnerEmail || 'Linked partner'}
                            </p>
                            <p className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
                                {partner.status === 'pending' ? `Invite sent to ${partner.inviteeEmail}` : partner.status === 'linked' ? partner.partnerEmail : 'Tap "Upgrade" to link their account'}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                                <span style={{ color: statusInfo[partner.status]?.color }}>{statusInfo[partner.status]?.icon}</span>
                                <span className="text-[11px] font-semibold" style={{ color: statusInfo[partner.status]?.color }}>
                                    {statusInfo[partner.status]?.label}
                                </span>
                            </div>
                        </div>

                        {/* Remove */}
                        <button
                            type="button"
                            onClick={() => setConfirmRemove(true)}
                            className="p-2 rounded-full hover:opacity-70 shrink-0"
                            style={{ color: theme.error || '#d64545' }}
                            aria-label="Remove partner"
                        >
                            <Trash2 size={17} />
                        </button>
                    </div>
                ) : (
                    /* Empty state */
                    <div
                        className="content-section p-6 rounded-2xl text-center"
                        style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                    >
                        <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                            style={{ backgroundColor: theme.primary + '18' }}
                        >
                            <Users size={26} style={{ color: theme.primary }} />
                        </div>
                        <p className="font-semibold mb-1" style={{ color: theme.text }}>No research partner yet</p>
                        <p className="text-sm max-w-xs mx-auto" style={{ color: theme.textLight }}>
                            Add one partner to co-track research. Tag any record as "Mine" or "Theirs," then filter your lists by owner.
                        </p>
                    </div>
                )}
            </div>

            {/* ── ADD PARTNER ── (only when no partner) */}
            {!partner && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1 w-full min-w-0">
                        <UserPlus size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
                        <span className="text-xs font-bold uppercase tracking-[0.12em] opacity-40 shrink-0" style={{ color: theme.text }}>Add a partner</span>
                        <div
                            className="flex-1 h-px min-w-0"
                            style={{
                                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                            }}
                        />
                    </div>

                    {/* Invite by email */}
                    <button
                        type="button"
                        onClick={() => { setShowInviteForm(true); setShowLocalForm(false); setError(null); }}
                        className="content-section group w-full p-5 rounded-2xl transition-all text-left flex items-center gap-4"
                        style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.primary + '18' }}>
                            <Mail size={18} style={{ color: theme.primary }} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold" style={{ color: theme.text }}>Invite by email</p>
                            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                Send your partner a link to set up their partner profile for shared tracking
                            </p>
                        </div>
                        <ChevronRight size={16} style={{ color: theme.textLight }} />
                    </button>

                    {/* Invite form (inline, expands below) */}
                    {showInviteForm && (
                        <div
                            className="content-section p-5 rounded-2xl space-y-3"
                            style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                        >
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                Enter your partner's email. They'll get a link to confirm and appear in your shared tracking setup.
                            </p>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                                placeholder="partner@email.com"
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
                                    {sending ? 'Sending…' : 'Send invite'}
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

                    {/* Add name only */}
                    <button
                        type="button"
                        onClick={() => { setShowLocalForm(true); setShowInviteForm(false); setError(null); }}
                        className="content-section group w-full p-5 rounded-2xl transition-all text-left flex items-center gap-4"
                        style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.primary + '18' }}>
                            <UserPlus size={18} style={{ color: theme.primary }} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold" style={{ color: theme.text }}>Add name only</p>
                            <p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
                                No email needed — just a label for tagging records. Great for testing the feature
                            </p>
                        </div>
                        <ChevronRight size={16} style={{ color: theme.textLight }} />
                    </button>

                    {/* Local name form */}
                    {showLocalForm && (
                        <div
                            className="content-section p-5 rounded-2xl space-y-3"
                            style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
                        >
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                Data stays on this device until your partner signs up.
                            </p>
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLocal()}
                                placeholder="Partner's first name"
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
                                    Add label
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
                        style={{
                            background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
                        }}
                    />
                </div>

                {[
                    { num: '1', title: 'Send an invite', body: "Enter your partner's email — they'll get a link to confirm their spot." },
                    { num: '2', title: 'They confirm',   body: 'Once accepted, they appear in your shared tracking setup.' },
                    { num: '3', title: 'Tag & filter',   body: 'Tag any record as "Mine" or "Theirs," then filter your lists by owner.' },
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
            <div
                className="content-section p-4 rounded-2xl flex items-start gap-3"
                style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}
            >
                <Shield size={15} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                    Partner data is stored securely on your account. Invite emails are only sent when you explicitly tap "Send invite."
                </p>
            </div>

            {/* ── Confirm remove portal ── */}
            {confirmRemove && ReactDOM.createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 z-[99999]"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setConfirmRemove(false)}
                >
                    <div
                        className="content-section w-full max-w-sm rounded-2xl shadow-xl p-6"
                        style={{
                            backgroundColor: theme.cardBackground || theme.white || '#fff',
                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-semibold text-base mb-1" style={{ color: theme.text }}>Remove partner?</h3>
                        <p className="text-sm mb-5" style={{ color: theme.textLight }}>
                            Their label will be cleared from your records. If they were linked by email, both accounts will be unlinked.
                        </p>
                        {error && <p className="text-xs mb-3" style={{ color: theme.error }}>{error}</p>}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setConfirmRemove(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                style={{ border: `1px solid ${theme.border}`, color: theme.textLight }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold active:scale-95"
                                style={{ backgroundColor: theme.error || '#d64545', color: '#fff' }}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
}
