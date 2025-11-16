const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const DEFAULT_CAP = parseInt(process.env.FOUNDER_CAP || '100', 10);
const DEFAULT_DISCOUNT = parseInt(process.env.FOUNDER_DISCOUNT_PERCENT || '0', 10);

// Lazy-load Firestore references to avoid initialization errors
function getDb() {
  return admin.firestore();
}

function getFieldValue() {
  return admin.firestore.FieldValue;
}

function getFounderConfigRef() {
  return getDb().collection('appConfig').doc('founderOffer');
}

function getFounderAnalyticsRef() {
  return getDb().collection('analytics').doc('founderCount');
}

function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallback;
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return fallback;
}

async function ensureFounderConfig(transaction) {
  const configRef = getFounderConfigRef();
  const snapshot = transaction
    ? await transaction.get(configRef)
    : await configRef.get();

  if (snapshot.exists) {
    return snapshot.data();
  }

  const FieldValue = getFieldValue();
  const initialData = {
    enabled: false,
    cap: DEFAULT_CAP,
    totalGranted: 0,
    discountPercent: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (transaction) {
    transaction.set(configRef, initialData, { merge: true });
  } else {
    await configRef.set(initialData, { merge: true });
  }

  return initialData;
}

async function fetchFounderState() {
  try {
    const db = getDb();
    const FieldValue = getFieldValue();
    return await db.runTransaction(async (transaction) => {
      const config = await ensureFounderConfig(transaction);

      const analyticsRef = getFounderAnalyticsRef();
      const analyticsSnap = await transaction.get(analyticsRef);
      const analyticsData = analyticsSnap.exists ? analyticsSnap.data() : {};

      const totalGrantedConfig = normalizeNumber(config.totalGranted, 0);
      const totalGrantedAnalytics = normalizeNumber(analyticsData.totalFounders, 0);

      const totalGranted = Math.max(totalGrantedConfig, totalGrantedAnalytics);
      const cap = normalizeNumber(config.cap, DEFAULT_CAP);

      const normalized = {
        enabled: normalizeBoolean(config.enabled, true),
        cap,
        totalGranted,
        remaining: Math.max(0, cap - totalGranted),
        discountPercent: normalizeNumber(config.discountPercent, DEFAULT_DISCOUNT),
        lastUpdated:
          config.updatedAt ||
          analyticsData.lastUpdated ||
          FieldValue.serverTimestamp(),
      };

      if (totalGranted !== totalGrantedConfig) {
        const configRef = getFounderConfigRef();
        transaction.set(
          configRef,
          {
            totalGranted,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (totalGranted !== totalGrantedAnalytics) {
        const analyticsRef = getFounderAnalyticsRef();
        transaction.set(
          analyticsRef,
          {
            totalFounders: totalGranted,
            lastUpdated: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return normalized;
    });
  } catch (error) {
    logger.error('❌ Transaction failed, using fallback:', error);
    // Fallback: try to read without transaction
    try {
      const configRef = getFounderConfigRef();
      const analyticsRef = getFounderAnalyticsRef();
      const configSnap = await configRef.get();
      const analyticsSnap = await analyticsRef.get();
      
      const config = configSnap.exists ? configSnap.data() : {};
      const analyticsData = analyticsSnap.exists ? analyticsSnap.data() : {};
      
      const totalGranted = Math.max(
        normalizeNumber(config.totalGranted, 0),
        normalizeNumber(analyticsData.totalFounders, 0)
      );
      const cap = normalizeNumber(config.cap, DEFAULT_CAP);
      
      return {
        enabled: normalizeBoolean(config.enabled, true),
        cap,
        totalGranted,
        remaining: Math.max(0, cap - totalGranted),
        discountPercent: normalizeNumber(config.discountPercent, DEFAULT_DISCOUNT),
        lastUpdated: config.updatedAt || analyticsData.lastUpdated || new Date().toISOString(),
      };
    } catch (fallbackError) {
      logger.error('❌ Fallback also failed, using defaults:', fallbackError);
      // Ultimate fallback: return defaults
      return {
        enabled: true,
        cap: DEFAULT_CAP,
        totalGranted: 0,
        remaining: DEFAULT_CAP,
        discountPercent: DEFAULT_DISCOUNT,
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

async function fetchUserFounderSnapshot(userId) {
  if (!userId) {
    return {
      isFounder: false,
      founderNumber: null,
      founderLockedRate: null,
      founderDiscountPercent: null,
    };
  }

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return {
        isFounder: false,
        founderNumber: null,
        founderLockedRate: null,
        founderDiscountPercent: null,
      };
    }

    const data = userSnap.data();
    const subscription = data.subscription || {};

    return {
      isFounder: Boolean(
        data.isFounder ||
          subscription.isFounder ||
          subscription.founderPricing ||
          subscription.interval === 'founder'
      ),
      founderNumber: data.founderNumber || null,
      founderLockedRate: subscription.founderLockedRate || null,
      founderDiscountPercent:
        subscription.founderDiscountPercent ||
        data.founderDiscountPercent ||
        null,
    };
  } catch (error) {
    logger.error('❌ Failed to fetch user founder snapshot:', error);
    return {
      isFounder: false,
      founderNumber: null,
      founderLockedRate: null,
      founderDiscountPercent: null,
    };
  }
}

async function buildFounderOfferResponse(userId) {
  const state = await fetchFounderState();
  const userSnapshot = await fetchUserFounderSnapshot(userId);

  const couponConfigured = Boolean(process.env.STRIPE_FOUNDER_COUPON_ID);
  const lifetimeConfigured = Boolean(process.env.STRIPE_FOUNDER_LIFETIME_PRICE_ID);

  return {
    ...state,
    isFounder: userSnapshot.isFounder,
    founderNumber: userSnapshot.founderNumber,
    founderLockedRate: userSnapshot.founderLockedRate,
    founderDiscountPercent:
      userSnapshot.founderDiscountPercent ?? state.discountPercent,
    couponConfigured,
    lifetimePriceConfigured: lifetimeConfigured,
  };
}

exports.getFounderOfferStatus = onCall(
  {
    cors: true,
    invoker: 'public', // Allow unauthenticated access
  },
  async (request) => {
    try {
      logger.info('📊 getFounderOfferStatus called');
      const userId = request.auth?.uid || null;
      logger.info('📊 User ID:', userId || 'anonymous');
      
      const response = await buildFounderOfferResponse(userId);
      logger.info('✅ getFounderOfferStatus success:', {
        enabled: response.enabled,
        remaining: response.remaining,
        isFounder: response.isFounder
      });
      
      return {
        success: true,
        ...response,
      };
    } catch (error) {
      logger.error('❌ getFounderOfferStatus failed:', error);
      logger.error('❌ Error stack:', error.stack);
      
      // Return a safe default response instead of throwing
      return {
        success: false,
        enabled: true,
        cap: DEFAULT_CAP,
        totalGranted: 0,
        remaining: DEFAULT_CAP,
        discountPercent: DEFAULT_DISCOUNT,
        isFounder: false,
        founderNumber: null,
        couponConfigured: false,
        lifetimePriceConfigured: false,
        message: error.message || 'Unable to load founder offer status',
        error: error.code || 'unknown_error',
      };
    }
  }
);

module.exports = {
  getFounderOfferStatus: exports.getFounderOfferStatus,
  buildFounderOfferResponse,
  fetchFounderState,
};

