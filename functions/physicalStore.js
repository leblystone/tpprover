const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

require('dotenv').config();

let _stripeClient = null;

/** Physical shop only — never fall back to app subscription STRIPE_SECRET_KEY. */
function getShopStripe() {
  if (_stripeClient) return _stripeClient;
  const key = process.env.STRIPE_SHOP_SECRET_KEY;
  if (!key || key === 'sk_test_fallback_key') return null;
  _stripeClient = require('stripe')(key);
  return _stripeClient;
}

function stripeErrorMessage(err) {
  const raw = err?.raw?.message || err?.message || 'Unknown Stripe error';
  const code = err?.code || err?.raw?.code;
  const param = err?.param || err?.raw?.param;
  return code ? `${raw} (${code}${param ? `, ${param}` : ''})` : raw;
}

function buildShippingOptions() {
  const groundRate =
    process.env.STRIPE_SHIPPING_RATE_GROUND || 'shr_1TZb2v9Zv4lzK1k8gmofAuHY';
  const priorityRate =
    process.env.STRIPE_SHIPPING_RATE_PRIORITY || 'shr_1TZbaS9Zv4lzK1k8eR3NQM9w';
  return [
    { shipping_rate: groundRate },
    { shipping_rate: priorityRate },
  ];
}

/** Inline fallback if Dashboard shipping rate IDs are missing on this API key. */
function buildInlineShippingOptions() {
  return [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 600, currency: 'usd' },
        display_name: 'USPS Ground',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 3 },
          maximum: { unit: 'business_day', value: 7 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 2000, currency: 'usd' },
        display_name: 'USPS Priority',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 1 },
          maximum: { unit: 'business_day', value: 3 },
        },
      },
    },
  ];
}

async function createCheckoutWithFallbacks(stripe, basePayload) {
  const attempts = [];

  const withShippingIds = {
    ...basePayload,
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: buildShippingOptions(),
  };
  attempts.push(withShippingIds);

  const withInlineShipping = {
    ...basePayload,
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: buildInlineShippingOptions(),
  };
  attempts.push(withInlineShipping);

  const addressOnly = {
    ...basePayload,
    shipping_address_collection: { allowed_countries: ['US'] },
  };
  attempts.push(addressOnly);

  let lastErr;
  for (let i = 0; i < attempts.length; i += 1) {
    const payload = { ...attempts[i] };
    try {
      return await stripe.checkout.sessions.create(payload);
    } catch (err) {
      lastErr = err;
      const msg = stripeErrorMessage(err);
      logger.warn(`Checkout attempt ${i + 1} failed: ${msg}`);

      if (payload.automatic_tax?.enabled && /tax/i.test(msg)) {
        try {
          const { automatic_tax, ...noTax } = payload;
          return await stripe.checkout.sessions.create(noTax);
        } catch (taxRetryErr) {
          lastErr = taxRetryErr;
          logger.warn(`Checkout attempt ${i + 1} (no tax) failed: ${stripeErrorMessage(taxRetryErr)}`);
        }
      }
    }
  }
  throw lastErr;
}

const ALLOWED_ORIGINS = [
  'https://thepepplanner.app',
  'https://www.thepepplanner.app',
  'https://thepepplanner.com',
  'https://www.thepepplanner.com',
];

if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000');
}

function getBaseUrl(request) {
  const origin = request.rawRequest?.headers?.origin || request.rawRequest?.headers?.referer || '';
  if (origin) {
    try {
      const { protocol, host } = new URL(origin);
      if (host === 'localhost' || host.startsWith('127.0.0.1') || host.startsWith('192.168.')) {
        return `${protocol}//${host}`;
      }
    } catch {
      /* ignore malformed origin */
    }
    for (const allowed of ALLOWED_ORIGINS) {
      if (origin.startsWith(allowed)) return allowed;
    }
  }
  return 'https://thepepplanner.app';
}

/**
 * Create a Stripe Checkout Session for physical/digital product orders.
 * No authentication required — supports guest checkout.
 */
exports.createPhysicalCheckoutSession = onCall(
  { cors: true, enforceAppCheck: false, secrets: ['STRIPE_SHOP_SECRET_KEY'] },
  async (request) => {
    const stripe = getShopStripe();
    if (!stripe) {
      throw new HttpsError(
        'failed-precondition',
        'Shop Stripe is not configured. Set STRIPE_SHOP_SECRET_KEY in Firebase secrets (shop account, not app subscriptions).'
      );
    }

    const { lineItems, customerEmail } = request.data || {};

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new HttpsError('invalid-argument', 'Cart is empty.');
    }

    for (const item of lineItems) {
      if (!item.priceId || typeof item.priceId !== 'string') {
        throw new HttpsError('invalid-argument', 'A product is missing its Stripe price. Update it in Admin → Shop Products.');
      }
      if (!item.quantity || item.quantity < 1) {
        throw new HttpsError('invalid-argument', 'Each item must have quantity >= 1.');
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
        throw new HttpsError(
          'failed-precondition',
          `Product with price "${item.priceId}" is no longer available. Check the Stripe price ID in admin.`
        );
      }
    }

    const hasPhysical = lineItems.some((i) => i.requiresShipping !== false);

    const baseUrl = getBaseUrl(request);
    const userId = request.auth?.uid || 'guest';

    const sessionPayload = {
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
      allow_promotion_codes: true,
      custom_fields: [
        {
          key: 'gift_message',
          label: { type: 'custom', custom: 'Gift message (optional)' },
          type: 'text',
          optional: true,
        },
        {
          key: 'customer_phone',
          label: { type: 'custom', custom: 'Phone for shipping updates (optional)' },
          type: 'text',
          optional: true,
        },
      ],
    };

    if (customerEmail) {
      sessionPayload.customer_email = customerEmail;
    } else if (request.auth?.token?.email) {
      sessionPayload.customer_email = request.auth.token.email;
    }

    try {
      const session = hasPhysical
        ? await createCheckoutWithFallbacks(stripe, sessionPayload)
        : await stripe.checkout.sessions.create(sessionPayload).catch(async (err) => {
            const msg = stripeErrorMessage(err);
            if (sessionPayload.automatic_tax?.enabled && /tax/i.test(msg)) {
              const { automatic_tax, ...noTax } = sessionPayload;
              return stripe.checkout.sessions.create(noTax);
            }
            throw err;
          });

      if (!session.url) {
        throw new HttpsError('internal', 'Stripe did not return a checkout URL. Please try again.');
      }
      logger.info(`🛒 Physical checkout session created: ${session.id} (${lineItems.length} items, userId: ${userId})`);
      return { id: session.id, url: session.url };
    } catch (error) {
      logger.error('❌ Physical checkout session error:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', `Stripe checkout failed: ${stripeErrorMessage(error)}`);
    }
  }
);

/**
 * Retrieve a completed physical order session for the success page.
 * Returns a summary — no auth required so guests can see their confirmation.
 */
exports.getPhysicalOrderSession = onCall(
  { cors: true, enforceAppCheck: false, secrets: ['STRIPE_SHOP_SECRET_KEY'] },
  async (request) => {
    const stripe = getShopStripe();
    if (!stripe) throw new HttpsError('failed-precondition', 'Shop Stripe is not configured.');

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
