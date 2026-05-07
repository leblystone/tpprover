import React from 'react';
import { Shield, Lock } from 'lucide-react';
import { getProtocolAccentHex } from '../../utils/protocolColors';
import { resolveProtocolPurposeIcon } from '../../utils/protocolPurposeIcons';
import { formatMMDDYYYY } from '../../utils/date';

/**
 * ChooseActiveProtocolModal
 *
 * mode="choose" — fires when a free-plan user downgrades with >1 active protocols.
 *   They MUST pick one; no dismiss option. The rest are held.
 *
 * mode="resume" — fires when the active slot opens and held protocols exist.
 *   Optional; user can dismiss and pick later.
 */
export default function ChooseActiveProtocolModal({ protocols, theme, onChoose, mode = 'choose' }) {
    const [selected, setSelected] = React.useState(null);

    const isResumeMode = mode === 'resume';

    const title       = isResumeMode ? 'Your Protocol Slot is Open' : 'Choose Your Active Protocol';
    const subtitle    = isResumeMode ? 'Free plan · slot available'  : 'Free plan · 1 active protocol allowed';
    const description = isResumeMode
        ? 'Your active slot just opened. Pick a held protocol to resume, or close this and start a new one.'
        : 'You have multiple active protocols. Pick one to keep running — the rest will be held in your library until you upgrade to Research+. Your data is never deleted.';
    const confirmLabel = isResumeMode ? 'Resume This Protocol' : 'Keep This Protocol Active';
    const footerNote   = isResumeMode
        ? 'Resuming will re-activate this protocol as your one free-plan slot.'
        : 'Held protocols are fully preserved — exportable and automatically restored when you upgrade.';

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        >
            <div
                className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    backgroundColor: theme.surface || theme.cardBackground,
                    border: `1px solid ${theme.border}`,
                }}
            >
                {/* ── Header ──────────────────────────────────────────── */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${theme.primary}20` }}
                        >
                            {isResumeMode
                                ? <Lock size={20} style={{ color: theme.primary }} />
                                : <Shield size={20} style={{ color: theme.primary }} />
                            }
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-tight" style={{ color: theme.text }}>
                                {title}
                            </h2>
                            <p className="text-xs" style={{ color: theme.textLight }}>{subtitle}</p>
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                        {description}
                    </p>
                </div>

                {/* ── Protocol list ────────────────────────────────────── */}
                <div className="px-4 pb-2 space-y-2 max-h-64 overflow-y-auto">
                    {protocols.map(p => {
                        const accent      = getProtocolAccentHex(p);
                        const PurposeIcon = resolveProtocolPurposeIcon(p);
                        const isSelected  = selected === p.id;
                        const label       = p.name || p.protocolName || 'Unnamed Protocol';

                        return (
                            <button
                                key={p.id}
                                onClick={() => setSelected(p.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                                style={{
                                    backgroundColor: isSelected
                                        ? `${accent}20`
                                        : theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    border: `2px solid ${isSelected ? accent : theme.border || 'transparent'}`,
                                }}
                            >
                                {/* Avatar */}
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${accent}25` }}
                                >
                                    {PurposeIcon
                                        ? <PurposeIcon size={16} style={{ color: accent }} />
                                        : <span style={{ color: accent, fontSize: 14, fontWeight: 700 }}>
                                            {label[0].toUpperCase()}
                                          </span>
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: theme.text }}>
                                        {label}
                                    </p>
                                    <p className="text-xs truncate" style={{ color: theme.textLight }}>
                                        {p.startDate
                                            ? `Started ${formatMMDDYYYY(p.startDate).replace(/\//g, '-')}`
                                            : 'Active'}
                                    </p>
                                </div>

                                {/* Check */}
                                {isSelected && (
                                    <div
                                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: accent }}
                                    >
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path
                                                d="M1.5 4L3.5 6L8.5 1.5"
                                                stroke="white"
                                                strokeWidth="1.8"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Footer ──────────────────────────────────────────── */}
                <div className="px-6 py-4 border-t" style={{ borderColor: theme.border }}>
                    <p className="text-xs mb-3" style={{ color: theme.textLight }}>
                        {footerNote}
                    </p>
                    <button
                        onClick={() => selected && onChoose(selected)}
                        disabled={!selected}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                        style={{
                            backgroundColor: selected ? theme.primary : theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                            color: selected ? (theme.textOnPrimary || '#fff') : theme.textLight,
                            cursor: selected ? 'pointer' : 'not-allowed',
                            opacity: selected ? 1 : 0.6,
                        }}
                    >
                        {selected ? confirmLabel : 'Select a protocol above'}
                    </button>

                    {isResumeMode && (
                        <button
                            onClick={() => onChoose(null)}
                            className="w-full mt-2 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-70"
                            style={{ color: theme.textLight }}
                        >
                            Close — I'll pick later
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
