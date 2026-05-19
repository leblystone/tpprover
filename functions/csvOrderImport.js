/**
 * Parse Squarespace orders CSV and import into physicalOrders.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const SUBSCRIPTION_SKUS = new Set([
  'app-monthly', 'app-annual', 'app-lifetime',
  'monthly-access', 'annual-access', 'lifetime-access',
]);

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const email = (request.auth.token.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Admin access required');
}

function parseCsvRow(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
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
    header.forEach((h, idx) => { row[h.trim()] = vals[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function parseMoneyToCents(str) {
  const n = parseFloat(String(str || '0').replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

function parseDate(str) {
  if (!str?.trim()) return null;
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
  return 'pending';
}

function buildLineItem(row) {
  const qty = parseInt(row['Lineitem quantity'], 10) || 1;
  const unit = parseMoneyToCents(row['Lineitem price']);
  return {
    name: row['Lineitem name'] || 'Item',
    sku: row['Lineitem sku'] || null,
    variant: row['Lineitem variant'] || null,
    quantity: qty,
    unitPriceCents: unit,
    amountTotal: unit * qty,
    requiresShipping: (row['Lineitem requires shipping'] || '').toLowerCase() === 'true',
    fulfillmentStatus: row['Lineitem fulfillment status'] || null,
  };
}

function isPhysicalLineItem(item) {
  if (item.requiresShipping) return true;
  const sku = (item.sku || '').toLowerCase();
  return sku && !SUBSCRIPTION_SKUS.has(sku);
}

function stripUndefined(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof admin.firestore.Timestamp || obj instanceof admin.firestore.FieldValue) return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = stripUndefined(v);
  }
  return out;
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
  const lineItems = rows.filter((r) => r['Lineitem name']).map(buildLineItem);
  const physicalItems = lineItems.filter(isPhysicalLineItem);
  const allDigital = lineItems.length > 0 && lineItems.every((i) => !i.requiresShipping);
  const subscriptionOnly = lineItems.length > 0 && lineItems.every((i) => {
    const sku = (i.sku || '').toLowerCase();
    return sku && SUBSCRIPTION_SKUS.has(sku);
  });

  const created = parseDate(headerRow['Created at']);
  const fulfilledAt = parseDate(headerRow['Fulfilled at']);
  const paidAt = parseDate(headerRow['Paid at']);

  return {
    allDigital,
    subscriptionOnly,
    physicalCount: physicalItems.length,
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
      shippingMethod: headerRow['Shipping Method'] || null,
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
      lineItemCount: lineItems.length,
      createdAt: created
        ? admin.firestore.Timestamp.fromDate(created)
        : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };
}

async function loadExistingDocIds(db, docIds) {
  const existing = new Set();
  const chunkSize = 100;
  for (let i = 0; i < docIds.length; i += chunkSize) {
    const chunk = docIds.slice(i, i + chunkSize);
    const refs = chunk.map((id) => db.collection('physicalOrders').doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => {
      if (snap.exists) existing.add(snap.id);
    });
  }
  return existing;
}

async function importFromCsvContent(csvContent, options = {}) {
  const {
    dryRun = false,
    includeDigital = false,
    includeSubscriptions = false,
    overwrite = false,
  } = options;

  const rows = parseCsv(csvContent);
  if (!rows.length) {
    throw new HttpsError('invalid-argument', 'CSV appears empty or has no data rows');
  }
  const groups = groupOrders(rows);
  const db = admin.firestore();
  const stats = { imported: 0, skipped: 0, skipReasons: {}, totalOrders: groups.size };

  const pending = [];
  for (const [orderId, orderRows] of groups) {
    const built = buildOrder(orderId, orderRows);
    let reason = null;
    if (built.subscriptionOnly && !includeSubscriptions) reason = 'subscription_only';
    else if (built.allDigital && !includeDigital) reason = 'digital_only';
    else if (!built.physicalCount && !includeDigital && !built.subscriptionOnly) reason = 'no_physical_items';

    if (reason) {
      stats.skipped++;
      stats.skipReasons[reason] = (stats.skipReasons[reason] || 0) + 1;
      continue;
    }

    pending.push({ docId: `squarespace_csv_${orderId}`, doc: built.doc });
  }

  let existingIds = new Set();
  if (!dryRun && !overwrite && pending.length > 0) {
    existingIds = await loadExistingDocIds(db, pending.map((p) => p.docId));
  }

  const batchSize = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const { docId, doc } of pending) {
    if (!dryRun) {
      if (!overwrite && existingIds.has(docId)) {
        stats.skipped++;
        stats.skipReasons.already_imported = (stats.skipReasons.already_imported || 0) + 1;
        continue;
      }
      batch.set(db.collection('physicalOrders').doc(docId), stripUndefined(doc), { merge: false });
      batchCount++;
      if (batchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    stats.imported++;
  }

  if (!dryRun && batchCount > 0) await batch.commit();
  return stats;
}

exports.importOrdersFromCsv = onCall(
  { cors: true, timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    requireAdmin(request);
    const { csvContent, dryRun, includeDigital, includeSubscriptions, overwrite } = request.data || {};
    if (!csvContent || typeof csvContent !== 'string') {
      throw new HttpsError('invalid-argument', 'csvContent string is required');
    }
    if (csvContent.length > 10 * 1024 * 1024) {
      throw new HttpsError('invalid-argument', 'CSV too large (max 10MB)');
    }
    try {
      const stats = await importFromCsvContent(csvContent, {
        dryRun: !!dryRun,
        includeDigital: !!includeDigital,
        includeSubscriptions: !!includeSubscriptions,
        overwrite: !!overwrite,
      });
      return { ok: true, ...stats };
    } catch (err) {
      logger.error('importOrdersFromCsv failed', err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err.message || 'CSV import failed');
    }
  },
);

module.exports.importFromCsvContent = importFromCsvContent;
module.exports.parseCsv = parseCsv;
