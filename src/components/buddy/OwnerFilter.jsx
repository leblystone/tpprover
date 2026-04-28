import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { OWNER_ALL, OWNER_SELF } from '../../utils/buddies';
import { featureFlags } from '../../config/featureFlags';

/**
 * Horizontal scroll pill-filter that lets the user switch between
 * "All", "Mine", and each configured buddy.
 *
 * Renders nothing when the user has no buddies configured or when
 * the Buddy feature flag is off — keeps the UI quiet for solo users.
 *
 * Use at the top of any list page (Protocols, Vendors, Orders,
 * Community) in the same row as the Search input.
 *
 * Props:
 *   - theme: object — current theme.
 *   - value?: string — controlled value. Defaults to the one in AppContext.
 *   - onChange?: (newOwnerId: string) => void — called when the
 *     selection changes. When omitted, updates `setOwnerFilter` on
 *     AppContext so every page syncs automatically.
 *   - className?: string — extra wrapper classes.
 */
export default function OwnerFilter({ theme, value, onChange, className = '' }) {
    const ctx = useAppContext() || {};
    const buddies = Array.isArray(ctx.buddies) ? ctx.buddies : [];
    const currentValue = value !== undefined ? value : ctx.ownerFilter;

    if (!featureFlags.ENABLE_BUDDY) return null;
    if (buddies.length === 0) return null;

    const handleChange = (next) => {
        if (onChange) onChange(next);
        else if (ctx.setOwnerFilter) ctx.setOwnerFilter(next);
    };

    const options = [
        { id: OWNER_ALL, label: 'All', color: theme?.primary || '#7F9E95' },
        { id: OWNER_SELF, label: 'Mine', color: theme?.primary || '#7F9E95' },
        ...buddies.map((b) => ({ id: b.id, label: b.name, color: b.color || '#A6A6E3' })),
    ];

    return (
        <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar ${className}`}>
            {options.map((opt) => {
                const active = currentValue === opt.id || (!currentValue && opt.id === OWNER_ALL);
                return (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleChange(opt.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors active:scale-95"
                        style={{
                            backgroundColor: active ? (opt.color + '28') : (theme?.cardBackground || '#fff'),
                            color: active ? opt.color : (theme?.textLight || '#666'),
                            border: `1px solid ${active ? opt.color : (theme?.border || 'rgba(0,0,0,0.08)')}`,
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}
