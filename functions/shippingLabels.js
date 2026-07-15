const fs = require('fs');
const path = require('path');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();
const { buildPackingSlipHtmlBody } = require('./_packingSlipBuild.cjs');
const { activityEntry, appendOrderActivity } = require('./orderActivity');

const PACKING_SLIP_LOGO_URL = process.env.LOGO_URL || 'https://thepepplanner.app/tpp_logo.png';

/** Logo as data URI when a local file exists (reliable for print); otherwise hosted URL. */
function getPackingSlipLogoSrc() {
  const candidates = [
    path.join(__dirname, 'assets', 'tpp_logo.png'),
    path.join(__dirname, '..', 'public', 'tpp_logo.png'),
    path.join(__dirname, '..', 'src', 'assets', 'tpp_logo.png'),
  ];
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch (err) {
      logger.warn('getPackingSlipLogoSrc: could not read', filePath, err.message);
    }
  }
  return PACKING_SLIP_LOGO_URL;
}

const EASYPOST_API_BASE = 'https://api.easypost.com/v2';

/** Must be set on shipment CREATE (options), not as top-level /buy fields. */
const EASYPOST_LABEL_OPTIONS = {
  label_format: 'PDF',
  label_size: '4x6',
};

function extractLabelUrl(purchased) {
  return purchased.postage_label?.label_pdf_url
    || purchased.postage_label?.label_url
    || '';
}

function extractPdfLabelUrl(purchased) {
  return purchased.postage_label?.label_pdf_url || '';
}

/**
 * After buy, ensure we have a PDF URL. EasyPost often returns PNG unless
 * options were set on create; convert via /shipments/:id/label/pdf when needed.
 */
async function ensurePdfLabel(shipment, auth) {
  let purchased = shipment || {};
  let labelPdfUrl = extractPdfLabelUrl(purchased);
  let labelUrl = extractLabelUrl(purchased);

  if (!labelPdfUrl && purchased.id) {
    try {
      const convRes = await fetch(
        `${EASYPOST_API_BASE}/shipments/${purchased.id}/label?file_format=PDF`,
        {
          method: 'GET',
          headers: { Authorization: auth },
        }
      );
      if (convRes.ok) {
        purchased = await convRes.json();
        labelPdfUrl = extractPdfLabelUrl(purchased);
        labelUrl = extractLabelUrl(purchased) || labelUrl;
      } else {
        const errText = await convRes.text();
        logger.warn('EasyPost label PDF convert failed', convRes.status, errText);
      }
    } catch (err) {
      logger.warn('EasyPost label PDF convert error', err.message);
    }
  }

  const downloadUrl = labelPdfUrl || labelUrl;
  let labelPdfBase64 = null;
  let labelContentType = labelPdfUrl ? 'application/pdf' : 'application/octet-stream';

  if (downloadUrl) {
    try {
      const fileRes = await fetch(downloadUrl);
      if (fileRes.ok) {
        const buf = Buffer.from(await fileRes.arrayBuffer());
        labelPdfBase64 = buf.toString('base64');
        labelContentType = fileRes.headers.get('content-type') || labelContentType;
        if (!labelPdfUrl && /pdf/i.test(labelContentType)) {
          labelPdfUrl = downloadUrl;
        }
      }
    } catch (err) {
      logger.warn('EasyPost label file fetch failed (CORS/proxy path skipped later by client)', err.message);
    }
  }

  return {
    purchased,
    labelUrl: downloadUrl || '',
    labelPdfUrl: labelPdfUrl || downloadUrl || '',
    labelPdfBase64,
    labelContentType,
    trackingNumber: purchased.tracking_code || '',
    carrier: purchased.selected_rate?.carrier || '',
    labelCost: purchased.selected_rate?.rate || null,
  };
}

function buildShipmentPayload(fromAddress, toAddress) {
  return {
    shipment: {
      from_address: fromAddress,
      to_address: toAddress,
      parcel: { length: 10, width: 8, height: 2, weight: 16 },
      options: { ...EASYPOST_LABEL_OPTIONS },
    },
  };
}

