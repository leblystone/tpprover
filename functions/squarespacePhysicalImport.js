/**
 * Import Squarespace commerce orders into physicalOrders.
 * Preserves full order payload + tracking. Only skips true app-subscription orders (6 known SKUs).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

/** Exact Squarespace SKUs for digital app access only — user has ~3 of these total */
const SUBSCRIPTION_SKUS = new Set([
  'app-monthly', 'app-annual', 'app-lifetime',
  'monthly-access', 'annual-access', 'lifetime-access',
]);

const IMPORT_START = new Date('2015-01-01T00:00:00.000Z');
const WINDOW_DAYS = 90;

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const email = (request.auth.token.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Admin access required');
  return email;
}

function getApiKey() {
  const key = process.env.SQUARESPACE_API_KEY?.trim().replace(/\r?\n/g, '').replace(/\s+/g, '');
  if (!key) throw new HttpsError('failed-precondition', 'SQUARESPACE_API_KEY not configured in Cloud Functions');
  return key;
}

function squarespaceGet(apiKey, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.squarespace.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'ThePepPlanner/1.0',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`Squarespace HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchOrdersPage(apiKey, modifiedAfter, modifiedBefore, cursor) {
  let path = `/1.0/commerce/orders?limit=50&modifiedAfter=${encodeURIComponent(modifiedAfter)}&modifiedBefore=${encodeURIComponent(modifiedBefore)}`;
  if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;
  return squarespaceGet(apiKey, path);
}

async function fetchOrderDetails(apiKey, orderId) {
  return squarespaceGet(apiKey, `/1.0/commerce/orders/${orderId}`);
}

function getLineItems(order) {
  return order.lineItems || order.items || order.orderItems || [];
}

function getItemSku(item) {
  return (item.sku || item.variantSku || '').toString().toLowerCase().trim();
}

/** Skip only when every line has a known app subscription SKU (not productId) */
function isAppSubscriptionOnlyOrder(lineItems) {
  const items = lineItems || [];
  if (!items.length) return false;
  return items.every((item) => {
    const sku = getItemSku(item);
    return sku && SUBSCRIPTION_SKUS.has(sku);
  });
}

function parseMoneyToCents(value) {
  if (value == null || value === '') return 0;
  const n = typeof value === 'object' && value.value != null ? Number(value.value) : Number(value);
  if (Number.isNaN(n)) return 0;
  if (Number.isInteger(n) && n >= 10000) return n;
  return Math.round(n * 100);
}

function mapAddress(addr) {
  if (!addr) return null;
  return {
    line1: addr.address1 || addr.line1 || '',
    line2: addr.address2 || addr.line2 || '',
    city: addr.city || '',
    state: addr.state || addr.region || '',
    postal_code: addr.postalCode || addr.zip || '',
    country: addr.countryCode || addr.country || 'US',
    phone: addr.phone || null,
    firstName: addr.firstName || null,
    lastName: addr.lastName || null,
  };
}

function mapFulfillments(order) {
  const raw = order.fulfillments || [];
  return raw.map((f) => ({
    id: f.id || null,
    status: f.status || null,
    shipDate: f.shipDate || f.shippedOn || null,
    carrierName: f.carrierName || f.carrier || null,
    service: f.service || f.serviceLevel || null,
    trackingNumber: f.trackingNumber || f.tracking_number || null,
    trackingUrl: f.trackingUrl || f.tracking_url || null,
    shipTo: mapAddress(f.shipTo || f.shippingAddress),
  }));
}

function deriveOrderStatus(order, fulfillments) {
  const fs = (order.fulfillmentStatus || '').toUpperCase();
  const hasTracking = fulfillments.some((f) => f.trackingNumber);
  if (fs === 'FULFILLED' || fs === 'COMPLETED') {
    return hasTracking ? 'shipped' : 'delivered';
  }
  if (fs === 'IN_PROGRESS' || fs === 'PENDING') return 'pending';
  if (hasTracking) return 'shipped';
  return 'pending';
}

function squarespaceOrderToPhysical(order) {
  const lineItems = getLineItems(order);
  const fulfillments = mapFulfillments(order);

  const email = order.customerEmail
    || order.customer?.email
    || order.billingAddress?.email
    || null;

  const customerName = order.customerName
    || order.customer?.fullName
    || [order.billingAddress?.firstName, order.billingAddress?.lastName].filter(Boolean).join(' ')
    || null;

  const shippingAddress = mapAddress(
    order.shippingAddress
    || order.shipTo
    || fulfillments.find((f) => f.shipTo)?.shipTo
    || order.billingAddress,
  );

  const primaryFulfillment = fulfillments.find((f) => f.trackingNumber) || fulfillments[0];

  const items = lineItems.map((item) => {
    const unitCents = parseMoneyToCents(item.unitPricePaid?.value ?? item.unitPricePaid ?? item.price ?? item.basePrice);
    const qty = item.quantity || 1;
    return {
      name: item.productName || item.name || item.title || 'Item',
      sku: item.sku || item.variantSku || null,
      productId: item.productId || null,
      variantId: item.variantId || null,
      quantity: qty,
      amountTotal: unitCents * qty,
      unitPriceCents: unitCents,
      lineItemId: item.id || null,
    };
  });

  const totals = order.totals || {};
  const amountTotal = parseMoneyToCents(totals.total?.value ?? totals.total ?? order.grandTotal)
    || items.reduce((s, i) => s + i.amountTotal, 0);

  const createdOn = order.createdOn || order.createdAt || order.createdDate;
  const createdAt = createdOn
    ? admin.firestore.Timestamp.fromDate(new Date(createdOn))
    : admin.firestore.FieldValue.serverTimestamp();

  const subscriptionOnly = isAppSubscriptionOnlyOrder(lineItems);

  return {
    sessionId: `squarespace_${order.id}`,
    source: 'squarespace',
    status: deriveOrderStatus(order, fulfillments),
    customerEmail: email,
    customerName,
    customerPhone: order.billingAddress?.phone || shippingAddress?.phone || null,
    shippingAddress: shippingAddress ? {
      line1: shippingAddress.line1,
      line2: shippingAddress.line2,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postal_code,
      country: shippingAddress.country,
    } : null,
    shippingName: shippingAddress
      ? [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(' ') || customerName
      : customerName,
    billingAddress: mapAddress(order.billingAddress),
    items,
    amountTotal,
    subtotalCents: parseMoneyToCents(totals.subtotal?.value ?? totals.subtotal),
    shippingCents: parseMoneyToCents(totals.shipping?.value ?? totals.shipping ?? totals.shippingTotal),
    taxCents: parseMoneyToCents(totals.tax?.value ?? totals.tax ?? totals.taxTotal),
    discountCents: parseMoneyToCents(totals.discount?.value ?? totals.discount),
    currency: (totals.currency || order.currency || 'usd').toLowerCase(),
    hasPhysicalItems: !subscriptionOnly,
    isSubscription: subscriptionOnly,
    squarespaceOrderId: order.id,
    squarespaceOrderNumber: order.orderNumber || order.referenceNumber || null,
    squarespaceChannel: order.channel || order.source || null,
    squarespaceFulfillmentStatus: order.fulfillmentStatus || null,
    squarespaceFinancialStatus: order.financialStatus || order.paymentStatus || null,
    fulfillments,
    trackingNumber: primaryFulfillment?.trackingNumber || null,
    trackingUrl: primaryFulfillment?.trackingUrl || null,
    labelCarrier: primaryFulfillment?.carrierName || null,
    labelService: primaryFulfillment?.service || null,
    shippedAt: primaryFulfillment?.shipDate || null,
    customerNotes: order.customerMessage || order.notes || null,
    internalNotes: order.internalNotes || null,
    isImported: true,
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
    squarespaceRaw: order,
    createdAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function importOneOrder(db, apiKey, orderSummary, dryRun, skipSubscriptionOnly, forceReimport) {
  const docId = `squarespace_${orderSummary.id}`;
  const existing = await db.collection('physicalOrders').doc(docId).get();
  if (existing.exists && !forceReimport) {
    return { status: 'skipped', reason: 'already_imported', orderId: orderSummary.id };
  }

  const order = await fetchOrderDetails(apiKey, orderSummary.id);
  const lineItems = getLineItems(order);

  if (!lineItems.length) {
    return { status: 'skipped', reason: 'no_line_items', orderId: orderSummary.id };
  }

  if (skipSubscriptionOnly && isAppSubscriptionOnlyOrder(lineItems)) {
    return {
      status: 'skipped',
      reason: 'app_subscription_only',
      orderId: orderSummary.id,
      skus: lineItems.map((i) => getItemSku(i) || '(no sku)').join(', '),
    };
  }

  const physical = squarespaceOrderToPhysical(order);

  if (!dryRun) {
    await db.collection('physicalOrders').doc(docId).set(physical, { merge: false });
  }

  return {
    status: 'imported',
    orderId: orderSummary.id,
    docId,
    orderNumber: physical.squarespaceOrderNumber,
    amountTotal: physical.amountTotal,
    trackingNumber: physical.trackingNumber,
    isSubscription: physical.isSubscription,
  };
}

exports.importSquarespacePhysicalOrders = onCall(
  { cors: true, timeoutSeconds: 540, secrets: ['SQUARESPACE_API_KEY'] },
  async (request) => {
    requireAdmin(request);
    const apiKey = getApiKey();
    const db = admin.firestore();

    const {
      windowEnd: windowEndInput,
      dryRun = false,
      maxOrders = 50,
      skipSubscriptionOnly = true,
      forceReimport = false,
    } = request.data || {};

    const stateRef = db.doc('_config/squarespacePhysicalImport');
    const stateSnap = await stateRef.get();
    const state = stateSnap.exists ? stateSnap.data() : {};

    let windowEnd = windowEndInput ? new Date(windowEndInput) : (state.windowEnd ? state.windowEnd.toDate() : new Date());
    let windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS);

    if (windowStart < IMPORT_START) {
      windowStart = new Date(IMPORT_START);
    }

    const modifiedAfter = windowStart.toISOString();
    const modifiedBefore = windowEnd.toISOString();

    logger.info(`Squarespace import window: ${modifiedAfter} → ${modifiedBefore}`);

    let cursor = state.cursor || null;
    const results = { imported: 0, skipped: 0, errors: 0, skipReasons: {}, details: [] };
    let processed = 0;

    const tallySkip = (reason) => {
      results.skipped += 1;
      results.skipReasons[reason] = (results.skipReasons[reason] || 0) + 1;
    };

    while (processed < maxOrders) {
      const page = await fetchOrdersPage(apiKey, modifiedAfter, modifiedBefore, cursor);
      const orders = page.result || [];

      if (!orders.length && !page.pagination?.nextPageCursor) {
        const nextEnd = new Date(windowStart);
        if (nextEnd <= IMPORT_START) {
          await stateRef.set({
            done: true,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastStats: results,
          }, { merge: true });
          return {
            done: true,
            message: 'Import complete — all historical windows processed',
            window: { modifiedAfter, modifiedBefore },
            ...results,
          };
        }

        await stateRef.set({
          windowEnd: admin.firestore.Timestamp.fromDate(nextEnd),
          cursor: null,
          done: false,
        }, { merge: true });

        return {
          done: false,
          message: 'Window complete — call again to continue with earlier dates',
          nextWindowEnd: nextEnd.toISOString(),
          ...results,
        };
      }

      for (const summary of orders) {
        if (processed >= maxOrders) break;
        try {
          const r = await importOneOrder(db, apiKey, summary, dryRun, skipSubscriptionOnly, forceReimport);
          results.details.push(r);
          if (r.status === 'imported') results.imported += 1;
          else if (r.status === 'skipped') tallySkip(r.reason || 'unknown');
        } catch (err) {
          results.errors += 1;
          results.skipReasons.error = (results.skipReasons.error || 0) + 1;
          results.details.push({ status: 'error', orderId: summary.id, error: err.message });
          logger.error(`Import failed for ${summary.id}:`, err);
        }
        processed += 1;
        await new Promise((r) => setTimeout(r, 150));
      }

      cursor = page.pagination?.nextPageCursor || null;
      if (!cursor) break;
    }

    await stateRef.set({
      windowEnd: admin.firestore.Timestamp.fromDate(windowEnd),
      windowStart: admin.firestore.Timestamp.fromDate(windowStart),
      cursor,
      done: false,
      lastRun: admin.firestore.FieldValue.serverTimestamp(),
      lastStats: results,
    }, { merge: true });

    return {
      done: false,
      dryRun,
      window: { modifiedAfter, modifiedBefore },
      hasMoreInWindow: !!cursor,
      ...results,
    };
  },
);

exports.resetSquarespaceImport = onCall(
  { cors: true, secrets: ['SQUARESPACE_API_KEY'] },
  async (request) => {
    requireAdmin(request);
    await admin.firestore().doc('_config/squarespacePhysicalImport').delete();
    return { ok: true, message: 'Import state reset — next run starts from today and walks backward' };
  },
);
