const crypto = require('crypto');

/**
 * Verify EasyPost webhook HMAC signature.
 * Header form: "hmac-sha256-hex=<hex>" or raw hex.
 */
function verifyEasyPostSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
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

module.exports = { verifyEasyPostSignature };
