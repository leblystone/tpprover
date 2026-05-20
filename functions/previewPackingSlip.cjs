/**
 * Local packing slip preview — no deploy required.
 *
 * Usage (from repo root or functions/):
 *   node functions/previewPackingSlip.cjs
 *   node functions/previewPackingSlip.cjs --open
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { buildPackingSlipHtml } = require('./shippingLabels');

const sampleOrder = {
  squarespaceOrderNumber: '833',
  customerName: 'John Crabtree',
  shippingName: 'John Crabtree',
  customerPhone: '(555) 123-4567',
  shippingMethod: 'Standard shipping',
  shippingAddress: {
    line1: '214 Hlavek Rd',
    city: 'Decatur',
    state: 'TX',
    zip: '76234',
    country: 'US',
  },
  billingAddress: {
    line1: '214 Hlavek Rd',
    city: 'Decatur',
    state: 'TX',
    zip: '76234',
    country: 'US',
  },
  items: [
    { name: 'Midnight Pep Planner', sku: 'MPP-MID-001', quantity: 1 },
    { name: 'Rose Gold Pen Set', sku: 'PEN-RG-2', quantity: 2 },
  ],
  giftMessage: 'Please gift wrap',
  trackingNumber: '',
};

const outPath = path.join(__dirname, 'packing-slip-preview.html');
const html = buildPackingSlipHtml(sampleOrder, 'preview-order-id');
fs.writeFileSync(outPath, html, 'utf8');

console.log(`Wrote ${outPath}`);
console.log('Open in your browser, then use Print Preview (Ctrl+P) with paper size 4×6.');

if (process.argv.includes('--open')) {
  const fileUrl = `file:///${outPath.replace(/\\/g, '/')}`;
  if (process.platform === 'win32') {
    execSync(`start "" "${outPath}"`, { stdio: 'ignore', shell: true });
  } else if (process.platform === 'darwin') {
    execSync(`open "${outPath}"`);
  } else {
    execSync(`xdg-open "${outPath}"`);
  }
  console.log(fileUrl);
}
