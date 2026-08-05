/**
 * Lab report OCR / PDF text extraction — draft candidates only.
 * Never auto-saves. User must confirm each value.
 */

import { LAB_MARKERS, CUSTOM_MARKER_KEY } from '../data/labMarkers';

/** Extra aliases commonly printed on lab PDFs / OCR text */
const MARKER_ALIASES = {
  fasting_glucose: ['glucose', 'fasting blood glucose', 'blood glucose', 'fbg', 'glu'],
  hba1c: ['a1c', 'hba1c', 'hemoglobin a1c', 'glycohemoglobin', 'hgb a1c'],
  insulin_fasting: ['insulin', 'fasting insulin', 'insulin fasting'],
  igf1: ['igf-1', 'igf1', 'insulin-like growth factor', 'insulin like growth factor'],
  gh: ['growth hormone', 'hgh', 'somatotropin'],
  total_testosterone: ['total testosterone', 'testosterone, total', 'testosterone total', 'total testo'],
  free_testosterone: ['free testosterone', 'testosterone, free', 'testosterone free', 'free testo'],
  estradiol: ['estradiol', 'e2', 'estradiol (e2)'],
  shbg: ['shbg', 'sex hormone binding globulin'],
  dhea_s: ['dhea-s', 'dheas', 'dhea s'],
  cortisol_am: ['cortisol', 'cortisol am', 'am cortisol'],
  prolactin: ['prolactin'],
  tsh: ['tsh', 'thyroid stimulating hormone'],
  free_t4: ['free t4', 'ft4', 't4 free'],
  free_t3: ['free t3', 'ft3', 't3 free'],
  hct: ['hematocrit', 'hct'],
  hgb: ['hemoglobin', 'hgb', 'hb'],
  rbc: ['rbc', 'red blood cell', 'red blood cells'],
  wbc: ['wbc', 'white blood cell', 'white blood cells'],
  platelets: ['platelets', 'plt', 'platelet count'],
  ldl: ['ldl', 'ldl cholesterol', 'ldl-c'],
  hdl: ['hdl', 'hdl cholesterol', 'hdl-c'],
  triglycerides: ['triglycerides', 'trig', 'trigs'],
  total_cholesterol: ['total cholesterol', 'cholesterol, total', 'cholesterol total'],
  creatinine: ['creatinine', 'creat'],
  egfr: ['egfr', 'e.g.f.r', 'estimated gfr'],
  bun: ['bun', 'blood urea nitrogen'],
  alt: ['alt', 'sgpt', 'alanine aminotransferase'],
  ast: ['ast', 'sgot', 'aspartate aminotransferase'],
  crp: ['hs-crp', 'hscrp', 'crp', 'c-reactive protein'],
  psa: ['psa', 'prostate specific antigen'],
  vitamin_d: ['vitamin d', '25-oh vitamin d', '25-hydroxy vitamin d', 'vit d'],
  ferritin: ['ferritin'],
};

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLooseDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // YYYY-MM-DD
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  }
  // MM/DD/YYYY or M/D/YY
  m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
  }
  return null;
}

function extractReportDate(text) {
  const patterns = [
    /(?:collected|collection\s*date|specimen\s*date|draw\s*date|date\s*collected)\s*[:\-]?\s*([0-9]{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}|\d{4}-\d{2}-\d{2})/i,
    /(?:report\s*date|result\s*date|date\s*reported)\s*[:\-]?\s*([0-9]{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}|\d{4}-\d{2}-\d{2})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const d = parseLooseDate(m[1]);
      if (d) return d;
    }
  }
  return todayKey();
}

