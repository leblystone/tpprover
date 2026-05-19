const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

const EASYPOST_API_BASE = 'https://api.easypost.com/v2';

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

    const payload = {
      shipment: {
        from_address: fromAddress,
        to_address: toAddress,
        parcel: { length: 10, width: 8, height: 2, weight: 16 },
      },
    };

    const res = await fetch(`${EASYPOST_API_BASE}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': easyPostAuth(),
      },
      body: JSON.stringify(payload),
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
  { cors: true, secrets: ['EASYPOST_API_KEY'] },
  async (request) => {
    requireAdmin(request);

    const { orderId, shipmentId, rateId } = request.data;
    if (!orderId || !shipmentId || !rateId) {
      throw new HttpsError('invalid-argument', 'orderId, shipmentId, and rateId are required');
    }

    const auth = easyPostAuth();

    // Buy the label
    const buyRes = await fetch(`${EASYPOST_API_BASE}/shipments/${shipmentId}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({ rate: { id: rateId } }),
    });

    if (!buyRes.ok) {
      const err = await buyRes.text();
      logger.error('EasyPost buy label error', buyRes.status, err);
      throw new HttpsError('internal', 'Failed to purchase label');
    }

    const purchased = await buyRes.json();

    const trackingNumber = purchased.tracking_code || '';
    const labelUrl = purchased.postage_label?.label_url || '';
    const carrier = purchased.selected_rate?.carrier || '';

    // Update physicalOrders doc
    const db = admin.firestore();
    await db.collection('physicalOrders').doc(orderId).update({
      status: 'shipped',
      trackingNumber,
      labelUrl,
      labelCarrier: carrier,
      shippedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Read order for customer info
    const orderSnap = await db.collection('physicalOrders').doc(orderId).get();
    const order = orderSnap.exists ? orderSnap.data() : {};
    const customerEmail = order.customerEmail || order.email || '';
    const customerName = order.customerName || order.shippingName || 'there';

    // Build items list for email
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items
      .map((i) => `<li>${i.name || i.title || 'Item'}${i.quantity > 1 ? ` x${i.quantity}` : ''}</li>`)
      .join('');

    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#e91e63;">Your order has shipped! 📦</h2>
        <p>Hi ${customerName},</p>
        <p>Great news — your PEP Planner order is on its way!</p>
        ${itemsHtml ? `<h3>Items:</h3><ul>${itemsHtml}</ul>` : ''}
        <p><strong>Carrier:</strong> ${carrier}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p>
          <a href="https://thepepplanner.app/order/${orderId}"
             style="display:inline-block;background:#e91e63;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Track Your Order
          </a>
        </p>
        <p style="color:#666;font-size:14px;">Thank you for supporting The PEP Planner! 💖</p>
      </div>
    `;

    if (customerEmail) {
      try {
        const { sendEmailWithQueue } = require('./emailService');
        await sendEmailWithQueue(customerEmail, 'Your PEP Planner order has shipped! 📦', emailHtml, {
          type: 'orderShipped',
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
    try {
      const trackerBody = new URLSearchParams();
      trackerBody.append('tracker[tracking_code]', trackingNumber);
      if (carrier) trackerBody.append('tracker[carrier]', carrier);

      await fetch(`${EASYPOST_API_BASE}/trackers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': auth,
        },
        body: trackerBody.toString(),
      });
    } catch (err) {
      logger.error('Failed to create EasyPost tracker:', err);
    }

    return { trackingNumber, labelUrl, carrier };
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

      const customerEmail = order.customerEmail || order.email || '';
      const customerName = order.customerName || order.shippingName || 'there';

      const deliveredHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#4caf50;">Your order was delivered! 🎉</h2>
          <p>Hi ${customerName},</p>
          <p>Your PEP Planner order has been delivered! We hope you love it.</p>
          <p>
            <a href="https://thepepplanner.app/order/${orderId}"
               style="display:inline-block;background:#4caf50;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              View Your Order
            </a>
          </p>
          <p style="color:#666;font-size:14px;">Thank you for choosing The PEP Planner! 💖</p>
        </div>
      `;

      if (customerEmail) {
        try {
          const { sendEmailWithQueue } = require('./emailService');
          await sendEmailWithQueue(customerEmail, 'Your PEP Planner order was delivered! 🎉', deliveredHtml, {
            type: 'orderDelivered',
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
    }

    logger.info('easypostTrackerWebhook: processed', trackingCode, 'status:', status);
    sendOk();
  }
);

// ---------------------------------------------------------------------------
// 4. printPackingSlip — generate HTML packing slip for printing
// ---------------------------------------------------------------------------
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
    const addr = order.shippingAddress || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const orderDate = order.createdAt?.toDate?.()
      ? order.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const customerName = order.shippingName || order.customerName || '';
    const ordNum = order.squarespaceOrderNumber || order.squarespaceOrderId
      ? `#${String(order.squarespaceOrderNumber || order.squarespaceOrderId).replace(/^#/, '')}`
      : `#${String(orderId).slice(-8).toUpperCase()}`;

    const line1 = addr.line1 || addr.street1 || '';
    const line2 = addr.line2 || addr.street2 || '';
    const cityLine = [addr.city, addr.state, addr.zip || addr.postal_code].filter(Boolean).join(', ');
    const countryLine = addr.country && addr.country !== 'US' ? addr.country : '';

    const addrHtml = [customerName, line1, line2, cityLine, countryLine]
      .filter(Boolean)
      .map(l => `<div>${l}</div>`)
      .join('');

    const itemRows = items.map((i) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px solid #f0e6f0;font-size:12px;color:#1a1a1a;">
          ${i.name || i.title || 'Item'}
          ${i.variant ? `<span style="color:#a0a0a0;font-size:11px;"> · ${i.variant}</span>` : ''}
        </td>
        <td style="padding:6px 0;border-bottom:1px solid #f0e6f0;text-align:right;font-size:12px;color:#1a1a1a;font-weight:600;">×${i.quantity || 1}</td>
      </tr>
    `).join('');

    const giftSection = order.giftMessage ? `
      <div style="margin-top:10px;padding:8px 10px;background:#fff0f6;border-left:3px solid #e91e63;border-radius:0 4px 4px 0;">
        <div style="font-size:10px;font-weight:700;letter-spacing:0.06em;color:#e91e63;text-transform:uppercase;margin-bottom:3px;">Gift Message</div>
        <div style="font-size:11px;font-style:italic;color:#444;">"${order.giftMessage}"</div>
      </div>
    ` : '';

    const trackingSection = order.trackingNumber ? `
      <div style="margin-top:10px;padding:6px 10px;background:#f8f8f8;border-radius:4px;font-size:10px;color:#888;">
        <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Tracking</span>
        <span style="margin-left:8px;font-family:monospace;color:#333;">${order.trackingNumber}</span>
        ${order.labelCarrier ? `<span style="margin-left:6px;color:#aaa;">via ${order.labelCarrier}</span>` : ''}
      </div>
    ` : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Packing Slip ${ordNum}</title>
  <style>
    /* 4×6 label printer target */
    @page {
      size: 4in 6in;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 4in;
      min-height: 6in;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      color: #1a1a1a;
      padding: 0.2in 0.22in 0.18in;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 2px solid #e91e63;
      margin-bottom: 10px;
    }
    .brand { font-size: 15px; font-weight: 800; color: #e91e63; letter-spacing: -0.3px; }
    .brand-sub { font-size: 8px; font-weight: 500; color: #c06090; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 1px; }
    .order-meta { text-align: right; }
    .order-num { font-size: 13px; font-weight: 700; color: #1a1a1a; }
    .order-date { font-size: 9px; color: #999; margin-top: 2px; }

    /* Ship to */
    .section-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #e91e63;
      margin-bottom: 3px;
    }
    .ship-to {
      font-size: 12px;
      line-height: 1.5;
      color: #1a1a1a;
    }
    .ship-to .name { font-weight: 700; font-size: 13px; }

    /* Divider */
    .divider { border: none; border-top: 1px solid #f0e6f0; margin: 10px 0; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #aaa;
      padding-bottom: 5px;
      border-bottom: 1px solid #f0e6f0;
    }
    thead th:last-child { text-align: right; }

    /* Footer heart strip */
    .footer {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed #f0c0d8;
      text-align: center;
    }
    .footer-thanks { font-size: 11px; color: #e91e63; font-weight: 600; }
    .footer-url { font-size: 9px; color: #bbb; margin-top: 2px; letter-spacing: 0.04em; }

    /* Screen-only print button */
    .no-print { display: block; text-align: center; margin-top: 16px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="brand">The PEP Planner</div>
      <div class="brand-sub">Packing Slip</div>
    </div>
    <div class="order-meta">
      <div class="order-num">${ordNum}</div>
      <div class="order-date">${orderDate}</div>
    </div>
  </div>

  <div class="section-label">Ship To</div>
  <div class="ship-to">
    ${addrHtml}
  </div>

  <hr class="divider">

  <div class="section-label">Items</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Product</th>
        <th>Qty</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  ${giftSection}
  ${trackingSection}

  <div class="footer">
    <div class="footer-thanks">Thank you! ♥</div>
    <div class="footer-url">thepepplanner.com</div>
  </div>

  <div class="no-print">
    <button
      onclick="window.print()"
      style="margin-top:8px;background:#e91e63;color:#fff;border:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:0.03em;"
    >
      Print Packing Slip
    </button>
  </div>

</body>
</html>`;

    return { html };
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
          body: JSON.stringify({ shipment: { from_address: fromAddress, to_address: toAddress, parcel: { length: 10, width: 8, height: 2, weight: 16 } } }),
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

        const purchased = await buyRes.json();
        const trackingNumber = purchased.tracking_code || '';
        const labelUrl = purchased.postage_label?.label_url || '';
        const carrier = purchased.selected_rate?.carrier || chosen.carrier;

        await db.collection('physicalOrders').doc(orderId).update({
          status: 'shipped',
          trackingNumber,
          labelUrl,
          labelCarrier: carrier,
          shippedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send shipped email
        const customerEmail = order.customerEmail || '';
        if (customerEmail) {
          try {
            const { sendEmailWithQueue } = require('./emailService');
            const emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#e91e63;">Your order has shipped! 📦</h2><p>Hi ${order.customerName || 'there'},</p><p>Your PEP Planner order is on its way!</p><p><strong>Carrier:</strong> ${carrier}<br><strong>Tracking:</strong> ${trackingNumber}</p><p style="color:#666;font-size:14px;">Thank you! 💖</p></div>`;
            await sendEmailWithQueue(customerEmail, 'Your PEP Planner order has shipped! 📦', emailHtml, { type: 'orderShipped', metadata: { orderId, trackingNumber } });
          } catch (e) { logger.error('bulk shipped email error', orderId, e); }
        }

        result.success = true;
        result.trackingNumber = trackingNumber;
        result.labelUrl = labelUrl;
        result.carrier = carrier;
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
    const { sendEmailWithQueue } = require('./emailService');

    for (const doc of docs) {
      const order = doc.data();
      const customerEmail = order.customerEmail || order.email || '';
      const customerName = order.customerName || order.shippingName || 'there';

      if (!customerEmail) continue;

      const reviewHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#e91e63;">Loving your PEP Planner? 💖</h2>
          <p>Hi ${customerName},</p>
          <p>We hope you're enjoying your PEP Planner! Your feedback means the world to us and helps other planners find their perfect match.</p>
          <p>Would you take a moment to leave a review?</p>
          <div style="margin:24px 0;">
            <a href="https://www.etsy.com/shop/ThePepPlanner"
               style="display:inline-block;background:#f56400;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-right:12px;">
              Review on Etsy ⭐
            </a>
            <a href="https://g.page/r/ThePepPlanner/review"
               style="display:inline-block;background:#4285f4;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Review on Google ⭐
            </a>
          </div>
          <p style="color:#666;font-size:14px;">Thank you for supporting The PEP Planner! 💖</p>
        </div>
      `;

      try {
        await sendEmailWithQueue(customerEmail, 'Loving your PEP Planner? Leave a review! ⭐', reviewHtml, {
          type: 'reviewRequest',
          metadata: { orderId: doc.id },
          priority: 'low',
        });
        await doc.ref.update({ reviewEmailSent: true });
        sent++;
      } catch (err) {
        logger.error('Failed to send review email for order', doc.id, err);
      }
    }

    logger.info(`sendReviewRequestEmails: sent ${sent} review emails`);
    res.status(200).json({ sent });
  }
);
