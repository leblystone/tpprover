/**
 * Recovery function to find and fix users who paid for lifetime but don't have lifetime access
 * This scans Stripe for successful lifetime payments and grants access to users who don't have it
 */

const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const FieldValue = admin.firestore.FieldValue;
const DEFAULT_LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || null;
const FOUNDER_LIFETIME_PRICE_ID = process.env.STRIPE_FOUNDER_LIFETIME_PRICE_ID || null;

function isLifetimePriceId(priceId) {
  if (!priceId) return false;
  const normalized = String(priceId);
  return [DEFAULT_LIFETIME_PRICE_ID, FOUNDER_LIFETIME_PRICE_ID]
    .filter(Boolean)
    .includes(normalized);
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

async function findUserIdByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const snapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}

async function grantLifetimeAccess(userId, email, paymentIntentId, amountPaid, currency, reason) {
  const db = admin.firestore();
  const normalizedEmail = normalizeEmail(email);
  const now = FieldValue.serverTimestamp();

  // Update lifetimeAccess collection
  await db.collection('lifetimeAccess').doc(userId).set({
    userId,
    email: normalizedEmail,
    reason,
    grantedBy: 'recovery-script',
    grantedAt: now,
    status: 'active',
    hasLifetimeAccess: true,
    metadata: {
      stripePaymentIntentId: paymentIntentId,
      amountPaid,
      currency,
      recoveredAt: new Date().toISOString()
    }
  }, { merge: true });

  // Update userSubscriptions collection (CRITICAL - this is what the app reads)
  const subscriptionData = {
    hasLifetimeAccess: true,
    interval: 'lifetime',
    status: 'active',
    plan: 'lifetime',
    lifetimeReason: reason,
    lifetimeGrantedAt: now,
    currentPeriodEnd: null,
    currentPeriodStart: now,
    userId,
    stripePaymentIntentId: paymentIntentId,
    amountPaid,
    currency,
    lastUpdated: now
  };

  await db.collection('userSubscriptions').doc(userId).set({
    subscription: subscriptionData,
    lastUpdated: now
  }, { merge: true });

  // Update users collection
  await db.collection('users').doc(userId).set({
    subscription: subscriptionData,
    updatedAt: now
  }, { merge: true });

  logger.info(`✅ Granted lifetime access to ${userId} (${normalizedEmail})`);
}

/**
 * Recovery function to find and fix users who paid for lifetime but don't have access
 */
exports.recoverLifetimePurchases = onCall(
  {
    cors: true
  },
  async (request) => {
    try {
      const { dryRun = false, limit = 100 } = request.data || {};
      
      logger.info(`🔍 Starting lifetime purchase recovery (dryRun: ${dryRun}, limit: ${limit})`);

      const db = admin.firestore();
      const results = {
        scanned: 0,
        found: 0,
        fixed: 0,
        skipped: 0,
        errors: [],
        details: []
      };

      // Get all successful payment intents from the last 90 days
      const cutoffDate = Math.floor((Date.now() - (90 * 24 * 60 * 60 * 1000)) / 1000);
      
      logger.info(`📅 Scanning payment intents since ${new Date(cutoffDate * 1000).toISOString()}`);

      let hasMore = true;
      let startingAfter = null;

      while (hasMore && results.scanned < limit) {
        const params = {
          limit: Math.min(100, limit - results.scanned),
          created: { gte: cutoffDate }
        };
        
        if (startingAfter) {
          params.starting_after = startingAfter;
        }

        const paymentIntents = await stripe.paymentIntents.list(params);
        results.scanned += paymentIntents.data.length;

        for (const pi of paymentIntents.data) {
          // Only process succeeded payments
          if (pi.status !== 'succeeded') continue;

          const metadata = pi.metadata || {};
          const priceId = metadata.priceId || null;
          const planName = metadata.planName || '';
          
          // Check if this is a lifetime purchase
          const isLifetimePurchase = 
            metadata.isLifetime === 'true' ||
            isLifetimePriceId(priceId) ||
            planName.toLowerCase().includes('lifetime');

          if (!isLifetimePurchase || metadata.isGift === 'true') {
            continue;
          }

          results.found++;

          // Get customer email
          let userEmail = null;
          try {
            if (pi.customer) {
              const customer = await stripe.customers.retrieve(pi.customer);
              userEmail = customer.email;
            }
          } catch (err) {
            logger.warn(`⚠️ Could not retrieve customer for payment intent ${pi.id}:`, err.message);
          }

          if (!userEmail) {
            userEmail = pi.receipt_email || metadata.userEmail;
          }

          if (!userEmail) {
            results.errors.push({
              paymentIntentId: pi.id,
              error: 'No email found'
            });
            continue;
          }

          // Find user by email
          const userId = metadata.userId || await findUserIdByEmail(userEmail);

          if (!userId) {
            logger.info(`ℹ️ User not found for email ${userEmail}, payment intent ${pi.id} - will be pre-granted on signup`);
            results.skipped++;
            continue;
          }

          // Check if user already has lifetime access
          const subscriptionDoc = await db.collection('userSubscriptions').doc(userId).get();
          const subscription = subscriptionDoc.exists() ? subscriptionDoc.data()?.subscription : null;
          
          const hasLifetimeAccess = 
            subscription?.hasLifetimeAccess === true ||
            subscription?.interval === 'lifetime' ||
            subscription?.plan === 'lifetime';

          if (hasLifetimeAccess) {
            logger.info(`ℹ️ User ${userId} already has lifetime access`);
            results.skipped++;
            continue;
          }

          // Grant lifetime access
          const amountPaid = pi.amount / 100;
          const currency = pi.currency.toUpperCase();
          const reason = `Lifetime Purchase Recovery - Payment Intent ${pi.id}`;

          if (!dryRun) {
            try {
              await grantLifetimeAccess(userId, userEmail, pi.id, amountPaid, currency, reason);
              results.fixed++;
              results.details.push({
                userId,
                email: userEmail,
                paymentIntentId: pi.id,
                amountPaid,
                currency,
                status: 'fixed'
              });
            } catch (error) {
              logger.error(`❌ Failed to grant lifetime access to ${userId}:`, error);
              results.errors.push({
                userId,
                email: userEmail,
                paymentIntentId: pi.id,
                error: error.message
              });
            }
          } else {
            results.details.push({
              userId,
              email: userEmail,
              paymentIntentId: pi.id,
              amountPaid,
              currency,
              status: 'would_fix'
            });
          }
        }

        hasMore = paymentIntents.has_more;
        if (paymentIntents.data.length > 0) {
          startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
        }
      }

      logger.info(`✅ Recovery complete:`, {
        scanned: results.scanned,
        found: results.found,
        fixed: results.fixed,
        skipped: results.skipped,
        errors: results.errors.length
      });

      return {
        success: true,
        dryRun,
        results
      };

    } catch (error) {
      logger.error('❌ Recovery function failed:', error);
      throw new Error(`Recovery failed: ${error.message}`);
    }
  }
);