function markerSearchTerms(marker) {
  const aliases = MARKER_ALIASES[marker.key] || [];
  return [marker.name, ...aliases]
    .map((t) => String(t || '').trim().toLowerCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

/**
 * Find numeric value near a marker name in lab report text.
 */
function findValueNearMarker(textLower, term, defaultUnit) {
  const t = escapeRegExp(term);
  // Marker ... number [unit]
  const patterns = [
    new RegExp(`${t}\\s*[:\\-]?\\s*(\\d+(?:\\.\\d+)?)\\s*([a-zA-Zµ/%µIU]+(?:\\/[a-zA-Z]+)?)?`, 'i'),
    new RegExp(`${t}[^\\n\\d]{0,40}?(\\d+(?:\\.\\d+)?)\\s*([a-zA-Zµ/%µIU]+(?:\\/[a-zA-Z]+)?)?`, 'i'),
  ];
  for (const re of patterns) {
    const m = textLower.match(re);
    if (!m) continue;
    const value = Number(m[1]);
    if (!Number.isFinite(value)) continue;
    // Skip absurd outliers for common % markers
    if (defaultUnit === '%' && (value < 0 || value > 100)) continue;
    const unit = (m[2] || defaultUnit || '').trim();
    return { value, unit: unit || defaultUnit || '' };
  }
  return null;
}

/**
 * Parse free text into draft lab entries matched to curated markers.
 * @returns {{ date: string, drafts: Array, rawPreview: string }}
 */
export function parseLabReportText(text) {
  const raw = normalizeText(text);
  const textLower = raw.toLowerCase();
  const date = extractReportDate(raw);
  const drafts = [];
  const seen = new Set();

  for (const marker of LAB_MARKERS) {
    const terms = markerSearchTerms(marker);
    let hit = null;
    for (const term of terms) {
      hit = findValueNearMarker(textLower, term, marker.unit);
      if (hit) break;
    }
    if (!hit) continue;
    if (seen.has(marker.key)) continue;
    seen.add(marker.key);
    drafts.push({
      id: `draft-${marker.key}-${drafts.length}`,
      selected: true,
      markerKey: marker.key,
      markerName: marker.name,
      value: hit.value,
      unit: hit.unit || marker.unit || '',
      date,
      notes: 'Imported from scan — verify before saving',
      confidence: 'matched',
    });
  }

  return {
    date,
    drafts,
    rawPreview: raw.slice(0, 1200),
  };
}

async function extractTextFromPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const { getDocument, GlobalWorkerOptions } = pdfjs;
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const maxPages = Math.min(pdf.numPages, 6);
  const chunks = [];
  for (let i = 1; i <= maxPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    chunks.push(content.items.map((it) => it.str).join(' '));
  }
  return chunks.join('\n');
}

async function extractTextFromImage(file) {
  const { recognizeLabelImage } = await import('./labelOCR');
  const { text } = await recognizeLabelImage(file);
  return text || '';
}

/**
 * Extract text from a lab PDF or image, then parse marker candidates.
 * @param {File|Blob} file
 * @returns {Promise<{ date: string, drafts: Array, rawPreview: string, source: string, fileName: string }>}
 */
export async function parseLabReportFile(file) {
  if (!file) throw new Error('No file selected');

  const name = file.name || 'report';
  let text = '';
  let source = 'unknown';

  if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) {
    text = await extractTextFromPdf(file);
    source = 'pdf';
    // Scanned PDF with little/no text layer — fall back to raster OCR of first page is heavy;
    // if empty, try treating as image isn't valid. Leave empty for user messaging.
  } else if (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) {
    text = await extractTextFromImage(file);
    source = 'ocr';
  } else if (file.type === 'text/plain' || /\.txt$/i.test(name)) {
    text = await file.text();
    source = 'text';
  } else {
    throw new Error('Unsupported file type. Use PDF or a photo of your lab report.');
  }

  const parsed = parseLabReportText(text);
  return {
    ...parsed,
    source,
    fileName: name,
  };
}

export function draftToLabFields(draft) {
  return {
    markerKey: draft.markerKey || CUSTOM_MARKER_KEY,
    markerName: (draft.markerName || '').trim(),
    value: Number(draft.value),
    unit: (draft.unit || '').trim(),
    date: draft.date || todayKey(),
    notes: draft.notes || '',
  };
}
