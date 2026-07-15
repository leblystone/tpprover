const { logger } = require('firebase-functions');

function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const line1 = (addr.line1 || addr.street1 || addr.address || '').trim();
  if (!line1) return null;
  return {
    line1,
    line2: (addr.line2 || addr.street2 || '').trim() || null,
    city: (addr.city || '').trim(),
    state: (addr.state || '').trim(),
    postal_code: (addr.postal_code || addr.zip || '').trim(),
    country: (addr.country || 'US').trim() || 'US',
  };
}

function extractCustomField(session, key) {
  const fields = session?.custom_fields || [];
  const field = fields.find((f) => f.key === key);
  if (!field) return null;
  return field.text?.value || field.dropdown?.value || field.numeric?.value || null;
}

/** Prefer Basil `collected_information`; ignore empty legacy `shipping_details` stubs. */
function pickShippingDetails(session) {
  const collected = session?.collected_information?.shipping_details;
  const legacy = session?.shipping_details;
  if (collected?.address?.line1 || collected?.name) return collected;
  if (legacy?.address?.line1 || legacy?.name) return legacy;
  return collected || legacy || null;
}

function pickCustomerDetails(session) {
  const collected = session?.collected_information?.customer_details;
  const legacy = session?.customer_details;
  if (collected?.email || collected?.name || collected?.phone) return collected;
  if (legacy?.email || legacy?.name || legacy?.phone) return legacy;
  return collected || legacy || null;
}

function pickPaymentIntentShipping(session) {
  const pi = session?.payment_intent;
  if (!pi || typeof pi !== 'object') return null;
  return pi.shipping || null;
}

/**
 * Webhook payloads are often thin, and Stripe API 2025-03-31.basil+ moved shipping off
 * top-level `shipping_details` into `collected_information.shipping_details`.
 * Always re-retrieve the session (with payment_intent) so address / customer fields land.
 */
async function enrichPhysicalCheckoutSession(session, stripe) {
  let s = session || {};

  if (stripe && s.id) {
    try {
      s = await stripe.checkout.sessions.retrieve(s.id, {
        expand: ['line_items', 'line_items.data.price.product', 'payment_intent'],
      });
    } catch (err) {
      logger.warn(`checkout session retrieve failed for ${s.id}:`, err.message);
    }
  }

  let shippingDetails = pickShippingDetails(s);
  const customerDetails = pickCustomerDetails(s);
  const piShipping = pickPaymentIntentShipping(s);

  if (!shippingDetails?.address?.line1 && piShipping?.address?.line1) {
    shippingDetails = {
      name: piShipping.name || shippingDetails?.name || null,
      address: piShipping.address,
      phone: piShipping.phone || null,
    };
  }

  const rawEmail =
    customerDetails?.email
    || s.customer_email
    || s.customer_details?.email
    || s.collected_information?.customer_details?.email
    || null;

  const customerEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
  const customerName =
    customerDetails?.name
    || s.customer_details?.name
    || shippingDetails?.name
    || null;
  const shippingName = shippingDetails?.name || customerName;
  const shippingAddress = normalizeAddress(shippingDetails?.address);
  const billingAddress = normalizeAddress(customerDetails?.address);
  const customerPhone =
    extractCustomField(s, 'customer_phone')
    || customerDetails?.phone
    || shippingDetails?.phone
    || piShipping?.phone
    || null;
  const giftMessage = extractCustomField(s, 'gift_message');

  if (!shippingAddress?.line1) {
    logger.warn(
      `enrichPhysicalCheckoutSession: no shipping address for ${s.id || 'unknown'} `
      + `(has collected_information=${Boolean(s.collected_information)}, `
      + `has payment_intent.shipping=${Boolean(piShipping?.address?.line1)})`
    );
  }

  return {
    session: s,
    customerEmail,
    customerName,
    shippingName,
    shippingAddress,
    billingAddress,
    billingName: customerName,
    customerPhone,
    giftMessage,
    shippingDetails,
    customerDetails,
  };
}

module.exports = {
  enrichPhysicalCheckoutSession,
  normalizeAddress,
  extractCustomField,
  pickShippingDetails,
  pickCustomerDetails,
};
