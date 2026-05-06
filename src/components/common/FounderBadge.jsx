import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { isFoundingMember } from '../../utils/subscriptionPlans';
import { useTierAccess } from '../../utils/useSubscriptionAccess';
import FounderCelebrationModal from './FounderCelebrationModal';

/**
 * Founding Member badge — gold gradient pill with a repeating glisten
 * swipe. A bright diagonal highlight sweeps left-to-right every ~3s,
 * giving the chip a premium "foil" feel without being distracting.
 * Clickable — opens the FounderCelebrationModal.
 *
 * Requires BOTH: account created before the founder cutoff date AND
 * active founder-tier subscription. Trialing, free-lapsed, and
 * Research+ accounts must NOT show this badge.
 */
export default function FounderBadge({ user, theme, size = 'md', compact = false, className = '' }) {
    const [showModal, setShowModal] = useState(false);
    const { isFounder } = useTierAccess();

    if (!isFoundingMember(user) || !isFounder) return null;

    const dims = size === 'sm'
        ? { px: 'px-1.5', py: 'py-0.5', text: 'text-[10px]', icon: 10, gap: 'gap-1' }
        : { px: 'px-2',   py: 'py-0.5', text: 'text-[11px]', icon: 12, gap: 'gap-1' };

    return (
        <>
            <button
                type="button"
                title="Founding Member — tap to learn more"
                onClick={() => setShowModal(true)}
                className={`
                    relative inline-flex items-center overflow-hidden
                    ${dims.gap} ${dims.px} ${dims.py}
                    rounded-full font-semibold tracking-wide ${dims.text}
                    active:scale-95 transition-transform cursor-pointer
                    founder-badge-root
                    ${className}
                `}
                style={{
                    background: 'linear-gradient(135deg, #C8912A 0%, #E8C55A 35%, #F5D97A 50%, #E8C55A 65%, #B8822A 100%)',
                    color: '#3A2B10',
                    border: '1px solid rgba(255, 220, 120, 0.6)',
                    boxShadow: '0 1px 4px rgba(184,138,62,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
            >
                {/* Glisten sweep overlay */}
                <span
                    aria-hidden="true"
                    className="founder-glisten"
                />

                <Crown size={dims.icon} strokeWidth={2.5} style={{ position: 'relative', zIndex: 1 }} />
                {!compact && <span style={{ position: 'relative', zIndex: 1 }}>Founding Member</span>}
            </button>

            {/* Keyframe styles — scoped so they don't leak */}
            <style>{`
                .founder-badge-root {
                    isolation: isolate;
                }
                .founder-glisten {
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    background: linear-gradient(
                        105deg,
                        transparent 30%,
                        rgba(255, 255, 255, 0.55) 47%,
                        rgba(255, 255, 255, 0.75) 50%,
                        rgba(255, 255, 255, 0.55) 53%,
                        transparent 70%
                    );
                    transform: translateX(-100%);
                    animation: founderGlisten 3.2s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 0;
                }
                @keyframes founderGlisten {
                    0%        { transform: translateX(-160%); opacity: 0; }
                    8%        { opacity: 1; }
                    38%       { transform: translateX(160%);  opacity: 1; }
                    40%       { opacity: 0; }
                    100%      { transform: translateX(160%);  opacity: 0; }
                }
            `}</style>

            <FounderCelebrationModal
                open={showModal}
                onClose={() => setShowModal(false)}
                theme={theme}
                user={user}
            />
        </>
    );
}
