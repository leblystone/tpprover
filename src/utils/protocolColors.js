import { penColors } from './penColors';

export const PROTOCOL_PALETTE = [
    '#7B6B9C', // muted violet
    '#6B8FA3', // slate blue
    '#7F9E95', // sage green
    '#A3896B', // warm sand
    '#C47A5A', // terracotta
    '#6B9C7B', // forest green
    '#9C7B8A', // dusty rose
    '#7B8FA3', // steel blue
    '#A3936B', // golden tan
    '#8A7B9C', // lavender grey
];

/**
 * Deterministic color assignment based on protocol ID hash.
 */
export function getProtocolColor(protocolId) {
    if (!protocolId) return PROTOCOL_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < protocolId.length; i++) {
        hash = protocolId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PROTOCOL_PALETTE[Math.abs(hash) % PROTOCOL_PALETTE.length];
}

/**
 * Resolve pen color name or hex to hex (for matching accents across calendar, notes, cards).
 */
/** Normalize #RGB / #RRGGBB to #RRGGBB for CSS concat and rgba parsing */
export function normalizeHexToSixDigits(hex) {
    if (hex == null || typeof hex !== 'string') return null;
    let h = hex.trim().replace(/^#/, '');
    if (h.length === 3) {
        h = h.split('').map((c) => c + c).join('');
    }
    if (h.length !== 6 || !/^[a-fA-F0-9]{6}$/.test(h)) return null;
    return `#${h.toUpperCase()}`;
}

export function resolvePenColorToHex(penColor) {
    if (!penColor) return null;
    const raw = String(penColor).trim();
    if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(raw)) return raw;
    const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
    const found = penColors.find(
        (c) => String(c.name || '').toLowerCase().replace(/\s+/g, ' ') === normalized
    );
    return found?.hex || null;
}

/**
 * Single accent for a protocol: saved protocolColor (palette picker) first, then pen metadata, then palette hash.
 */
export function getProtocolAccentHex(protocol) {
    if (!protocol) return PROTOCOL_PALETTE[0];

    // Explicit card accent from palette always wins so Manage/picker changes are not overridden by pen delivery color
    if (protocol.protocolColor) {
        const raw = String(protocol.protocolColor).trim();
        if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(raw)) {
            const n = normalizeHexToSixDigits(raw);
            if (n) return n;
        }
        const named = resolvePenColorToHex(protocol.protocolColor);
        if (named) return normalizeHexToSixDigits(named) || named;
        return protocol.protocolColor;
    }

    const fromPen = resolvePenColorToHex(protocol.penColor);
    if (fromPen) return normalizeHexToSixDigits(fromPen) || fromPen;

    for (const pep of protocol.peptides || []) {
        const h = resolvePenColorToHex(pep?.penColor);
        if (h) return normalizeHexToSixDigits(h) || h;
    }

    return getProtocolColor(protocol.id);
}

/** RGBA helper for note chips and borders */
export function hexToRgba(hex, alpha) {
    const normalized = normalizeHexToSixDigits(hex);
    if (!normalized) return `rgba(127, 158, 149, ${alpha})`;
    const h = normalized.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
