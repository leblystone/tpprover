/**
 * Curated blood / lab markers commonly logged alongside peptide research.
 * Personal journal only — no clinical reference ranges or interpretation.
 */

export const LAB_MARKERS = [
  { key: 'fasting_glucose', name: 'Fasting glucose', unit: 'mg/dL', category: 'Metabolic' },
  { key: 'hba1c', name: 'HbA1c', unit: '%', category: 'Metabolic' },
  { key: 'insulin_fasting', name: 'Fasting insulin', unit: 'µIU/mL', category: 'Metabolic' },
  { key: 'igf1', name: 'IGF-1', unit: 'ng/mL', category: 'Hormone' },
  { key: 'gh', name: 'Growth hormone', unit: 'ng/mL', category: 'Hormone' },
  { key: 'total_testosterone', name: 'Total testosterone', unit: 'ng/dL', category: 'Hormone' },
  { key: 'free_testosterone', name: 'Free testosterone', unit: 'pg/mL', category: 'Hormone' },
  { key: 'estradiol', name: 'Estradiol (E2)', unit: 'pg/mL', category: 'Hormone' },
  { key: 'shbg', name: 'SHBG', unit: 'nmol/L', category: 'Hormone' },
  { key: 'dhea_s', name: 'DHEA-S', unit: 'µg/dL', category: 'Hormone' },
  { key: 'cortisol_am', name: 'Cortisol (AM)', unit: 'µg/dL', category: 'Hormone' },
  { key: 'prolactin', name: 'Prolactin', unit: 'ng/mL', category: 'Hormone' },
  { key: 'tsh', name: 'TSH', unit: 'mIU/L', category: 'Thyroid' },
  { key: 'free_t4', name: 'Free T4', unit: 'ng/dL', category: 'Thyroid' },
  { key: 'free_t3', name: 'Free T3', unit: 'pg/mL', category: 'Thyroid' },
  { key: 'hct', name: 'Hematocrit', unit: '%', category: 'CBC' },
  { key: 'hgb', name: 'Hemoglobin', unit: 'g/dL', category: 'CBC' },
  { key: 'rbc', name: 'RBC', unit: 'M/µL', category: 'CBC' },
  { key: 'wbc', name: 'WBC', unit: 'K/µL', category: 'CBC' },
  { key: 'platelets', name: 'Platelets', unit: 'K/µL', category: 'CBC' },
  { key: 'ldl', name: 'LDL cholesterol', unit: 'mg/dL', category: 'Lipid' },
  { key: 'hdl', name: 'HDL cholesterol', unit: 'mg/dL', category: 'Lipid' },
  { key: 'triglycerides', name: 'Triglycerides', unit: 'mg/dL', category: 'Lipid' },
  { key: 'total_cholesterol', name: 'Total cholesterol', unit: 'mg/dL', category: 'Lipid' },
  { key: 'creatinine', name: 'Creatinine', unit: 'mg/dL', category: 'Kidney' },
  { key: 'egfr', name: 'eGFR', unit: 'mL/min', category: 'Kidney' },
  { key: 'bun', name: 'BUN', unit: 'mg/dL', category: 'Kidney' },
  { key: 'alt', name: 'ALT', unit: 'U/L', category: 'Liver' },
  { key: 'ast', name: 'AST', unit: 'U/L', category: 'Liver' },
  { key: 'crp', name: 'hs-CRP', unit: 'mg/L', category: 'Inflammation' },
  { key: 'psa', name: 'PSA', unit: 'ng/mL', category: 'Other' },
  { key: 'vitamin_d', name: 'Vitamin D (25-OH)', unit: 'ng/mL', category: 'Other' },
  { key: 'ferritin', name: 'Ferritin', unit: 'ng/mL', category: 'Other' },
];

export const CUSTOM_MARKER_KEY = 'custom';

export function getLabMarkerByKey(key) {
  return LAB_MARKERS.find((m) => m.key === key) || null;
}

export function searchLabMarkers(query, limit = 16) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return LAB_MARKERS.slice(0, limit);
  return LAB_MARKERS.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.key.includes(q) ||
      (m.category || '').toLowerCase().includes(q)
  ).slice(0, limit);
}
