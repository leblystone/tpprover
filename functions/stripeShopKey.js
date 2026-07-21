/** Strip whitespace/quotes Firebase secrets often pick up when pasted. */
function sanitizeSecret(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  return trimmed || null;
}

function getStripeShopSecretKey() {
  const key = sanitizeSecret(process.env.STRIPE_SHOP_SECRET_KEY);
  if (!key || key === 'sk_test_fallback_key') return null;
  return key;
}

function getStripeShopWebhookSecret() {
  return sanitizeSecret(process.env.STRIPE_SHOP_WEBHOOK_SECRET);
}

/** Basil+ stores ship-to on collected_information.shipping_details (not top-level shipping_details). */
const SHOP_STRIPE_API_VERSION = '2025-03-31.basil';

let _stripeClient = null;

function getShopStripe() {
  if (_stripeClient) return _stripeClient;
  const key = getStripeShopSecretKey();
  if (!key) return null;
  _stripeClient = require('stripe')(key, { apiVersion: SHOP_STRIPE_API_VERSION });
  return _stripeClient;
}

module.exports = {
  sanitizeSecret,
  getStripeShopSecretKey,
  getStripeShopWebhookSecret,
  getShopStripe,
};
