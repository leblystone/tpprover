/**
 * Curated protocol / compound names for protocol-name autocomplete.
 * Suggestions only — users can type custom stack names.
 */

/** Purpose / goal chips for advanced guided protocol walkthrough. */
export const PURPOSE_SUGGESTIONS = [
  'Weight loss',
  'Cognition',
  'Recovery',
  'Anti-aging',
  'Healing',
  'Performance',
  'Sleep',
];

/** Catalog category → onboarding purpose chip */
const CATEGORY_TO_PURPOSE = {
  'GLP-1': 'Weight loss',
  Healing: 'Healing',
  Cognitive: 'Cognition',
  Sleep: 'Sleep',
  'Anti-aging': 'Anti-aging',
  Performance: 'Performance',
  'GHRH/GHRP': 'Performance',
  Growth: 'Performance',
  Cellular: 'Anti-aging',
  Mitochondria: 'Recovery',
  Immune: 'Healing',
  Libido: 'Performance',
  Hormone: 'Performance',
  Blend: 'Healing',
  Antioxidant: 'Anti-aging',
  Cosmetic: 'Healing',
  Tanning: 'Healing',
  Senolytic: 'Anti-aging',
};

/** Purpose-icon ids (from protocolPurposeIcons) → onboarding purpose chip */
const ICON_ID_TO_PURPOSE = {
  'weight-loss': 'Weight loss',
  brain: 'Cognition',
  recovery: 'Recovery',
  longevity: 'Anti-aging',
  performance: 'Performance',
  sleep: 'Sleep',
  muscle: 'Performance',
  energy: 'Performance',
  immune: 'Healing',
  health: 'Healing',
  metabolism: 'Weight loss',
  hormones: 'Performance',
};

/** Short name-only picks for first-run / guided walkthrough (no dosages). */
export const ONBOARDING_PROTOCOL_NAME_PICKS = [
  { id: 'semaglutide', name: 'Semaglutide', category: 'GLP-1' },
  { id: 'tirzepatide', name: 'Tirzepatide', category: 'GLP-1' },
  { id: 'retatrutide', name: 'Retatrutide', category: 'GLP-1' },
  { id: 'bpc-157', name: 'BPC-157', category: 'Healing' },
  { id: 'tb-500', name: 'TB-500', category: 'Healing' },
  { id: 'cjc-ipa', name: 'CJC-1295 + Ipamorelin', category: 'GHRH/GHRP' },
  { id: 'nad', name: 'NAD+', category: 'Cellular' },
  { id: 'pt-141', name: 'PT-141', category: 'Libido' },
  { id: 'ghk-cu', name: 'GHK-Cu', category: 'Healing' },
];

