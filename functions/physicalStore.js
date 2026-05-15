const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

require('dotenv').config();

let _stripeClient = null;
function getStripe() {
  if (_stripeClient) return _stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_fallback_key') return null;
  _stripeClient = require('stripe')(key);
  return _stripeClient;
}
const keyAtLoad = process.env.STRIPE_SECRET_KEY;
if (keyAtLoad && keyAtLoad !== 'sk_test_fallback_key') {
  _stripeClient = require('stripe')(keyAtLoad);
}

const ALLOWED_ORIGINS = [
  'https://thepepplanner.app',
  'https://www.thepepplanner.app',
  'https://thepepplanner.com',
  'https://www.thepepplanner.com',
];

if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000');
}

function getBaseUrl(request) {
  const origin = request.rawRequest?.headers?.origin || request.rawRequest?.headers?.referer || '';
  for (const allowed of ALLOWED_ORIGINS) {
    if (origin.startsWith(allowed)) return allowed;
  }
  return 'https://thepepplanner.app';
}

/**
 * Create a Stripe Checkout Session for physical/digital product orders.
 * No authentication required — supports guest checkout.
 */
exports.createPhysicalCheckoutSession = onCall(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY.');
    }

    const { lineItems, customerEmail } = request.data || {};

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new Error('lineItems array is required and must not be empty.');
    }

    for (const item of lineItems) {
      if (!item.priceId || typeof item.priceId !== 'string') {
        throw new Error('Each lineItem must have a valid priceId string.');
      }
      if (!item.quantity || item.quantity < 1) {
        throw new Error('Each lineItem must have a quantity >= 1.');
      }
    }

    // Validate each priceId exists in Firestore and is active
    const db = admin.firestore();
    const productsSnap = await db.collection('shopProducts').where('active', '==', true).get();
    const validPriceIds = new Set();
    productsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.stripePriceId) validPriceIds.add(data.stripePriceId);
    });

    for (const item of lineItems) {
      if (!validPriceIds.has(item.priceId)) {
        logger.warn(`Rejected checkout: priceId "${item.priceId}" not found in active shopProducts`);
        throw new Error(`Product with price "${item.priceId}" is no longer available.`);
      }
    }

    const hasPhysical = lineItems.some((i) => i.requiresShipping !== false);

    const baseUrl = getBaseUrl(request);
    const userId = request.auth?.uid || 'guest';

    const sessionPayload = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems.map((item) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      metadata: {
        type: 'physical_order',
        userId,
        hasPhysical: hasPhysical ? 'true' : 'false',
      },
      success_url: `${baseUrl}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/shop`,
      automatic_tax: { enabled: true },
    };

    if (hasPhysical) {
      sessionPayload.shipping_address_collection = {
        allowed_countries: [
          'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'NL', 'SE', 'DK', 'NO',
          'FI', 'IE', 'NZ', 'AT', 'BE', 'CH', 'ES', 'IT', 'PT', 'JP',
        ],
      };
    }

    if (customerEmail) {
      sessionPayload.customer_email = customerEmail;
    } else if (request.auth?.token?.email) {
      sessionPayload.customer_email = request.auth.token.email;
    }

    try {
      const session = await stripe.checkout.sessions.create(sessionPayload);
      logger.info(`🛒 Physical checkout session created: ${session.id} (${lineItems.length} items, userId: ${userId})`);
      return { id: session.id, url: session.url };
    } catch (error) {
      logger.error('❌ Physical checkout session error:', error);
      throw new Error(`Stripe Error: ${error.message}`);
    }
  }
);

/**
 * Retrieve a completed physical order session for the success page.
 * Returns a summary — no auth required so guests can see their confirmation.
 */
exports.getPhysicalOrderSession = onCall(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    const stripe = getStripe();
    if (!stripe) throw new Error('Stripe is not configured.');

    const { sessionId } = request.data || {};
    if (!sessionId) throw new Error('sessionId is required.');

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'line_items.data.price.product'],
      });

      if (session.metadata?.type !== 'physical_order') {
        throw new Error('Session is not a physical order.');
      }

      return {
        customerName: session.customer_details?.name || null,
        customerEmail: session.customer_details?.email || null,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        shipping: session.shipping_details || null,
        items: (session.line_items?.data || []).map((li) => ({
          name: li.description || li.price?.product?.name || 'Item',
          quantity: li.quantity,
          amountTotal: li.amount_total,
        })),
      };
    } catch (error) {
      logger.error('❌ getPhysicalOrderSession error:', error);
      throw new Error(error.message);
    }
  }
);
