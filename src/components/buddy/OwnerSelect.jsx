import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { OWNER_SELF } from '../../utils/buddies';
import { featureFlags } from '../../config/featureFlags';
import { Users } from 'lucide-react';

/**
 * Owner selector — segmented pill control matching the app's UI.
 * Renders nothing when the Buddy System flag is off OR no buddies configured.
 *
 * Props:
 *   - value?: string — current ownerId ('self' = mine).
 *   - onChange: (ownerId: string) => void
 *   - theme: object
 *   - label?: string — label above the control.
 */
/**
 * compact=true — no label, smaller pills, designed to sit inline next to other controls.
 */
export default function OwnerSelect({ value, onChange, theme, label = 'Who is this for?', compact = false }) {
    const { buddies } = useAppContext() || {};
    const list = Array.isArray(buddies) ? buddies : [];

    if (!featureFlags.ENABLE_BUDDY) return null;
    if (list.length === 0) return null;

    const current = value || OWNER_SELF;

    const options = [
        { id: OWNER_SELF, label: 'Mine', color: theme?.primary },
        ...list.map((b) => ({
            id: b.id,
            label: b.name + (b.relationship ? ` · ${b.relationship}` : ''),
            initials: b.initials || b.name?.[0] || '?',
            color: b.color || theme?.primary,
        })),
    ];

    const pills = (
        <div
            className="flex items-center gap-1 p-0.5 rounded-xl w-full"
            style={{
                backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            }}
        >
            {options.map((opt) => {
                const active = current === opt.id;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg font-semibold transition-all duration-150"
                        style={{
                            padding: compact ? '3px 8px' : '6px 12px',
                            fontSize: compact ? '11px' : '12px',
                            ...(active ? {
                                backgroundColor: opt.color || theme?.primary,
                                color: '#ffffff',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                            } : {
                                backgroundColor: 'transparent',
                                color: theme?.textLight,
                            }),
                        }}
                    >
                        {active && !compact && (
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.7)' }} />
                        )}
                        {compact ? (active ? opt.initials || opt.label : opt.label) : opt.label}
                    </button>
                );
            })}
        </div>
    );

    if (compact) return pills;

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2">
                <Users size={12} style={{ color: theme?.textLight, opacity: 0.6 }} />
                <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: theme?.textLight, opacity: 0.6 }}>
                    {label}
                </span>
            </div>
            {pills}
        </div>
    );
}
