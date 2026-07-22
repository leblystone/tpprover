/**
 * Curated common supplements for autocomplete.
 * Suggestions only — users can type custom names. Not medical advice.
 */

export const COMMON_SUPPLEMENTS = [
  { id: 'vitamin-c', name: 'Vitamin C', category: 'Vitamin', aliases: ['ascorbic acid'] },
  { id: 'vitamin-d3', name: 'Vitamin D3', category: 'Vitamin', aliases: ['cholecalciferol', 'vitamin d'] },
  { id: 'vitamin-d2', name: 'Vitamin D2', category: 'Vitamin', aliases: ['ergocalciferol'] },
  { id: 'vitamin-a', name: 'Vitamin A', category: 'Vitamin', aliases: ['retinol'] },
  { id: 'vitamin-e', name: 'Vitamin E', category: 'Vitamin', aliases: ['tocopherol'] },
  { id: 'vitamin-k2', name: 'Vitamin K2', category: 'Vitamin', aliases: ['mk-7', 'menaquinone'] },
  { id: 'b-complex', name: 'B-Complex', category: 'Vitamin', aliases: ['b vitamins'] },
  { id: 'b1', name: 'Vitamin B1 (Thiamine)', category: 'Vitamin', aliases: ['thiamine'] },
  { id: 'b2', name: 'Vitamin B2 (Riboflavin)', category: 'Vitamin', aliases: ['riboflavin'] },
  { id: 'b3', name: 'Vitamin B3 (Niacin)', category: 'Vitamin', aliases: ['niacin', 'niacinamide'] },
  { id: 'b5', name: 'Vitamin B5 (Pantothenic Acid)', category: 'Vitamin', aliases: ['pantothenic acid'] },
  { id: 'b6', name: 'Vitamin B6', category: 'Vitamin', aliases: ['pyridoxine'] },
  { id: 'b7', name: 'Biotin (B7)', category: 'Vitamin', aliases: ['biotin'] },
  { id: 'b9', name: 'Folate (B9)', category: 'Vitamin', aliases: ['folic acid', 'methylfolate'] },
  { id: 'b12', name: 'Vitamin B12', category: 'Vitamin', aliases: ['methylcobalamin', 'cyanocobalamin', 'cobalamin'] },
  { id: 'magnesium', name: 'Magnesium', category: 'Mineral', aliases: ['mag glycinate', 'mag citrate', 'mag threonate'] },
  { id: 'magnesium-glycinate', name: 'Magnesium Glycinate', category: 'Mineral' },
  { id: 'magnesium-citrate', name: 'Magnesium Citrate', category: 'Mineral' },
  { id: 'magnesium-threonate', name: 'Magnesium Threonate', category: 'Mineral', aliases: ['magtein'] },
  { id: 'zinc', name: 'Zinc', category: 'Mineral', aliases: ['zinc picolinate', 'zinc bisglycinate'] },
  { id: 'copper', name: 'Copper', category: 'Mineral' },
  { id: 'selenium', name: 'Selenium', category: 'Mineral' },
  { id: 'iodine', name: 'Iodine', category: 'Mineral', aliases: ['potassium iodide'] },
  { id: 'iron', name: 'Iron', category: 'Mineral', aliases: ['ferrous bisglycinate'] },
  { id: 'calcium', name: 'Calcium', category: 'Mineral' },
  { id: 'potassium', name: 'Potassium', category: 'Mineral' },
  { id: 'chromium', name: 'Chromium', category: 'Mineral' },
  { id: 'omega-3', name: 'Omega-3 (Fish Oil)', category: 'Fatty acid', aliases: ['fish oil', 'epa', 'dha'] },
  { id: 'cod-liver-oil', name: 'Cod Liver Oil', category: 'Fatty acid' },
  { id: 'krill-oil', name: 'Krill Oil', category: 'Fatty acid' },
  { id: 'flaxseed-oil', name: 'Flaxseed Oil', category: 'Fatty acid' },
  { id: 'coq10', name: 'CoQ10', category: 'Antioxidant', aliases: ['ubiquinol', 'ubiquinone'] },
  { id: 'nac', name: 'NAC', category: 'Antioxidant', aliases: ['n-acetylcysteine', 'n-acetyl cysteine'] },
  { id: 'glutathione', name: 'Glutathione', category: 'Antioxidant' },
  { id: 'alpha-lipoic-acid', name: 'Alpha-Lipoic Acid', category: 'Antioxidant', aliases: ['ala'] },
  { id: 'astaxanthin', name: 'Astaxanthin', category: 'Antioxidant' },
  { id: 'resveratrol', name: 'Resveratrol', category: 'Antioxidant' },
  { id: 'curcumin', name: 'Curcumin (Turmeric)', category: 'Botanical', aliases: ['turmeric'] },
  { id: 'ashwagandha', name: 'Ashwagandha', category: 'Botanical' },
  { id: 'rhodiola', name: 'Rhodiola', category: 'Botanical' },
  { id: 'ginseng', name: 'Ginseng', category: 'Botanical' },
  { id: 'berberine', name: 'Berberine', category: 'Botanical' },
  { id: 'milk-thistle', name: 'Milk Thistle', category: 'Botanical', aliases: ['silymarin'] },
  { id: 'elderberry', name: 'Elderberry', category: 'Botanical' },
  { id: 'echinacea', name: 'Echinacea', category: 'Botanical' },
  { id: 'probiotics', name: 'Probiotics', category: 'Gut', aliases: ['lactobacillus', 'bifidobacterium'] },
  { id: 'prebiotics', name: 'Prebiotics', category: 'Gut' },
  { id: 'digestive-enzymes', name: 'Digestive Enzymes', category: 'Gut' },
  { id: 'collagen', name: 'Collagen', category: 'Protein', aliases: ['collagen peptides'] },
  { id: 'creatine', name: 'Creatine', category: 'Performance', aliases: ['creatine monohydrate'] },
  { id: 'electrolytes', name: 'Electrolytes', category: 'Hydration' },
  { id: 'lmnt', name: 'LMNT / Electrolyte Mix', category: 'Hydration', aliases: ['lmnt'] },
  { id: 'protein-powder', name: 'Protein Powder', category: 'Protein', aliases: ['whey', 'casein'] },
  { id: 'multivitamin', name: 'Multivitamin', category: 'Multi' },
  { id: 'melatonin', name: 'Melatonin', category: 'Sleep' },
  { id: 'glycine', name: 'Glycine', category: 'Amino acid' },
  { id: 'l-theanine', name: 'L-Theanine', category: 'Amino acid' },
  { id: 'l-tyrosine', name: 'L-Tyrosine', category: 'Amino acid' },
  { id: 'taurine', name: 'Taurine', category: 'Amino acid' },
  { id: 'l-carnitine', name: 'L-Carnitine', category: 'Amino acid', aliases: ['acetyl-l-carnitine', 'alcar'] },
  { id: '5-htp', name: '5-HTP', category: 'Amino acid' },
  { id: 'gaba', name: 'GABA', category: 'Amino acid' },
  { id: 'nmn', name: 'NMN', category: 'Longevity', aliases: ['nicotinamide mononucleotide'] },
  { id: 'nr', name: 'NR (Nicotinamide Riboside)', category: 'Longevity', aliases: ['nicotinamide riboside'] },
  { id: 'tmg', name: 'TMG (Betaine)', category: 'Longevity', aliases: ['trimethylglycine', 'betaine'] },
  { id: 'boron', name: 'Boron', category: 'Mineral' },
  { id: 'dim', name: 'DIM', category: 'Hormone support', aliases: ['diindolylmethane'] },
  { id: 'calcium-d-glucarate', name: 'Calcium D-Glucarate', category: 'Hormone support' },
  { id: 'tongkat-ali', name: 'Tongkat Ali', category: 'Botanical' },
  { id: 'fadogia', name: 'Fadogia Agrestis', category: 'Botanical' },
];

/**
 * Filter curated list by query (name, alias, or category).
 * @param {string} query
 * @param {number} [limit=12]
 */
export function searchCommonSupplements(query, limit = 12) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const item of COMMON_SUPPLEMENTS) {
    const name = item.name.toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const aliases = (item.aliases || []).map((a) => a.toLowerCase());
    let score = 0;
    if (name.startsWith(q) || aliases.some((a) => a.startsWith(q))) score = 3;
    else if (name.includes(q) || aliases.some((a) => a.includes(q))) score = 2;
    else if (cat.includes(q)) score = 1;
    if (score > 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((s) => s.item);
}
