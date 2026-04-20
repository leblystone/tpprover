import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
    Users, UserPlus, Mail, Check, X, Trash2,
    Clock, Shield, Info, Link2, LogIn, AlertCircle,
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

/**
 * Research Partner page (Buddy System v2).
 *
 * One partner per account. Flow:
 *   1. No partner → invite by email
 *   2. Invite pending → show who was invited, allow cancel
 *   3. Linked → show partner card with linked indicator
 *
 * Until the cloud invite flow is live the user can also add a
 * "local label" (just a name) so tagging still works offline.
 */
export default function AccountBuddy() {
    const { theme } = useOutletContext();
    const { user, buddies = [], addBuddy, deleteBuddy } = useAppContext() || {};
    const { firebaseUser } = useFirebase();

    const enabled = featureFlags.ENABLE_BUDDY;

    // Partner state: null | { status: 'local'|'pending'|'linked', ... }
    const [partner, setPartner] = useState(() => {
        // Derive from cached cloud state or first buddy in local list
        const cached = getCachedPartner();
        if (cached) return cached;
        if (buddies?.length > 0) {
            const b = buddies[0];
            return { status: 'local', id: b.id, name: b.name, color: b.color, initials: b.initials };
        }
        return null;
    });

    const [inviteEmail, setInviteEmail] = useState('');
    const [localName, setLocalName] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [showLocalForm, setShowLocalForm] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);

    // Sync local buddy changes into partner state
    useEffect(() => {
        const cached = getCachedPartner();
        if (cached) return; // cloud state wins
        if (buddies?.length > 0 && !partner) {
            const b = buddies[0];
            setPartner({ status: 'local', id: b.id, name: b.name, color: b.color, initials: b.initials });
        }
    }, [buddies]);

    // Also reflect server-side partner from user doc
    useEffect(() => {
        if (user?.partnerId && user?.partnerEmail) {
            const linked = {
                status: 'linked',
                partnerId: user.partnerId,
                partnerEmail: user.partnerEmail,
                linkedAt: user.partnerLinkedAt,
            };
            setPartner(linked);
            setCachedPartner(linked);
        } else if (user?.partnerInvitePending) {
            const pending = {
                status: 'pending',
                inviteeEmail: user.partnerInvitePending.inviteeEmail,
                inviteId: user.partnerInvitePending.inviteId,
            };
            setPartner(pending);
            setCachedPartner(pending);
        }
    }, [user?.partnerId, user?.partnerEmail, user?.partnerInvitePending]);

    /* ── handlers ─────────────────────────────────────────────────── */

    const handleSendInvite = async () => {
        setError(null);
        setSending(true);
        try {
            const res = await sendPartnerInvite(inviteEmail.trim());
            setPartner({ status: 'pending', inviteeEmail: res.inviteeEmail, inviteId: res.inviteId });
            setShowInviteForm(false);
            setInviteEmail('');
            window.dispatchEvent(new CustomEvent('tpp:toast', {
                detail: { message: `Invite sent to ${res.inviteeEmail}`, type: 'success' },
            }));
        } catch (e) {
            setError(e?.message || 'Could not send invite. Try again.');
        } finally {
            setSending(false);
        }
    };

    const handleAddLocal = () => {
        const name = localName.trim();
        if (!name) return;
        // Remove any existing local buddy first (1-partner cap)
        (buddies || []).forEach((b) => deleteBuddy(b.id));
        const color = pickBuddyColor([]);
        const initials = computeInitials(name);
        const id = `local_${Date.now()}`;
        addBuddy({ id, name, initials, color, relationship: '', note: '' });
        const p = { status: 'local', id, name, color, initials };
        setPartner(p);
        setShowLocalForm(false);
        setLocalName('');
    };

    const handleRemove = async () => {
        setError(null);
        try {
            if (partner?.status === 'linked' || partner?.status === 'pending') {
                await removePartner();
            }
            if (partner?.id) deleteBuddy(partner.id);
            setPartner(null);
            setCachedPartner(null);
            setConfirmRemove(false);
        } catch (e) {
            setError(e?.message || 'Could not remove partner.');
            setConfirmRemove(false);
        }
    };

    /* ── render ───────────────────────────────────────────────────── */

    const hasPartner = Boolean(partner);

    return (
        <div className="min-h-screen w-full px-4 py-6 md:px-8 md:py-10" style={{ backgroundColor: theme?.background }}>
            <div className="max-w-xl mx-auto space-y-5">

                {/* Header */}
                <header className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}>
                        <Users size={20} style={{ color: theme?.primary || '#7F9E95' }} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold" style={{ color: theme?.text }}>Research Partner</h1>
                        <p className="text-sm" style={{ color: theme?.textLight }}>
                            Link one partner so you can tag and filter records by owner.
                        </p>
                    </div>
                </header>

                {/* Flag-off notice */}
                {!enabled && (
                    <InfoBanner theme={theme} icon={<Info size={15} />}>
                        Buddy System is still rolling out — data you add is saved locally and will show across list pages once enabled.
                    </InfoBanner>
                )}

                {/* Privacy notice */}
                <InfoBanner theme={theme} icon={<Shield size={15} />}>
                    Partner data is stored securely on your account. Invite emails are only sent when you explicitly tap "Send invite."
                </InfoBanner>

                {/* ── Partner card ── */}
                {hasPartner ? (
                    <PartnerCard partner={partner} theme={theme} onRemove={() => setConfirmRemove(true)} />
                ) : (
                    <EmptyState theme={theme} onInvite={() => { setShowInviteForm(true); setShowLocalForm(false); }} onLocal={() => { setShowLocalForm(true); setShowInviteForm(false); }} />
                )}

                {/* ── Invite form ── */}
                {showInviteForm && !hasPartner && (
                    <FormCard
                        theme={theme}
                        title="Send an invite"
                        icon={<Mail size={16} style={{ color: theme?.primary }} />}
                        onClose={() => { setShowInviteForm(false); setError(null); }}
                    >
                        <p className="text-xs mb-3" style={{ color: theme?.textLight }}>
                            Enter your partner's email. They'll receive a link to create their own account and connect with you — or sign in if they already have one.
                        </p>
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                            placeholder="partner@email.com"
                            autoFocus
                            className="w-full px-3 py-2 rounded-xl text-sm mb-3"
                            style={{ backgroundColor: theme?.background, border: `1px solid ${theme?.border}`, color: theme?.text }}
                        />
                        {error && (
                            <div className="flex items-center gap-2 text-xs mb-3 p-2 rounded-lg" style={{ backgroundColor: (theme?.error || '#d64545') + '15', color: theme?.error || '#d64545' }}>
                                <AlertCircle size={13} /> {error}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setShowInviteForm(false); setError(null); }} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ border: `1px solid ${theme?.border}`, color: theme?.textLight }}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendInvite}
                                disabled={sending || !inviteEmail.trim()}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                style={{ backgroundColor: theme?.primary || '#7F9E95', color: theme?.white || '#fff' }}
                            >
                                {sending ? <span className="animate-spin">⟳</span> : <Mail size={14} />}
                                {sending ? 'Sending…' : 'Send invite'}
                            </button>
                        </div>
                        <p className="text-[11px] mt-3 text-center" style={{ color: theme?.textLight }}>
                            Don't want to invite via email? <button type="button" className="underline" onClick={() => { setShowInviteForm(false); setShowLocalForm(true); }}>Add a local label instead →</button>
                        </p>
                    </FormCard>
                )}

                {/* ── Local label form ── */}
                {showLocalForm && !hasPartner && (
                    <FormCard
                        theme={theme}
                        title="Add a local label"
                        icon={<UserPlus size={16} style={{ color: theme?.primary }} />}
                        onClose={() => { setShowLocalForm(false); setError(null); }}
                    >
                        <p className="text-xs mb-3" style={{ color: theme?.textLight }}>
                            No email needed. Just add a name so you can tag records as "Mine" vs theirs. Data stays on this device — great for testing the feature before your partner signs up.
                        </p>
                        <input
                            type="text"
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddLocal()}
                            placeholder="Partner's first name"
                            autoFocus
                            className="w-full px-3 py-2 rounded-xl text-sm mb-3"
                            style={{ backgroundColor: theme?.background, border: `1px solid ${theme?.border}`, color: theme?.text }}
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowLocalForm(false)} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ border: `1px solid ${theme?.border}`, color: theme?.textLight }}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAddLocal}
                                disabled={!localName.trim()}
                                className="flex-1 py-2 rounded-xl text-sm font-semibold active:scale-95 disabled:opacity-50"
                                style={{ backgroundColor: theme?.primary || '#7F9E95', color: theme?.white || '#fff' }}
                            >
                                Add label
                            </button>
                        </div>
                    </FormCard>
                )}

                {/* How it works */}
                <HowItWorks theme={theme} />

            </div>

            {/* Confirm remove portal */}
            {confirmRemove && ReactDOM.createPortal(
                <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999]" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setConfirmRemove(false)}>
                    <div className="w-full max-w-sm rounded-2xl shadow-xl p-5" style={{ backgroundColor: theme?.cardBackground || '#fff', border: `1px solid ${theme?.border}` }} onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-semibold text-base mb-1" style={{ color: theme?.text }}>Remove partner?</h3>
                        <p className="text-sm mb-4" style={{ color: theme?.textLight }}>
                            Their label will be cleared from your records. If they were linked by email, both accounts will be unlinked.
                        </p>
                        {error && <p className="text-xs mb-3" style={{ color: theme?.error }}>{error}</p>}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmRemove(false)} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ border: `1px solid ${theme?.border}`, color: theme?.textLight }}>Cancel</button>
                            <button type="button" onClick={handleRemove} className="flex-1 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: theme?.error || '#d64545', color: '#fff' }}>Remove</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function PartnerCard({ partner, theme, onRemove }) {
    const statusMap = {
        linked:  { label: 'Linked account',  color: theme?.success || '#4CAF50', icon: <Link2 size={12} /> },
        pending: { label: 'Invite pending',   color: theme?.warning || '#F59E0B', icon: <Clock size={12} /> },
        local:   { label: 'Local label only', color: theme?.textLight,            icon: <LogIn size={12} /> },
    };
    const s = statusMap[partner?.status] || statusMap.local;
    const initials = partner.initials || computeInitials(partner.name || partner.partnerEmail || '?');
    const displayName = partner.name || partner.partnerEmail || 'Linked partner';
    const sub = partner.status === 'pending' ? `Invite sent to ${partner.inviteeEmail}` : partner.status === 'linked' ? partner.partnerEmail : 'Tap to upgrade to a linked account';

    return (
        <div className="rounded-2xl p-4" style={{ backgroundColor: theme?.cardBackground || theme?.white, border: `1px solid ${theme?.border}` }}>
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0" style={{ backgroundColor: partner.color || theme?.primary || '#7F9E95' }}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: theme?.text }}>{displayName}</p>
                    <p className="text-xs truncate" style={{ color: theme?.textLight }}>{sub}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <span style={{ color: s.color }}>{s.icon}</span>
                        <span className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</span>
                    </div>
                </div>
                <button type="button" onClick={onRemove} className="p-2 rounded-full hover:opacity-70" style={{ color: theme?.error || '#d64545' }} aria-label="Remove partner">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}

