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
  if (!request.auth || !ADMIN_EMAILS.includes(request.auth.token.email)) {
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

    const { orderId } = request.data;
    if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

    const db = admin.firestore();
    const orderSnap = await db.collection('physicalOrders').doc(orderId).get();
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');

    const order = orderSnap.data();
    const addr = order.shippingAddress || {};

    const fromAddress = {
      name: process.env.FROM_NAME || 'The PEP Planner',
      street1: process.env.FROM_STREET1 || '123 Main St',
      city: process.env.FROM_CITY || 'Los Angeles',
      state: process.env.FROM_STATE || 'CA',
      zip: process.env.FROM_ZIP || '90001',
      country: process.env.FROM_COUNTRY || 'US',
    };

    const toAddress = {
      name: order.shippingName || addr.name || order.customerName || '',
      street1: addr.street1 || addr.line1 || addr.address || '',
      street2: addr.street2 || addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      zip: addr.zip || addr.postal_code || '',
      country: addr.country || 'US',
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

    const rates = (shipment.rates || []).map((r) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      rate: r.rate,
      delivery_days: r.delivery_days,
    }));

    return { shipmentId: shipment.id, rates };
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
      ? order.createdAt.toDate().toLocaleDateString('en-US')
      : new Date().toLocaleDateString('en-US');

    const customerName = order.shippingName || order.customerName || '';
    const addressLines = [
      addr.street1 || addr.line1 || addr.address || '',
      addr.street2 || addr.line2 || '',
      [addr.city, addr.state, addr.zip || addr.postal_code].filter(Boolean).join(', '),
      addr.country && addr.country !== 'US' ? addr.country : '',
    ].filter(Boolean);

    const itemRows = items.map((i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${i.name || i.title || 'Item'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${i.quantity || 1}</td>
      </tr>
    `).join('');

    const giftSection = order.giftMessage ? `
      <div style="margin-top:24px;padding:16px;background:#fff3e0;border-radius:8px;border:1px dashed #ff9800;">
        <strong>🎁 Gift Message:</strong>
        <p style="margin:8px 0 0;font-style:italic;">${order.giftMessage}</p>
      </div>
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Packing Slip — Order ${orderId}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px; color: #333; }
        </style>
      </head>
      <body>
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="margin:0;color:#e91e63;font-size:28px;">The PEP Planner</h1>
          <p style="margin:4px 0 0;color:#888;font-size:14px;">Packing Slip</p>
        </div>

        <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
          <div>
            <strong>Order ID:</strong> ${orderId}<br>
            <strong>Date:</strong> ${orderDate}
          </div>
        </div>

        <div style="margin-bottom:24px;">
          <strong>Ship To:</strong><br>
          ${customerName}<br>
          ${addressLines.join('<br>')}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #ddd;">Item</th>
              <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #ddd;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        ${giftSection}

        <div style="margin-top:40px;text-align:center;padding-top:24px;border-top:1px solid #eee;">
          <p style="color:#888;font-size:14px;">Thank you for your order! 💖</p>
          <p style="color:#aaa;font-size:12px;">thepepplanner.com</p>
        </div>

        <div class="no-print" style="text-align:center;margin-top:24px;">
          <button onclick="window.print()" style="background:#e91e63;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:16px;cursor:pointer;">
            Print Packing Slip
          </button>
        </div>
      </body>
      </html>
    `;

    return { html };
  }
);

// ---------------------------------------------------------------------------
// 5. sendReviewRequestEmails — email customers 4 days after delivery
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
