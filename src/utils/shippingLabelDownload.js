import { jsPDF } from 'jspdf';

function extractSlipBody(html) {
  if (!html) return '';
  const slipMatch = html.match(/<div class="slip">[\s\S]*<\/footer>\s*<\/div>/i);
  if (slipMatch) return slipMatch[0];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1].replace(/<div class="no-print"[\s\S]*/i, '').trim();
  }
  return html;
}

const PRINT_STYLES = `
  @page { size: 4in 6in; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
  .label-page { width: 4in; height: 6in; display: flex; align-items: center; justify-content: center; page-break-after: always; overflow: hidden; }
  .label-page img, .label-page embed, .label-page object { width: 4in; height: 6in; object-fit: contain; }
  .slip { width: 4in; height: 6in; padding: 0.12in 0.14in 0.1in; display: flex; flex-direction: column; page-break-after: always; }
  .slip:last-child { page-break-after: auto; }
  .logo-wrap { text-align: center; margin-bottom: 4px; }
  .logo { width: 0.78in; height: 0.78in; object-fit: contain; }
  .title-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 4px; }
  .doc-date { font-size: 9px; font-weight: 400; }
  .rule { border: none; border-top: 1px solid #111; margin-bottom: 5px; }
  .cols-3 { display: grid; grid-template-columns: 1fr 1fr 0.85fr; gap: 4px; margin-bottom: 6px; }
  .col-head { font-size: 8px; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
  .addr-line { font-size: 8.5px; line-height: 1.35; }
  .addr-line:first-of-type { font-weight: 700; }
  .meta-row { display: flex; justify-content: space-between; font-size: 8px; line-height: 1.35; }
  .meta-val { font-weight: 700; text-align: right; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  .items-table th { font-size: 8px; text-transform: uppercase; border-bottom: 1px solid #111; text-align: left; }
  .items-table th:last-child { text-align: right; width: 26px; }
  .items-table td { font-size: 9px; padding: 4px 0; border-bottom: 1px dotted #bbb; vertical-align: top; }
  .item-title { font-weight: 700; font-size: 9px; }
  .item-sub { font-size: 7.5px; color: #555; }
  .item-qty { text-align: right; font-weight: 700; font-size: 9px; }
  .notes-label { font-size: 8px; font-weight: 700; }
  .notes-body { font-size: 8.5px; line-height: 1.35; }
  .footer { margin-top: auto; text-align: center; padding-top: 4px; }
  .footer-thanks { font-size: 13px; font-weight: 800; }
  .footer-brand { font-size: 9px; font-weight: 700; }
  .footer-line { font-size: 8px; color: #444; }
  .footer-url { font-size: 8px; color: #666; margin-top: 2px; }
`;

function extensionForContentType(contentType, url) {
  if (contentType && /pdf/i.test(contentType)) return 'pdf';
  if (contentType && /png/i.test(contentType)) return 'png';
  if (url && /\.pdf(\?|$)/i.test(url)) return 'pdf';
  if (url && /\.png(\?|$)/i.test(url)) return 'png';
  return 'pdf';
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function base64ToBlob(base64, contentType = 'application/pdf') {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType || 'application/pdf' });
}

function htmlToPlainLines(html) {
  if (!html || typeof document === 'undefined') return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, button, .no-print').forEach((el) => el.remove());
    const text = (doc.body?.innerText || doc.documentElement?.innerText || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\r/g, '');
    return text
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function downloadLabelPdf(labelUrl, trackingNumber, options = {}) {
  const { labelPdfBase64, labelContentType } = options;
  const ext = extensionForContentType(labelContentType, labelUrl);
  const filename = `shipping-label-${trackingNumber || Date.now()}.${ext}`;

  if (labelPdfBase64) {
    try {
      triggerBlobDownload(base64ToBlob(labelPdfBase64, labelContentType || 'application/pdf'), filename);
      return true;
    } catch (err) {
      console.warn('Base64 label download failed, falling back to URL', err);
    }
  }

  if (!labelUrl) return false;

  try {
    const res = await fetch(labelUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    triggerBlobDownload(blob, filename);
    return true;
  } catch {
    // Cross-origin EasyPost S3 URLs often block fetch; open/download attribute as last resort
    const anchor = document.createElement('a');
    anchor.href = labelUrl;
    anchor.download = filename;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return true;
  }
}

export function downloadPackingSlipHtml(packingSlipHtml, trackingNumber) {
  if (!packingSlipHtml) return false;
  const blob = new Blob([packingSlipHtml], { type: 'text/html;charset=utf-8' });
  triggerBlobDownload(blob, `packing-slip-${trackingNumber || Date.now()}.html`);
  return true;
}

/**
 * Build a 4×6 packing-slip PDF from the HTML slip (text extraction).
 * Returns true when a PDF download was triggered.
 */
export function downloadPackingSlipPdf(packingSlipHtml, trackingNumber) {
  if (!packingSlipHtml) return false;
  try {
    const lines = htmlToPlainLines(packingSlipHtml);
    if (!lines.length) return false;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [4, 6],
    });

    const left = 0.18;
    const right = 3.82;
    const maxWidth = right - left;
    let y = 0.28;
    const lineHeight = 0.16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Packing Slip', left, y);
    y += 0.22;
    doc.setDrawColor(20);
    doc.setLineWidth(0.01);
    doc.line(left, y, right, y);
    y += 0.18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    for (const raw of lines) {
      if (y > 5.7) break;
      const wrapped = doc.splitTextToSize(raw, maxWidth);
      for (const part of wrapped) {
        if (y > 5.7) break;
        const isHeader = /^(ship to|bill to|items|qty|tracking|notes|order)/i.test(part)
          || part === part.toUpperCase() && part.length < 24;
        doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
        doc.setFontSize(isHeader ? 8 : 8.5);
        doc.text(part, left, y);
        y += lineHeight;
      }
    }

    doc.save(`packing-slip-${trackingNumber || Date.now()}.pdf`);
    return true;
  } catch (err) {
    console.warn('Packing slip PDF generation failed', err);
    return false;
  }
}

