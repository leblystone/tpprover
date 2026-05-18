/**
 * Buddy System utilities (Research+ Wave).
 *
 * A "buddy" is a secondary account owner the user wants to track
 * records for — a partner, training buddy, or research collaborator.
 * Each record (protocol, vendor, order, community) can carry an
 * `ownerId` that points at either the signed-in user (`'self'`) or
 * a buddy by id.
 *
 * Storage: localStorage only for now. Cloud sync is deferred until the
 * full invite flow / security rules land in a follow-up pass. The data
 * shape is forward-compatible: each buddy has a stable `id`, so
 * records tagged today will keep working when cloud sync ships.
 */
import { generateId } from './string';
import { normalizeHexToSixDigits } from './protocolColors';

export const OWNER_SELF = 'self';
export const OWNER_ALL = '__all__';

const BUDDY_STORAGE_KEY = 'tpprover_buddies';
const OWNER_FILTER_KEY = 'tpprover_owner_filter';

const DEFAULT_BUDDY_COLORS = [
    '#7F9E95', '#A6A6E3', '#E3A6A6', '#E3C4A6', '#C4E3A6',
    '#A6C4E3', '#E3A6D1', '#D1A6E3', '#A6E3D1',
];

export function pickBuddyColor(existing = []) {
    const used = new Set((existing || []).map((b) => b?.color).filter(Boolean));
    const free = DEFAULT_BUDDY_COLORS.find((c) => !used.has(c));
    return free || DEFAULT_BUDDY_COLORS[Math.floor(Math.random() * DEFAULT_BUDDY_COLORS.length)];
}

export function loadBuddies() {
    try {
        const raw = localStorage.getItem(BUDDY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function persistBuddies(list) {
    try {
        localStorage.setItem(BUDDY_STORAGE_KEY, JSON.stringify(list || []));
    } catch (e) {
        // ignore quota errors — buddy list is small
        console.warn('[buddies] persist failed', e);
    }
}

export function createBuddy(input = {}, existing = []) {
    const name = String(input.name || '').trim();
    if (!name) return null;
    return {
        id: input.id || generateId(),
        name,
        initials: computeInitials(name),
        color: input.color || pickBuddyColor(existing),
        relationship: input.relationship || '',
        note: input.note || '',
        createdAt: input.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

export function computeInitials(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return '?';
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Resolve an ownerId into a display label + color.
 * `self` (or empty) returns the user's own record label.
 */
export function resolveOwner(ownerId, buddies = [], selfLabel = 'Mine') {
    if (!ownerId || ownerId === OWNER_SELF) {
        return { id: OWNER_SELF, name: selfLabel, initials: 'ME', color: '#7F9E95', isSelf: true };
    }
    const match = (buddies || []).find((b) => b && b.id === ownerId);
    if (match) {
        return { ...match, isSelf: false };
    }
    return { id: ownerId, name: 'Unknown buddy', initials: '??', color: '#999', isSelf: false, orphan: true };
}

/**
 * Filter any list of records by ownerId.
 * Accepts `OWNER_ALL` for a pass-through.
 */
export function filterByOwner(records, ownerFilter) {
    if (!Array.isArray(records)) return [];
    if (!ownerFilter || ownerFilter === OWNER_ALL) return records;
    if (ownerFilter === OWNER_SELF) {
        return records.filter((r) => !r?.ownerId || r.ownerId === OWNER_SELF);
    }
    return records.filter((r) => r?.ownerId === ownerFilter);
}

/**
 * Darkens a hex color by multiplying each RGB channel by `factor`.
 * factor=0.35 → very dark, factor=0.55 → medium dark.
 */
export function darkenHex(hex, factor = 0.38) {
    const h = (hex || '#7F9E95').replace('#', '');
    if (h.length !== 6) return hex;
    const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Returns a solid dark card style for buddy-owned cards.
 * The background is a genuinely dark version of the item's own accent color —
 * a brown protocol goes dark brown, a purple goes dark purple, etc.
 * Text inside the card should be light (handled via CSS .buddy-owned selector).
 */
export function getBuddyCardTint(itemColor, isDark = false) {
    if (!itemColor) return {};
    const bg = darkenHex(itemColor, isDark ? 0.52 : 0.38);
    const border = darkenHex(itemColor, isDark ? 0.68 : 0.55);
    // Layered depth: lift shadow + close shadow + top highlight + bottom shade + edge ring
    const outer = isDark
        ? `0 14px 36px rgba(0,0,0,0.62), 0 6px 14px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06)`
        : `0 12px 28px rgba(0,0,0,0.26), 0 4px 10px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)`;
    const norm = normalizeHexToSixDigits(itemColor);
    const accentEdge = norm ? `${norm}33` : 'rgba(255,255,255,0.05)';
    const bevel = isDark
        ? `inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -2px 10px rgba(0,0,0,0.45), inset 0 0 0 1px ${border}, inset 0 0 12px ${accentEdge}`
        : `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.28), inset 0 0 0 1px ${border}, inset 0 0 10px ${accentEdge}`;
    return {
        backgroundColor: bg,
        boxShadow: `${outer}, ${bevel}`,
    };
}

export function loadOwnerFilter() {
    try {
        return localStorage.getItem(OWNER_FILTER_KEY) || OWNER_ALL;
    } catch {
        return OWNER_ALL;
    }
}

export function persistOwnerFilter(value) {
    try {
        localStorage.setItem(OWNER_FILTER_KEY, value || OWNER_ALL);
    } catch {
        // ignore
    }
}

export default {
    OWNER_SELF,
    OWNER_ALL,
    loadBuddies,
    persistBuddies,
    createBuddy,
    computeInitials,
    pickBuddyColor,
    resolveOwner,
    filterByOwner,
    darkenHex,
    getBuddyCardTint,
    loadOwnerFilter,
    persistOwnerFilter,
};