function getEasyPostKey() {
  return process.env.EASYPOST_API_KEY;
}

const ADMIN_EMAILS = ['lebrockmaldonado@gmail.com', 'contact@thepepplanner.com', 'thepepplanner@gmail.com'];

function requireAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
  const email = (request.auth.token.email || '').toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
}

function easyPostAuth() {
  const key = getEasyPostKey()?.trim().replace(/\r?\n/g, '');
  if (!key) throw new HttpsError('internal', 'EasyPost API key not configured');
  return 'Basic ' + Buffer.from(key + ':', 'utf8').toString('base64');
}

function normalizeCarrierForEasyPost(carrier) {
  if (!carrier) return null;
  const c = String(carrier).toUpperCase();
  if (c.includes('USPS') || c.includes('UNITED_STATES')) return 'USPS';
  if (c.includes('UPS') || c.includes('UNITED_PARCEL')) return 'UPS';
  if (c.includes('FEDEX')) return 'FedEx';
  if (c.includes('DHL')) return 'DHLExpress';
  return null;
}

/**
 * Register a tracking number with EasyPost and link it to a physicalOrders doc.
 * Reuses trackingIndex cache when the tracker already exists.
 */
async function registerEasyPostTrackerForOrder(db, orderRef, orderId, trackingNumber, carrier) {
  const trimmed = String(trackingNumber || '').trim();
  if (!trimmed) {
    throw new HttpsError('failed-precondition', 'Order has no tracking number');
  }

  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError('not-found', 'Order not found');
  }

  const existingId = orderSnap.data().easypostTrackerId;
  if (existingId) {
    return { alreadyRegistered: true, trackerId: existingId, status: orderSnap.data().easypostStatus || null };
  }

  const safeId = trimmed.replace(/\s/g, '');
  const indexRef = db.collection('trackingIndex').doc(safeId);
  const indexSnap = await indexRef.get();
  if (indexSnap.exists && indexSnap.data().easypostTrackerId) {
    const trackerId = indexSnap.data().easypostTrackerId;
    await orderRef.update({
      easypostTrackerId: trackerId,
      easypostRegisteredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { alreadyRegistered: true, trackerId, fromCache: true };
  }

  const body = new URLSearchParams();
  body.append('tracker[tracking_code]', trimmed);
  const normalized = normalizeCarrierForEasyPost(carrier);
  if (normalized) body.append('tracker[carrier]', normalized);

  const trackerRes = await fetch(`${EASYPOST_API_BASE}/trackers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: easyPostAuth(),
    },
    body: body.toString(),
  });

  if (!trackerRes.ok) {
    const errText = await trackerRes.text();
    logger.error('EasyPost register tracker error', trackerRes.status, errText);
    throw new HttpsError('internal', `EasyPost could not register tracking (${trackerRes.status})`);
  }

  const tracker = await trackerRes.json();
  const trackerId = tracker.id;

  await orderRef.update({
    easypostTrackerId: trackerId,
    easypostRegisteredAt: admin.firestore.FieldValue.serverTimestamp(),
    easypostStatus: tracker.status || null,
  });

  await indexRef.set({
    easypostTrackerId: trackerId,
    physicalOrderId: orderId,
    orderType: 'physical',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return {
    trackerId,
    status: tracker.status || null,
    trackingNumber: trimmed,
    alreadyRegistered: false,
  };
}

async function sendSms(to, body) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return null;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  const data = await resp.json();
  if (!resp.ok) logger.error('Twilio error:', data);
  return data;
}

// ---------------------------------------------------------------------------
// 1. createShippingLabel — create an EasyPost shipment and return rates
// ---------------------------------------------------------------------------
exports.createShippingLabel = onCall(
  { cors: true, secrets: ['EASYPOST_API_KEY'] },
  async (request) => {
    requireAdmin(request);

    const { orderId, shippingAddress, shippingName, saveAddress } = request.data || {};
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const db = admin.firestore();
    const orderRef = db.collection('physicalOrders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');

    const order = orderSnap.data();
    const addr = shippingAddress || order.shippingAddress || {};
    const shipName = (shippingName || order.shippingName || order.customerName || '').trim();

    const line1 = (addr.line1 || addr.street1 || addr.address || '').trim();
    if (!line1) {
      throw new HttpsError('invalid-argument', 'Shipping street address is required');
    }

    if (saveAddress && shippingAddress) {
      await orderRef.update({
        shippingAddress: {
          line1,
          line2: (addr.line2 || addr.street2 || '').trim() || null,
          city: (addr.city || '').trim(),
          state: (addr.state || '').trim(),
          postal_code: (addr.postal_code || addr.zip || '').trim(),
          country: (addr.country || 'US').trim() || 'US',
        },
        shippingName: shipName || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const fromAddress = {
      name: process.env.FROM_NAME || 'The PEP Planner',
      street1: process.env.FROM_STREET1 || '123 Main St',
      city: process.env.FROM_CITY || 'Los Angeles',
      state: process.env.FROM_STATE || 'CA',
      zip: process.env.FROM_ZIP || '90001',
      country: process.env.FROM_COUNTRY || 'US',
    };

    const toAddress = {
      name: shipName,
      street1: line1,
      street2: (addr.street2 || addr.line2 || '').trim(),
      city: (addr.city || '').trim(),
      state: (addr.state || '').trim(),
      zip: (addr.zip || addr.postal_code || '').trim(),
      country: (addr.country || 'US').trim() || 'US',
    };

    const res = await fetch(`${EASYPOST_API_BASE}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': easyPostAuth(),
      },
      body: JSON.stringify(buildShipmentPayload(fromAddress, toAddress)),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error('EasyPost create shipment error', res.status, err);
      throw new HttpsError('internal', 'Failed to create shipment');
    }

    const shipment = await res.json();

    const shipmentId = shipment.id;
    const rates = (shipment.rates || []).map((r) => ({
      id: r.id,
      shipmentId,
      carrier: r.carrier,
      service: r.service,
      rate: r.rate,
      delivery_days: r.delivery_days,
    }));

    return { shipmentId, rates };
  }
);

