/**
 * syncMyStripeSubscription
 *
 * User-callable function (auth required) that re-fetches the caller's own
 * Stripe subscription and overwrites their Firestore subscription doc.
 *
 * Mirrors manualSyncSubscription but is locked to request.auth.uid so a user
 * can only ever sync their own data. Safe to expose in the client UI.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

const STRIPE_PRICE_TO_PLAN = {
  // Research+ prices
  'price_1TS5C550b3cktl9XUg2Uvg5d': { tier: 'research_plus', planKey: 'researchPlusMonthly',  interval: 'month',    name: 'Research+ Monthly' },
  'price_1TS5D250b3cktl9XYpr3bhT2': { tier: 'research_plus', planKey: 'researchPlusAnnual',   interval: 'year',     name: 'Research+ Annual' },
  'price_1TS5DS50b3cktl9Xb3gNyL2d': { tier: 'research_plus', planKey: 'researchPlusLifetime', interval: 'lifetime', name: 'Research+ Lifetime' },
};

const FOUNDERS_CUTOFF_MS = new Date('2026-05-05T00:00:00.000Z').getTime();

async function resolveUserTier(userId, baseTier, db) {
  if (!baseTier || baseTier === 'free') return baseTier;
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return baseTier;
    const raw = userDoc.data().createdAt;
    if (!raw) return baseTier;
    const createdMs = raw?.toDate ? raw.toDate().getTime() : new Date(raw).getTime();
    if (isNaN(createdMs)) return baseTier;
    return createdMs < FOUNDERS_CUTOFF_MS ? 'founder' : baseTier;
  } catch {
    return baseTier;
  }
}

exports.syncMyStripeSubscription = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated.');

    const userId = request.auth.uid;
    const db = admin.firestore();
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    logger.info(`🔄 User-initiated Stripe sync for ${userId}`);

    // Look up user doc for stripeCustomerId / email
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) throw new HttpsError('not-found', 'User not found.');
    const userData = userDoc.data();

    let customerId = userData?.stripeCustomerId || userData?.customerId;

    // Also check userSubscriptions doc
    if (!customerId) {
      const subDoc = await db.collection('userSubscriptions').doc(userId).get();
      if (subDoc.exists) {
        customerId = subDoc.data()?.subscription?.stripeCustomerId;
      }
    }

    // Fall back to email lookup in Stripe
    if (!customerId && userData?.email) {
      const customers = await stripe.customers.list({ email: userData.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    if (!customerId) {
      throw new HttpsError('not-found', 'No Stripe account found for this user. If you subscribed via web, please contact support.');
    }

    // Fetch all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10,
      expand: ['data.latest_invoice'],
    });

    if (subscriptions.data.length === 0) {
      throw new HttpsError('not-found', 'No Stripe subscriptions found for your account.');
    }

    // Prefer active/trialing; fall back to most recent
    const activeSub =
      subscriptions.data.find(s => s.status === 'active' || s.status === 'trialing') ||
      subscriptions.data[0];

    const price = activeSub.items?.data?.[0]?.price;
    const planDetails = (price?.id && STRIPE_PRICE_TO_PLAN[price.id]) || {
      tier: 'research_plus',
      planKey: price?.nickname || activeSub.id,
      interval: price?.recurring?.interval || 'month',
      name: price?.nickname || 'Subscription',
    };

    const resolvedTier = await resolveUserTier(userId, planDetails.tier, db);

    const subscriptionData = {
      userId,
      userEmail: userData.email || null,
      status: activeSub.status,
      tier: resolvedTier,
      plan: planDetails.name,
      planKey: planDetails.key || planDetails.planKey,
      interval: planDetails.interval,
      paymentProvider: 'stripe',
      stripeCustomerId: customerId,
      stripeSubscriptionId: activeSub.id,
      currentPeriodStart: activeSub.current_period_start
        ? new Date(activeSub.current_period_start * 1000).toISOString() : null,
      currentPeriodEnd: activeSub.current_period_end
        ? new Date(activeSub.current_period_end * 1000).toISOString() : null,
      cancelAtPeriodEnd: activeSub.cancel_at_period_end || false,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    const subRef = db.collection('userSubscriptions').doc(userId);
    const userRef = db.collection('users').doc(userId);

    batch.set(subRef, {
      subscription: subscriptionData,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    batch.set(userRef, {
      subscription: subscriptionData,
      stripeCustomerId: customerId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    batch.set(subRef.collection('history').doc(), {
      eventType: 'user_stripe_sync',
      title: 'User re-synced Stripe subscription',
      description: `User triggered manual Stripe sync. Found: ${activeSub.id} (${activeSub.status}). Tier: ${resolvedTier}.`,
      severity: 'info',
      status: activeSub.status,
      source: 'user_self_sync',
      stripeSubscriptionId: activeSub.id,
      eventTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    logger.info(`✅ Stripe sync complete for user ${userId}: ${activeSub.id} (${activeSub.status})`);

    return {
      success: true,
      status: activeSub.status,
      plan: planDetails.name,
      interval: planDetails.interval,
      tier: resolvedTier,
      message: `Subscription synced: ${planDetails.name} (${activeSub.status})`,
    };
  }
);
