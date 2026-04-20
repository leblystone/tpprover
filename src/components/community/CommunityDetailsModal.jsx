import React, { useState, useEffect } from 'react';
import { X, Users, Save, Trash2, ExternalLink, Link2 } from 'lucide-react';
import OwnerSelect from '../buddy/OwnerSelect';
import { OWNER_SELF } from '../../utils/buddies';

/**
 * Platform catalogue — logo SVGs + deeplink builders.
 * Ordered by popularity in the peptide/research community.
 */
const PLATFORMS = [
    {
        value: 'reddit',
        label: 'Reddit',
        color: '#FF4500',
        buildUrl: (name) => name ? `https://reddit.com/r/${name.replace(/^r\//, '')}` : '',
        placeholder: 'r/Peptides',
        hint: 'Enter the subreddit name (e.g. r/Peptides)',
        Logo: () => (
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <circle cx="10" cy="10" r="10" fill="#FF4500" />
                <path fill="#fff" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .1-.49l-2.38-.5a.12.12 0 0 0-.14.09l-.73 3.43a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .37c0 1.88 2.19 3.41 4.89 3.41s4.89-1.53 4.89-3.41a2.87 2.87 0 0 0 0-.37 1.46 1.46 0 0 0 .41-1.1zm-9.4 1a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.59 2.71a3.58 3.58 0 0 1-2.86.79 3.58 3.58 0 0 1-2.86-.79.15.15 0 0 1 .21-.21 3.27 3.27 0 0 0 2.65.63 3.27 3.27 0 0 0 2.65-.63.15.15 0 0 1 .21.21zm-.08-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" />
            </svg>
        ),
    },
    {
        value: 'discord',
        label: 'Discord',
        color: '#5865F2',
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'Paste invite link',
        hint: 'Paste the Discord invite link',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
        ),
    },
    {
        value: 'telegram',
        label: 'Telegram',
        color: '#26A5E4',
        buildUrl: (name) => name ? `https://t.me/${name.replace(/^@/, '')}` : '',
        placeholder: '@groupname',
        hint: 'Enter the Telegram @username or group name',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="#26A5E4" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.803l-2.964-.924c-.643-.204-.657-.643.136-.953l11.573-4.46c.537-.194 1.006.131.889.755z" />
            </svg>
        ),
    },
    {
        value: 'facebook',
        label: 'Facebook Group',
        color: '#1877F2',
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'Paste group URL',
        hint: 'Paste the Facebook Group link',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
        ),
    },
    {
        value: 'twitter',
        label: 'X / Twitter',
        color: '#000',
        buildUrl: (name) => name ? `https://x.com/${name.replace(/^@/, '')}` : '',
        placeholder: '@handle or community',
        hint: 'Enter the X/Twitter @handle',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
        ),
    },
    {
        value: 'youtube',
        label: 'YouTube Channel',
        color: '#FF0000',
        buildUrl: (name) => name && name.startsWith('http') ? name : name ? `https://youtube.com/@${name.replace(/^@/, '')}` : '',
        placeholder: '@channelname',
        hint: 'Enter the YouTube @channel name',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="#FF0000" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        ),
    },
    {
        value: 'forum',
        label: 'Forum / Website',
        color: '#6B7280',
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'https://forum.example.com',
        hint: 'Paste the full URL',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
        ),
    },
    {
        value: 'other',
        label: 'Other',
        color: '#9CA3AF',
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'https://...',
        hint: 'Paste any link (optional)',
        Logo: () => (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
        ),
    },
];

const SECTION_OPTIONS = [
    { value: 'research', label: '🔬 Research (verified / scientific)' },
    { value: 'community', label: '💬 Community (user discretion)' },
];

function getPlatform(value) {
    return PLATFORMS.find((p) => p.value === value) || PLATFORMS[PLATFORMS.length - 1];
}