// ---------------------------------------------------------------------------
// 2. purchaseShippingLabel — buy label, update order, notify customer
// ---------------------------------------------------------------------------
exports.purchaseShippingLabel = onCall(
  { cors: true, secrets: ['EASYPOST_API_KEY'], timeoutSeconds: 120 },
  async (request) => {
    requireAdmin(request);

    const { orderId, shipmentId, rateId } = request.data;
    if (!orderId || !shipmentId || !rateId) {
      throw new HttpsError('invalid-argument', 'orderId, shipmentId, and rateId are required');
    }

    const auth = easyPostAuth();

    // Buy the label (format/size already set on shipment create via options)
    const buyRes = await fetch(`${EASYPOST_API_BASE}/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ rate: { id: rateId } }),
    });

    if (!buyRes.ok) {
      const err = await buyRes.text();
      logger.error('EasyPost buy label error', buyRes.status, err);
      throw new HttpsError('internal', `Failed to purchase label: ${err || buyRes.status}`);
    }

    const bought = await buyRes.json();
    const labelInfo = await ensurePdfLabel(bought, auth);

    const trackingNumber = labelInfo.trackingNumber || bought.tracking_code || '';
    const labelUrl = labelInfo.labelUrl;
    const labelPdfUrl = labelInfo.labelPdfUrl;
    const carrier = labelInfo.carrier || bought.selected_rate?.carrier || '';
    const labelCost = labelInfo.labelCost != null
      ? labelInfo.labelCost
      : (bought.selected_rate?.rate || null);

    if (!labelUrl && !labelInfo.labelPdfBase64) {
      logger.error('EasyPost buy succeeded but no label URL/PDF returned', bought.id, bought.postage_label);
      throw new HttpsError('internal', 'EasyPost purchased the label but did not return a printable file. Check EasyPost dashboard.');
    }

    // Update physicalOrders doc
    const db = admin.firestore();
    const orderRef = db.collection('physicalOrders').doc(orderId);
    await orderRef.update({
      status: 'shipped',
      trackingNumber,
      labelUrl,
      labelPdfUrl: labelPdfUrl || labelUrl,
      labelCarrier: carrier,
      labelCost: labelCost != null ? parseFloat(labelCost) : null,
      labelFormat: 'PDF',
      labelSize: '4x6',
      easypostShipmentId: shipmentId,
      labelPurchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      shippedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await appendOrderActivity(orderRef, activityEntry({
      type: 'label_created',
      title: 'Shipping label purchased (EasyPost)',
      detail: [
        carrier,
        trackingNumber,
        labelCost != null ? `$${Number(labelCost).toFixed(2)}` : null,
        '4×6 PDF',
      ].filter(Boolean).join(' · '),
      actor: 'admin',
    }));
    await appendOrderActivity(orderRef, activityEntry({
      type: 'shipped',
      title: 'Order shipped',
      detail: trackingNumber ? `Tracking ${trackingNumber}` : null,
      actor: 'admin',
    }));

    // Read order for customer info
    const orderSnap = await orderRef.get();
    const order = orderSnap.exists ? orderSnap.data() : {};
    const customerEmail = order.customerEmail || order.email || '';
    const customerName = order.customerName || order.shippingName || 'there';

    const shopEmails = require('./shopEmails');
    const orderStatusUrl = `${shopEmails.SHOP_BASE}/order/${orderId}`;
    const bodyHtml = shopEmails.buildOrderBodyFromStoredOrder(order, {
      carrier,
      trackingNumber,
      includePolicies: false,
    });

    if (customerEmail) {
      try {
        await shopEmails.sendShopTemplatedEmail('shopOrderShipped', customerEmail, {
          customerName,
          orderStatusUrl,
          sessionId: orderId,
        }, {
          bodyHtml,
          emailType: 'orderShipped',
          recipientName: customerName,
          metadata: { orderId, trackingNumber },
        });
      } catch (err) {
        logger.error('Failed to send shipped email:', err);
      }
    }

    // SMS notification
    if (order.customerPhone && process.env.TWILIO_ACCOUNT_SID) {
      try {
        await sendSms(
          order.customerPhone,
          `Your PEP Planner order has shipped! Tracking: ${trackingNumber} (${carrier}). Track at https://thepepplanner.app/order/${orderId}`
        );
      } catch (err) {
        logger.error('Failed to send shipped SMS:', err);
      }
    }

    // Create EasyPost tracker for webhook updates
    let easypostTrackerId = null;
    try {
      const registered = await registerEasyPostTrackerForOrder(
        db,
        db.collection('physicalOrders').doc(orderId),
        orderId,
        trackingNumber,
        carrier
      );
      easypostTrackerId = registered.trackerId;
    } catch (err) {
      logger.error('Failed to create EasyPost tracker:', err);
    }

    const updatedOrder = {
      ...order,
      trackingNumber,
      labelCarrier: carrier,
      labelUrl,
      status: 'shipped',
    };
    const packingSlipHtml = buildPackingSlipHtml(updatedOrder, orderId);

    return {
      success: true,
      purchased: true,
      confirmation: true,
      message: [
        'Label purchased via EasyPost',
        carrier,
        trackingNumber ? `tracking ${trackingNumber}` : null,
        labelCost != null ? `$${Number(labelCost).toFixed(2)}` : null,
        '4×6 PDF ready',
      ].filter(Boolean).join(' · '),
      trackingNumber,
      labelUrl,
      labelPdfUrl,
      labelPdfBase64: labelInfo.labelPdfBase64,
      labelContentType: labelInfo.labelContentType,
      carrier,
      labelCost: labelCost != null ? parseFloat(labelCost) : null,
      labelFormat: 'PDF',
      labelSize: '4x6',
      easypostTrackerId,
      packingSlipHtml,
      easypostShipmentId: shipmentId,
    };
  }
);

