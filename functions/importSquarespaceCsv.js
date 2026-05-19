#!/usr/bin/env node
/**
 * One-time import: Squarespace orders CSV → Firestore physicalOrders
 *
 * Usage:
 *   cd functions
 *   node importSquarespaceCsv.js "C:\path\to\orders.csv"
 *   node importSquarespaceCsv.js "C:\path\to\orders.csv" --dry-run
 *   node importSquarespaceCsv.js "C:\path\to\orders.csv" --include-digital
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const SUBSCRIPTION_SKUS = new Set([
  'app-monthly', 'app-annual', 'app-lifetime',
  'monthly-access', 'annual-access', 'lifetime-access',
]);

let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
if (!projectId) {
  try {
    const rc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.firebaserc'), 'utf8'));
    projectId = rc.projects?.default;
  } catch { /* ignore */ }
}

if (!admin.apps.length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const sa = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    admin.initializeApp({ credential: admin.credential.cert(sa), projectId: projectId || sa.project_id });
  } else {
    admin.initializeApp(projectId ? { projectId } : {});
  }
}

const db = admin.firestore();

/** Parse one CSV row respecting quoted fields */
function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(content) {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const header = parseCsvRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCsvRow(lines[i]);
    const row = {};
    header.forEach((h, idx) => {
      row[h.trim()] = vals[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function parseMoneyToCents(str) {
  const n = parseFloat(String(str || '0').replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

function parseDate(str) {
  if (!str || !str.trim()) return null;
  const d = new Date(str.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function rowHasOrderHeader(row) {
  return !!(row.Email || row['Financial Status'] || row.Total);
}

function mapStatus(fulfillmentStatus, fulfilledAt) {
  const fs = (fulfillmentStatus || '').toUpperCase();
  if (fs === 'CANCELLED') return 'cancelled';
  if (fs === 'FULFILLED') return fulfilledAt ? 'shipped' : 'delivered';
  if (fs === 'PENDING' || fs === 'pending') return 'pending';
  return 'pending';
}

function buildLineItem(row) {
  return {
    name: row['Lineitem name'] || 'Item',
    sku: row['Lineitem sku'] || null,
    variant: row['Lineitem variant'] || null,
    quantity: parseInt(row['Lineitem quantity'], 10) || 1,
    unitPriceCents: parseMoneyToCents(row['Lineitem price']),
    amountTotal: parseMoneyToCents(row['Lineitem price']) * (parseInt(row['Lineitem quantity'], 10) || 1),
    requiresShipping: (row['Lineitem requires shipping'] || '').toLowerCase() === 'true',
    fulfillmentStatus: row['Lineitem fulfillment status'] || null,
  };
}

function isPhysicalLineItem(item) {
  if (item.requiresShipping) return true;
  const sku = (item.sku || '').toLowerCase();
  if (sku && !SUBSCRIPTION_SKUS.has(sku)) return true;
  return false;
}

function groupOrders(rows) {
  const groups = new Map();
  for (const row of rows) {
    const id = row['Order ID']?.trim();
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return groups;
}

function buildOrder(orderId, rows) {
  const headerRow = rows.find(rowHasOrderHeader) || rows[0];
  const lineItems = rows
    .filter((r) => r['Lineitem name'])
    .map(buildLineItem);

  const shippingMethod = headerRow['Shipping Method'] || '';
  const allDigital = lineItems.length > 0 && lineItems.every((i) => !i.requiresShipping);
  const subscriptionOnly = lineItems.length > 0 && lineItems.every((i) => {
    const sku = (i.sku || '').toLowerCase();
    return sku && SUBSCRIPTION_SKUS.has(sku);
  });

  const physicalItems = lineItems.filter(isPhysicalLineItem);

  const created = parseDate(headerRow['Created at']);
  const fulfilledAt = parseDate(headerRow['Fulfilled at']);
  const paidAt = parseDate(headerRow['Paid at']);

  return {
    meta: { allDigital, subscriptionOnly, physicalCount: physicalItems.length },
    doc: {
      sessionId: `squarespace_csv_${orderId}`,
      source: 'squarespace',
      status: mapStatus(headerRow['Fulfillment Status'], fulfilledAt),
      customerEmail: headerRow.Email?.trim() || null,
      customerName: headerRow['Shipping Name'] || headerRow['Billing Name'] || null,
      customerPhone: headerRow['Shipping Phone'] || headerRow['Billing Phone'] || null,
      shippingName: headerRow['Shipping Name'] || headerRow['Billing Name'] || null,
      shippingAddress: headerRow['Shipping Address1'] ? {
        line1: headerRow['Shipping Address1'] || '',
        line2: headerRow['Shipping Address2'] || '',
        city: headerRow['Shipping City'] || '',
        state: headerRow['Shipping Province'] || '',
        postal_code: headerRow['Shipping Zip'] || '',
        country: headerRow['Shipping Country'] || 'US',
      } : null,
      billingAddress: headerRow['Billing Address1'] ? {
        line1: headerRow['Billing Address1'] || '',
        line2: headerRow['Billing Address2'] || '',
        city: headerRow['Billing City'] || '',
        state: headerRow['Billing Province'] || '',
        postal_code: headerRow['Billing Zip'] || '',
        country: headerRow['Billing Country'] || 'US',
      } : null,
      items: (physicalItems.length ? physicalItems : lineItems).map((i) => ({
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        amountTotal: i.amountTotal,
      })),
      amountTotal: parseMoneyToCents(headerRow.Total),
      subtotalCents: parseMoneyToCents(headerRow.Subtotal),
      shippingCents: parseMoneyToCents(headerRow.Shipping),
      taxCents: parseMoneyToCents(headerRow.Taxes),
      discountCents: parseMoneyToCents(headerRow['Discount Amount']),
      currency: (headerRow.Currency || 'usd').toLowerCase(),
      financialStatus: headerRow['Financial Status'] || null,
      fulfillmentStatus: headerRow['Fulfillment Status'] || null,
      shippingMethod,
      squarespaceOrderId: orderId,
      squarespaceOrderNumber: headerRow['Channel Order Number'] || orderId,
      paymentMethod: headerRow['Payment Method'] || null,
      paymentReference: headerRow['Payment Reference'] || null,
      privateNotes: headerRow['Private Notes'] || null,
      discountCode: headerRow['Discount Code'] || null,
      channelType: headerRow['Channel Type'] || null,
      channelName: headerRow['Channel Name'] || null,
      paidAt: paidAt ? admin.firestore.Timestamp.fromDate(paidAt) : null,
      fulfilledAt: fulfilledAt ? admin.firestore.Timestamp.fromDate(fulfilledAt) : null,
      cancelledAt: parseDate(headerRow['Cancelled at'])
        ? admin.firestore.Timestamp.fromDate(parseDate(headerRow['Cancelled at']))
        : null,
      isImported: true,
      importSource: 'squarespace_csv',
      csvRows: rows,
      createdAt: created
        ? admin.firestore.Timestamp.fromDate(created)
        : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const includeDigital = args.includes('--include-digital');
  const includeSubscriptions = args.includes('--include-subscriptions');

  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('Usage: node importSquarespaceCsv.js <path-to-orders.csv> [--dry-run] [--include-digital] [--include-subscriptions]');
    process.exit(1);
  }

  console.log(`Reading ${csvPath}...`);
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  const groups = groupOrders(rows);
  console.log(`Found ${groups.size} unique orders in CSV`);

  const stats = { imported: 0, skipped: 0, reasons: {} };

  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const [orderId, orderRows] of groups) {
    const { meta, doc } = buildOrder(orderId, orderRows);
    let reason = null;

    if (meta.subscriptionOnly && !includeSubscriptions) reason = 'subscription_only';
    else if (meta.allDigital && !includeDigital) reason = 'digital_only';
    else if (!meta.physicalCount && !includeDigital && !meta.subscriptionOnly) reason = 'no_physical_items';

    if (reason) {
      stats.skipped++;
      stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
      continue;
    }

    const docId = `squarespace_csv_${orderId}`;
    if (!dryRun) {
      batch.set(db.collection('physicalOrders').doc(docId), doc, { merge: false });
      batchCount++;
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
        process.stdout.write('.');
      }
    }
    stats.imported++;
  }

  if (!dryRun && batchCount > 0) {
    await batch.commit();
  }

  console.log('\n\nDone.');
  console.log(`  Imported: ${stats.imported}${dryRun ? ' (dry run)' : ''}`);
  console.log(`  Skipped:  ${stats.skipped}`);
  console.log('  Skip reasons:', stats.reasons);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
