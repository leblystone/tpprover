const admin = require('firebase-admin');
const { logger } = require('firebase-functions');

const TOKEN_DOC = '_config/marketplaceTokens';

async function getMarketplaceTokens() {
  const doc = await admin.firestore().doc(TOKEN_DOC).get();
  return doc.exists ? doc.data() : { etsy: null, tiktok: null };
}

async function saveMarketplaceToken(platform, tokenData) {
  await admin.firestore().doc(TOKEN_DOC).set(
    { [platform]: { ...tokenData, updatedAt: admin.firestore.FieldValue.serverTimestamp() } },
    { merge: true }
  );
}

async function refreshTokenIfNeeded(platform) {
  const tokens = await getMarketplaceTokens();
  const token = tokens[platform];
  if (!token || !token.expiresAt) return null;

  const expiresAt = token.expiresAt.toDate ? token.expiresAt.toDate() : new Date(token.expiresAt);
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return token;
  }

  logger.info(`Refreshing ${platform} token...`);
  // TODO: implement actual refresh for each platform
  // Etsy: POST https://api.etsy.com/v3/public/oauth/token with grant_type=refresh_token
  // TikTok: POST https://auth.tiktok-shops.com/api/v2/token/refresh
  return token;
}

module.exports = { getMarketplaceTokens, saveMarketplaceToken, refreshTokenIfNeeded };
