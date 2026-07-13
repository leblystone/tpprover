/**
 * Merge subscription docs and refresh cancel-at-period-end from Stripe for admin views.
 */
const logger = require('firebase-functions/logger');

function isCancelFlagTruthy(val) {
  return val === true || val === 'true' || val === 1;
}

/**
 * Prefer userSubscriptions.subscription, merge cancel flags from users.subscription.
 */
function coalesceSubscriptionForAdmin(subscriptionDoc, userData) {
  const nested = subscriptionDoc?.subscription;
  const userSub = userData?.subscription || null;
  let base = nested || userSub || null;
  if (!base) return null;

  if (nested && userSub) {
    base = { ...userSub, ...nested };
  }

  const cancelAtPeriodEnd =
    isCancelFlagTruthy(base.cancelAtPeriodEnd) ||
    isCancelFlagTruthy(base.cancel_at_period_end) ||
    isCancelFlagTruthy(userSub?.cancelAtPeriodEnd) ||
    isCancelFlagTruthy(userSub?.cancel_at_period_end) ||
    isCancelFlagTruthy(nested?.cancelAtPeriodEnd) ||
    isCancelFlagTruthy(nested?.cancel_at_period_end);

  if (cancelAtPeriodEnd) {
    base = { ...base, cancelAtPeriodEnd: true, cancel_at_period_end: true };
  }

  const stripeCustomerId =
    base.stripeCustomerId || userData?.stripeCustomerId || nested?.stripeCustomerId || userSub?.stripeCustomerId;
  if (stripeCustomerId && !base.stripeCustomerId) {
    base = { ...base, stripeCustomerId };
  }

  return base;
}

async function enrichSubscriptionFromStripe(subscription, userData, userId, db) {
  if (!subscription || !process.env.STRIPE_SECRET_KEY) return subscription;

  const provider = subscription.paymentProvider || subscription.source || subscription.platform;
  const hasStripeIds =
    subscription.stripeSubscriptionId ||
    subscription.stripeCustomerId ||
    subscription.id?.startsWith?.('sub_') ||
    userData?.stripeCustomerId;

  const isStripe =
    provider === 'stripe' ||
    provider === 'squarespace' ||
    hasStripeIds;

  if (!isStripe) return subscription;

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  try {
    let stripeSub = null;
    const subId = subscription.stripeSubscriptionId || (subscription.id?.startsWith?.('sub_') ? subscription.id : null);
    const customerId = subscription.stripeCustomerId || userData?.stripeCustomerId;

    if (subId) {
      stripeSub = await stripe.subscriptions.retrieve(subId);
    } else if (customerId) {
      const list = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
      stripeSub =
        list.data.find((s) => s.cancel_at_period_end) ||
        list.data.find((s) => s.status === 'active' || s.status === 'trialing') ||
        list.data[0] ||
        null;
    } else if (userData?.email) {
      const customers = await stripe.customers.list({ email: userData.email, limit: 1 });
      if (customers.data[0]) {
        const list = await stripe.subscriptions.list({ customer: customers.data[0].id, status: 'all', limit: 10 });
        stripeSub =
          list.data.find((s) => s.cancel_at_period_end) ||
          list.data.find((s) => s.status === 'active' || s.status === 'trialing') ||
          list.data[0] ||
          null;
      }
    }

    if (!stripeSub) return subscription;

    const cancelAtPeriodEnd = stripeSub.cancel_at_period_end === true;
    const cancelAt = stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000).toISOString() : null;
    const currentPeriodEnd = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : subscription.currentPeriodEnd;

    const enriched = {
      ...subscription,
      status: stripeSub.status || subscription.status,
      stripeSubscriptionId: stripeSub.id,
      stripeCustomerId: stripeSub.customer || customerId || subscription.stripeCustomerId,
      cancelAtPeriodEnd: cancelAtPeriodEnd || subscription.cancelAtPeriodEnd === true,
      cancel_at_period_end: cancelAtPeriodEnd,
      cancelAt: cancelAt || subscription.cancelAt || null,
      currentPeriodEnd: currentPeriodEnd || subscription.currentPeriodEnd,
      paymentProvider: subscription.paymentProvider || 'stripe',
      platform: subscription.platform || 'stripe',
      _billingEnrichedFromStripe: true,
    };

    const firestoreMissingCancel =
      cancelAtPeriodEnd && !isCancelFlagTruthy(subscription.cancelAtPeriodEnd);

    if (firestoreMissingCancel && db && userId) {
      const FieldValue = require('firebase-admin').firestore.FieldValue;
      const updates = {
        'subscription.cancelAtPeriodEnd': true,
        'subscription.cancel_at_period_end': true,
        lastUpdated: FieldValue.serverTimestamp(),
      };
      if (cancelAt) updates['subscription.cancelAt'] = cancelAt;
      if (currentPeriodEnd) updates['subscription.currentPeriodEnd'] = currentPeriodEnd;

      db.collection('userSubscriptions')
        .doc(userId)
        .update(updates)
        .catch((err) => logger.warn('Failed to patch userSubscriptions cancel flag', userId, err.message));

      db.collection('users')
        .doc(userId)
        .update(updates)
        .catch((err) => logger.warn('Failed to patch users cancel flag', userId, err.message));
    }

    return enriched;
  } catch (err) {
    logger.warn('Stripe subscription enrich failed', userId, err.message);
    return subscription;
  }
}

module.exports = {
  coalesceSubscriptionForAdmin,
  enrichSubscriptionFromStripe,
  isCancelFlagTruthy,
};
