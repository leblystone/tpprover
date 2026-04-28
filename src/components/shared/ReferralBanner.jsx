import React, { useEffect, useState } from 'react';
import { Link2, Copy, Check, Gift, Share2 } from 'lucide-react';
import { fetchMyReferralCode, getCachedReferralCode, buildReferralUrl } from '../../services/referrals';
import { trackConversion, EVENTS } from '../../services/conversionAnalytics';

/**
 * Compact banner that surfaces the current user's referral link.
 *
 * Hits the cached value first for instant render, then fetches the
 * canonical code from the callable. Copy + share buttons use native
 * share when available, falling back to clipboard.
 */
export default function ReferralBanner({ theme }) {
    const [code, setCode] = useState(() => getCachedReferralCode());
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const real = await fetchMyReferralCode();
            if (!cancelled && real) setCode(real);
        })();
        return () => { cancelled = true; };
    }, []);

    const url = code ? buildReferralUrl(code) : '';

    const handleCopy = async () => {
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
            trackConversion(EVENTS.REFERRAL_LINK_COPIED, { surface: 'share_incentive' });
            window.dispatchEvent(new CustomEvent('tpp:toast', {
                detail: { message: 'Referral link copied', type: 'success' },
            }));
        } catch {
            // ignore
        }
    };

    const handleShare = async () => {
        if (!url) return;
        const text = 'Try The Pep Planner — sign up with my link and we both get a free month.';
        if (navigator.share) {
            try {
                await navigator.share({ title: 'The Pep Planner', text, url });
                return;
            } catch {
                // fall through to copy
            }
        }
        handleCopy();
    };

    if (!code) {
        return (
            <div
                className="rounded-xl p-3 text-xs flex items-center gap-2"
                style={{
                    backgroundColor: (theme?.primary || '#7F9E95') + '10',
                    border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
                    color: theme?.textLight,
                }}
            >
                <Gift size={14} style={{ color: theme?.primary || '#7F9E95' }} />
                Loading your referral link…
            </div>
        );
    }

    return (
        <div
            className="rounded-xl p-3"
            style={{
                backgroundColor: (theme?.primary || '#7F9E95') + '12',
                border: `1px solid ${(theme?.primary || '#7F9E95') + '33'}`,
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <Gift size={14} style={{ color: theme?.primary || '#7F9E95' }} />
                <p className="text-xs font-semibold" style={{ color: theme?.text }}>
                    Your referral link
                </p>
            </div>
            <div
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 mb-2"
                style={{
                    backgroundColor: theme?.cardBackground || theme?.white,
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                }}
            >
                <Link2 size={12} style={{ color: theme?.textLight }} />
                <span className="text-[11px] font-mono truncate flex-1" style={{ color: theme?.text }}>
                    {url}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold active:scale-95"
                    style={{
                        backgroundColor: theme?.cardBackground || theme?.white,
                        color: theme?.text,
                        border: `1px solid ${theme?.border || 'rgba(0,0,0,0.08)'}`,
                    }}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold active:scale-95"
                    style={{
                        backgroundColor: theme?.primary || '#7F9E95',
                        color: theme?.textOnPrimary || '#fff',
                    }}
                >
                    <Share2 size={12} />
                    Share link
                </button>
            </div>
            <p className="text-[10px] mt-2" style={{ color: theme?.textLight }}>
                When a friend signs up, you both get a free month.
            </p>
        </div>
    );
}
