import React from 'react';
import { Pencil, Trash2, ExternalLink, Shield } from 'lucide-react';
import OwnerChip from '../buddy/OwnerChip';

// Platform colours + inline SVG logos — matches CommunityDetailsModal catalogue.
const PLATFORMS = {
    reddit:   { color: '#FF4500', Logo: () => <svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" fill="#FF4500"/><path fill="#fff" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .1-.49l-2.38-.5a.12.12 0 0 0-.14.09l-.73 3.43a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .37c0 1.88 2.19 3.41 4.89 3.41s4.89-1.53 4.89-3.41a2.87 2.87 0 0 0 0-.37 1.46 1.46 0 0 0 .41-1.1zm-9.4 1a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.59 2.71a3.58 3.58 0 0 1-2.86.79 3.58 3.58 0 0 1-2.86-.79.15.15 0 0 1 .21-.21 3.27 3.27 0 0 0 2.65.63 3.27 3.27 0 0 0 2.65-.63.15.15 0 0 1 .21.21zm-.08-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z"/></svg> },
    discord:  { color: '#5865F2', Logo: () => <svg viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
    telegram: { color: '#26A5E4', Logo: () => <svg viewBox="0 0 24 24" fill="#26A5E4"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.803l-2.964-.924c-.643-.204-.657-.643.136-.953l11.573-4.46c.537-.194 1.006.131.889.755z"/></svg> },
    facebook: { color: '#1877F2', Logo: () => <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    twitter:  { color: '#000',    Logo: () => <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.213 5.567zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    youtube:  { color: '#FF0000', Logo: () => <svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
    forum:    { color: '#6B7280', Logo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
    other:    { color: '#9CA3AF', Logo: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> },
};

function getPlatform(key) {
    return PLATFORMS[(key || 'other').toLowerCase()] || PLATFORMS.other;
}

export default function CommunityCard({ community, theme, onEdit, onDelete }) {
    if (!community) return null;

    const plat = getPlatform(community.platform);
    const link = community.url || '';

    const sectionLabel = community.section === 'research'
        ? { text: '🔬 Research', color: theme.info }
        : community.section === 'community'
            ? { text: '💬 Community', color: theme.warning }
            : { text: 'Tracked', color: theme.textLight };

    return (
        <div
            className="rounded-2xl p-4 transition-all hover:shadow-md"
            style={{
                backgroundColor: theme.cardBackground || theme.white,
                border: `1px solid ${theme.border}`,
            }}
        >
            <div className="flex items-start gap-3">
                {/* Platform logo */}
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 p-2"
                    style={{ backgroundColor: plat.color + '15' }}
                >
                    <plat.Logo />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm" style={{ color: theme.text }}>
                            {community.name || 'Untitled'}
                        </h3>
                        <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{ backgroundColor: plat.color + '18', color: plat.color }}
                        >
                            {(community.platform || 'other').charAt(0).toUpperCase() + (community.platform || 'other').slice(1)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Shield size={10} style={{ color: sectionLabel.color }} />
                        <span className="text-[11px]" style={{ color: sectionLabel.color }}>
                            {sectionLabel.text}
                        </span>
                        <OwnerChip ownerId={community.ownerId} theme={theme} compact />
                    </div>

                    {/* Handle / link */}
                    {(community.handle || link) && (
                        <a
                            href={link || '#'}
                            target={link ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            style={{ color: plat.color }}
                        >
                            <ExternalLink size={11} />
                            <span>{community.handle || 'Open'}</span>
                        </a>
                    )}

                    {community.notes && (
                        <p className="text-xs mt-1.5 line-clamp-2" style={{ color: theme.textLight }}>
                            {community.notes}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEdit?.(community); }}
                        className="p-1.5 rounded-lg hover:opacity-70"
                        style={{ color: theme.textLight }}
                        aria-label="Edit"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDelete?.(community); }}
                        className="p-1.5 rounded-lg hover:opacity-70"
                        style={{ color: theme.error }}
                        aria-label="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