function EmptyState({ theme, onInvite, onLocal }) {
    return (
        <div className="rounded-2xl p-6 text-center space-y-4" style={{ backgroundColor: theme?.cardBackground || theme?.white, border: `1px solid ${theme?.border}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}>
                <Users size={26} style={{ color: theme?.primary || '#7F9E95' }} />
            </div>
            <div>
                <p className="font-semibold text-sm mb-1" style={{ color: theme?.text }}>No research partner yet</p>
                <p className="text-xs max-w-xs mx-auto" style={{ color: theme?.textLight }}>
                    Add one partner to co-track research. Tag records as "Mine" or "Theirs" and filter your lists by owner.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button type="button" onClick={onInvite} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-95" style={{ backgroundColor: theme?.primary || '#7F9E95', color: theme?.white || '#fff' }}>
                    <Mail size={15} /> Invite by email
                </button>
                <button type="button" onClick={onLocal} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium active:scale-95" style={{ border: `1px solid ${theme?.border}`, color: theme?.text }}>
                    <UserPlus size={15} /> Add name only
                </button>
            </div>
        </div>
    );
}

function FormCard({ theme, title, icon, onClose, children }) {
    return (
        <div className="rounded-2xl p-4" style={{ backgroundColor: theme?.cardBackground || theme?.white, border: `1px solid ${theme?.border}` }}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {icon}
                    <h2 className="font-semibold text-sm" style={{ color: theme?.text }}>{title}</h2>
                </div>
                <button type="button" onClick={onClose} style={{ color: theme?.textLight }}><X size={15} /></button>
            </div>
            {children}
        </div>
    );
}

function HowItWorks({ theme }) {
    const steps = [
        { icon: <Mail size={14} />, title: 'Send an invite', body: 'Enter your partner\'s email. They get a link to sign up or sign in.' },
        { icon: <Check size={14} />, title: 'They accept', body: 'Once they tap the link, both accounts are securely linked.' },
        { icon: <Users size={14} />, title: 'Tag & filter', body: 'Any record can be tagged "Mine" or "Theirs." Filter your lists by owner.' },
    ];
    return (
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme?.cardBackground || theme?.white, border: `1px solid ${theme?.border}` }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme?.textLight }}>How it works</p>
            <div className="space-y-3">
                {steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18', color: theme?.primary || '#7F9E95' }}>
                            {s.icon}
                        </div>
                        <div>
                            <p className="text-xs font-semibold" style={{ color: theme?.text }}>{s.title}</p>
                            <p className="text-xs" style={{ color: theme?.textLight }}>{s.body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function InfoBanner({ theme, icon, children }) {
    return (
        <div className="rounded-2xl p-3 flex items-start gap-2 text-xs" style={{ backgroundColor: (theme?.primary || '#7F9E95') + '12', border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}` }}>
            <span className="mt-0.5" style={{ color: theme?.primary || '#7F9E95' }}>{icon}</span>
            <span style={{ color: theme?.textLight }}>{children}</span>
        </div>
    );
}
