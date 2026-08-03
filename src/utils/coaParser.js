/**
 * COA (Certificate of Analysis) document parser.
 * Extracts compound name, mg/dose, purity, batch/lot, and vendor from PDF or image files.
 */

import { parseVialScan } from './vialScanParser';

const COA_KEYWORDS = ['coa', 'certificate', 'analysis', 'assay', 'certificate of analysis'];

export function looksLikeCOA(titleOrFilename = '') {
  const t = String(titleOrFilename || '').toLowerCase();
  return COA_KEYWORDS.some((k) => t.includes(k));
}

function extractFieldsFromText(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;

  // Reuse labeled / dose / batch heuristics from vial scan parser, then enrich
  const base = parseVialScan(raw);

  const name =
    raw.match(/(?:product|compound|peptide|sample|material)\s*(?:name)?\s*[:=\-]?\s*([A-Za-z][\w\-./+]{1,48})/i)?.[1] ||
    base.name;

  const doseMatch = raw.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|iu|ml|mL|g)\b/i);
  const mg = doseMatch?.[1] || base.mg;
  const mgUnit = doseMatch
    ? (() => {
        const u = doseMatch[2].toLowerCase().replace('µg', 'mcg').replace('ug', 'mcg');
        if (u === 'iu') return 'IU';
        if (u === 'ml') return 'mL';
        if (u === 'mcg') return 'mcg';
        if (u === 'g') return 'g';
        return 'mg';
      })()
    : base.mgUnit;

  const purity =
    raw.match(/(?:purity|assay|HPLC\s*purity)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*%?/i)?.[1] ||
    raw.match(/(\d{2}(?:\.\d+)?)\s*%\s*(?:purity|by\s*HPLC)?/i)?.[1] ||
    base.purity;

  const batchNumber =
    raw.match(/(?:lot|batch)\s*(?:no\.?|number|#)?\s*[:=\-]?\s*([A-Za-z0-9\-_./]{3,40})/i)?.[1] ||
    base.batchNumber;

  const vendor =
    raw.match(/(?:manufactured\s*by|supplier|vendor|laboratory|lab)\s*[:=\-]?\s*([A-Za-z][\w\s.&'-]{1,48})/i)?.[1]?.trim() ||
    base.vendor;

  const fields = {};
  if (name) fields.name = name.trim();
  if (mg) fields.mg = String(mg);
  if (mgUnit) fields.mgUnit = mgUnit;
  if (purity) fields.purity = String(purity).replace(/%/g, '').trim();
  if (batchNumber && !/^batch$/i.test(batchNumber)) fields.batchNumber = batchNumber.trim();
  if (vendor) fields.vendor = vendor.trim();

  // Require at least one meaningful field beyond a bare batch-looking SKU
  if (!fields.name && !fields.mg && !fields.purity) return null;
  return fields;
}

async function extractTextFromPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const { getDocument, GlobalWorkerOptions } = pdfjs;
  // Vite resolves the worker module URL at build time
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const maxPages = Math.min(pdf.numPages, 3);
  const chunks = [];
  for (let i = 1; i <= maxPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    chunks.push(content.items.map((it) => it.str).join(' '));
  }
  return chunks.join('\n');
}

async function extractTextFromImage(file) {
  // Reuse shared OCR worker (same engine as label scan)
  const { recognizeLabelImage } = await import('./labelOCR');
  const { text } = await recognizeLabelImage(file);
  return text || '';
}

/**
 * Parse a COA file (PDF or image) into stockpile fields.
 * @param {File|Blob} file
 * @param {{ title?: string }} [meta]
 * @returns {Promise<object|null>}
 */
export async function parseCOAFile(file, meta = {}) {
  if (!file) return null;

  const titleHint = meta.title || file.name || '';
  let text = '';

  try {
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) {
      text = await extractTextFromPdf(file);
    } else if (file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || '')) {
      text = await extractTextFromImage(file);
    } else if (file.type === 'text/plain' || /\.txt$/i.test(file.name || '')) {
      text = await file.text();
    } else {
      // Unknown type — try image OCR as last resort if it looks like a COA by name
      if (looksLikeCOA(titleHint)) {
        try {
          text = await extractTextFromImage(file);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }
  } catch (err) {
    console.error('COA text extraction failed:', err);
    return null;
  }

  const fields = extractFieldsFromText(text);
  if (!fields) return null;
  return { ...fields, source: 'coa', sourceTitle: titleHint };
}

/**
 * Merge COA fields into an existing form without overwriting user-filled values.
 */
export function mergeCOAIntoForm(form, fields) {
  if (!fields) return form;
  const next = { ...form };
  const empty = (v) => v == null || String(v).trim() === '';
  if (empty(next.name) && fields.name) next.name = fields.name;
  if (empty(next.mg) && fields.mg) next.mg = fields.mg;
  if (empty(next.mgUnit) && fields.mgUnit) next.mgUnit = fields.mgUnit;
  if (empty(next.purity) && fields.purity) next.purity = fields.purity;
  if (empty(next.batchNumber) && fields.batchNumber) next.batchNumber = fields.batchNumber;
  if (empty(next.vendor) && fields.vendor) next.vendor = fields.vendor;
  return next;
}

export default parseCOAFile;
