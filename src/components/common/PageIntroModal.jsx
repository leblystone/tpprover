import React from 'react';
import { X, Lightbulb } from 'lucide-react';

/**
 * First-view page intro — compact "helpful tip" toast.
 *
 * Appears once per route (bottom-anchored on mobile, bottom-right on
 * desktop). Intentionally small so it doesn't hide the page behind it.
 * Tap anywhere outside or "Got it" to dismiss.
 */
export default function PageIntroModal({ intro, onDismiss, theme }) {
    if (!intro) return null;
    const { title, body, bullets } = intro;

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-end md:items-end md:justify-end justify-center p-3 md:p-5 pointer-events-none"
        >
            {/* backdrop only on mobile so desktop page is fully visible */}
            <div
                className="absolute inset-0 md:hidden pointer-events-auto"
                style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
                onClick={onDismiss}
            />

            <div
                className="relative pointer-events-auto w-full md:max-w-xs rounded-2xl shadow-2xl overflow-hidden"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white || '#fff',
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                    /* subtle lift */
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 1.5px 4px rgba(0,0,0,0.08)',
                }}
                role="dialog"
                aria-label={title}
            >
                {/* Accent top bar */}
                <div
                    className="h-1 w-full"
                    style={{ background: `linear-gradient(90deg, ${theme?.primary || '#7F9E95'}, ${theme?.accent || '#9EB9B2'})` }}
                />

                <div className="px-3.5 pt-3 pb-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <div
                                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: (theme?.primary || '#7F9E95') + '20' }}
                            >
                                <Lightbulb size={13} style={{ color: theme?.primary || '#7F9E95' }} />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme?.primary || '#7F9E95' }}>
                                Quick tip
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="shrink-0 -mt-0.5 -mr-0.5 p-1 rounded-full hover:opacity-70 transition-opacity"
                            style={{ color: theme?.textLight }}
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Title */}
                    <h2 className="text-sm font-semibold leading-snug mb-1" style={{ color: theme?.text }}>
                        {title}
                    </h2>

                    {/* Body */}
                    {body && (
                        <p className="text-xs leading-relaxed" style={{ color: theme?.textLight }}>
                            {body}
                        </p>
                    )}

                    {/* Bullet list */}
                    {Array.isArray(bullets) && bullets.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                            {bullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: theme?.textLight }}>
                                    <span
                                        className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: theme?.primary || '#7F9E95' }}
                                    />
                                    {b}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end mt-2.5">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="px-3 py-1 rounded-full text-xs font-semibold active:scale-95 transition-transform"
                            style={{
                                backgroundColor: theme?.primary || '#7F9E95',
                                color: theme?.white || '#fff',
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
