/**
 * Curated common medications (brand + generic) for autocomplete.
 * Not a full drug database — suggestions only; users can type custom names.
 * Personal journal use only — no dosing advice or interaction data.
 */

export const COMMON_MEDICATIONS = [
  { id: 'metformin', brandName: 'Glucophage', genericName: 'metformin', category: 'Metabolic' },
  { id: 'semaglutide-ozempic', brandName: 'Ozempic', genericName: 'semaglutide', category: 'GLP-1' },
  { id: 'semaglutide-wegovy', brandName: 'Wegovy', genericName: 'semaglutide', category: 'GLP-1' },
  { id: 'tirzepatide-mounjaro', brandName: 'Mounjaro', genericName: 'tirzepatide', category: 'GLP-1' },
  { id: 'tirzepatide-zepbound', brandName: 'Zepbound', genericName: 'tirzepatide', category: 'GLP-1' },
  { id: 'liraglutide-saxenda', brandName: 'Saxenda', genericName: 'liraglutide', category: 'GLP-1' },
  { id: 'dulaglutide', brandName: 'Trulicity', genericName: 'dulaglutide', category: 'GLP-1' },
  { id: 'atorvastatin', brandName: 'Lipitor', genericName: 'atorvastatin', category: 'Lipid' },
  { id: 'rosuvastatin', brandName: 'Crestor', genericName: 'rosuvastatin', category: 'Lipid' },
  { id: 'simvastatin', brandName: 'Zocor', genericName: 'simvastatin', category: 'Lipid' },
  { id: 'levothyroxine', brandName: 'Synthroid', genericName: 'levothyroxine', category: 'Thyroid' },
  { id: 'liothyronine', brandName: 'Cytomel', genericName: 'liothyronine', category: 'Thyroid' },
  { id: 'lisinopril', brandName: 'Zestril', genericName: 'lisinopril', category: 'Blood pressure' },
  { id: 'amlodipine', brandName: 'Norvasc', genericName: 'amlodipine', category: 'Blood pressure' },
  { id: 'losartan', brandName: 'Cozaar', genericName: 'losartan', category: 'Blood pressure' },
  { id: 'metoprolol', brandName: 'Lopressor', genericName: 'metoprolol', category: 'Blood pressure' },
  { id: 'hydrochlorothiazide', brandName: 'Microzide', genericName: 'hydrochlorothiazide', category: 'Blood pressure' },
  { id: 'omeprazole', brandName: 'Prilosec', genericName: 'omeprazole', category: 'GI' },
  { id: 'pantoprazole', brandName: 'Protonix', genericName: 'pantoprazole', category: 'GI' },
  { id: 'sertraline', brandName: 'Zoloft', genericName: 'sertraline', category: 'Mental health' },
  { id: 'escitalopram', brandName: 'Lexapro', genericName: 'escitalopram', category: 'Mental health' },
  { id: 'fluoxetine', brandName: 'Prozac', genericName: 'fluoxetine', category: 'Mental health' },
  { id: 'bupropion', brandName: 'Wellbutrin', genericName: 'bupropion', category: 'Mental health' },
  { id: 'alprazolam', brandName: 'Xanax', genericName: 'alprazolam', category: 'Mental health' },
  { id: 'gabapentin', brandName: 'Neurontin', genericName: 'gabapentin', category: 'Neurologic' },
  { id: 'pregabalin', brandName: 'Lyrica', genericName: 'pregabalin', category: 'Neurologic' },
  { id: 'tramadol', brandName: 'Ultram', genericName: 'tramadol', category: 'Pain' },
  { id: 'ibuprofen', brandName: 'Advil', genericName: 'ibuprofen', category: 'Pain' },
  { id: 'acetaminophen', brandName: 'Tylenol', genericName: 'acetaminophen', category: 'Pain' },
  { id: 'aspirin', brandName: 'Bayer', genericName: 'aspirin', category: 'Pain' },
  { id: 'melatonin', brandName: 'Melatonin', genericName: 'melatonin', category: 'Sleep' },
  { id: 'zolpidem', brandName: 'Ambien', genericName: 'zolpidem', category: 'Sleep' },
  { id: 'cetirizine', brandName: 'Zyrtec', genericName: 'cetirizine', category: 'Allergy' },
  { id: 'loratadine', brandName: 'Claritin', genericName: 'loratadine', category: 'Allergy' },
  { id: 'montelukast', brandName: 'Singulair', genericName: 'montelukast', category: 'Allergy' },
  { id: 'albuterol', brandName: 'Ventolin', genericName: 'albuterol', category: 'Respiratory' },
  { id: 'fluticasone', brandName: 'Flonase', genericName: 'fluticasone', category: 'Allergy' },
  { id: 'prednisone', brandName: 'Deltasone', genericName: 'prednisone', category: 'Steroid' },
  { id: 'methylprednisolone', brandName: 'Medrol', genericName: 'methylprednisolone', category: 'Steroid' },
  { id: 'testosterone-cypionate', brandName: 'Depo-Testosterone', genericName: 'testosterone cypionate', category: 'Hormone' },
  { id: 'estradiol', brandName: 'Estrace', genericName: 'estradiol', category: 'Hormone' },
  { id: 'progesterone', brandName: 'Prometrium', genericName: 'progesterone', category: 'Hormone' },
  { id: 'finasteride', brandName: 'Propecia', genericName: 'finasteride', category: 'Hormone' },
  { id: 'tadalafil', brandName: 'Cialis', genericName: 'tadalafil', category: 'Hormone' },
  { id: 'sildenafil', brandName: 'Viagra', genericName: 'sildenafil', category: 'Hormone' },
  { id: 'anastrozole', brandName: 'Arimidex', genericName: 'anastrozole', category: 'Hormone' },
  { id: 'clomiphene', brandName: 'Clomid', genericName: 'clomiphene', category: 'Hormone' },
  { id: 'enclomiphene', brandName: 'Androxal', genericName: 'enclomiphene', category: 'Hormone' },
  { id: 'warfarin', brandName: 'Coumadin', genericName: 'warfarin', category: 'Blood thinner' },
  { id: 'apixaban', brandName: 'Eliquis', genericName: 'apixaban', category: 'Blood thinner' },
  { id: 'clopidogrel', brandName: 'Plavix', genericName: 'clopidogrel', category: 'Blood thinner' },
  { id: 'insulin-glargine', brandName: 'Lantus', genericName: 'insulin glargine', category: 'Diabetes' },
  { id: 'empagliflozin', brandName: 'Jardiance', genericName: 'empagliflozin', category: 'Diabetes' },
  { id: 'sitagliptin', brandName: 'Januvia', genericName: 'sitagliptin', category: 'Diabetes' },
  { id: 'allopurinol', brandName: 'Zyloprim', genericName: 'allopurinol', category: 'Gout' },
  { id: 'tamsulosin', brandName: 'Flomax', genericName: 'tamsulosin', category: 'Urologic' },
  { id: 'ondansetron', brandName: 'Zofran', genericName: 'ondansetron', category: 'GI' },
  { id: 'docusate', brandName: 'Colace', genericName: 'docusate', category: 'GI' },
  { id: 'polyethylene-glycol', brandName: 'MiraLAX', genericName: 'polyethylene glycol', category: 'GI' },
];

/** Display label: "Lipitor (atorvastatin)" */
export function formatMedicationLabel(med) {
  if (!med) return '';
  const brand = (med.brandName || '').trim();
  const generic = (med.genericName || '').trim();
  if (brand && generic && brand.toLowerCase() !== generic.toLowerCase()) {
    return `${brand} (${generic})`;
  }
  return brand || generic || '';
}

/**
 * Filter curated list by query (brand, generic, or category).
 * @param {string} query
 * @param {number} [limit=12]
 */
export function searchCommonMedications(query, limit = 12) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const scored = [];
  for (const med of COMMON_MEDICATIONS) {
    const brand = med.brandName.toLowerCase();
    const generic = med.genericName.toLowerCase();
    const cat = (med.category || '').toLowerCase();
    let score = 0;
    if (brand.startsWith(q) || generic.startsWith(q)) score = 3;
    else if (brand.includes(q) || generic.includes(q)) score = 2;
    else if (cat.includes(q)) score = 1;
    if (score > 0) scored.push({ med, score });
  }
  scored.sort((a, b) => b.score - a.score || a.med.brandName.localeCompare(b.med.brandName));
  return scored.slice(0, limit).map((s) => s.med);
}
