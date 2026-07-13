const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { syncUserSubscriptionFromStripe } = require('./stripeSubscriptionSync');

/**
 * Manually sync a user's subscription from Stripe to Firestore (admin panel).
 */
exports.manualSyncSubscription = functions.https.onCall(async (data, context) => {
  const { userId, stripeCustomerId } = data.data || data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new functions.https.HttpsError('failed-precondition', 'STRIPE_SECRET_KEY not configured');
  }

  const stripe = require('stripe')(stripeKey);
  const db = admin.firestore();

  try {
    const result = await syncUserSubscriptionFromStripe(db, stripe, userId, { stripeCustomerId });
    if (!result.success) {
      return {
        success: false,
        message:
          result.reason === 'no_stripe_customer'
            ? 'No Stripe customer found for this user'
            : 'No subscriptions found in Stripe for this customer',
        customerId: result.customerId,
      };
    }

    return {
      success: true,
      message: 'Subscription synced successfully',
      subscriptionId: result.subscriptionId,
      status: result.status,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
    };
  } catch (error) {
    console.error('Manual sync failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
