/**
 * Parse a decoded barcode / QR string into stockpile / protocol form fields.
 *
 * Supported formats:
 * - Structured QR: "BPC-157|5mg|batch:LOT2024" or "BPC-157,5mg,vendor:Acme"
 * - Key/value pairs: "name=BPC-157;mg=5;batch=LOT2024"
 * - GS1-ish / labeled: "Product: BPC-157 Batch: LOT2024 5 mg"
 * - Plain batch/SKU: falls back to batchNumber = raw string
 */

const DOSE_RE = /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|iu|ml|mL|g)\b/i;
const BATCH_RE = /(?:batch|lot|lot\s*#|batch\s*#)\s*[:=\-]?\s*([A-Za-z0-9\-_./]+)/i;
const VENDOR_RE = /(?:vendor|supplier|brand|mfr|manufacturer)\s*[:=\-]?\s*([A-Za-z0-9][\w\s.&'-]{1,40})/i;
const NAME_LABEL_RE = /(?:product|compound|name|peptide)\s*[:=\-]?\s*([A-Za-z][\w\-./+]{1,40})/i;

const KNOWN_COMPOUND_HINT =
  /\b([A-Z]{2,6}-?\d{2,4}[A-Z]?|[A-Za-z]{3,}(?:-\d+[A-Za-z]?)?)\b/;

function normalizeUnit(raw) {
  if (!raw) return 'mg';
  const u = String(raw).toLowerCase().replace('µg', 'mcg').replace('ug', 'mcg');
  if (u === 'iu') return 'IU';
  if (u === 'ml') return 'mL';
  if (u === 'mcg') return 'mcg';
  if (u === 'g') return 'g';
  return 'mg';
}

function parseDoseToken(token) {
  const m = String(token || '').match(DOSE_RE);
  if (!m) return null;
  return { mg: m[1], mgUnit: normalizeUnit(m[2]) };
}

function parseKeyValue(raw) {
  const out = {};
  const pairs = String(raw).split(/[;|&\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const pair of pairs) {
    const kv = pair.split(/[:=]/);
    if (kv.length < 2) continue;
    const key = kv[0].trim().toLowerCase();
    const value = kv.slice(1).join(':').trim();
    if (!value) continue;
    if (['name', 'product', 'compound', 'peptide'].includes(key)) out.name = value;
    else if (['mg', 'amount', 'dose', 'qty', 'quantity'].includes(key)) {
      const dose = parseDoseToken(value) || { mg: value.replace(/[^\d.]/g, ''), mgUnit: 'mg' };
      if (dose.mg) {
        out.mg = dose.mg;
        out.mgUnit = dose.mgUnit;
      }
    } else if (['unit', 'mgunit', 'doseunit'].includes(key)) {
      out.mgUnit = normalizeUnit(value);
    } else if (['batch', 'lot', 'batchnumber', 'lotnumber'].includes(key)) {
      out.batchNumber = value;
    } else if (['vendor', 'supplier', 'brand', 'manufacturer'].includes(key)) {
      out.vendor = value;
    } else if (['purity'].includes(key)) {
      out.purity = value.replace(/%/g, '').trim();
    }
  }
  return out;
}

function parseDelimited(raw) {
  const parts = String(raw)
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const out = {};
  // First non-dose / non-labeled token is usually the name
  for (const part of parts) {
    const labeled = parseKeyValue(part);
    if (labeled.name || labeled.mg || labeled.batchNumber || labeled.vendor) {
      Object.assign(out, labeled);
      continue;
    }
    const dose = parseDoseToken(part);
    if (dose) {
      out.mg = dose.mg;
      out.mgUnit = dose.mgUnit;
      continue;
    }
    if (!out.name && /[A-Za-z]/.test(part) && !BATCH_RE.test(part)) {
      out.name = part;
    }
  }
  return Object.keys(out).length ? out : null;
}

function parseLabeledText(raw) {
  const out = {};
  const name = raw.match(NAME_LABEL_RE);
  if (name) out.name = name[1].trim();

  const dose = parseDoseToken(raw);
  if (dose) {
    out.mg = dose.mg;
    out.mgUnit = dose.mgUnit;
  }

  const batch = raw.match(BATCH_RE);
  if (batch) out.batchNumber = batch[1].trim();

  const vendor = raw.match(VENDOR_RE);
  if (vendor) out.vendor = vendor[1].trim();

  const purity = raw.match(/(?:purity|assay)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*%?/i);
  if (purity) out.purity = purity[1];

  if (!out.name) {
    const hint = raw.match(KNOWN_COMPOUND_HINT);
    if (hint && !/^(batch|lot|product|name|mg|iu)$/i.test(hint[1])) {
      out.name = hint[1];
    }
  }

  return Object.keys(out).length ? out : null;
}

/**
 * @param {string} rawDecoded
 * @returns {{ name?: string, mg?: string, mgUnit?: string, batchNumber?: string, vendor?: string, purity?: string, raw: string }}
 */
export function parseVialScan(rawDecoded) {
  const raw = String(rawDecoded || '').trim();
  if (!raw) return { raw: '' };

  // Try JSON payloads first
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    try {
      const json = JSON.parse(raw);
      const obj = Array.isArray(json) ? json[0] : json;
      if (obj && typeof obj === 'object') {
        const fromJson = parseKeyValue(
          Object.entries(obj)
            .map(([k, v]) => `${k}=${v}`)
            .join(';')
        );
        return { ...fromJson, raw };
      }
    } catch {
      /* fall through */
    }
  }

  const kv = parseKeyValue(raw);
  if (kv.name || (kv.mg && (kv.batchNumber || kv.vendor))) {
    return { ...kv, raw };
  }

  const delimited = parseDelimited(raw);
  if (delimited && (delimited.name || delimited.mg)) {
    return { ...delimited, ...kv, raw };
  }

  const labeled = parseLabeledText(raw);
  if (labeled && (labeled.name || labeled.mg || labeled.batchNumber)) {
    return { ...labeled, ...kv, raw };
  }

  // Fallback: treat entire string as batch / SKU
  return {
    batchNumber: raw.slice(0, 64),
    raw,
  };
}

/**
 * Map scan fields into protocol peptide dosage shape.
 * Vial barcodes usually encode vial size (e.g. 5mg); we still apply it as a starting dosage.
 */
export function scanFieldsToPeptidePatch(fields) {
  if (!fields) return {};
  const patch = {};
  if (fields.name) patch.name = fields.name;
  if (fields.mg) {
    patch.dosage = {
      amount: String(fields.mg),
      unit: fields.mgUnit === 'mg' || fields.mgUnit === 'mcg' || fields.mgUnit === 'IU' || fields.mgUnit === 'mL'
        ? fields.mgUnit
        : 'mg',
    };
  }
  return patch;
}

/**
 * Fuzzy-match a compound name against stockpile items.
 * @returns {{ matches: Array, exact: object|null }}
 */
export function matchStockpileByName(name, stockpile = []) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle || !Array.isArray(stockpile)) return { matches: [], exact: null };

  const matches = stockpile.filter((item) => {
    const n = String(item?.name || '').trim().toLowerCase();
    if (!n) return false;
    return n === needle || n.includes(needle) || needle.includes(n);
  });

  const exact = matches.find((item) => String(item.name || '').trim().toLowerCase() === needle) || null;
  return { matches, exact };
}

export default parseVialScan;
