import React from 'react';
import { Sparkle } from '@phosphor-icons/react';

/**
 * Research+ badge — same gold-gradient + glisten-swipe feel as FounderBadge.
 * Shown on premium features so trial users know this is a Research+ perk.
 *
 * Props:
 *   size     'sm' | 'md'  — controls padding / font / icon size
 *   compact  boolean      — hide text, show icon only
 */
export default function ResearchPlusBadge({ size = 'sm', compact = false, className = '' }) {
    const dims = size === 'sm'
        ? { px: 'px-1.5', py: 'py-0.5', text: 'text-[10px]', icon: 10, gap: 'gap-1' }
        : { px: 'px-2',   py: 'py-0.5', text: 'text-[11px]', icon: 12, gap: 'gap-1' };

    return (
        <>
            <span
                className={`
                    relative inline-flex items-center overflow-hidden
                    ${dims.gap} ${dims.px} ${dims.py}
                    rounded-full font-semibold tracking-wide ${dims.text}
                    rp-badge-root
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
                <span aria-hidden="true" className="rp-badge-glisten" />

                <Sparkle size={dims.icon} weight="fill" style={{ position: 'relative', zIndex: 1 }} />
                {!compact && (
                    <span style={{ position: 'relative', zIndex: 1 }}>Research+</span>
                )}
            </span>

            <style>{`
                .rp-badge-root {
                    isolation: isolate;
                }
                .rp-badge-glisten {
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
                    animation: rpBadgeGlisten 3.2s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 0;
                }
                @keyframes rpBadgeGlisten {
                    0%   { transform: translateX(-160%); opacity: 0; }
                    8%   { opacity: 1; }
                    38%  { transform: translateX(160%);  opacity: 1; }
                    40%  { opacity: 0; }
                    100% { transform: translateX(160%);  opacity: 0; }
                }
            `}</style>
        </>
    );
}
