/**
 * adminManualAppleGrant
 *
 * Admin-callable function to manually write an Apple IAP subscription to Firestore.
 * Used when the client-side verifyAppleReceipt call failed after a successful StoreKit
 * purchase (e.g. network error, function cold-start timeout, receipt mismatch).
 *
 * Mirrors the planMapping in appleInAppPurchase.js — keep in sync.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const FieldValue = admin.firestore.FieldValue;

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

const FOUNDERS_CUTOFF_MS = new Date('2026-05-05T00:00:00.000Z').getTime();

const PLAN_MAPPING = {
  'apple.monthly':  { key: 'monthly',              name: 'Monthly',              interval: 'month',    tier: 'founder' },
  'apple.annual':   { key: 'annual',               name: 'Annual',               interval: 'year',     tier: 'founder' },
  'lifetime.apple': { key: 'lifetime',             name: 'Lifetime Access',       interval: 'lifetime', tier: 'founder' },
  'apple.researchplus.monthly':  { key: 'researchPlusMonthly',  name: 'Research+ Monthly',  interval: 'month',    tier: 'research_plus' },
  'apple.researchplus.annual':   { key: 'researchPlusAnnual',   name: 'Research+ Annual',   interval: 'year',     tier: 'research_plus' },
  'apple.researchplus.lifetime': { key: 'researchPlusLifetime', name: 'Research+ Lifetime', interval: 'lifetime', tier: 'research_plus' },
};

async function resolveUserTier(userId, baseTier, db) {
  if (!baseTier || baseTier === 'free') return baseTier;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return baseTier;
    const raw = userDoc.data().createdAt;
    if (!raw) return baseTier;
    const createdMs = raw?.toDate ? raw.toDate().getTime() : new Date(raw).getTime();
    if (isNaN(createdMs)) return baseTier;
    if (createdMs < FOUNDERS_CUTOFF_MS) {
      logger.info(`👑 Founder tier resolved for pre-cutoff user ${userId}`);
      return 'founder';
    }
    return baseTier;
  } catch (e) {
    logger.warn(`⚠️ Could not resolve user tier for ${userId}: ${e.message}`);
    return baseTier;
  }
}

exports.adminManualAppleGrant = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');
    const callerEmail = request.auth.token.email;
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const { userId, productId, reason, adminNote } = request.data;
    if (!userId) throw new HttpsError('invalid-argument', 'userId is required');

    const resolvedProductId = productId || 'apple.researchplus.annual';
    const planDetails = PLAN_MAPPING[resolvedProductId];

    if (!planDetails) {
      throw new HttpsError(
        'invalid-argument',
        `Unknown product ID: ${resolvedProductId}. Valid IDs: ${Object.keys(PLAN_MAPPING).join(', ')}`
      );
    }

    const db = admin.firestore();

    // Resolve email from users doc
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new HttpsError('not-found', `User ${userId} not found`);
    const userEmail = userDoc.data().email || null;

    // Apply founder override if account predates cutoff
    const resolvedTier = await resolveUserTier(userId, planDetails.tier, db);

    const now = new Date();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const periodEnd = planDetails.interval === 'year'
      ? new Date(now.getTime() + oneYearMs)
      : planDetails.interval === 'month'
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : null;

    const subscriptionData = {
      userId,
      userEmail,
      status: 'active',
      tier: resolvedTier,
      plan: planDetails.name,
      planKey: planDetails.key,
      interval: planDetails.interval,
      paymentProvider: 'apple',
      appleProductId: resolvedProductId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      hasLifetimeAccess: planDetails.interval === 'lifetime',
      adminGranted: true,
      adminGrantedAt: FieldValue.serverTimestamp(),
      adminGrantedBy: callerEmail,
      adminGrantReason: reason || 'Manual admin grant — receipt verification failed after StoreKit purchase',
      adminNote: adminNote || null,
      lastUpdated: FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    const subRef = db.collection('userSubscriptions').doc(userId);
    const userRef = db.collection('users').doc(userId);

    batch.set(subRef, { subscription: subscriptionData, lastUpdated: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(userRef, { subscription: subscriptionData, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    // Audit history entry
    batch.set(subRef.collection('history').doc(), {
      eventType: 'admin_manual_apple_grant',
      title: `Admin manually granted ${planDetails.name}`,
      description: `Admin override: ${reason || 'Receipt verification failed after StoreKit purchase'}. Product: ${resolvedProductId}. Tier: ${resolvedTier}. Granted by: ${callerEmail}.`,
      severity: 'warning',
      status: 'active',
      source: 'admin_manual',
      adminGrantedBy: callerEmail,
      appleProductId: resolvedProductId,
      eventTimestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    logger.info(`✅ Admin manually granted Apple IAP subscription for user ${userId} (product: ${resolvedProductId}, tier: ${resolvedTier}) by ${callerEmail}`);

    return {
      success: true,
      userId,
      productId: resolvedProductId,
      tier: resolvedTier,
      plan: planDetails.name,
      interval: planDetails.interval,
      periodEnd: periodEnd ? periodEnd.toISOString() : null,
      message: `Granted ${planDetails.name} (${resolvedTier}) to ${userEmail}`,
    };
  }
);
