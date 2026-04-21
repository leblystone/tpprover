import React, { useState, useEffect } from 'react';
import { Users, ExternalLink, Link2, Globe, MoreHorizontal, Lock, BookMarked, Tag, StickyNote } from 'lucide-react';
import { SiReddit, SiDiscord, SiTelegram, SiFacebook, SiX, SiYoutube } from 'react-icons/si';
import TextInput from '../common/inputs/TextInput';
import OwnerSelect from '../buddy/OwnerSelect';
import BottomSheet from '../common/BottomSheet';
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
    },
    {
        value: 'discord',
        label: 'Discord',
        tileLabel: 'Discord',
        icon: SiDiscord,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'Paste invite link',
    },
    {
        value: 'telegram',
        label: 'Telegram',
        tileLabel: 'Telegram',
        icon: SiTelegram,
        buildUrl: (name) => name ? `https://t.me/${name.replace(/^@/, '')}` : '',
        placeholder: '@groupname',
    },
    {
        value: 'facebook',
        label: 'Facebook Group',
        tileLabel: 'Facebook',
        icon: SiFacebook,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'Paste group URL',
    },
    {
        value: 'twitter',
        label: 'X / Twitter',
        tileLabel: 'X',
        icon: SiX,
        buildUrl: (name) => name ? `https://x.com/${name.replace(/^@/, '')}` : '',
        placeholder: '@handle or community',
    },
    {
        value: 'youtube',
        label: 'YouTube Channel',
        tileLabel: 'YouTube',
        icon: SiYoutube,
        buildUrl: (name) => name && name.startsWith('http') ? name : name ? `https://youtube.com/@${name.replace(/^@/, '')}` : '',
        placeholder: '@channelname',
    },
    {
        value: 'forum',
        label: 'Forum / Website',
        tileLabel: 'Forum',
        icon: Globe,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'https://forum.example.com',
    },
    {
        value: 'other',
        label: 'Other',
        tileLabel: 'Other',
        icon: MoreHorizontal,
        buildUrl: (name) => name && name.startsWith('http') ? name : '',
        placeholder: 'https://...',
    },
];

const SECTION_OPTIONS = [
    { value: 'research', label: '🔬 Research (verified / scientific)' },
    { value: 'community', label: '💬 Community (user discretion)' },
];

function getPlatform(value) {
    return PLATFORMS.find((p) => p.value === value) || PLATFORMS[PLATFORMS.length - 1];
}

function getHandleLabel(plat) {
    switch (plat.value) {
        case 'reddit':   return 'Subreddit Name';
        case 'telegram': return 'Telegram Username';
        case 'twitter':  return 'X / Twitter Handle';
        case 'youtube':  return 'Channel Name';
        case 'discord':  return 'Discord Invite Link';
        case 'facebook': return 'Group URL';
        case 'forum':    return 'Forum URL';
        default:         return `${plat.label} Handle`;
    }
}

