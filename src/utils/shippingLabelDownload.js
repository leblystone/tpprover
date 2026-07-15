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

export async function downloadLabelPdf(labelUrl, trackingNumber) {
  if (!labelUrl) return false;
  const filename = `shipping-label-${trackingNumber || Date.now()}.pdf`;
  try {
    const res = await fetch(labelUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
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

export function openLabelAndPackingSlipPrint({ labelUrl, packingSlipHtml }) {
  const slipBody = extractSlipBody(packingSlipHtml);
  const isPdf = labelUrl && /\.pdf(\?|$)/i.test(labelUrl);
  const labelPage = labelUrl
    ? `<div class="label-page">${
      isPdf
        ? `<embed src="${labelUrl}" type="application/pdf" width="384" height="576" />`
        : `<img src="${labelUrl}" alt="Shipping label" />`
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
 * After EasyPost label purchase: download 4×6 PDF label and open combined print view.
 */
export async function fulfillShippingLabelDownload({
  labelUrl,
  labelPdfUrl,
  packingSlipHtml,
  trackingNumber,
}) {
  const pdfUrl = labelPdfUrl || labelUrl;
  await downloadLabelPdf(pdfUrl, trackingNumber);
  if (packingSlipHtml) {
    openLabelAndPackingSlipPrint({ labelUrl: pdfUrl, packingSlipHtml });
  } else if (pdfUrl) {
    window.open(pdfUrl, '_blank', 'noopener,noreferrer');
  }
}

export function formatLabelPurchaseConfirmation(data) {
  const parts = ['Label purchased via EasyPost'];
  if (data.carrier) parts.push(data.carrier);
  if (data.trackingNumber) parts.push(`tracking ${data.trackingNumber}`);
  if (data.labelCost != null) parts.push(`$${Number(data.labelCost).toFixed(2)}`);
  parts.push('4×6 PDF downloading…');
  return parts.join(' · ');
}
