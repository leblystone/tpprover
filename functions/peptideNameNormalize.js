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

function normalizePeptideLookupKey(name) {
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

module.exports = { stripDecorativeChars, normalizePeptideLookupKey };
