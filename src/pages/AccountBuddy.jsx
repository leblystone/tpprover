import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, Plus, Trash2, Edit3, Shield, Info, X, Check } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { featureFlags } from '../config/featureFlags';
import { createBuddy, computeInitials, pickBuddyColor } from '../utils/buddies';
import { trackConversion, EVENTS } from '../services/conversionAnalytics';

const PRESET_COLORS = [
    '#7F9E95', '#A6A6E3', '#E3A6A6', '#E3C4A6', '#C4E3A6',
    '#A6C4E3', '#E3A6D1', '#D1A6E3', '#A6E3D1',
];

/**
 * Buddy System settings page (Research+ Wave).
 *
 * Manages the local buddy list. Each buddy becomes a selectable
 * owner when tagging protocols, vendors, orders, and communities.
 *
 * Cloud invite flow (account linking, shared data) will layer on
 * top of this page later — the data model here is forward
 * compatible because every buddy has a stable id.
 */
export default function AccountBuddy() {
    const { theme } = useOutletContext();
    const { buddies = [], addBuddy, updateBuddy, deleteBuddy } = useAppContext() || {};

    const [editor, setEditor] = useState(null); // null | { buddy, mode: 'add'|'edit' }
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const enabled = featureFlags.ENABLE_BUDDY;
    const canAdd = enabled && buddies.length < 5; // soft cap; raise when cloud sync ships

    const sorted = useMemo(
        () => [...(buddies || [])].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        [buddies]
    );

    const openAdd = () => {
        setEditor({
            mode: 'add',
            buddy: {
                name: '',
                relationship: '',
                note: '',
                color: pickBuddyColor(buddies),
            },
        });
    };

    const openEdit = (buddy) => {
        setEditor({ mode: 'edit', buddy: { ...buddy } });
    };

    const handleSave = () => {
        if (!editor) return;
        const name = String(editor.buddy.name || '').trim();
        if (!name) return;

        if (editor.mode === 'add') {
            const created = createBuddy(editor.buddy, buddies);
            if (created) {
                addBuddy(created);
                trackConversion(EVENTS.BUDDY_INVITED, {
                    hasRelationship: Boolean(created.relationship),
                    buddyCount: buddies.length + 1,
                });
            }
        } else {
            updateBuddy({
                ...editor.buddy,
                name,
                initials: computeInitials(name),
            });
        }
        setEditor(null);
    };

    const handleDelete = () => {
        if (!deleteConfirm?.id) return;
        deleteBuddy(deleteConfirm.id);
        setDeleteConfirm(null);
    };

    return (
        <div
            className="min-h-screen w-full px-4 py-6 md:px-8 md:py-10"
            style={{ backgroundColor: theme?.background }}
        >
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
                    >
                        <Users size={20} style={{ color: theme?.primary || '#7F9E95' }} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl md:text-2xl font-semibold" style={{ color: theme?.text }}>
                            Buddy System
                        </h1>
                        <p className="text-sm" style={{ color: theme?.textLight }}>
                            Tag protocols, vendors, and orders by owner — then filter your lists per person.
                        </p>
                    </div>
                </header>

                {!enabled && (
                    <Banner theme={theme} tone="info" icon={<Info size={16} />}>
                        Buddy System is still rolling out. Data you add here is saved locally and will light up in your list pages once the feature flag is enabled.
                    </Banner>
                )}

                <Banner theme={theme} tone="info" icon={<Shield size={16} />}>
                    Buddies are stored on this device for now. No invite emails are sent and no data is shared until cloud sync ships in a later update.
                </Banner>

                <section
                    className="rounded-2xl overflow-hidden"
                    style={{
                        backgroundColor: theme?.cardBackground || theme?.white,
                        border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                    }}
                >
                    <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                        <h2 className="font-semibold text-sm" style={{ color: theme?.text }}>
                            Your buddies {sorted.length > 0 && <span style={{ color: theme?.textLight }}>· {sorted.length}</span>}
                        </h2>
                        <button
                            type="button"
                            onClick={openAdd}
                            disabled={!canAdd}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 disabled:opacity-50"
                            style={{
                                backgroundColor: theme?.primary || '#7F9E95',
                                color: theme?.white || '#fff',
                            }}
                        >
                            <Plus size={14} />
                            Add buddy
                        </button>
                    </div>

                    {sorted.length === 0 ? (
                        <div className="p-8 text-center">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                                style={{ backgroundColor: (theme?.primary || '#7F9E95') + '18' }}
                            >
                                <Users size={22} style={{ color: theme?.primary || '#7F9E95' }} />
                            </div>
                            <p className="text-sm font-medium mb-1" style={{ color: theme?.text }}>
                                No buddies yet
                            </p>
                            <p className="text-xs" style={{ color: theme?.textLight }}>
                                Add someone you want to co-track research for — a partner, training buddy, or collaborator.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                            {sorted.map((buddy) => (
                                <li key={buddy.id} className="flex items-center gap-3 p-4">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                        style={{ backgroundColor: buddy.color || '#7F9E95' }}
                                    >
                                        {buddy.initials || computeInitials(buddy.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate" style={{ color: theme?.text }}>
                                            {buddy.name}
                                        </p>
                                        {(buddy.relationship || buddy.note) && (
                                            <p className="text-xs truncate" style={{ color: theme?.textLight }}>
                                                {buddy.relationship}
                                                {buddy.relationship && buddy.note ? ' · ' : ''}
                                                {buddy.note}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openEdit(buddy)}
                                        className="p-2 rounded-full hover:opacity-80"
                                        aria-label={`Edit ${buddy.name}`}
                                        style={{ color: theme?.textLight }}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirm(buddy)}
                                        className="p-2 rounded-full hover:opacity-80"
                                        aria-label={`Remove ${buddy.name}`}
                                        style={{ color: theme?.error || '#d64545' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {sorted.length >= 5 && (
                    <Banner theme={theme} tone="info" icon={<Info size={16} />}>
                        You've hit the soft cap of 5 buddies for now. The limit lifts once cloud-synced buddies ship.
                    </Banner>
                )}
            </div>

            {editor && (
                <BuddyEditorModal
                    theme={theme}
                    state={editor}
                    onChange={(patch) => setEditor((e) => ({ ...e, buddy: { ...e.buddy, ...patch } }))}
                    onClose={() => setEditor(null)}
                    onSave={handleSave}
                    existing={buddies}
                />
            )}

            {deleteConfirm && (
                <ConfirmModal
                    theme={theme}
                    title={`Remove ${deleteConfirm.name}?`}
                    body="Their tag will be cleared from any records. You can re-add them later."
                    confirmLabel="Remove"
                    onCancel={() => setDeleteConfirm(null)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}

function Banner({ theme, icon, children }) {
    return (
        <div
            className="rounded-2xl p-3 flex items-start gap-2 text-xs"
            style={{
                backgroundColor: (theme?.primary || '#7F9E95') + '12',
                color: theme?.text,
                border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
            }}
        >
            <span style={{ color: theme?.primary || '#7F9E95' }} className="mt-0.5">{icon}</span>
            <span style={{ color: theme?.textLight }}>{children}</span>
        </div>
    );
}

function BuddyEditorModal({ theme, state, onChange, onClose, onSave, existing }) {
    const { buddy, mode } = state;
    const nameInvalid = !String(buddy?.name || '').trim();

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <h3 className="font-semibold text-base" style={{ color: theme?.text }}>
                        {mode === 'add' ? 'Add buddy' : 'Edit buddy'}
                    </h3>
                    <button onClick={onClose} aria-label="Close" style={{ color: theme?.textLight }}>
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <Field label="Name" theme={theme}>
                        <input
                            type="text"
                            value={buddy.name || ''}
                            onChange={(e) => onChange({ name: e.target.value })}
                            placeholder="Jamie Rivera"
                            autoFocus
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                backgroundColor: theme?.background,
                                color: theme?.text,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                            }}
                        />
                    </Field>

                    <Field label="Relationship (optional)" theme={theme}>
                        <input
                            type="text"
                            value={buddy.relationship || ''}
                            onChange={(e) => onChange({ relationship: e.target.value })}
                            placeholder="Partner, training buddy, coach..."
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                                backgroundColor: theme?.background,
                                color: theme?.text,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                            }}
                        />
                    </Field>

                    <Field label="Note (optional)" theme={theme}>
                        <textarea
                            rows={2}
                            value={buddy.note || ''}
                            onChange={(e) => onChange({ note: e.target.value })}
                            placeholder="Anything you want to remember about this buddy."
                            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                            style={{
                                backgroundColor: theme?.background,
                                color: theme?.text,
                                border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                            }}
                        />
                    </Field>

                    <Field label="Color tag" theme={theme}>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((c) => {
                                const selected = buddy.color === c;
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => onChange({ color: c })}
                                        aria-label={`Use color ${c}`}
                                        className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95"
                                        style={{
                                            backgroundColor: c,
                                            boxShadow: selected ? `0 0 0 2px ${theme?.white || '#fff'}, 0 0 0 4px ${c}` : 'none',
                                        }}
                                    >
                                        {selected && <Check size={12} color="#fff" />}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                </div>

                <div className="flex items-center justify-end gap-2 p-3 border-t" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ color: theme?.textLight }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={nameInvalid}
                        className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: theme?.primary || '#7F9E95', color: theme?.white || '#fff' }}
                    >
                        {mode === 'add' ? 'Add buddy' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, theme, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold mb-1" style={{ color: theme?.textLight }}>
                {label}
            </span>
            {children}
        </label>
    );
}

function ConfirmModal({ theme, title, body, confirmLabel, onCancel, onConfirm }) {
    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5">
                    <h3 className="font-semibold text-base" style={{ color: theme?.text }}>{title}</h3>
                    <p className="text-sm mt-1" style={{ color: theme?.textLight }}>{body}</p>
                </div>
                <div className="flex items-center justify-end gap-2 p-3 border-t" style={{ borderColor: theme?.border || 'rgba(0,0,0,0.08)' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded-full text-sm font-medium"
                        style={{ color: theme?.textLight }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-1.5 rounded-full font-semibold text-sm active:scale-95"
                        style={{ backgroundColor: theme?.error || '#d64545', color: theme?.white || '#fff' }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
