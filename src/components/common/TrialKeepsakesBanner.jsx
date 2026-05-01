import React, { useState } from 'react';
import { Archive, X, Download, ArrowRight } from 'lucide-react';
import { trackUpgradeCta } from '../../services/conversionAnalytics';

/**
 * Shown to soft-downgraded users (trial ended or subscription ended).
 *
 * Messaging distinguishes two cases:
 *   isSubscriptionEnded = true  → user was a paying subscriber → "Resubscribe to restore access"
 *   isSubscriptionEnded = false → trial ended, never paid      → "Subscribe to unlock full access"
 *
 * We explicitly reassure users their data is safe and can be exported at
 * any time — we do not hold data hostage. Subscription unlocks Pep Planner
 * features (unlimited protocols, sync, AI, etc.), not the data itself.
 */
export default function TrialKeepsakesBanner({ theme, onUpgrade, isSubscriptionEnded = false, className = '' }) {
    const [dismissed, setDismissed] = useState(() => {
        try {
            return sessionStorage.getItem('tpprover_keepsakes_dismissed') === '1';
        } catch {
            return false;
        }
    });

    if (dismissed) return null;

    const handleDismiss = () => {
        try { sessionStorage.setItem('tpprover_keepsakes_dismissed', '1'); } catch { /* ignore */ }
        setDismissed(true);
    };

    const handleExport = () => {
        // Fire a global event that TrialExpired / settings pages can listen to
        window.dispatchEvent(new CustomEvent('tpp:open-export'));
        // Fallback navigation to the trial expired page which has export buttons
        try {
            window.location.hash = '#export';
        } catch { /* ignore */ }
    };

    const headline = isSubscriptionEnded
        ? 'Your data is safe — resubscribe to restore full access'
        : 'Your research data is safe — subscribe to unlock the full planner';

    const body = isSubscriptionEnded
        ? 'We never delete your data. Protocols, stockpile, and history are preserved. Resubscribe any time to pick up exactly where you left off.'
        : 'Everything you tracked during your trial is here. We do not hold your data hostage — you can export it at any time. Subscribe to continue using the full Pep Planner.';

    const ctaLabel = isSubscriptionEnded ? 'Resubscribe' : 'Subscribe';

    return (
        <div
            className={`rounded-xl p-3 flex items-start gap-3 ${className}`}
            style={{
                backgroundColor: (theme?.primary || '#7F9E95') + '14',
                border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
            }}
        >
            <div
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                    backgroundColor: (theme?.primary || '#7F9E95') + '22',
                    color: theme?.primary || '#7F9E95',
                }}
            >
                <Archive size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-0.5" style={{ color: theme?.text }}>
                    {headline}
                </p>
                <p className="text-xs mb-3" style={{ color: theme?.textLight }}>
                    {body}
                </p>
                <div className="flex items-center flex-wrap gap-2">
                    {onUpgrade && (
                        <button
                            type="button"
                            onClick={() => {
                                trackUpgradeCta('trial_keepsakes_banner');
                                onUpgrade();
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95"
                            style={{
                                backgroundColor: theme?.primary || '#7F9E95',
                                color: theme?.textOnPrimary || '#fff',
                            }}
                        >
                            {ctaLabel}
                            <ArrowRight size={12} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleExport}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95"
                        style={{
                            backgroundColor: (theme?.primary || '#7F9E95') + '18',
                            color: theme?.primary || '#7F9E95',
                            border: `1px solid ${(theme?.primary || '#7F9E95') + '40'}`,
                        }}
                    >
                        <Download size={12} />
                        Export my data
                    </button>
                </div>
            </div>
            <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-black/5"
                style={{ color: theme?.textLight }}
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
}