// ---------------------------------------------------------------------------
// 2b. registerShopOrderEasyPostTracker — admin: register imported/manual tracking
// ---------------------------------------------------------------------------
exports.registerShopOrderEasyPostTracker = onCall(
  { cors: true, secrets: ['EASYPOST_API_KEY'] },
  async (request) => {
    requireAdmin(request);
    const { orderId } = request.data || {};
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const db = admin.firestore();
    const orderRef = db.collection('physicalOrders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');

    const order = orderSnap.data();
    const trackingNumber = order.trackingNumber;
    const carrier = order.labelCarrier || order.carrier || null;

    const result = await registerEasyPostTrackerForOrder(
      db,
      orderRef,
      orderId,
      trackingNumber,
      carrier
    );

    if (!result.alreadyRegistered) {
      await appendOrderActivity(orderRef, activityEntry({
        type: 'tracking_update',
        title: 'EasyPost tracking enabled',
        detail: trackingNumber,
        actor: 'admin',
        actorEmail: request.auth.token.email || null,
        meta: { easypostTrackerId: result.trackerId, easypostStatus: result.status },
      }));
    }

    return {
      success: true,
      alreadyRegistered: result.alreadyRegistered,
      trackerId: result.trackerId,
      status: result.status,
    };
  }
);

// ---------------------------------------------------------------------------
// 3. easypostTrackerWebhook — receive delivery updates from EasyPost
// ---------------------------------------------------------------------------
exports.easypostTrackerWebhook = onRequest(
  { cors: true, invoker: 'public', secrets: ['EASYPOST_API_KEY'] },
  async (req, res) => {
    const sendOk = () => res.status(200).send('OK');

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    let event;
    try {
      event = typeof req.body === 'object' ? req.body : JSON.parse(req.rawBody || '{}');
    } catch {
      sendOk();
      return;
    }

    const description = event.description;
    const result = event.result || {};

    if (description !== 'tracker.updated') {
      sendOk();
      return;
    }

    const trackingCode = (result.tracking_code || '').toString().trim();
    const status = (result.status || '').toLowerCase();

    if (!trackingCode) {
      logger.warn('easypostTrackerWebhook: missing tracking_code');
      sendOk();
      return;
    }

    const db = admin.firestore();

    // Look up order by trackingNumber
    const ordersQuery = await db.collection('physicalOrders')
      .where('trackingNumber', '==', trackingCode)
      .limit(1)
      .get();

    if (ordersQuery.empty) {
      logger.info('easypostTrackerWebhook: no order found for tracking', trackingCode);
      sendOk();
      return;
    }

    const orderDoc = ordersQuery.docs[0];
    const order = orderDoc.data();
    const orderId = orderDoc.id;

    if (status === 'delivered') {
      const fourDays = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

      await orderDoc.ref.update({
        status: 'delivered',
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
        reviewEmailScheduledFor: admin.firestore.Timestamp.fromDate(fourDays),
      });

      const latestScan = Array.isArray(result.tracking_details) ? result.tracking_details[0] : null;
      const scanDetail = latestScan
        ? [latestScan.message || latestScan.status, latestScan.tracking_location?.city].filter(Boolean).join(' · ')
        : null;
      await appendOrderActivity(orderDoc.ref, activityEntry({
        type: 'delivered',
        title: 'Delivered',
        detail: scanDetail || `Tracking ${trackingCode}`,
        actor: 'system',
        meta: { easypostStatus: status },
      }));

      const customerEmail = order.customerEmail || order.email || '';
      const customerName = order.customerName || order.shippingName || 'there';

      const shopEmails = require('./shopEmails');
      const orderStatusUrl = `${shopEmails.SHOP_BASE}/order/${orderId}`;

      if (customerEmail) {
        try {
          const bodyHtml = shopEmails.buildOrderBodyFromStoredOrder(order, {
            carrier: order.carrier,
            trackingNumber: order.trackingNumber || trackingCode,
            includePolicies: false,
          });
          await shopEmails.sendShopTemplatedEmail('shopOrderDelivered', customerEmail, {
            customerName,
            orderStatusUrl,
            sessionId: orderId,
          }, {
            bodyHtml,
            emailType: 'orderDelivered',
            recipientName: customerName,
            metadata: { orderId, trackingNumber: trackingCode },
          });
        } catch (err) {
          logger.error('Failed to send delivered email:', err);
        }
      }

      if (order.customerPhone && process.env.TWILIO_ACCOUNT_SID) {
        try {
          await sendSms(
            order.customerPhone,
            `Your PEP Planner order has been delivered! 🎉 We hope you love it. View at https://thepepplanner.app/order/${orderId}`
          );
        } catch (err) {
          logger.error('Failed to send delivered SMS:', err);
        }
      }
    } else if (['in_transit', 'out_for_delivery', 'pre_transit', 'available_for_pickup'].includes(status)) {
      const latestScan = Array.isArray(result.tracking_details) ? result.tracking_details[0] : null;
      const scanDetail = latestScan
        ? [latestScan.message || latestScan.status_detail || status, latestScan.tracking_location?.city].filter(Boolean).join(' · ')
        : status.replace(/_/g, ' ');
      await appendOrderActivity(orderDoc.ref, activityEntry({
        type: 'tracking_update',
        title: 'Carrier scan',
        detail: scanDetail,
        actor: 'system',
        meta: { easypostStatus: status },
      }));
    }

    logger.info('easypostTrackerWebhook: processed', trackingCode, 'status:', status);
    sendOk();
  }
);

