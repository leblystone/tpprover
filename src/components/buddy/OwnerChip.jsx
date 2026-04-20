import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { resolveOwner, OWNER_SELF } from '../../utils/buddies';

/**
 * Small pill that displays who a record belongs to. Renders nothing
 * when there are no buddies (clean UI for solo users).
 *
 * Props:
 *   - ownerId: string | undefined — the record's `ownerId` field.
 *   - theme:   object — current theme for fallback colors.
 *   - compact: boolean — show initials only (default false).
 *   - hideSelf: boolean — when true, suppress the chip for self-owned
 *                         records (useful on dense lists).
 */
export default function OwnerChip({ ownerId, theme, compact = false, hideSelf = true }) {
    const { buddies } = useAppContext() || {};
    const list = Array.isArray(buddies) ? buddies : [];

    // No buddies → Buddy System is effectively off; render nothing.
    if (list.length === 0) return null;

    const owner = resolveOwner(ownerId, list);
    if (hideSelf && owner.isSelf) return null;

    const bg = (owner.color || theme?.primary || '#7F9E95') + '22';
    const fg = owner.color || theme?.primary || '#7F9E95';

    return (
        <span
            className="inline-flex items-center gap-1 rounded-full text-xs font-medium"
            style={{
                backgroundColor: bg,
                color: fg,
                padding: compact ? '1px 6px' : '2px 8px',
                lineHeight: 1.1,
            }}
            title={owner.name + (owner.relationship ? ` · ${owner.relationship}` : '')}
        >
            <span
                className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                    backgroundColor: fg,
                    color: '#fff',
                    width: compact ? 14 : 16,
                    height: compact ? 14 : 16,
                }}
            >
                {owner.initials}
            </span>
            {!compact && <span>{owner.name}</span>}
        </span>
    );
}