export const COMMON_PROTOCOL_NAMES = [
  { id: 'bpc-157', name: 'BPC-157', category: 'Healing', aliases: ['bpc', 'bpc157', 'body protection compound'] },
  { id: 'tb-500', name: 'TB-500', category: 'Healing', aliases: ['tb500', 'thymosin beta-4', 'tb4'] },
  { id: 'bpc-tb', name: 'BPC-157 + TB-500', category: 'Healing', aliases: ['wolverine', 'bpc/tb', 'bpc tb'] },
  { id: 'ghk-cu', name: 'GHK-Cu', category: 'Healing', aliases: ['ghkcu', 'copper peptide'] },
  { id: 'll-37', name: 'LL-37', category: 'Healing', aliases: ['ll37'] },
  { id: 'ss-31', name: 'SS-31', category: 'Mitochondria', aliases: ['elamipretide', 'ss31'] },
  { id: 'mots-c', name: 'MOTS-c', category: 'Mitochondria', aliases: ['motsc'] },
  { id: 'humanin', name: 'Humanin', category: 'Mitochondria' },
  { id: 'semaglutide', name: 'Semaglutide', category: 'GLP-1', aliases: ['ozempic', 'wegovy', 'rybelsus', 'sema'] },
  { id: 'tirzepatide', name: 'Tirzepatide', category: 'GLP-1', aliases: ['mounjaro', 'zepbound', 'tirz'] },
  { id: 'retatrutide', name: 'Retatrutide', category: 'GLP-1', aliases: ['reta'] },
  { id: 'cagrilintide', name: 'Cagrilintide', category: 'GLP-1', aliases: ['cagri'] },
  { id: 'liraglutide', name: 'Liraglutide', category: 'GLP-1', aliases: ['saxenda', 'victoza'] },
  { id: 'dulaglutide', name: 'Dulaglutide', category: 'GLP-1', aliases: ['trulicity'] },
  { id: 'ipamorelin', name: 'Ipamorelin', category: 'GHRH/GHRP', aliases: ['ipa'] },
  { id: 'cjc-1295', name: 'CJC-1295', category: 'GHRH/GHRP', aliases: ['cjc', 'cjc1295'] },
  { id: 'cjc-dac', name: 'CJC-1295 DAC', category: 'GHRH/GHRP', aliases: ['cjc dac'] },
  { id: 'cjc-ipa', name: 'CJC-1295 + Ipamorelin', category: 'GHRH/GHRP', aliases: ['cjc/ipa', 'cjc ipa'] },
  { id: 'sermorelin', name: 'Sermorelin', category: 'GHRH/GHRP' },
  { id: 'tesamorelin', name: 'Tesamorelin', category: 'GHRH/GHRP', aliases: ['egrifta'] },
  { id: 'ghrp-2', name: 'GHRP-2', category: 'GHRH/GHRP', aliases: ['ghrp2'] },
  { id: 'ghrp-6', name: 'GHRP-6', category: 'GHRH/GHRP', aliases: ['ghrp6'] },
  { id: 'hexarelin', name: 'Hexarelin', category: 'GHRH/GHRP' },
  { id: 'mk-677', name: 'MK-677', category: 'GHRH/GHRP', aliases: ['ibutamoren', 'mk677'] },
  { id: 'igf-1-lr3', name: 'IGF-1 LR3', category: 'Growth', aliases: ['igf1', 'igf-1', 'lr3'] },
  { id: 'igf-des', name: 'IGF-DES', category: 'Growth', aliases: ['igf des'] },
  { id: 'peg-mgf', name: 'PEG-MGF', category: 'Growth', aliases: ['mgf'] },
  { id: 'follistatin-344', name: 'Follistatin-344', category: 'Growth', aliases: ['follistatin'] },
  { id: 'selank', name: 'Selank', category: 'Cognitive' },
  { id: 'semax', name: 'Semax', category: 'Cognitive' },
  { id: 'dsip', name: 'DSIP', category: 'Sleep' },
  { id: 'epitalon', name: 'Epitalon', category: 'Anti-aging', aliases: ['epithalon', 'epithalone'] },
  { id: 'thymosin-a1', name: 'Thymosin Alpha-1', category: 'Immune', aliases: ['ta1', 'ta-1'] },
  { id: 'nad', name: 'NAD+', category: 'Cellular', aliases: ['nad+', 'nadh'] },
  { id: 'pt-141', name: 'PT-141', category: 'Libido', aliases: ['bremelanotide', 'pt141'] },
  { id: 'melanotan-ii', name: 'Melanotan II', category: 'Tanning', aliases: ['mt2', 'melanotan 2', 'mt-2'] },
  { id: 'oxytocin', name: 'Oxytocin', category: 'Hormone' },
  { id: 'kisspeptin', name: 'Kisspeptin', category: 'Hormone', aliases: ['kisspeptin-10'] },
  { id: 'hcg', name: 'HCG', category: 'Hormone', aliases: ['human chorionic gonadotropin'] },
  { id: 'ara-290', name: 'ARA-290', category: 'Healing', aliases: ['cibinetide'] },
  { id: 'foxo4-dri', name: 'FOXO4-DRI', category: 'Senolytic', aliases: ['foxo4'] },
  { id: 'glow', name: 'GLOW', category: 'Blend' },
  { id: 'klow', name: 'KLOW', category: 'Blend' },
  { id: 'lipo-c', name: 'Lipo-C', category: 'Blend' },
  { id: 'glutathione', name: 'Glutathione', category: 'Antioxidant' },
  { id: 'snap-8', name: 'SNAP-8', category: 'Cosmetic' },
  { id: 'cerebrolysin', name: 'Cerebrolysin', category: 'Cognitive' },
  { id: 'dihexa', name: 'Dihexa', category: 'Cognitive' },
  { id: 'noopept', name: 'Noopept', category: 'Cognitive' },
  { id: 'p21', name: 'P21', category: 'Cognitive' },
  { id: 'aicar', name: 'AICAR', category: 'Performance' },
  { id: 'cardarine', name: 'Cardarine', category: 'Performance', aliases: ['gw501516', 'gw'] },
];