// ---------------------------------------------------------------------------
// 4. printPackingSlip — generate HTML packing slip for printing
// ---------------------------------------------------------------------------
function buildPackingSlipHtml(order, orderId = '') {
  const escapeHtml = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const { slipBody, styles, ordNum } = buildPackingSlipHtmlBody(
    order,
    orderId,
    escapeHtml,
    getPackingSlipLogoSrc,
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Packing Slip ${escapeHtml(ordNum)}</title>
  <style>${styles}</style>
</head>
<body>
${slipBody}
  <div class="no-print">
    <button type="button" onclick="window.print()"
      style="background:#5B6D5E;color:#fff;border:none;padding:8px 20px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">
      Print Packing Slip
    </button>
  </div>
</body>
</html>`;
}

exports.buildPackingSlipHtml = buildPackingSlipHtml;

exports.printPackingSlip = onCall(
  { cors: true },
  async (request) => {
    requireAdmin(request);

    const { orderId } = request.data;
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const db = admin.firestore();
    const orderSnap = await db.collection('physicalOrders').doc(orderId).get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');

    const order = orderSnap.data();
    return { html: buildPackingSlipHtml(order, orderId) };
  }
);

// ---------------------------------------------------------------------------
// 5. bulkCreateShippingLabels — auto-buy cheapest rate for multiple orders
// ---------------------------------------------------------------------------
exports.bulkCreateShippingLabels = onCall(
  { cors: true, secrets: ['EASYPOST_API_KEY'], timeoutSeconds: 540 },
  async (request) => {
    requireAdmin(request);

    const { orderIds, carrierPreference } = request.data || {};
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new HttpsError('invalid-argument', 'orderIds array is required');
    }
    if (orderIds.length > 50) {
      throw new HttpsError('invalid-argument', 'Max 50 orders per bulk run');
    }

    const db = admin.firestore();
    const auth = easyPostAuth();
    const carrierPref = (carrierPreference || '').toUpperCase();

    const results = [];

    for (const orderId of orderIds) {
      const result = { orderId, success: false, trackingNumber: null, labelUrl: null, carrier: null, error: null, rate: null };
      try {
        const orderSnap = await db.collection('physicalOrders').doc(orderId).get();
        if (!orderSnap.exists) { result.error = 'Order not found'; results.push(result); continue; }

        const order = orderSnap.data();
        if (order.status !== 'pending') { result.error = `Already ${order.status}`; results.push(result); continue; }
        if (order.trackingNumber) { result.error = 'Already has label'; results.push(result); continue; }

        const addr = order.shippingAddress || {};
        const line1 = (addr.line1 || addr.street1 || '').trim();
        if (!line1) { result.error = 'Missing street address'; results.push(result); continue; }

        const fromAddress = {
          name: process.env.FROM_NAME || 'The PEP Planner',
          street1: process.env.FROM_STREET1 || '123 Main St',
          city: process.env.FROM_CITY || 'Los Angeles',
          state: process.env.FROM_STATE || 'CA',
          zip: process.env.FROM_ZIP || '90001',
          country: process.env.FROM_COUNTRY || 'US',
        };

        const toAddress = {
          name: order.shippingName || order.customerName || '',
          street1: line1,
          street2: (addr.line2 || addr.street2 || '').trim(),
          city: (addr.city || '').trim(),
          state: (addr.state || '').trim(),
          zip: (addr.zip || addr.postal_code || '').trim(),
          country: (addr.country || 'US').trim() || 'US',
        };

        const shipRes = await fetch(`${EASYPOST_API_BASE}/shipments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': auth },
          body: JSON.stringify(buildShipmentPayload(fromAddress, toAddress)),
        });

        if (!shipRes.ok) {
          const err = await shipRes.text();
          result.error = `EasyPost shipment error: ${shipRes.status}`;
          logger.error('bulk shipment error', orderId, err);
          results.push(result);
          continue;
        }

        const shipment = await shipRes.json();
        const rates = shipment.rates || [];
        if (!rates.length) { result.error = 'No rates available'; results.push(result); continue; }

        // Pick best rate: prefer carrier match, then cheapest
        const sorted = [...rates].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
        let chosen = sorted[0];
        if (carrierPref) {
          const match = sorted.find(r => r.carrier?.toUpperCase().includes(carrierPref));
          if (match) chosen = match;
        }

        result.rate = { carrier: chosen.carrier, service: chosen.service, cost: chosen.rate };

        const buyRes = await fetch(`${EASYPOST_API_BASE}/shipments/${shipment.id}/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': auth },
          body: JSON.stringify({ rate: { id: chosen.id } }),
        });

        if (!buyRes.ok) {
          const err = await buyRes.text();
          result.error = `EasyPost buy error: ${buyRes.status}`;
          logger.error('bulk buy error', orderId, err);
          results.push(result);
          continue;
        }

        const bought = await buyRes.json();
        const labelInfo = await ensurePdfLabel(bought, auth);
        const trackingNumber = labelInfo.trackingNumber || bought.tracking_code || '';
        const labelUrl = labelInfo.labelUrl;
        const labelPdfUrl = labelInfo.labelPdfUrl || labelUrl;
        const carrier = labelInfo.carrier || bought.selected_rate?.carrier || chosen.carrier;
        const labelCost = labelInfo.labelCost != null
          ? labelInfo.labelCost
          : (bought.selected_rate?.rate || chosen.rate);

        if (!labelUrl && !labelInfo.labelPdfBase64) {
          result.error = 'EasyPost buy returned no label file';
          results.push(result);
          continue;
        }

        await db.collection('physicalOrders').doc(orderId).update({
          status: 'shipped',
          trackingNumber,
          labelUrl,
          labelPdfUrl,
          labelCarrier: carrier,
          labelCost: labelCost != null ? parseFloat(labelCost) : null,
          labelFormat: 'PDF',
          labelSize: '4x6',
          easypostShipmentId: shipment.id,
          labelPurchasedAt: admin.firestore.FieldValue.serverTimestamp(),
          shippedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        try {
          await registerEasyPostTrackerForOrder(
            db,
            db.collection('physicalOrders').doc(orderId),
            orderId,
            trackingNumber,
            carrier
          );
        } catch (epErr) {
          logger.error('bulk EasyPost tracker error', orderId, epErr);
        }

        const customerEmail = order.customerEmail || '';
        if (customerEmail) {
          try {
            const shopEmails = require('./shopEmails');
            const shippedOrder = { ...order, carrier, trackingNumber };
            await shopEmails.sendShopTemplatedEmail('shopOrderShipped', customerEmail, {
              customerName: order.customerName || 'there',
              orderStatusUrl: `${shopEmails.SHOP_BASE}/order/${orderId}`,
              sessionId: orderId,
            }, {
              bodyHtml: shopEmails.buildOrderBodyFromStoredOrder(shippedOrder, {
                carrier,
                trackingNumber,
                includePolicies: false,
              }),
              emailType: 'orderShipped',
              metadata: { orderId, trackingNumber },
            });
          } catch (e) { logger.error('bulk shipped email error', orderId, e); }
        }

        result.success = true;
        result.purchased = true;
        result.trackingNumber = trackingNumber;
        result.labelUrl = labelUrl;
        result.labelPdfUrl = labelPdfUrl;
        result.labelPdfBase64 = labelInfo.labelPdfBase64;
        result.labelContentType = labelInfo.labelContentType;
        result.carrier = carrier;
        result.labelCost = labelCost;
        result.message = [
          'Label purchased via EasyPost',
          carrier,
          trackingNumber ? `tracking ${trackingNumber}` : null,
          '4×6 PDF ready',
        ].filter(Boolean).join(' · ');
        result.packingSlipHtml = buildPackingSlipHtml({
          ...order,
          trackingNumber,
          labelCarrier: carrier,
          status: 'shipped',
        }, orderId);
        results.push(result);

      } catch (err) {
        result.error = err.message || 'Unknown error';
        logger.error('bulkCreateShippingLabels error for', orderId, err);
        results.push(result);
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    return { results, succeeded, failed };
  }
);

// ---------------------------------------------------------------------------
// 6. sendReviewRequestEmails — email customers 4 days after delivery
// ---------------------------------------------------------------------------
exports.sendReviewRequestEmails = onRequest(
  { cors: true, invoker: 'public' },
  async (req, res) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db.collection('physicalOrders')
      .where('status', '==', 'delivered')
      .where('reviewEmailScheduledFor', '<=', now)
      .where('reviewEmailSent', '==', false)
      .get();

    // Also grab docs where reviewEmailSent doesn't exist yet
    const snapshot2 = await db.collection('physicalOrders')
      .where('status', '==', 'delivered')
      .where('reviewEmailScheduledFor', '<=', now)
      .get();

    const docsMap = new Map();
    snapshot.docs.forEach((d) => docsMap.set(d.id, d));
    snapshot2.docs.forEach((d) => {
      const data = d.data();
      if (!data.reviewEmailSent) docsMap.set(d.id, d);
    });

    const docs = Array.from(docsMap.values());

    if (docs.length === 0) {
      res.status(200).json({ sent: 0 });
      return;
    }

    let sent = 0;
    const shopEmails = require('./shopEmails');
    const shopReviewRequests = require('./shopReviewRequests');

    for (const doc of docs) {
      const order = doc.data();
      const customerEmail = order.customerEmail || order.email || '';
      const customerName = order.customerName || order.shippingName || 'there';

      if (!customerEmail) continue;

      try {
        const tokenInfo = await shopReviewRequests.createReviewTokenForOrder(db, doc);
        const reviewUrl = tokenInfo?.reviewUrl || `${shopEmails.SHOP_BASE}/shop/reviews`;
        const bodyHtml = tokenInfo
          ? shopReviewRequests.buildPostDeliveryReviewBodyHtml(reviewUrl)
          : shopEmails.buildReviewLinksHtml();

        await shopEmails.sendShopTemplatedEmail('shopReviewInvite', customerEmail, {
          customerName,
          reviewUrl,
          orderStatusUrl: reviewUrl,
          sessionId: doc.id,
        }, {
          bodyHtml,
          emailType: 'reviewRequest',
          metadata: { orderId: doc.id, tokenId: tokenInfo?.token || null },
          priority: 'low',
        });

        await db.collection('shopReviewRequests').add({
          emailLower: tokenInfo?.emailLower || String(customerEmail).trim().toLowerCase(),
          status: 'email_sent',
          orderIds: [doc.id],
          tokenId: tokenInfo?.token || null,
          source: 'post_delivery',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await doc.ref.update({
          reviewEmailSent: true,
          reviewEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        sent++;
      } catch (err) {
        logger.error('Failed to send review email for order', doc.id, err);
      }
    }

    logger.info(`sendReviewRequestEmails: sent ${sent} review emails`);
    res.status(200).json({ sent });
  }
);
