import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { isFoundingMember } from '../../utils/subscriptionPlans';
import FounderCelebrationModal from './FounderCelebrationModal';

/**
 * Founding Member badge — gold gradient pill, clickable.
 *
 * Renders nothing if the user doesn't qualify so call sites can drop it
 * in freely. Clicking opens the FounderCelebrationModal with confetti.
 *
 * Props:
 *   user    — object with `createdAt` (or explicit `isFoundingMember: true`)
 *   size    — 'sm' | 'md' (default 'md')
 *   compact — icon-only (no label) when space is tight
 *   theme   — for the celebration modal
 */
export default function FounderBadge({ user, theme, size = 'md', compact = false, className = '' }) {
    const [showModal, setShowModal] = useState(false);

    if (!isFoundingMember(user)) return null;

    const dims = size === 'sm' ? {
        px: 'px-1.5', py: 'py-0.5', text: 'text-[10px]', icon: 10, gap: 'gap-1',
    } : {
        px: 'px-2', py: 'py-0.5', text: 'text-[11px]', icon: 12, gap: 'gap-1',
    };

    const gradient = 'linear-gradient(135deg, #D4A852 0%, #E8C674 50%, #B88A3E 100%)';

    return (
        <>
            <button
                type="button"
                title="Founding Member — tap to learn more"
                onClick={() => setShowModal(true)}
                className={`inline-flex items-center ${dims.gap} ${dims.px} ${dims.py} rounded-full font-semibold tracking-wide ${dims.text} active:scale-95 transition-transform cursor-pointer ${className}`}
                style={{
                    background: gradient,
                    color: '#3A2B10',
                    border: '1px solid rgba(255, 220, 150, 0.5)',
                    boxShadow: '0 1px 3px rgba(184, 138, 62, 0.25)',
                }}
            >
                <Crown size={dims.icon} strokeWidth={2.5} />
                {!compact && <span>Founding Member</span>}
            </button>

            <FounderCelebrationModal
                open={showModal}
                onClose={() => setShowModal(false)}
                theme={theme}
                user={user}
            />
        </>
    );
}