export default function CommunityDetailsModal({ open, community, theme, onClose, onSave, onDelete }) {
    const [form, setForm] = useState({
        name: '',
        handle: '',
        url: '',
        platform: 'reddit',
        section: 'community',
        notes: '',
        ownerId: OWNER_SELF,
    });
    const [confirmDelete, setConfirmDelete] = useState(false);

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
        setConfirmDelete(false);
    }, [open, community]);

    const plat = getPlatform(form.platform);
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

    const outlinedInputProps = {
        theme,
        outlined: true,
        customTextColor: theme.isDark ? null : '#181A18',
    };

    const footer = (
        <div className="w-full flex items-center justify-between gap-4 p-1">
            <div className="flex items-center">
                {community?.id && (
                    <button
                        type="button"
                        onClick={() => {
                            if (confirmDelete) {
                                onDelete?.(community);
                                setConfirmDelete(false);
                            } else {
                                setConfirmDelete(true);
                            }
                        }}
                        className={`py-2 text-sm font-medium transition-all ${confirmDelete ? '' : ''}`}
                        style={{ color: confirmDelete ? '#8B5335' : '#C67A5C' }}
                    >
                        {confirmDelete ? 'Tap Again to Confirm!' : 'Delete Entry'}
                    </button>
                )}
            </div>
            <button
                type="button"
                onClick={handleSave}
                className="px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-[0.98] whitespace-nowrap"
                style={{
                    backgroundColor: theme?.primary,
                    color: theme?.textOnPrimary || '#ffffff',
                }}
            >
                {community?.id ? 'Save Changes' : 'Add Community'}
            </button>
        </div>
    );

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title={community?.id ? (form.name || 'Edit Community') : 'Add Community'}
            theme={theme}
            maxHeight="90vh"
            footer={footer}
        >
            <style>{`
                .community-modal-handle-field input.outlined-input { padding-right: 2.5rem !important; }
            `}</style>

            <div className="space-y-5">

                {/* ── SECTION: Platform ─────────────────── */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <BookMarked size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5 flex-1">
                            <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Platform & Name</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Select a platform below
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mb-4">
                        {PLATFORMS.map((p) => {
                            const selected = form.platform === p.value;
                            const Icon = p.icon;
                            return (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, platform: p.value, handle: '', url: '' })}
                                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 active:scale-95"
                                    style={{
                                        backgroundColor: selected ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                        border: selected ? '1px solid #3B4240' : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : '#e8e6df'}`,
                                        color: selected ? '#fff' : (theme.isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                                        boxShadow: selected
                                            ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)'
                                            : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                                    }}
                                >
                                    <Icon size={16} className="mb-1" style={{ color: selected ? '#fff' : 'inherit' }} aria-hidden />
                                    <span className="text-[9px] font-bold uppercase tracking-wide text-center leading-tight">
                                        {p.tileLabel}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <TextInput
                        label="Community Name *"
                        value={form.name}
                        onChange={(v) => setForm({ ...form, name: v })}
                        placeholder="e.g. Peptide Research Hub"
                        {...outlinedInputProps}
                    />
                </div>

                {/* ── SECTION: Link ─────────────────────── */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <Link2 size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5 flex-1">
                            <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Link / URL</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Handle or direct URL
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="relative community-modal-handle-field">
                            <TextInput
                                label={getHandleLabel(plat)}
                                value={form.handle}
                                onChange={(v) => setForm({ ...form, handle: v })}
                                placeholder={plat.placeholder}
                                {...outlinedInputProps}
                            />
                            {resolvedUrl && (
                                <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute right-3 top-1/2 z-[2] -translate-y-1/2 opacity-60 hover:opacity-100 touch-manipulation"
                                    style={{ color: theme.primary }}
                                    title="Open in new tab"
                                >
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>

                        {/* ─── Paste URL / Link divider ─── */}
                        <div className="flex items-center gap-2 py-1">
                            <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: theme.textLight }}>
                                <Link2 size={10} />
                                Paste URL / Link
                            </span>
                            <div className="flex-1 h-px" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                        </div>

                        <TextInput
                            label="Custom URL"
                            type="url"
                            value={form.url}
                            onChange={(v) => setForm({ ...form, url: v })}
                            placeholder="https://…"
                            {...outlinedInputProps}
                        />
                    </div>
                </div>

                {/* ── SECTION: Details ──────────────────── */}
                <div className="pt-2">
                    <div className="flex items-center gap-4 mb-4">
                        <StickyNote size={32} style={{ color: theme.primary }} />
                        <div className="flex flex-col gap-0.5 flex-1">
                            <h4 className="text-lg font-semibold tracking-wide" style={{ color: theme.text }}>Details</h4>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                                    Type, owner & notes
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Type */}
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

                        <TextInput
                            label="Notes About Community"
                            multiline
                            rows={2}
                            value={form.notes}
                            onChange={(v) => setForm({ ...form, notes: v })}
                            placeholder="Why you follow this, topics you watch, quality notes…"
                            {...outlinedInputProps}
                        />
                    </div>
                </div>

                {/* Privacy note */}
                <p className="text-[11px] leading-relaxed flex items-center justify-center gap-1 text-center pb-2" style={{ color: theme.textLight }}>
                    <Lock size={11} className="flex-shrink-0" />
                    This list lives only in your account and is never shared. The discovery directory is separately curated.
                </p>
            </div>
        </BottomSheet>
    );
}
