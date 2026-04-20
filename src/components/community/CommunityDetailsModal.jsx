import React, { useState, useEffect } from 'react';
import { X, Users, Save, Trash2, ExternalLink, Link2, Globe, MoreHorizontal } from 'lucide-react';
import { SiReddit, SiDiscord, SiTelegram, SiFacebook, SiX, SiYoutube } from 'react-icons/si';
import OwnerSelect from '../buddy/OwnerSelect';
import { OWNER_SELF } from '../../utils/buddies';

/**
 * Platform catalogue — deeplink builders + icons (react-icons / lucide, same stack as vendor payments).
 * Ordered by popularity in the peptide/research community.
 */
const PLATFORMS = [
    {
        value: 'reddit',
        label: 'Reddit',
        tileLabel: 'Reddit',
        icon: SiReddit,
        buildUrl: (name) => name ? `https://reddit.com/r/${name.replace(/^r\//, '')}` : '',
        placeholder: 'r/Peptides',
        hint: 'Enter the subreddit name (e.g. r/Peptides)',
    },
    {
        value: 'discord',
        label: 'Discord',
        tileLabel: 'Discord',
        icon: SiDiscord,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'Paste invite link',
        hint: 'Paste the Discord invite link',
    },
    {
        value: 'telegram',
        label: 'Telegram',
        tileLabel: 'Telegram',
        icon: SiTelegram,
        buildUrl: (name) => name ? `https://t.me/${name.replace(/^@/, '')}` : '',
        placeholder: '@groupname',
        hint: 'Enter the Telegram @username or group name',
    },
    {
        value: 'facebook',
        label: 'Facebook Group',
        tileLabel: 'Facebook',
        icon: SiFacebook,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'Paste group URL',
        hint: 'Paste the Facebook Group link',
    },
    {
        value: 'twitter',
        label: 'X / Twitter',
        tileLabel: 'X',
        icon: SiX,
        buildUrl: (name) => name ? `https://x.com/${name.replace(/^@/, '')}` : '',
        placeholder: '@handle or community',
        hint: 'Enter the X/Twitter @handle',
    },
    {
        value: 'youtube',
        label: 'YouTube Channel',
        tileLabel: 'YouTube',
        icon: SiYoutube,
        buildUrl: (name) => name && name.startsWith('http') ? name : name ? `https://youtube.com/@${name.replace(/^@/, '')}` : '',
        placeholder: '@channelname',
        hint: 'Enter the YouTube @channel name',
    },
    {
        value: 'forum',
        label: 'Forum / Website',
        tileLabel: 'Forum',
        icon: Globe,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'https://forum.example.com',
        hint: 'Paste the full URL',
    },
    {
        value: 'other',
        label: 'Other',
        tileLabel: 'Other',
        icon: MoreHorizontal,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'https://...',
        hint: 'Paste any link (optional)',
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
                    {/* Platform picker — same tile pattern as vendor payment methods, theme-aware */}
                    <div>
                        <label className="block text-xs font-semibold mb-2" style={{ color: theme.textLight }}>
                            Platform
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {PLATFORMS.map((p) => {
                                const selected = form.platform === p.value;
                                const Icon = p.icon;
                                const onPrimary = theme.textOnPrimary || '#ffffff';
                                const unselBg = theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.secondary || '#f5f4f0');
                                const unselBorder = theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border;
                                return (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, platform: p.value, handle: '', url: '' })}
                                        className="flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 active:scale-95"
                                        style={{
                                            backgroundColor: selected ? theme.primary : unselBg,
                                            border: selected
                                                ? `1px solid ${theme.primaryDark || theme.primary}`
                                                : `1px solid ${unselBorder}`,
                                            color: selected ? onPrimary : theme.textLight,
                                            boxShadow: selected
                                                ? 'inset 0 2px 4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)'
                                                : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <Icon
                                            size={20}
                                            className="mb-2"
                                            style={{ color: selected ? onPrimary : 'inherit' }}
                                            aria-hidden
                                        />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                                            {p.tileLabel}
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
                                    style={{ color: theme.primary }}
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
