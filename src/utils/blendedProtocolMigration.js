/**
 * Migration for blended protocols with missing frequency on peptides.
 * 
 * Older blended protocols may have been saved with peptides[].frequency undefined
 * (sharedFrequency wasn't synced to peptides at save time). This repairs them
 * so "Not set" no longer appears on peptide cards for existing users.
 * 
 * Run on protocols whenever loading from storage (Firebase, localStorage, merge).
 */

const DEFAULT_FREQUENCY = { type: 'daily', time: ['AM'] };

function isValidFrequency(f) {
    return f && (f.type || (Array.isArray(f.time) && f.time.length > 0));
}

/**
 * Repairs blended protocols: ensures all peptides have the shared frequency.
 * Finds first valid frequency from any peptide, or uses default.
 * @param {Array} protocols
 * @returns {Array} protocols with repaired blended data (new array, immutably)
 */
export function migrateBlendedProtocolFrequencies(protocols) {
    if (!Array.isArray(protocols) || protocols.length === 0) return protocols;

    const isBlended = (p) =>
        (p.blendMode || p.protocolType || '').toLowerCase() === 'blended' &&
        Array.isArray(p.peptides) &&
        p.peptides.length > 1;

    let changed = false;
    const result = protocols.map((p) => {
        if (!isBlended(p)) return p;

        const peptides = p.peptides || [];
        const firstValid = peptides.find((pep) => isValidFrequency(pep.frequency));
        const shared = firstValid?.frequency && isValidFrequency(firstValid.frequency)
            ? firstValid.frequency
            : DEFAULT_FREQUENCY;

        const needsRepair = peptides.some((pep) => !isValidFrequency(pep.frequency));
        if (!needsRepair) return p;

        changed = true;
        return {
            ...p,
            peptides: peptides.map((pep) => ({
                ...pep,
                frequency: { ...shared }
            }))
        };
    });

    return changed ? result : protocols;
}
