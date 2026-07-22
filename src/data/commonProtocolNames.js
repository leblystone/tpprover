/**
 * Curated protocol / compound names for protocol-name autocomplete.
 * Suggestions only — users can type custom stack names.
 */

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
