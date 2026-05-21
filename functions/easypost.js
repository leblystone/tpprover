const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const crypto = require('crypto');
const admin = require('firebase-admin');

const EASYPOST_API_BASE = 'https://api.easypost.com/v2';

// Map EasyPost status to internal order status
function easypostStatusToInternal(status) {
  if (!status || typeof status !== 'string') return 'Order Placed';
  const s = status.toLowerCase();
  if (s === 'delivered') return 'Delivered';
  if (s === 'in_transit' || s === 'out_for_delivery') return 'Shipped';
  if (s === 'return_to_sender') return 'Returned';
  if (s === 'failure' || s === 'error') return 'Delivery Failed';
  return 'Order Placed'; // unknown, pre_transit, etc.
}

/**
 * Create an EasyPost tracker and register it for webhook updates.
 * Writes to trackingIndex so the webhook can find userId/orderId by tracking code.
 */
exports.createEasyPostTracker = onCall(
  {
    cors: true,
    secrets: ['EASYPOST_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to register tracking');
    }

    const { trackingNumber, orderId, carrier } = request.data;
    if (!trackingNumber || typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
      throw new HttpsError('invalid-argument', 'Tracking number is required');
    }
    if (!orderId) {
      throw new HttpsError('invalid-argument', 'orderId is required');
    }

    const userId = request.auth.uid;
    const trimmedTracking = trackingNumber.trim();
    const normalizedCarrier = (carrier && typeof carrier === 'string') ? carrier.trim().toUpperCase() : null;

    const apiKey = process.env.EASYPOST_API_KEY?.trim().replace(/\r?\n/g, '');
    if (!apiKey) {
      logger.error('EASYPOST_API_KEY secret is missing or empty');
      throw new HttpsError('internal', 'Tracking service not configured');
    }

    try {
      // Create tracker via EasyPost API (carrier optional - EasyPost can auto-detect)
      const body = new URLSearchParams();
      body.append('tracker[tracking_code]', trimmedTracking);
      if (normalizedCarrier) {
        body.append('tracker[carrier]', normalizedCarrier);
      }

      const trackerRes = await fetch(`${EASYPOST_API_BASE}/trackers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(apiKey + ':', 'utf8').toString('base64'),
        },
        body: body.toString(),
      });

      if (!trackerRes.ok) {
        const errText = await trackerRes.text();
        logger.error('EasyPost create tracker error', trackerRes.status, errText);
        return {
          error: 'Failed to register tracking with EasyPost',
          status: trackerRes.status,
          details: errText,
        };
      }

      const tracker = await trackerRes.json();
      const trackerId = tracker.id || tracker.tracking_code;
      const status = tracker.status || 'unknown';

      // Write trackingIndex for webhook lookup (use tracking_code as doc id for easy lookup)
      const safeId = trimmedTracking.replace(/\s/g, '');
      const db = admin.firestore();
      await db.collection('trackingIndex').doc(safeId).set({
        userId,
        orderId,
        easypostTrackerId: tracker.id || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return {
        success: true,
        status: easypostStatusToInternal(status),
        originalStatus: status,
        trackerId: tracker.id,
      };
    } catch (err) {
      logger.error('createEasyPostTracker error', err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err.message || 'Failed to create tracker');
    }
  }
);

/**
 * Get current tracker status from EasyPost (for live preview in OrderDetailsModal).
 */
exports.getEasyPostTrackerStatus = onCall(
  {
    cors: true,
    secrets: ['EASYPOST_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to get tracking info');
    }

    const { trackingNumber } = request.data;
    if (!trackingNumber || typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
      throw new HttpsError('invalid-argument', 'Tracking number is required');
    }

    const apiKey = process.env.EASYPOST_API_KEY?.trim().replace(/\r?\n/g, '');
    if (!apiKey) {
      logger.error('EASYPOST_API_KEY secret is missing or empty');
      throw new HttpsError('internal', 'Tracking service not configured');
    }

    try {
      const authHeader = 'Basic ' + Buffer.from(apiKey + ':', 'utf8').toString('base64');
      const safeId = trackingNumber.trim().replace(/\s/g, '');

      // Check Firestore for a cached EasyPost tracker ID first — avoids re-billing ($0.02/POST)
      const db = admin.firestore();
      const indexSnap = await db.collection('trackingIndex').doc(safeId).get();
      const cachedTrackerId = indexSnap.exists ? indexSnap.data().easypostTrackerId : null;

      let res;
      if (cachedTrackerId) {
        // Free GET — no charge, uses existing tracker
        res = await fetch(`${EASYPOST_API_BASE}/trackers/${cachedTrackerId}`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
      } else {
        // First time: POST to create tracker (~$0.02), then cache the ID
        const body = new URLSearchParams();
        body.append('tracker[tracking_code]', trackingNumber.trim());
        res = await fetch(`${EASYPOST_API_BASE}/trackers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': authHeader,
          },
          body: body.toString(),
        });
      }

      if (!res.ok) {
        const errText = await res.text();
        return {
          error: 'Failed to fetch tracking information',
          status: res.status,
          details: errText,
        };
      }

      const tracker = await res.json();

      // If this was a first-time POST, cache the tracker ID so future calls use GET (free)
      if (!cachedTrackerId && tracker.id) {
        await db.collection('trackingIndex').doc(safeId).set(
          { easypostTrackerId: tracker.id },
          { merge: true }
        );
      }

      const status = tracker.status || 'unknown';
      const trackingStatus = tracker.tracking_details && tracker.tracking_details[0];
      const statusDetail = trackingStatus ? (trackingStatus.message || trackingStatus.status_detail) : '';
      const statusDate = trackingStatus ? trackingStatus.datetime : null;

      return {
        success: true,
        data: {
          tracking_number: tracker.tracking_code || trackingNumber,
          carrier: tracker.carrier || null,
          status,
          statusDetail,
          statusDate,
          tracking_details: tracker.tracking_details || [],
          eta: tracker.est_delivery_date || null,
        },
        mappedStatus: easypostStatusToInternal(status),
      };
    } catch (err) {
      logger.error('getEasyPostTrackerStatus error', err);
      if (err instanceof HttpsError) throw err;
      return { error: err.message || 'Failed to fetch tracking' };
    }
  }
);

