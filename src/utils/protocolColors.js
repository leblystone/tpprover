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
 * Single accent for a protocol: configured pen color first, then saved protocolColor, then palette.
 */
export function getProtocolAccentHex(protocol) {
    if (!protocol) return PROTOCOL_PALETTE[0];

    const fromPen = resolvePenColorToHex(protocol.penColor);
    if (fromPen) return fromPen;

    for (const pep of protocol.peptides || []) {
        const h = resolvePenColorToHex(pep?.penColor);
        if (h) return h;
    }

    if (protocol.protocolColor) {
        const named = resolvePenColorToHex(protocol.protocolColor);
        if (named) return named;
        if (/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(String(protocol.protocolColor).trim())) {
            return protocol.protocolColor.trim();
        }
        return protocol.protocolColor;
    }

    return getProtocolColor(protocol.id);
}

/** RGBA helper for note chips and borders */
export function hexToRgba(hex, alpha) {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return `rgba(127, 158, 149, ${alpha})`;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
