import React, { useState } from 'react';
import { Archive, X, Info } from 'lucide-react';
import { trackUpgradeCta } from '../../services/conversionAnalytics';

/**
 * Research+ Wave: Trial Keepsakes banner.
 *
 * Shown to soft-downgraded users (trial/subscription ended, ENABLE_SOFT_DOWNGRADE on).
 * Reassures them that their data is preserved as "keepsakes" — read-only
 * references they can still view while on the Free plan. Core actions
 * (limited new records, core tracking) continue to work.
 *
 * Dismissible per-session so it doesn't become visual noise after the
 * first visit, but re-appears each new session until upgrade.
 */
export default function TrialKeepsakesBanner({ theme, onUpgrade, className = '' }) {
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
                <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-sm font-semibold" style={{ color: theme?.text }}>
                        Your trial data is safe
                    </p>
                    <Info size={12} style={{ color: theme?.textLight }} />
                </div>
                <p className="text-xs mb-2" style={{ color: theme?.textLight }}>
                    Records you created during your trial are saved as read-only keepsakes.
                    Upgrade any time to edit them again and sync across devices.
                </p>
                {onUpgrade && (
                    <button
                        type="button"
                        onClick={() => {
                            trackUpgradeCta('trial_keepsakes_banner');
                            onUpgrade();
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95"
                        style={{
                            backgroundColor: theme?.primary || '#7F9E95',
                            color: theme?.textOnPrimary || '#fff',
                        }}
                    >
                        See upgrade options
                    </button>
                )}
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
