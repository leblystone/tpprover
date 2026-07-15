/**
 * Keep in sync with src/utils/peptideNameNormalize.js
 */

function stripDecorativeChars(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .normalize('NFKD')
        .replace(/[\u200d\uFE00-\uFE0F]/g, '')
        .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')
        .replace(/[^a-zA-Z0-9\s+.\-/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

const LOOKUP_ALIASES = {
    'semorelin': 'sermorelin',
    'tb500': 'tb-500',
    'tb 500': 'tb-500',
    'bpc157': 'bpc-157',
    'bpc 157': 'bpc-157',
    'cjc1295': 'cjc-1295',
    'cjc 1295': 'cjc-1295',
    'pe 22 28': 'pe-22-28',
    'pe22 28': 'pe-22-28',
    'nad': 'nad+',
    'epithalon': 'epitalon',
    'epithalone': 'epitalon',
    'thymosin alpha 1': 'thymosin alpha-1',
    'thymosin alpha1': 'thymosin alpha-1',
    'ta1': 'thymosin alpha-1',
    'ta-1': 'thymosin alpha-1',
    'thymosin beta 4': 'tb-500',
    'thymosin beta-4': 'tb-500',
    'ghk cu': 'ghk-cu',
    'ghkcu': 'ghk-cu',
    'mots c': 'mots-c',
    'motsc': 'mots-c',
    'vasoactive intestinal peptide': 'vip',
    'vasoactive intestinal polypeptide': 'vip',
};

function normalizePeptideLookupKey(name) {
    const base = stripDecorativeChars(name).toLowerCase();
    if (!base) return '';
    return LOOKUP_ALIASES[base] || base;
}

/**
 * Aggressive key — letters + digits only, aliases applied. Collapses
 * hyphen/space/case differences ("TB-500" / "TB 500" / "tb500" -> "tb500").
 */
function superNormalizePeptideName(name) {
    const key = normalizePeptideLookupKey(name);
    return key.replace(/[^a-z0-9]/g, '');
}

module.exports = { stripDecorativeChars, normalizePeptideLookupKey, superNormalizePeptideName };