/**
 * EasyPost webhook: receives tracker.updated (and other) events.
 * Verifies HMAC, looks up trackingIndex by tracking_code, updates userData document.
 */
function verifyEasyPostSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  // EasyPost sends the header as "hmac-sha256-hex=<hex>" — strip the prefix before comparing
  const hexSig = signature.startsWith('hmac-sha256-hex=')
    ? signature.slice('hmac-sha256-hex='.length)
    : signature;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hexSig, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

exports.easyPostWebhook = onRequest(
  {
    cors: true,
    invoker: 'public',
    secrets: ['EASYPOST_WEBHOOK_SECRET'],
  },
  async (req, res) => {
    // Must return 200 quickly so EasyPost does not retry
    const sendOk = () => res.status(200).send('OK');

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const rawBody = typeof req.rawBody === 'undefined' ? (req.body && JSON.stringify(req.body)) : req.rawBody;
    const signature = req.headers['x-hmac-signature'] || req.headers['X-Hmac-Signature'];
    const secret = process.env.EASYPOST_WEBHOOK_SECRET?.trim().replace(/\r?\n/g, '');

    if (secret && signature) {
      const valid = verifyEasyPostSignature(rawBody, signature, secret);
      if (!valid) {
        logger.warn('EasyPost webhook signature verification failed');
        res.status(401).send('Invalid signature');
        return;
      }
    } else if (secret && !signature) {
      logger.warn('EasyPost webhook secret set but no X-Hmac-Signature header');
      res.status(401).send('Missing signature');
      return;
    }

    let event;
    try {
      event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
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

    const trackingCode = (result.tracking_code || result.tracking_code_original || '').toString().trim().replace(/\s/g, '');
    const status = (result.status || '').toLowerCase();

    if (!trackingCode) {
      logger.warn('EasyPost webhook: tracker.updated missing tracking_code');
      sendOk();
      return;
    }

    const db = admin.firestore();
    const indexRef = db.collection('trackingIndex').doc(trackingCode);
    const indexSnap = await indexRef.get();
    if (!indexSnap.exists) {
      logger.info('EasyPost webhook: no trackingIndex for', trackingCode);
      sendOk();
      return;
    }

    const { userId, orderId } = indexSnap.data();
    if (!userId || !orderId) {
      sendOk();
      return;
    }

    const internalStatus = easypostStatusToInternal(status);
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    const userRef = db.collection('userData').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      sendOk();
      return;
    }

    const data = userSnap.data();
    const orders = Array.isArray(data.orders) ? [...data.orders] : [];
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      sendOk();
      return;
    }

    const order = orders[idx];
    const previousRaw = order.lastEasypostRawStatus || '';
    const currentStatus = (order.status || 'Order Placed').toLowerCase();
    const statusPriority = { 'order placed': 0, 'placed': 0, 'shipped': 1, 'delivered': 2, 'returned': 0, 'delivery failed': 0 };
    const currentPriority = statusPriority[currentStatus] ?? 0;
    const newPriority = statusPriority[internalStatus.toLowerCase()] ?? 0;

    // Only advance status, never downgrade
    if (newPriority <= currentPriority && internalStatus !== 'Delivery Failed' && internalStatus !== 'Returned') {
      sendOk();
      return;
    }

    orders[idx] = {
      ...order,
      status: internalStatus,
      updatedAt: now.toISOString(),
      statusSource: 'tracking',
      statusManuallySetAt: null,
      lastEasypostRawStatus: status,
    };
    if ((internalStatus === 'Shipped') && !order.shipDate) {
      orders[idx].shipDate = dateStr;
    }
    if ((internalStatus === 'Delivered') && !order.deliveryDate) {
      orders[idx].deliveryDate = dateStr;
    }

    await userRef.update({
      orders,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const pushEngine = require('./pushNotificationEngine');
      await pushEngine.handleEasyPostTrackingPush(userId, orders[idx], status, previousRaw);
    } catch (pushErr) {
      logger.warn('EasyPost webhook: push notification failed (non-fatal)', pushErr.message);
    }

    logger.info('EasyPost webhook: updated order', orderId, 'to', internalStatus);
    sendOk();
  }
);
