const admin = require('firebase-admin');
const { logger } = require('firebase-functions');
require('dotenv').config();

const TOKEN_DOC = '_config/marketplaceTokens';

async function getAppCredentials(platform) {
  const envMap = {
    etsy: {
      clientId: process.env.ETSY_CLIENT_ID,
      clientSecret: process.env.ETSY_CLIENT_SECRET,
    },
    tiktok: {
      clientId: process.env.TIKTOK_APP_KEY || process.env.TIKTOK_CLIENT_KEY,
      clientSecret: process.env.TIKTOK_APP_SECRET || process.env.TIKTOK_CLIENT_SECRET,
    },
  };
  const fromEnv = envMap[platform];
  if (fromEnv?.clientId && fromEnv?.clientSecret) {
    return { clientId: fromEnv.clientId.trim(), clientSecret: fromEnv.clientSecret.trim() };
  }
  const snap = await admin.firestore().doc('_config/marketplaceAppCredentials').get();
  if (!snap.exists) return null;
  const data = snap.data()[platform];
  if (!data?.clientId || !data?.clientSecret) return null;
  return { clientId: data.clientId, clientSecret: data.clientSecret };
}

async function getMarketplaceTokens() {
  const doc = await admin.firestore().doc(TOKEN_DOC).get();
  return doc.exists ? doc.data() : { etsy: null, tiktok: null };
}

async function saveMarketplaceToken(platform, tokenData) {
  await admin.firestore().doc(TOKEN_DOC).set(
    { [platform]: { ...tokenData, updatedAt: admin.firestore.FieldValue.serverTimestamp() } },
    { merge: true },
  );
}

async function refreshTokenIfNeeded(platform) {
  const tokens = await getMarketplaceTokens();
  const token = tokens[platform];
  if (!token || !token.accessToken) return null;

  const expiresAt = token.expiresAt?.toDate
    ? token.expiresAt.toDate()
    : token.expiresAt
      ? new Date(token.expiresAt)
      : null;

  if (expiresAt && expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return token;
  }

  if (!token.refreshToken) {
    logger.warn(`${platform} token expired and no refresh token available`);
    return token;
  }

  const credentials = await getAppCredentials(platform);
  if (!credentials) {
    logger.warn(`${platform} credentials missing — cannot refresh token`);
    return token;
  }

  logger.info(`Refreshing ${platform} token...`);

  try {
    if (platform === 'etsy') {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: credentials.clientId,
        refresh_token: token.refreshToken,
      });
      const resp = await fetch('https://api.etsy.com/v3/public/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Etsy refresh failed');

      const updated = {
        ...token,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || token.refreshToken,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (data.expires_in || 3600) * 1000),
        ),
      };
      await saveMarketplaceToken(platform, updated);
      return updated;
    }

    if (platform === 'tiktok') {
      const resp = await fetch('https://auth.tiktok-shops.com/api/v2/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_key: credentials.clientId,
          app_secret: credentials.clientSecret,
          refresh_token: token.refreshToken,
          grant_type: 'refresh_token',
        }),
      });
      const data = await resp.json();
      if (data.code !== 0 || !data.data?.access_token) {
        throw new Error(data.message || 'TikTok refresh failed');
      }

      const d = data.data;
      const updated = {
        ...token,
        accessToken: d.access_token,
        refreshToken: d.refresh_token || token.refreshToken,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + (d.access_token_expire_in || 86400) * 1000),
        ),
        shopCipher: d.shop_cipher || token.shopCipher,
      };
      await saveMarketplaceToken(platform, updated);
      return updated;
    }
  } catch (err) {
    logger.error(`Failed to refresh ${platform} token:`, err);
  }

  return token;
}

module.exports = { getMarketplaceTokens, saveMarketplaceToken, refreshTokenIfNeeded };