export default function CommunityDetailsModal({ open, community, theme, onClose, onSave, onDelete }) {
    const [form, setForm] = useState({
        name: '',
        handle: '',   // platform-specific handle/identifier (optional)
        url: '',      // always optional now
        platform: 'reddit',
        section: 'community',
        notes: '',
        ownerId: OWNER_SELF,
    });

    useEffect(() => {
        if (!open) return;
        setForm({
            name: community?.name || '',
            handle: community?.handle || '',
            url: community?.url || '',
            platform: community?.platform || 'reddit',
            section: community?.section || 'community',
            notes: community?.notes || '',
            ownerId: community?.ownerId || OWNER_SELF,
        });
    }, [open, community]);

    if (!open) return null;

    const plat = getPlatform(form.platform);

    // Auto-build URL from handle when URL is empty
    const resolvedUrl = (form.url || '').trim() || plat.buildUrl((form.handle || '').trim());

    const handleSave = () => {
        const trimmedName = (form.name || '').trim();
        if (!trimmedName) {
            window.dispatchEvent(new CustomEvent('tpp:toast', {
                detail: { type: 'warning', message: 'Give your community a name.' },
            }));
            return;
        }
        onSave?.({
            ...(community || {}),
            name: trimmedName,
            handle: (form.handle || '').trim(),
            url: resolvedUrl,
            platform: form.platform,
            section: form.section,
            notes: (form.notes || '').trim(),
            ownerId: form.ownerId || OWNER_SELF,
        });
    };

    const inputStyle = {
        backgroundColor: theme.background,
        borderColor: theme.border,
        color: theme.text,
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl shadow-xl max-h-[92vh] flex flex-col"
                style={{
                    backgroundColor: theme.cardBackground || theme.white,
                    border: `1px solid ${theme.border}`,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                            <Users size={18} style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-lg font-semibold" style={{ color: theme.text }}>
                            {community?.id ? 'Edit Community' : 'Add Community'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:opacity-70" style={{ color: theme.textLight }}>
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Platform picker — icon grid */}
                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                            Platform
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {PLATFORMS.map((p) => {
                                const selected = form.platform === p.value;
                                return (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, platform: p.value, handle: '', url: '' })}
                                        className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all active:scale-95"
                                        style={{
                                            borderColor: selected ? p.color : (theme.border || 'rgba(0,0,0,0.1)'),
                                            backgroundColor: selected ? p.color + '15' : 'transparent',
                                        }}
                                    >
                                        <div className="w-6 h-6" style={{ color: p.color }}>
                                            <p.Logo />
                                        </div>
                                        <span className="text-[10px] font-medium leading-tight text-center" style={{ color: selected ? p.color : theme.textLight }}>
                                            {p.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Community name */}
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>
                            Community name <span style={{ color: theme.error }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Peptide Research Hub"
                            className="w-full px-3 py-2 rounded-xl border text-sm"
                            style={inputStyle}
                            autoFocus
                        />
                    </div>

                    {/* Handle / identifier — platform-aware */}
                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>
                            {plat.label} handle
                            <span className="ml-1 font-normal opacity-60">(optional)</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={form.handle}
                                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                                placeholder={plat.placeholder}
                                className="w-full px-3 py-2 rounded-xl border text-sm pr-10"
                                style={inputStyle}
                            />
                            {resolvedUrl && (
                                <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
                                    style={{ color: plat.color }}
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: theme.textLight }}>{plat.hint}</p>
                    </div>

                    {/* URL override — collapsed by default */}
                    <details className="group">
                        <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs font-medium" style={{ color: theme.textLight }}>
                            <Link2 size={11} />
                            <span>Custom link override</span>
                            <span className="ml-auto opacity-50 group-open:rotate-180 transition-transform">▾</span>
                        </summary>
                        <div className="mt-2">
                            <input
                                type="url"
                                value={form.url}
                                onChange={(e) => setForm({ ...form, url: e.target.value })}
                                placeholder="https://... (overrides auto-built link)"
                                className="w-full px-3 py-2 rounded-xl border text-sm"
                                style={inputStyle}
                            />
                        </div>
                    </details>

                    {/* Section */}
                    <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: theme.textLight }}>
                            Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {SECTION_OPTIONS.map((o) => {
                                const sel = form.section === o.value;
                                return (
                                    <button
                                        key={o.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, section: o.value })}
                                        className="py-2 px-3 rounded-xl border-2 text-xs font-medium text-left transition-all active:scale-95"
                                        style={{
                                            borderColor: sel ? theme.primary : (theme.border || 'rgba(0,0,0,0.1)'),
                                            backgroundColor: sel ? theme.primary + '12' : 'transparent',
                                            color: sel ? theme.primary : theme.textLight,
                                        }}
                                    >
                                        {o.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <OwnerSelect
                        value={form.ownerId}
                        onChange={(ownerId) => setForm({ ...form, ownerId })}
                        theme={theme}
                    />

                    <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: theme.textLight }}>
                            Notes <span className="font-normal opacity-60">(optional)</span>
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            rows={2}
                            placeholder="Why you follow this, topics you watch, quality notes…"
                            className="w-full px-3 py-2 rounded-xl border text-sm resize-none"
                            style={inputStyle}
                        />
                    </div>

                    <p className="text-[11px] leading-relaxed" style={{ color: theme.textLight }}>
                        This list lives only in your account and is never shared. The discovery directory is separately curated.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 p-3 border-t" style={{ borderColor: theme.border }}>
                    {community?.id ? (
                        <button
                            type="button"
                            onClick={() => onDelete?.(community)}
                            className="px-3 py-1.5 rounded-lg font-medium text-sm active:scale-95 inline-flex items-center gap-1"
                            style={{ color: theme.error, border: `1px solid ${theme.error}30` }}
                        >
                            <Trash2 size={14} />
                            Delete
                        </button>
                    ) : <div />}
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg font-medium text-sm hover:opacity-80" style={{ color: theme.textLight, border: `1px solid ${theme.border}` }}>
                            Cancel
                        </button>
                        <button type="button" onClick={handleSave} className="px-4 py-1.5 rounded-lg font-semibold text-sm inline-flex items-center gap-1 active:scale-95" style={{ backgroundColor: theme.primary, color: theme.white }}>
                            <Save size={14} />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
