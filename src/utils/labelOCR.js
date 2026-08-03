/**
 * Label / document OCR helpers — Google Lens-style text extraction from images.
 * Uses Tesseract.js in the browser (no barcode/QR dependency).
 */

import { parseVialScan } from './vialScanParser';

/**
 * Extract structured stockpile/protocol fields from free OCR text.
 */
export function parseLabelText(text) {
  const raw = String(text || '').replace(/\r/g, '\n').trim();
  if (!raw) return null;

  const collapsed = raw.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n');
  const oneLine = collapsed.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  // Prefer rich labeled extraction, fall back to vial scan heuristics
  const base = parseVialScan(oneLine);

  const name =
    oneLine.match(/(?:product|compound|peptide|sample|material)\s*(?:name)?\s*[:=\-]?\s*([A-Za-z][\w\-./+]{1,48})/i)?.[1] ||
    // First meaningful line that looks like a compound (BPC-157, Tirzepatide, etc.)
    collapsed
      .split('\n')
      .map((l) => l.trim())
      .find((l) => /^[A-Za-z][\w\-./+]{1,40}$/.test(l) && !/^(lot|batch|purity|mg|ml|iu|coa|certificate)$/i.test(l)) ||
    base.name;

  const doseMatch = oneLine.match(/(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|iu|ml|mL|g)\b/i);
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
    oneLine.match(/(?:purity|assay|HPLC\s*purity)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*%?/i)?.[1] ||
    oneLine.match(/(\d{2}(?:\.\d+)?)\s*%\s*(?:purity|by\s*HPLC)?/i)?.[1] ||
    base.purity;

  const batchNumber =
    oneLine.match(/(?:lot|batch)\s*(?:no\.?|number|#)?\s*[:=\-]?\s*([A-Za-z0-9\-_./]{3,40})/i)?.[1] ||
    base.batchNumber;

  const vendor =
    oneLine.match(/(?:manufactured\s*by|supplier|vendor|laboratory|lab|brand)\s*[:=\-]?\s*([A-Za-z][\w\s.&'-]{1,48})/i)?.[1]?.trim() ||
    base.vendor;

  const fields = { rawText: raw.slice(0, 800), source: 'ocr' };
  if (name) fields.name = String(name).trim();
  if (mg) fields.mg = String(mg);
  if (mgUnit) fields.mgUnit = mgUnit;
  if (purity) fields.purity = String(purity).replace(/%/g, '').trim();
  if (batchNumber && !/^batch$/i.test(batchNumber)) fields.batchNumber = batchNumber.trim();
  if (vendor) fields.vendor = vendor.trim();

  if (!fields.name && !fields.mg && !fields.purity && !fields.batchNumber) {
    return { ...fields, empty: true };
  }
  return fields;
}

let workerPromise = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        // Keep logs quiet in production
        logger: () => {},
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Run OCR on a File, Blob, HTMLCanvasElement, or image URL/dataURL.
 * @returns {Promise<{ text: string, fields: object|null }>}
 */
export async function recognizeLabelImage(source) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(source);
  const text = (data?.text || '').trim();
  const fields = parseLabelText(text);
  return { text, fields };
}

/**
 * Capture the current video frame to a canvas (optionally crop to center viewfinder).
 */
export function captureVideoFrame(video, { cropCenter = true } = {}) {
  if (!video || !video.videoWidth) {
    throw new Error('Camera frame not ready yet');
  }
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (cropCenter) {
    // Match the ~72% square viewfinder used in the UI
    const side = Math.min(vw, vh) * 0.72;
    sx = (vw - side) / 2;
    sy = (vh - side) / 2;
    sw = side;
    sh = side;
  }

  const canvas = document.createElement('canvas');
  // Upscale a bit for OCR when the crop is small
  const out = Math.max(640, Math.round(sw));
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, out, out);

  // Mild contrast boost helps Tesseract on glossy vial labels
  try {
    const img = ctx.getImageData(0, 0, out, out);
    const d = img.data;
    const contrast = 1.25;
    const intercept = 128 * (1 - contrast);
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, d[i] * contrast + intercept));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * contrast + intercept));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * contrast + intercept));
    }
    ctx.putImageData(img, 0, 0);
  } catch {
    /* ignore processing errors */
  }

  return canvas;
}

export default recognizeLabelImage;