/**
 * Exact / alias match against the curated catalog.
 * @param {string} name
 * @returns {{ id: string, name: string, category?: string } | null}
 */
export function findCommonProtocolByName(name) {
  const q = String(name || '').trim().toLowerCase();
  if (!q) return null;
  const qCompact = q.replace(/[^a-z0-9]+/g, '');
  for (const item of COMMON_PROTOCOL_NAMES) {
    const n = item.name.toLowerCase();
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());
    if (n === q || aliases.includes(q)) return item;
    const compact = n.replace(/[^a-z0-9]+/g, '');
    if (qCompact && compact === qCompact) return item;
  }
  return null;
}

/**
 * Auto-suggest a purpose/goal chip from a peptide or protocol name.
 * Matches the editor/stockpile compound inference, mapped onto PURPOSE_SUGGESTIONS.
 * @param {string} peptideName
 * @returns {string} purpose label or ''
 */
export function suggestPurposeFromPeptideName(peptideName) {
  const name = String(peptideName || '').trim();
  if (!name) return '';

  const catalog = findCommonProtocolByName(name);
  if (catalog?.category && CATEGORY_TO_PURPOSE[catalog.category]) {
    return CATEGORY_TO_PURPOSE[catalog.category];
  }

  // Fallback keyword scan for names outside the curated catalog
  const lower = name.toLowerCase();
  if (/(sema|tirz|reta|glp|mounjaro|ozempic|wegovy|zepbound)/.test(lower)) return 'Weight loss';
  if (/(bpc|tb-?500|ghk|ll-?37|heal)/.test(lower)) return 'Healing';
  if (/(semax|selank|dihexa|noopept|cerebro|cognit)/.test(lower)) return 'Cognition';
  if (/(dsip|sleep|melatonin)/.test(lower)) return 'Sleep';
  if (/(epital|epithal|anti-?age|longev|foxo|nad)/.test(lower)) return 'Anti-aging';
  if (/(cjc|ipa|sermorelin|mk-?677|igf|cardarine|perform|ghrp)/.test(lower)) return 'Performance';
  if (/(recover|injury|repair)/.test(lower)) return 'Recovery';

  return '';
}

/**
 * Map a purpose-icon id (stockpile/editor) onto an onboarding purpose chip.
 * @param {string|null|undefined} iconId
 */
export function purposeFromIconId(iconId) {
  if (!iconId) return '';
  return ICON_ID_TO_PURPOSE[iconId] || '';
}

/**
 * @param {string} query
 * @param {number} [limit=10]
 */
export function searchCommonProtocolNames(query, limit = 10) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const item of COMMON_PROTOCOL_NAMES) {
    const name = item.name.toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());
    let score = 0;
    if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) score = 3;
    else if (name.includes(q) || aliases.some((a) => a.includes(q))) score = 2;
    else if (cat.includes(q)) score = 1;
    // Compact match: "bpc" → "bpc-157"
    const compact = name.replace(/[^a-z0-9]/g, '');
    const qCompact = q.replace(/[^a-z0-9]/g, '');
    if (qCompact && compact.startsWith(qCompact)) score = Math.max(score, 3);
    else if (qCompact && compact.includes(qCompact)) score = Math.max(score, 2);
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((s) => s.item);
}
