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

/**
 * Webhook payloads often omit shipping_details and custom_fields.
 * Retrieve the full Checkout Session when address/customer data is missing.
 */
async function enrichPhysicalCheckoutSession(session, stripe) {
  let s = session || {};

  const hasShippingLine = Boolean(
    s.shipping_details?.address?.line1
    || s.collected_information?.shipping_details?.address?.line1
  );

  const hasCustomerEmail = Boolean(
    s.customer_details?.email
    || s.customer_email
    || s.collected_information?.customer_details?.email
  );

  const needsRetrieve = stripe && s.id && (!hasShippingLine || !hasCustomerEmail);

  if (needsRetrieve) {
    try {
      s = await stripe.checkout.sessions.retrieve(s.id, {
        expand: ['line_items', 'line_items.data.price.product'],
      });
    } catch (err) {
      logger.warn(`checkout session retrieve failed for ${s.id}:`, err.message);
    }
  }

  const shippingDetails =
    s.shipping_details
    || s.collected_information?.shipping_details
    || null;

  const customerDetails =
    s.customer_details
    || s.collected_information?.customer_details
    || null;

  const rawEmail =
    customerDetails?.email
    || s.customer_email
    || s.customer_details?.email
    || null;

  const customerEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
  const customerName = customerDetails?.name || s.customer_details?.name || null;
  const shippingName = shippingDetails?.name || customerName;
  const shippingAddress = normalizeAddress(shippingDetails?.address);
  const billingAddress = normalizeAddress(customerDetails?.address);
  const customerPhone =
    extractCustomField(s, 'customer_phone')
    || customerDetails?.phone
    || null;
  const giftMessage = extractCustomField(s, 'gift_message');

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
};
