/**
 * Strip decorative characters from peptide display names (emojis, ®, ZWJ, etc.)
 * while keeping compound text: BPC-157, TB-500, PE 22-28, etc.
 *
 * Uses a whitelist (not Unicode Emoji properties) because digit runs like "157"
 * in "BPC-157🩼" can be misclassified as Emoji_Component and get deleted.
 */

/** Remove emojis/symbols — keep letters, digits, spaces, + - . / */
export function stripDecorativeChars(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .normalize('NFKD')
        .replace(/[\u200d\uFE00-\uFE0F]/g, '')
        .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
        .replace(/[^a-zA-Z0-9\s+.\-/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Canonical key for matching API results ↔ protocol peptides. */
export function normalizePeptideLookupKey(name) {
    const base = stripDecorativeChars(name).toLowerCase();
    if (!base) return '';

    const aliases = {
        'semorelin': 'sermorelin',
        'tb500': 'tb-500',
        'tb 500': 'tb-500',
        'bpc157': 'bpc-157',
        'bpc 157': 'bpc-157',
        'cjc1295': 'cjc-1295',
        'cjc 1295': 'cjc-1295',
        'pe 22 28': 'pe-22-28',
        'nad': 'nad+',
    };
    return aliases[base] || base;
}

/** Clean label sent to Gemini (no emojis). */
export function sanitizePeptideNameForApi(name) {
    const clean = stripDecorativeChars(name);
    return clean || (name || '').trim();
}
