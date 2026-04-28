import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { OWNER_SELF } from '../../utils/buddies';
import { featureFlags } from '../../config/featureFlags';

/**
 * Owner selector control used inside record editors (ProtocolEditor,
 * VendorDetails, OrderDetails, CommunityDetails).
 *
 * Renders nothing when the Buddy System flag is off OR the user has no
 * buddies configured — editors stay clean for solo users.
 *
 * Props:
 *   - value?: string — current ownerId on the record (undefined/'self' = self).
 *   - onChange: (ownerId: string) => void
 *   - theme: object
 *   - label?: string — override the default "Owner" label.
 */
export default function OwnerSelect({ value, onChange, theme, label = 'Owner' }) {
    const { buddies } = useAppContext() || {};
    const list = Array.isArray(buddies) ? buddies : [];

    if (!featureFlags.ENABLE_BUDDY) return null;
    if (list.length === 0) return null;

    const current = value || OWNER_SELF;

    return (
        <label className="block">
            <span className="block text-xs font-semibold mb-1" style={{ color: theme?.textLight }}>
                {label}
            </span>
            <select
                value={current}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                    backgroundColor: theme?.background,
                    color: theme?.text,
                    border: `1px solid ${theme?.border || 'rgba(0,0,0,0.12)'}`,
                }}
            >
                <option value={OWNER_SELF}>Mine</option>
                {list.map((b) => (
                    <option key={b.id} value={b.id}>
                        {b.name}{b.relationship ? ` · ${b.relationship}` : ''}
                    </option>
                ))}
            </select>
        </label>
    );
}