export function openLabelAndPackingSlipPrint({ labelUrl, packingSlipHtml, labelPdfBase64, labelContentType }) {
  const slipBody = extractSlipBody(packingSlipHtml);
  let embedSrc = labelUrl || '';
  if (labelPdfBase64) {
    const type = labelContentType || 'application/pdf';
    embedSrc = `data:${type};base64,${labelPdfBase64}`;
  }
  const isPdf = embedSrc
    && (/pdf/i.test(labelContentType || '') || /\.pdf(\?|$)/i.test(labelUrl || '') || embedSrc.startsWith('data:application/pdf'));
  const labelPage = embedSrc
    ? `<div class="label-page">${
      isPdf
        ? `<embed src="${embedSrc}" type="application/pdf" width="384" height="576" />`
        : `<img src="${embedSrc}" alt="Shipping label" />`
    }</div>`
    : '';

  const win = window.open('', '_blank');
  if (!win) return false;

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Label &amp; Packing Slip</title><style>${PRINT_STYLES}</style></head><body>${labelPage}${slipBody}</body></html>`);
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      /* popup blocked or print unavailable */
    }
  }, 600);
  return true;
}

/**
 * After EasyPost label purchase: download 4×6 PDF label + packing slip PDF, open combined print view.
 * Never throws — purchase confirmation should still fire if download is blocked.
 */
export async function fulfillShippingLabelDownload({
  labelUrl,
  labelPdfUrl,
  labelPdfBase64,
  labelContentType,
  packingSlipHtml,
  trackingNumber,
}) {
  const pdfUrl = labelPdfUrl || labelUrl;
  let downloaded = false;
  let slipDownloaded = false;

  try {
    downloaded = await downloadLabelPdf(pdfUrl, trackingNumber, {
      labelPdfBase64,
      labelContentType,
    });
  } catch (err) {
    console.warn('Label PDF download failed', err);
  }

  if (packingSlipHtml) {
    try {
      slipDownloaded = downloadPackingSlipPdf(packingSlipHtml, trackingNumber);
      if (!slipDownloaded) downloadPackingSlipHtml(packingSlipHtml, trackingNumber);
    } catch (err) {
      console.warn('Packing slip download failed', err);
      try {
        downloadPackingSlipHtml(packingSlipHtml, trackingNumber);
      } catch {
        /* ignore */
      }
    }
    try {
      openLabelAndPackingSlipPrint({
        labelUrl: pdfUrl,
        packingSlipHtml,
        labelPdfBase64,
        labelContentType,
      });
    } catch (err) {
      console.warn('Label/slip print window failed', err);
    }
  } else if (!downloaded && pdfUrl) {
    try {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    } catch {
      /* ignore */
    }
  }

  return Boolean(downloaded || slipDownloaded || packingSlipHtml);
}

export function formatLabelPurchaseConfirmation(data) {
  if (data?.message) return data.message;
  const parts = ['Label purchased via EasyPost'];
  if (data.carrier) parts.push(data.carrier);
  if (data.trackingNumber) parts.push(`tracking ${data.trackingNumber}`);
  if (data.labelCost != null) parts.push(`$${Number(data.labelCost).toFixed(2)}`);
  parts.push(data.labelPdfBase64 || data.labelPdfUrl || data.labelUrl ? '4×6 PDF downloading…' : 'saved');
  return parts.join(' · ');
}
