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
