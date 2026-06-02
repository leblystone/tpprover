// 🔗 Stripe Webhook Handler for The Pep Planner
// Receives Stripe webhook events and triggers appropriate email automation

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');
const pushNotifications = require('./pushNotifications');
const adminAlerts = require('./adminAlerts');

const FieldValue = admin.firestore.FieldValue;
const DEFAULT_FOUNDER_CAP = parseInt(process.env.FOUNDER_CAP || '100', 10);
const DEFAULT_FOUNDER_DISCOUNT = parseInt(process.env.FOUNDER_DISCOUNT_PERCENT || '50', 10);
const DEFAULT_LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || null;
const FOUNDER_LIFETIME_PRICE_ID = process.env.STRIPE_FOUNDER_LIFETIME_PRICE_ID || null;

// Research+ price IDs — hardcoded as fallback so the webhook works even if
// env vars aren't set. Keep in sync with src/config/appConfig.js.
const RP_PRICE_MAP = {
  'price_1TS5C550b3cktl9XUg2Uvg5d': { tier: 'research_plus', planKey: 'researchPlusMonthly' },
  'price_1TS5D250b3cktl9XYpr3bhT2': { tier: 'research_plus', planKey: 'researchPlusAnnual' },
  'price_1TS5DS50b3cktl9Xb3gNyL2d': { tier: 'research_plus', planKey: 'researchPlusLifetime' },
};

function getTierFromPriceId(priceId) {
  if (!priceId) return null;
  return RP_PRICE_MAP[priceId] || null;
}

// Load environment variables
require('dotenv').config();

// Initialize Stripe instance (will be set in the handler after secrets are loaded)
let stripe = null;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

function isLifetimePriceId(priceId) {
  if (!priceId) return false;
  const normalized = String(priceId);
  const knownLifetimeIds = [
    DEFAULT_LIFETIME_PRICE_ID,
    FOUNDER_LIFETIME_PRICE_ID,
    'price_1TS5DS50b3cktl9Xb3gNyL2d', // Research+ Lifetime
  ].filter(Boolean);
  return knownLifetimeIds.includes(normalized);
}

async function linkStripeCustomerToUser(customerId, userId, email) {
  if (!customerId || !userId) {
    return;
  }

  const db = admin.firestore();
  const payload = {
    userId,
    email: normalizeEmail(email),
    linkedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('stripeCustomers').doc(customerId).set(payload, { merge: true });

  await db.collection('users').doc(userId).set({
    stripeCustomerId: customerId,
    subscription: {
      stripeCustomerId: customerId,
      lastUpdated: FieldValue.serverTimestamp()
    },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

async function findUserIdByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  const snapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', normalized)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].id;
}

/**
 * Safely retrieve email from a Stripe charge, handling guest customers (gcus_)
 * which cannot be fetched via the regular customers API endpoint.
 */
async function resolveEmailFromCharge(charge, stripe) {
  // Prefer email directly on the charge — always populated for one-time payments
  const directEmail =
    charge.billing_details?.email ||
    charge.receipt_email ||
    charge.metadata?.userEmail ||
    null;
  if (directEmail) return directEmail;

  // Only attempt customer retrieve for regular cus_ IDs
  const customerId = charge.customer;
  if (customerId && !String(customerId).startsWith('gcus_')) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer.email || null;
    } catch (err) {
      logger.warn(`⚠️ Could not retrieve customer ${customerId}: ${err.message}`);
    }
  }
  return null;
}

async function resolveUserContext({ customerId, userIdHint, emailHint }) {
  const db = admin.firestore();

  if (userIdHint) {
    return { userId: userIdHint, email: normalizeEmail(emailHint) };
  }

  if (customerId) {
    const mappingDoc = await db.collection('stripeCustomers').doc(customerId).get();
    if (mappingDoc.exists) {
      const data = mappingDoc.data();
      return { userId: data.userId, email: normalizeEmail(data.email) };
    }
  }

  if (emailHint) {
    const resolvedUserId = await findUserIdByEmail(emailHint);
    if (resolvedUserId) {
      if (customerId) {
        await linkStripeCustomerToUser(customerId, resolvedUserId, emailHint);
      }
      return { userId: resolvedUserId, email: normalizeEmail(emailHint) };
    }
  }

  return null;
}

function extractPlanDetails(stripeSubscription, invoice) {
  const price = stripeSubscription?.items?.data?.[0]?.price || invoice?.lines?.data?.[0]?.price || null;
  const intervalRaw = price?.recurring?.interval;
  let interval = null;
  if (intervalRaw === 'year') {
    interval = 'year';
  } else if (intervalRaw === 'month') {
    interval = 'month';
  } else if (intervalRaw) {
    interval = intervalRaw;
  }

  const planName =
    price?.nickname ||
    stripeSubscription?.plan?.nickname ||
    invoice?.lines?.data?.[0]?.description ||
    'Research Subscription';

  const amount =
    price?.unit_amount != null
      ? price.unit_amount / 100
      : invoice?.amount_due != null
        ? invoice.amount_due / 100
        : null;

  const currency =
    price?.currency
      ? price.currency.toUpperCase()
      : invoice?.currency
        ? invoice.currency.toUpperCase()
        : null;

  const periodStart = stripeSubscription?.current_period_start
    ? new Date(stripeSubscription.current_period_start * 1000).toISOString()
    : invoice?.lines?.data?.[0]?.period?.start
      ? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
      : null;

  const periodEnd = stripeSubscription?.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000).toISOString()
    : invoice?.lines?.data?.[0]?.period?.end
      ? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
      : null;

  const cancelAt = stripeSubscription?.cancel_at
    ? new Date(stripeSubscription.cancel_at * 1000).toISOString()
    : null;

  const canceledAt = stripeSubscription?.canceled_at
    ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
    : null;

  return {
    planName,
    interval,
    amount,
    currency,
    priceId: price?.id || null,
    periodStart,
    periodEnd,
    cancelAt,
    canceledAt,
  };
}

function sanitizeObject(obj) {
  if (!obj) return {};
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );
}

// Accounts created before this date are grandfathered founders.
const FOUNDERS_CUTOFF_MS = new Date('2026-05-05T00:00:00.000Z').getTime();

/**
 * Returns 'founder' if the user's account predates the founder cutoff and
 * baseTier is a paid tier. Falls back to baseTier on any error.
 */
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

async function upsertSubscriptionState({
  stripeSubscription,
  invoice,
  customer,
  statusOverride,
  paymentState,
  userIdHint,
  emailHint,
  tierOverride,        // explicit tier to stamp (e.g. 'free' on cancellation)
}) {
  const customerId =
    stripeSubscription?.customer ||
    invoice?.customer ||
    customer?.id ||
    null;

  const context = await resolveUserContext({
    customerId,
    userIdHint,
    emailHint: emailHint || customer?.email
  });

  if (!context || !context.userId) {
    logger.warn('⚠️ Unable to resolve user for Stripe customer', customerId, emailHint);
    return;
  }

  if (customerId) {
    await linkStripeCustomerToUser(customerId, context.userId, emailHint || customer?.email);
  }

  const planDetails = extractPlanDetails(stripeSubscription, invoice);
  const subscriptionStatus = statusOverride || stripeSubscription?.status || (paymentState === 'payment_failed' ? 'past_due' : null);

  if (!subscriptionStatus) {
    logger.warn('⚠️ Subscription status unresolved for user', context.userId, 'customer', customerId);
  }

  // Derive tier + planKey from price ID so the frontend resolves correctly.
  // When tierOverride is provided (e.g. 'free' on subscription deletion) it
  // takes precedence so the client never drifts back to a paid tier after expiry.
  const priceIdForTier = planDetails.priceId;
  const tierInfo = getTierFromPriceId(priceIdForTier);
  const db = admin.firestore();
  const rawTier = tierOverride ?? tierInfo?.tier ?? null;
  const derivedTier = rawTier
    ? await resolveUserTier(context.userId, rawTier, db)
    : null;
  const derivedPlanKey = tierInfo?.planKey || null;

  const subscriptionRecord = sanitizeObject({
    id: stripeSubscription?.id || invoice?.subscription || null,
    stripeSubscriptionId: stripeSubscription?.id || invoice?.subscription || null,
    stripeCustomerId: customerId,
    status: subscriptionStatus,
    plan: planDetails.planName,
    planKey: derivedPlanKey,
    tier: derivedTier,
    priceId: planDetails.priceId,
    amount: planDetails.amount,
    currency: planDetails.currency,
    interval: planDetails.interval,
    currentPeriodStart: planDetails.periodStart,
    currentPeriodEnd: planDetails.periodEnd,
    cancelAt: planDetails.cancelAt,
    cancelAtPeriodEnd: stripeSubscription?.cancel_at_period_end ?? false,
    canceledAt: planDetails.canceledAt,
    latestInvoiceId: invoice?.id || stripeSubscription?.latest_invoice || null,
    latestInvoiceStatus: invoice?.status || null,
    latestInvoiceAmountDue: invoice?.amount_due != null ? invoice.amount_due / 100 : null,
    latestInvoiceHostedUrl: invoice?.hosted_invoice_url || null,
    billingStatus: paymentState || null,
    paymentProvider: 'stripe', // Cross-platform: Track subscription source
    statusUpdatedAt: FieldValue.serverTimestamp(),
  });

  const lastInvoiceRecord = invoice ? sanitizeObject({
    id: invoice.id,
    amountDue: invoice.amount_due != null ? invoice.amount_due / 100 : null,
    amountPaid: invoice.amount_paid != null ? invoice.amount_paid / 100 : null,
    currency: invoice.currency ? invoice.currency.toUpperCase() : null,
    status: invoice.status,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    createdAt: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    periodStart: invoice.lines?.data?.[0]?.period?.start ? new Date(invoice.lines.data[0].period.start * 1000).toISOString() : null,
    periodEnd: invoice.lines?.data?.[0]?.period?.end ? new Date(invoice.lines.data[0].period.end * 1000).toISOString() : null,
  }) : null;

  const batch = db.batch();
  const userSubscriptionsRef = db.collection('userSubscriptions').doc(context.userId);
  const userRef = db.collection('users').doc(context.userId);

  const subscriptionUpdate = {
    subscription: {
      ...subscriptionRecord,
      lastUpdated: FieldValue.serverTimestamp(),
    },
    lastUpdated: FieldValue.serverTimestamp(),
  };

  if (lastInvoiceRecord) {
    subscriptionUpdate.lastInvoice = lastInvoiceRecord;
  }

  batch.set(userSubscriptionsRef, subscriptionUpdate, { merge: true });

  const userSubscriptionSnapshot = sanitizeObject({
    status: subscriptionRecord.status,
    plan: subscriptionRecord.plan,
    planKey: subscriptionRecord.planKey,
    tier: subscriptionRecord.tier,
    interval: subscriptionRecord.interval,
    currentPeriodEnd: subscriptionRecord.currentPeriodEnd,
    currentPeriodStart: subscriptionRecord.currentPeriodStart,
    cancelAt: subscriptionRecord.cancelAt || null,
    cancelAtPeriodEnd: subscriptionRecord.cancelAtPeriodEnd ?? false,
    stripeCustomerId: subscriptionRecord.stripeCustomerId,
    stripeSubscriptionId: subscriptionRecord.stripeSubscriptionId,
    latestInvoiceId: subscriptionRecord.latestInvoiceId,
    latestInvoiceStatus: subscriptionRecord.latestInvoiceStatus,
    latestInvoiceAmountDue: subscriptionRecord.latestInvoiceAmountDue,
    billingStatus: subscriptionRecord.billingStatus,
    lastPaymentStatus: paymentState || null,
    lastUpdated: FieldValue.serverTimestamp(),
  });

  if (lastInvoiceRecord) {
    userSubscriptionSnapshot.latestInvoice = lastInvoiceRecord;
  }

  const userExtra = {
    stripeCustomerId: subscriptionRecord.stripeCustomerId,
    subscription: userSubscriptionSnapshot,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (tierOverride === 'free' || subscriptionStatus === 'canceled') {
    userExtra.subscriptionEndedAt = FieldValue.serverTimestamp();
  }
  batch.set(userRef, userExtra, { merge: true });

  // Write subscription history for audit trail
  const historyRef = userSubscriptionsRef.collection('history').doc();
  batch.set(historyRef, {
    ...subscriptionRecord,
    eventTimestamp: FieldValue.serverTimestamp(),
    source: 'stripe_webhook',
  });

  await batch.commit();

  logger.info(`✅ Subscription data synced for user ${context.userId} with status ${subscriptionRecord.status}`);
}

/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 * Endpoint: https://us-central1-tpp-splendide.cloudfunctions.net/stripeWebhook
 */
exports.stripeWebhook = onRequest(
  {
    cors: true,
    invoker: 'public' // Allow unauthenticated access for Stripe webhooks
  },
  async (request, response) => {
    const sig = request.headers['stripe-signature'];

    // Initialize Stripe with secret key from environment/secrets
    if (!stripe) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        logger.error('❌ STRIPE_SECRET_KEY not configured');
        // Return 200 to acknowledge receipt, but log the error
        return response.status(200).json({ 
          received: false, 
          error: 'Stripe not configured' 
        });
      }
      stripe = require('stripe')(stripeSecretKey);
    }

    let event;

    try {
      // Use webhook secret from environment/secrets
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
        // Return 200 to acknowledge receipt, but log the error
        return response.status(200).json({ 
          received: false, 
          error: 'Webhook secret not configured' 
        });
      }

      // Verify webhook signature
      event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
    } catch (err) {
      logger.error(`❌ Webhook signature verification failed: ${err.message}`);
      // Return 200 to acknowledge receipt to Stripe, but log the error
      // Stripe requires 200-299 status codes, so we acknowledge even on errors
      return response.status(200).json({ 
        received: false, 
        error: `Webhook Error: ${err.message}` 
      });
    }

    logger.info(`📥 Received Stripe webhook event: ${event.type} (${event.id})`);

    // Idempotency: skip already-processed events
    const eventRef = admin.firestore().collection('processedWebhookEvents').doc(event.id);
    const existingEvent = await eventRef.get();
    if (existingEvent.exists) {
      logger.info(`⏭️ Event ${event.id} already processed, skipping`);
      return response.status(200).json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event, stripe);
          break;

        // Payment Intent Events
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event, stripe);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event, stripe);
          break;

        // Subscription Events
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event, stripe);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event, stripe);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event, stripe);
          break;

        // Invoice Events
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event, stripe);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event, stripe);
          break;

        case 'invoice.upcoming':
          await handleInvoiceUpcoming(event, stripe);
          break;

        // Charge Events
        case 'charge.succeeded':
          await handleChargeSucceeded(event, stripe);
          break;

        case 'charge.failed':
          await handleChargeFailed(event, stripe);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event, stripe);
          break;

        case 'customer.subscription.trial_will_end':
          await handleTrialWillEnd(event, stripe);
          break;

        case 'customer.subscription.paused':
          await handleSubscriptionPaused(event, stripe);
          break;

        case 'customer.subscription.resumed':
          await handleSubscriptionResumed(event, stripe);
          break;

        // Dispute Events
        case 'charge.dispute.created':
          await handleDisputeCreated(event, stripe);
          break;

        case 'charge.dispute.updated':
          await handleDisputeUpdated(event, stripe);
          break;

        case 'charge.dispute.closed':
          await handleDisputeClosed(event, stripe);
          break;

        case 'checkout.session.expired': {
          const expiredSession = event.data.object;
          const meta = expiredSession.metadata || {};
          if (meta.type === 'physical_order') {
            await handleAbandonedCheckout(expiredSession, stripe);
          }
          break;
        }

        default:
          logger.info(`🤷 Unhandled event type: ${event.type}`);
      }

      // Mark event as processed for idempotency
      await eventRef.set({
        eventType: event.type,
        processedAt: FieldValue.serverTimestamp(),
      });

      response.status(200).json({ received: true, eventType: event.type });
    } catch (error) {
      logger.error(`❌ Error processing webhook ${event.id}: ${error.message}`, error);

      // Return 500 for transient/retryable errors so Stripe retries
      // Return 200 for permanent errors to stop retries
      const isTransient = error.code === 'UNAVAILABLE' || 
                          error.code === 'DEADLINE_EXCEEDED' ||
                          error.message?.includes('ECONNRESET') ||
                          error.message?.includes('timeout');
      
      if (isTransient) {
        response.status(500).json({ error: error.message, retryable: true });
      } else {
        adminAlerts.alertWebhookFailure('stripe', event.type, error.message).catch(() => {});
        await admin.firestore().collection('webhookFailures').add({
          eventId: event.id,
          eventType: event.type,
          error: error.message,
          stack: error.stack,
          timestamp: FieldValue.serverTimestamp(),
        });
        response.status(200).json({ received: true, processed: false, error: error.message });
      }
    }
  }
);

/**
 * Handle checkout session completed (for founder pricing tracking)
 */
async function handleCheckoutSessionCompleted(event, stripe) {
  const session = event.data.object;
  const metadata = session.metadata || {};

  // ── Physical store order — write to physicalOrders, email owner + customer ──
  if (metadata.type === 'physical_order') {
    await handlePhysicalOrder(session, stripe);
    return;
  }

  try {
    if (session.customer && metadata.userId) {
      await linkStripeCustomerToUser(
        session.customer,
        metadata.userId,
        session.customer_details?.email || session.customer_email || metadata.userEmail
      );
    }

    // Handle subscription mode
    if (session.mode === 'subscription' && session.subscription && session.customer) {
      const [subscription, customer] = await Promise.all([
        stripe.subscriptions.retrieve(session.subscription),
        stripe.customers.retrieve(session.customer)
      ]);

      await upsertSubscriptionState({
        stripeSubscription: subscription,
        customer,
        userIdHint: metadata.userId || subscription.metadata?.userId,
        emailHint: session.customer_details?.email || session.customer_email || metadata.userEmail,
        statusOverride: subscription.status
      });
    }

    // Handle one-time payment mode (lifetime purchases)
    if (session.mode === 'payment' && session.payment_status === 'paid' && session.payment_intent) {
      logger.info(`💳 Processing one-time payment checkout: ${session.id}`);
      
      try {
        // Retrieve the payment intent to get full details
        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
        const userEmail = session.customer_details?.email || session.customer_email || metadata.userEmail || paymentIntent.receipt_email;
        
        if (!userEmail) {
          logger.warn(`⚠️ No email found for checkout session ${session.id}`);
        } else {
          // Check if this is a lifetime purchase
          const priceId = metadata.priceId || paymentIntent.metadata?.priceId || null;
          const planName = metadata.planName || paymentIntent.metadata?.planName || '';
          
          // Check if price is one-time payment by retrieving it from Stripe
          let isOneTimePayment = false;
          if (priceId) {
            try {
              const price = await stripe.prices.retrieve(priceId);
              // One-time payments don't have a recurring interval
              isOneTimePayment = !price.recurring;
              logger.info(`🔍 Price ${priceId} check: recurring=${!!price.recurring}, oneTime=${isOneTimePayment}`);
            } catch (priceError) {
              logger.warn(`⚠️ Could not retrieve price ${priceId} from Stripe:`, priceError.message);
            }
          }
          
          const isLifetimePurchase = 
            metadata.isLifetime === 'true' || 
            paymentIntent.metadata?.isLifetime === 'true' ||
            isLifetimePriceId(priceId) || 
            planName.toLowerCase().includes('lifetime') ||
            isOneTimePayment; // If it's a one-time payment, it's likely lifetime
          
          logger.info(`🔍 Lifetime purchase check for session ${session.id}:`, {
            priceId,
            planName,
            metadataIsLifetime: metadata.isLifetime,
            paymentIntentIsLifetime: paymentIntent.metadata?.isLifetime,
            isLifetimePriceId: isLifetimePriceId(priceId),
            planNameIncludesLifetime: planName.toLowerCase().includes('lifetime'),
            isOneTimePayment,
            isLifetimePurchase
          });

          if (isLifetimePurchase && metadata.isGift !== 'true' && paymentIntent.metadata?.isGift !== 'true') {
            logger.info(`🎁 Detected lifetime purchase in checkout session ${session.id}`);
            
            // Merge metadata from both session and payment intent
            const combinedMetadata = {
              ...paymentIntent.metadata,
              ...metadata,
              userId: metadata.userId || paymentIntent.metadata?.userId,
              priceId: priceId,
              planName: planName || paymentIntent.metadata?.planName || 'Lifetime Access'
            };

            try {
              await grantLifetimeAccessFromStripe({
                userIdHint: combinedMetadata.userId,
                userEmail,
                metadata: combinedMetadata,
                paymentIntent,
              });
              logger.info(`✅ Lifetime access granted via checkout session ${session.id}`);
            } catch (grantError) {
              logger.error(`❌ Failed to grant lifetime access from checkout session ${session.id}:`, grantError);
              // Log to Firestore for manual review
              await admin.firestore().collection('stripeEvents').add({
                type: 'checkout.session.completed',
                sessionId: session.id,
                paymentIntentId: paymentIntent.id,
                userEmail,
                error: grantError.message,
                isLifetimePurchase: true,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          } else {
            logger.info(`ℹ️ Checkout session ${session.id} is not a lifetime purchase (isLifetime: ${isLifetimePurchase}, isGift: ${metadata.isGift || paymentIntent.metadata?.isGift})`);
          }
        }
      } catch (paymentIntentError) {
        logger.error(`❌ Failed to process payment intent for checkout session ${session.id}:`, paymentIntentError);
      }
    }
  } catch (syncError) {
    logger.error('❌ Failed to sync subscription after checkout completion:', syncError);
  }

  // Founder tracking (only for founder purchases)
  if (!metadata || metadata.founderApplied !== 'true') {
    return;
  }

  if (metadata.isGift === 'true') {
    logger.info('🎁 Checkout session completed for gift purchase; founder tracking skipped.');
    return;
  }

  const userId = metadata.userId;
  if (!userId) {
    logger.warn('⚠️ Founder checkout completed but no userId provided in metadata.');
    return;
  }

  if (session.payment_status !== 'paid') {
    logger.warn(`⚠️ Checkout session ${session.id} for user ${userId} not marked as paid yet (status: ${session.payment_status}).`);
    return;
  }

  const founderType = metadata.founderType || 'new';
  const discountPercent = parseInt(metadata.founderDiscountPercent || DEFAULT_FOUNDER_DISCOUNT, 10);
  const founderCouponId = metadata.founderCouponId || null;
  const amountPaid = typeof session.amount_total === 'number' ? session.amount_total / 100 : null;
  const currency = session.currency ? session.currency.toUpperCase() : 'USD';
  const planName = metadata.planName || (session.mode === 'subscription' ? 'Subscription' : 'Lifetime');

  const db = admin.firestore();
  const configRef = db.collection('appConfig').doc('founderOffer');
  const analyticsRef = db.collection('analytics').doc('founderCount');
  const userRef = db.collection('users').doc(userId);
  const subscriptionRef = db.collection('userSubscriptions').doc(userId);

  await db.runTransaction(async (transaction) => {
    const configSnap = await transaction.get(configRef);
    const analyticsSnap = await transaction.get(analyticsRef);
    const userSnap = await transaction.get(userRef);

    const configData = configSnap.exists ? configSnap.data() : {};
    const analyticsData = analyticsSnap.exists ? analyticsSnap.data() : {};

    let totalGranted = Number(configData.totalGranted || 0);
    let analyticsTotal = Number(analyticsData.totalFounders || 0);
    const cap = Number(configData.cap || DEFAULT_FOUNDER_CAP);
    const existingFounderNumber = userSnap.exists ? (userSnap.data().founderNumber || null) : null;

    const isNewFounder = founderType === 'new' || (!existingFounderNumber && founderType === 'none');

    if (isNewFounder && totalGranted >= cap) {
      logger.warn(`⚠️ Founder cap reached (${cap}); not incrementing for user ${userId}.`);
    }

    let updatedFounderNumber = existingFounderNumber;
    if (isNewFounder && totalGranted < cap) {
      totalGranted += 1;
      analyticsTotal = Math.max(analyticsTotal, totalGranted);
      updatedFounderNumber = totalGranted;

      transaction.set(configRef, {
        totalGranted,
        updatedAt: FieldValue.serverTimestamp(),
        lastGrantedAt: FieldValue.serverTimestamp(),
        lastSessionId: session.id,
      }, { merge: true });

      transaction.set(analyticsRef, {
        totalFounders: analyticsTotal,
        lastUpdated: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      const highest = Math.max(totalGranted, analyticsTotal, existingFounderNumber || 0);
      updatedFounderNumber = existingFounderNumber || (highest > 0 ? highest : totalGranted);

      if (highest !== totalGranted) {
        transaction.set(configRef, {
          totalGranted: highest,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      if (highest !== analyticsTotal) {
        transaction.set(analyticsRef, {
          totalFounders: highest,
          lastUpdated: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    const userUpdatePayload = {
      isFounder: true,
      founderGrantedAt: FieldValue.serverTimestamp(),
      founderNumber: updatedFounderNumber || totalGranted || analyticsTotal || 1,
    };
    userUpdatePayload['subscription.isFounder'] = true;
    userUpdatePayload['subscription.founderPricing'] = true;
    userUpdatePayload['subscription.founderDiscountPercent'] = discountPercent;
    userUpdatePayload['subscription.founderCurrency'] = currency;
    userUpdatePayload['subscription.founderCheckoutSessionId'] = session.id;
    userUpdatePayload['subscription.founderPlanName'] = planName;
    if (amountPaid !== null) {
      userUpdatePayload['subscription.founderLockedRate'] = amountPaid;
    }
    if (founderCouponId) {
      userUpdatePayload['subscription.founderCouponId'] = founderCouponId;
    }

    transaction.set(userRef, userUpdatePayload, { merge: true });

    const subscriptionUpdatePayload = {
      userId,
      lastUpdated: FieldValue.serverTimestamp(),
    };
    subscriptionUpdatePayload['subscription.isFounder'] = true;
    subscriptionUpdatePayload['subscription.founderPricing'] = true;
    subscriptionUpdatePayload['subscription.founderDiscountPercent'] = discountPercent;
    subscriptionUpdatePayload['subscription.founderCurrency'] = currency;
    subscriptionUpdatePayload['subscription.founderCheckoutSessionId'] = session.id;
    subscriptionUpdatePayload['subscription.founderPlanName'] = planName;
    if (amountPaid !== null) {
      subscriptionUpdatePayload['subscription.founderLockedRate'] = amountPaid;
    }

    transaction.set(subscriptionRef, subscriptionUpdatePayload, { merge: true });
  });

  logger.info(`👑 Founder checkout completed for user ${userId}. Type: ${founderType}, discount: ${discountPercent}%, session: ${session.id}`);
}

/**
 * Handle physical store order from the planner shop checkout.
 * Writes to physicalOrders collection, emails the owner and the customer.
 */
async function handlePhysicalOrder(session, stripe) {
  const metadata = session.metadata || {};
  const rawCustomerEmail = session.customer_details?.email || session.customer_email || null;
  const customerEmail = rawCustomerEmail ? String(rawCustomerEmail).trim().toLowerCase() : null;
  const customerName = session.customer_details?.name || null;
  const shippingDetails = session.shipping_details || null;
  const hasPhysical = metadata.hasPhysical === 'true';

  let lineItems = [];
  try {
    const expanded = await stripe.checkout.sessions.listLineItems(session.id, { limit: 50 });
    lineItems = (expanded.data || []).map((li) => ({
      name: li.description || 'Item',
      priceId: li.price?.id || null,
      productId: li.price?.product || null,
      quantity: li.quantity,
      amountTotal: li.amount_total,
      currency: li.currency,
    }));
  } catch (err) {
    logger.error(`❌ Failed to expand line items for physical order ${session.id}:`, err);
  }

  const td = session.total_details || {};
  const orderData = {
    sessionId: session.id,
    paymentIntentId: session.payment_intent || null,
    customerEmail,
    customerName,
    shippingAddress: shippingDetails?.address || null,
    shippingName: shippingDetails?.name || null,
    billingAddress: session.customer_details?.address || null,
    billingName: session.customer_details?.name || null,
    items: lineItems,
    amountSubtotal: td.amount_subtotal ?? lineItems.reduce((s, li) => s + (li.amountTotal || 0), 0),
    amountShipping: td.amount_shipping ?? 0,
    amountTax: td.amount_tax ?? 0,
    amountDiscount: td.amount_discount ?? 0,
    amountTotal: session.amount_total,
    currency: session.currency || 'usd',
    status: 'pending',
    hasPhysicalItems: hasPhysical,
    userId: metadata.userId || 'guest',
    source: 'own-site',
    giftMessage: (session.custom_fields || []).find(f => f.key === 'gift_message')?.text?.value || null,
    customerPhone: (session.custom_fields || []).find(f => f.key === 'customer_phone')?.text?.value || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await admin.firestore().collection('physicalOrders').doc(session.id).set(orderData);
  logger.info(`📦 Physical order saved: ${session.id} (${lineItems.length} items)`);

  // Decrement stock for physical line items only
  try {
    const { decrementStockByPriceId } = require('./inventorySync');
    const db = admin.firestore();
    const priceSnap = await db.collection('shopProducts').get();
    const digitalPriceIds = new Set();
    priceSnap.forEach((doc) => {
      const d = doc.data();
      if (d.category === 'digital' && d.stripePriceId) digitalPriceIds.add(d.stripePriceId);
    });
    for (const item of lineItems) {
      if (!item.priceId || digitalPriceIds.has(item.priceId)) continue;
      const result = await decrementStockByPriceId(item.priceId, item.quantity);
      logger.info(`📦 Decremented stock for priceId ${item.priceId} x${item.quantity}`);
      if (result?.productId) {
        try {
          const { syncStockToAllPlatforms } = require('./inventorySync');
          await syncStockToAllPlatforms(result.productId);
          logger.info(`📦 Synced stock to marketplaces for product ${result.productId}`);
        } catch (syncErr) {
          logger.error(`⚠️ Marketplace sync error for product ${result.productId}:`, syncErr);
        }
      }
    }
  } catch (stockErr) {
    logger.error(`⚠️ Stock decrement error for order ${session.id}:`, stockErr);
  }

  // Digital PDF delivery — tokens + download email
  try {
    const { fulfillDigitalDownloadsForOrder } = require('./digitalDownloads');
    await fulfillDigitalDownloadsForOrder({
      sessionId: session.id,
      customerEmail,
      customerName,
      lineItems,
    });
  } catch (digitalErr) {
    logger.error(`❌ Digital fulfillment error for order ${session.id}:`, digitalErr);
  }

  // ── Email notifications (standard admin templates) ──
  const shopEmails = require('./shopEmails');
  const ownerEmail = process.env.PLANNER_ORDER_NOTIFICATION_EMAIL || 'lebrockmaldonado@gmail.com';

  const totals = shopEmails.extractTotalsFromSession(session, lineItems);
  const totalFormatted = `$${(totals.total / 100).toFixed(2)} ${totals.currency}`;
  const orderStatusUrl = `${shopEmails.SHOP_BASE}/order/${session.id}`;

  const ownerBodyHtml = `
    <p style="font-size:14px;color:#555;margin:0 0 12px"><strong>Customer:</strong> ${customerName || 'N/A'} (${customerEmail || 'N/A'})</p>
    ${shopEmails.buildOrderBodyFromSession({
      session,
      lineItems,
      shippingDetails,
      hasPhysical,
      includePolicies: false,
    })}
    <p style="font-size:12px;color:#888;margin-top:16px">Session: ${session.id}</p>`;

  try {
    await shopEmails.sendShopTemplatedEmail('shopOrderOwner', ownerEmail, {
      customerName: customerName || customerEmail || 'Guest',
      orderTotal: totalFormatted,
      orderStatusUrl,
      sessionId: session.id,
    }, { bodyHtml: ownerBodyHtml, emailType: 'physical_order_owner' });
    logger.info(`📧 Owner notification sent for physical order ${session.id}`);
  } catch (emailErr) {
    logger.error(`❌ Failed to send owner email for order ${session.id}:`, emailErr);
  }

  if (customerEmail) {
    try {
      const customerBodyHtml = shopEmails.buildOrderBodyFromSession({
        session,
        lineItems,
        shippingDetails,
        hasPhysical,
        includePolicies: false,
      });

      await shopEmails.sendShopTemplatedEmail('shopOrderConfirmation', customerEmail, {
        customerName: customerName || 'there',
        orderTotal: totalFormatted,
        orderStatusUrl,
        sessionId: session.id,
      }, {
        bodyHtml: customerBodyHtml,
        emailType: 'physical_order_customer',
        recipientName: customerName,
      });
      logger.info(`📧 Customer confirmation sent for physical order ${session.id}`);
    } catch (emailErr) {
      logger.error(`❌ Failed to send customer email for order ${session.id}:`, emailErr);
    }
  }
}

/**
 * Handle abandoned/expired physical-order checkout session.
 * Sends a recovery email nudging the customer back to the shop.
 */
async function handleAbandonedCheckout(session, stripe) {
  const email = session.customer_details?.email || session.customer_email;
  if (!email) {
    logger.info('Abandoned checkout but no email captured, skipping');
    return;
  }

  const customerName = session.customer_details?.name || 'there';
  const shopEmails = require('./shopEmails');

  let lineItems = [];
  try {
    const expanded = await stripe.checkout.sessions.listLineItems(session.id, { limit: 50 });
    lineItems = (expanded.data || []).map((li) => ({
      name: li.description || 'Item',
      quantity: li.quantity,
      amountTotal: li.amount_total,
    }));
  } catch (err) {
    logger.warn('Could not fetch line items for abandoned session:', err);
  }

  const bodyHtml = shopEmails.buildOrderItemsTableHtml(lineItems);

  await shopEmails.sendShopTemplatedEmail('shopAbandonedCart', email, {
    customerName: customerName || 'there',
    orderStatusUrl: `${shopEmails.SHOP_BASE}/shop`,
  }, { bodyHtml, emailType: 'abandoned_checkout' });
  logger.info(`📧 Abandoned cart email sent to ${email} for session ${session.id}`);
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSucceeded(event, stripe) {
  const paymentIntent = event.data.object;
  logger.info(`💰 Payment succeeded: ${paymentIntent.id}`);

  // Get user email from customer
  const customer = await stripe.customers.retrieve(paymentIntent.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', paymentIntent.customer);
    return;
  }

  const metadata = paymentIntent.metadata || {};
  const priceId = metadata.priceId || null;
  const planName = metadata.planName || '';
  
  // Check if price is one-time payment by retrieving it from Stripe
  let isOneTimePayment = false;
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      // One-time payments don't have a recurring interval
      isOneTimePayment = !price.recurring;
      logger.info(`🔍 Payment intent ${paymentIntent.id} - Price ${priceId} check: recurring=${!!price.recurring}, oneTime=${isOneTimePayment}`);
    } catch (priceError) {
      logger.warn(`⚠️ Could not retrieve price ${priceId} from Stripe:`, priceError.message);
    }
  }
  
  const isLifetimePurchase = 
    metadata.isLifetime === 'true' || 
    isLifetimePriceId(priceId) || 
    planName.toLowerCase().includes('lifetime') ||
    isOneTimePayment; // If it's a one-time payment, it's likely lifetime
  
  logger.info(`🔍 Payment intent ${paymentIntent.id} lifetime check:`, {
    priceId,
    planName,
    metadataIsLifetime: metadata.isLifetime,
    isLifetimePriceId: isLifetimePriceId(priceId),
    planNameIncludesLifetime: planName.toLowerCase().includes('lifetime'),
    isOneTimePayment,
    isLifetimePurchase
  });

  if (isLifetimePurchase && metadata.isGift !== 'true') {
    try {
      logger.info(`🎁 Processing lifetime purchase for payment intent ${paymentIntent.id}`);
      await grantLifetimeAccessFromStripe({
        userIdHint: metadata.userId,
        userEmail,
        metadata,
        paymentIntent,
      });
      logger.info(`✅ Lifetime access granted via payment intent ${paymentIntent.id}`);
    } catch (grantError) {
      logger.error(`❌ Failed to grant lifetime access from Stripe payment ${paymentIntent.id}:`, grantError);
      logger.error(`   Error details:`, {
        message: grantError.message,
        stack: grantError.stack,
        userIdHint: metadata.userId,
        userEmail,
        paymentIntentId: paymentIntent.id
      });
      
      // Log to Firestore for manual review and potential retry
      try {
        await admin.firestore().collection('stripeEvents').add({
          type: 'payment_intent.succeeded',
          paymentIntentId: paymentIntent.id,
          customerId: paymentIntent.customer,
          userEmail,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          isLifetimePurchase: true,
          error: grantError.message,
          errorStack: grantError.stack,
          metadata: metadata,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          needsManualReview: true
        });
      } catch (logError) {
        logger.error('❌ Failed to log error to Firestore:', logError);
      }
    }
  }

  // Send payment successful email
  await emailService.sendPaymentSuccessfulEmail(
    userEmail,
    paymentIntent.amount / 100, // Convert from cents
    paymentIntent.currency.toUpperCase(),
    paymentIntent.receipt_email ? `Receipt sent to ${paymentIntent.receipt_email}` : null
  );

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'payment_intent.succeeded',
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    userEmail,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle failed payment intent
 */
async function handlePaymentFailed(event, stripe) {
  const paymentIntent = event.data.object;
  logger.info(`💸 Payment failed: ${paymentIntent.id}`);

  // Get user email from customer
  const customer = await stripe.customers.retrieve(paymentIntent.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', paymentIntent.customer);
    return;
  }

  // Get userId and check billing notification preference
  let userId = await findUserIdByEmail(userEmail);

  // Check if user has billing notifications enabled
  if (userId) {
    const notificationSettings = await pushNotifications.getUserNotificationSettings(userId);
    const billingEnabled = notificationSettings?.billing !== false; // Default to true if not set (backward compatibility)
    
    if (!billingEnabled) {
      logger.info(`⏭️ Skipping payment failed email for ${userEmail} - billing notifications disabled`);
    } else {
      // Send payment failed email
      await emailService.sendPaymentFailedEmail(
        userEmail,
        paymentIntent.amount / 100,
        paymentIntent.currency.toUpperCase(),
        null // No invoice URL available in payment intent
      );
    }
  } else {
    // If we can't find userId, send email anyway (backward compatibility)
    await emailService.sendPaymentFailedEmail(
      userEmail,
      paymentIntent.amount / 100,
      paymentIntent.currency.toUpperCase(),
      null // No invoice URL available in payment intent
    );
  }

  // Update subscription status to reflect payment failure
  if (userId) {
    const db = admin.firestore();
    const failPayload = {
      billingStatus: 'payment_failed',
      lastPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('userSubscriptions').doc(userId).set(
      { subscription: failPayload }, { merge: true }
    );
    await db.collection('users').doc(userId).set(
      { subscription: failPayload }, { merge: true }
    );
    try {
      const pushEngine = require('./pushNotificationEngine');
      await pushEngine.sendPaymentFailedPush(userId);
    } catch (pushErr) {
      logger.warn('payment_failed push failed (non-fatal):', pushErr.message);
    }
  }

  await admin.firestore().collection('stripeEvents').add({
    type: 'payment_intent.payment_failed',
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    userId: userId || null,
    userEmail,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event, stripe) {
  const subscription = event.data.object;
  logger.info(`🎉 Subscription created: ${subscription.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', subscription.customer);
    return;
  }

  // Get plan details
  const plan = subscription.items.data[0]?.price;
  const planName = plan?.nickname || plan?.id || 'Pro Plan';

  // Send subscription confirmed email
  await emailService.sendSubscriptionConfirmedEmail(userEmail, planName);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.created',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    userEmail,
    planId: plan?.id,
    planName,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  await upsertSubscriptionState({
    stripeSubscription: subscription,
    customer,
    userIdHint: subscription.metadata?.userId,
    emailHint: userEmail,
    statusOverride: subscription.status
  });
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event, stripe) {
  const subscription = event.data.object;
  logger.info(`📝 Subscription updated: ${subscription.id}`);

  let customer = null;
  try {
    customer = await stripe.customers.retrieve(subscription.customer);
  } catch (customerError) {
    logger.warn(`⚠️ Failed to load customer ${subscription.customer} for subscription update`, customerError);
  }

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.updated',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  await upsertSubscriptionState({
    stripeSubscription: subscription,
    customer,
    userIdHint: subscription.metadata?.userId,
    emailHint: customer?.email,
    statusOverride: subscription.status
  });
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(event, stripe) {
  const subscription = event.data.object;
  logger.info(`❌ Subscription cancelled: ${subscription.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', subscription.customer);
    return;
  }

  // Get plan details
  const plan = subscription.items.data[0]?.price;
  const planName = plan?.nickname || plan?.id || 'Pro Plan';

  // Calculate end date
  const endDate = new Date(subscription.cancel_at * 1000).toISOString().split('T')[0];

  // Send subscription cancelled email
  await emailService.sendSubscriptionCancelledEmail(userEmail, planName, endDate);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.deleted',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    userEmail,
    planName,
    endDate,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // tierOverride: 'free' ensures the Firestore doc no longer carries
  // research_plus after the subscription is truly gone, preventing client-
  // side tier drift where caps and server AI guards stop enforcing.
  await upsertSubscriptionState({
    stripeSubscription: subscription,
    customer,
    userIdHint: subscription.metadata?.userId,
    emailHint: userEmail,
    statusOverride: 'canceled',
    paymentState: 'canceled',
    tierOverride: 'free',
  });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(event, stripe) {
  const invoice = event.data.object;
  logger.info(`✅ Invoice paid: ${invoice.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', invoice.customer);
    return;
  }

  // Get userId and check billing notification preference
  let userId = null;
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      userId = subscription.metadata?.userId;
    } catch (error) {
      logger.warn(`⚠️ Failed to retrieve subscription for payment success:`, error);
    }
  }
  
  // If no userId from subscription, try to find by email
  if (!userId) {
    userId = await findUserIdByEmail(userEmail);
  }

  // Check if user has billing notifications enabled
  if (userId) {
    const notificationSettings = await pushNotifications.getUserNotificationSettings(userId);
    const billingEnabled = notificationSettings?.billing !== false; // Default to true if not set (backward compatibility)
    
    if (!billingEnabled) {
      logger.info(`⏭️ Skipping payment successful email for ${userEmail} - billing notifications disabled`);
      // Still update subscription state even if email is skipped
    } else {
      // Send payment successful email with invoice link
      await emailService.sendPaymentSuccessfulEmail(
        userEmail,
        invoice.amount_paid / 100,
        invoice.currency.toUpperCase(),
        invoice.hosted_invoice_url
      );
    }
  } else {
    // If we can't find userId, send email anyway (backward compatibility)
    await emailService.sendPaymentSuccessfulEmail(
      userEmail,
      invoice.amount_paid / 100,
      invoice.currency.toUpperCase(),
      invoice.hosted_invoice_url
    );
  }

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'invoice.payment_succeeded',
    invoiceId: invoice.id,
    customerId: invoice.customer,
    userEmail,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  let subscription = null;
  if (invoice.subscription) {
    try {
      subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    } catch (subscriptionError) {
      logger.warn(`⚠️ Failed to retrieve subscription ${invoice.subscription} for payment success`, subscriptionError);
    }
  }

  await upsertSubscriptionState({
    stripeSubscription: subscription,
    invoice,
    customer,
    userIdHint: subscription?.metadata?.userId,
    emailHint: userEmail,
    statusOverride: subscription?.status || 'active',
    paymentState: 'payment_succeeded'
  });
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(event, stripe) {
  const invoice = event.data.object;
  logger.info(`💸 Invoice payment failed: ${invoice.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', invoice.customer);
    return;
  }

  // Get userId and check billing notification preference
  let userId = null;
  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      userId = subscription.metadata?.userId;
    } catch (error) {
      logger.warn(`⚠️ Failed to retrieve subscription for payment failure:`, error);
    }
  }
  
  // If no userId from subscription, try to find by email
  if (!userId) {
    userId = await findUserIdByEmail(userEmail);
  }

  // Check if user has billing notifications enabled
  if (userId) {
    const notificationSettings = await pushNotifications.getUserNotificationSettings(userId);
    const billingEnabled = notificationSettings?.billing !== false; // Default to true if not set (backward compatibility)
    
    if (!billingEnabled) {
      logger.info(`⏭️ Skipping payment failed email for ${userEmail} - billing notifications disabled`);
      // Still update subscription state even if email is skipped
    } else {
      // Send payment failed email
      await emailService.sendPaymentFailedEmail(
        userEmail,
        invoice.amount_due / 100,
        invoice.currency.toUpperCase(),
        invoice.hosted_invoice_url
      );
    }
  } else {
    // If we can't find userId, send email anyway (backward compatibility)
    await emailService.sendPaymentFailedEmail(
      userEmail,
      invoice.amount_due / 100,
      invoice.currency.toUpperCase(),
      invoice.hosted_invoice_url
    );
  }

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'invoice.payment_failed',
    invoiceId: invoice.id,
    customerId: invoice.customer,
    userEmail,
    amount: invoice.amount_due,
    currency: invoice.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  let subscription = null;
  if (invoice.subscription) {
    try {
      subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    } catch (subscriptionError) {
      logger.warn(`⚠️ Failed to retrieve subscription ${invoice.subscription} for payment failure`, subscriptionError);
    }
  }

  await upsertSubscriptionState({
    stripeSubscription: subscription,
    invoice,
    customer,
    userIdHint: subscription?.metadata?.userId,
    emailHint: userEmail,
    statusOverride: subscription?.status || 'past_due',
    paymentState: 'payment_failed'
  });

  if (userId) {
    try {
      const pushEngine = require('./pushNotificationEngine');
      await pushEngine.sendPaymentFailedPush(userId);
    } catch (pushErr) {
      logger.warn('invoice payment_failed push failed (non-fatal):', pushErr.message);
    }
  }
}

/**
 * Handle upcoming invoice (renewal reminder) - email sending disabled.
 * We are not sending renewal reminder emails. Event is still logged.
 */
async function handleInvoiceUpcoming(event, stripe) {
  const invoice = event.data.object;
  logger.info(`📅 Invoice upcoming: ${invoice.id}`);

  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email || null;
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const planName = subscription.items.data[0]?.price?.nickname || 'Pro Plan';

  // Log the event only (renewal reminder emails are disabled)
  await admin.firestore().collection('stripeEvents').add({
    type: 'invoice.upcoming',
    invoiceId: invoice.id,
    customerId: invoice.customer,
    userEmail,
    planName,
    amount: invoice.amount_due,
    currency: invoice.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle successful charge
 */
async function handleChargeSucceeded(event, stripe) {
  const charge = event.data.object;
  logger.info(`✅ Charge succeeded: ${charge.id}`);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'charge.succeeded',
    chargeId: charge.id,
    customerId: charge.customer,
    amount: charge.amount,
    currency: charge.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(event, stripe) {
  const charge = event.data.object;
  logger.info(`💸 Charge failed: ${charge.id}`);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'charge.failed',
    chargeId: charge.id,
    customerId: charge.customer,
    amount: charge.amount,
    currency: charge.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle dispute created (chargeback)
 */
async function handleDisputeCreated(event, stripe) {
  const dispute = event.data.object;
  logger.info(`🚨 Dispute created: ${dispute.id} for charge: ${dispute.charge}`);

  const charge = await stripe.charges.retrieve(dispute.charge);
  const userEmail = await resolveEmailFromCharge(charge, stripe);

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Immediately suspend access on dispute
  const context = await resolveUserContext({ customerId: charge.customer, emailHint: userEmail });
  if (context?.userId) {
    const db = admin.firestore();
    const disputePayload = {
      status: 'disputed',
      disputeId: dispute.id,
      disputeReason: dispute.reason,
      disputedAt: FieldValue.serverTimestamp(),
      hasLifetimeAccess: false,
      interval: null,
      plan: null,
      lastUpdated: FieldValue.serverTimestamp(),
    };
    const userSubscriptionsRef = db.collection('userSubscriptions').doc(context.userId);
    const userRef = db.collection('users').doc(context.userId);
    const batch = db.batch();
    batch.set(userSubscriptionsRef, { subscription: disputePayload }, { merge: true });
    batch.set(userRef, { subscription: disputePayload }, { merge: true });
    const historyRef = userSubscriptionsRef.collection('history').doc();
    batch.set(historyRef, {
      status: 'disputed',
      disputeId: dispute.id,
      disputeReason: dispute.reason,
      disputedAt: FieldValue.serverTimestamp(),
      eventTimestamp: FieldValue.serverTimestamp(),
      source: 'stripe_webhook',
      eventType: 'charge.dispute.created',
    });
    await batch.commit();
    logger.info(`🔒 Access suspended for user ${context.userId} due to dispute ${dispute.id}`);
    adminAlerts.alertDispute(context.userId, userEmail, dispute.id, dispute.reason, dispute.amount).catch(() => {});
  }

  await emailService.sendDisputeNotificationEmail(userEmail, dispute.reason, dispute.amount);

  await admin.firestore().collection('stripeEvents').add({
    type: 'charge.dispute.created',
    disputeId: dispute.id,
    chargeId: dispute.charge,
    customerId: charge.customer,
    userId: context?.userId,
    userEmail,
    reason: dispute.reason,
    amount: dispute.amount,
    timestamp: FieldValue.serverTimestamp()
  });
}

/**
 * Handle dispute updated
 */
async function handleDisputeUpdated(event, stripe) {
  const dispute = event.data.object;
  logger.info(`📝 Dispute updated: ${dispute.id} - Status: ${dispute.status}`);

  const charge = await stripe.charges.retrieve(dispute.charge);
  const userEmail = await resolveEmailFromCharge(charge, stripe);

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Send dispute status update email
  await emailService.sendDisputeStatusUpdateEmail(userEmail, dispute.status, dispute.reason);

  logger.info(`✅ Dispute status update sent to: ${userEmail}`);
}

/**
 * Handle dispute closed
 */
async function handleDisputeClosed(event, stripe) {
  const dispute = event.data.object;
  logger.info(`✅ Dispute closed: ${dispute.id} - Status: ${dispute.status}`);

  const charge = await stripe.charges.retrieve(dispute.charge);
  const userEmail = await resolveEmailFromCharge(charge, stripe);

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  const context = await resolveUserContext({ customerId: charge.customer, emailHint: userEmail });
  if (context?.userId) {
    const db = admin.firestore();
    const userSubscriptionsRef = db.collection('userSubscriptions').doc(context.userId);
    const userRef = db.collection('users').doc(context.userId);
    const batch = db.batch();
    // dispute.status: won = merchant wins (restore), lost = customer wins (revoke stays)
    if (dispute.status === 'won') {
      const wonPayload = {
        status: 'active',
        disputeResolved: true,
        disputeResolvedAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
      };
      batch.set(userSubscriptionsRef, { subscription: wonPayload }, { merge: true });
      batch.set(userRef, { subscription: wonPayload }, { merge: true });
      const historyRef = userSubscriptionsRef.collection('history').doc();
      batch.set(historyRef, {
        status: 'active',
        disputeResolved: true,
        disputeId: dispute.id,
        eventTimestamp: FieldValue.serverTimestamp(),
        source: 'stripe_webhook',
        eventType: 'charge.dispute.closed',
        outcome: 'won',
      });
      await batch.commit();
      logger.info(`✅ Access restored for user ${context.userId} -- dispute won`);
    } else {
      const revokedPayload = {
        status: 'revoked',
        revokedReason: `dispute_${dispute.status}`,
        disputeResolvedAt: FieldValue.serverTimestamp(),
        hasLifetimeAccess: false,
        interval: null,
        plan: null,
        lastUpdated: FieldValue.serverTimestamp(),
      };
      batch.set(userSubscriptionsRef, { subscription: revokedPayload }, { merge: true });
      batch.set(userRef, {
        subscription: {
          status: 'revoked',
          lastUpdated: FieldValue.serverTimestamp(),
        },
      }, { merge: true });
      const historyRef = userSubscriptionsRef.collection('history').doc();
      batch.set(historyRef, {
        status: 'revoked',
        disputeId: dispute.id,
        outcome: dispute.status,
        eventTimestamp: FieldValue.serverTimestamp(),
        source: 'stripe_webhook',
        eventType: 'charge.dispute.closed',
      });
      await batch.commit();
      logger.info(`🚫 Access permanently revoked for user ${context.userId} -- dispute ${dispute.status}`);
    }
  }

  await emailService.sendDisputeResolutionEmail(userEmail, dispute.status, dispute.reason);

  await admin.firestore().collection('stripeEvents').add({
    type: 'charge.dispute.closed',
    disputeId: dispute.id,
    chargeId: dispute.charge,
    customerId: charge.customer,
    userId: context?.userId,
    userEmail,
    outcome: dispute.status,
    timestamp: FieldValue.serverTimestamp()
  });
}

/**
 * Handle charge refunded -- revoke access for lifetime, update state for subscriptions
 */
async function handleChargeRefunded(event, stripe) {
  const charge = event.data.object;
  logger.info(`💸 Charge refunded: ${charge.id}, amount_refunded: ${charge.amount_refunded}, customer: ${charge.customer}`);

  // Guest customers (gcus_) cannot be retrieved via the regular customers endpoint.
  // Always prefer email directly from the charge object first.
  let userEmail =
    charge.billing_details?.email ||
    charge.receipt_email ||
    charge.metadata?.userEmail ||
    null;

  // Only attempt customer retrieve for regular cus_ IDs — gcus_ will throw "No such customer"
  if (!userEmail && charge.customer && !String(charge.customer).startsWith('gcus_')) {
    try {
      const customer = await stripe.customers.retrieve(charge.customer);
      userEmail = customer.email || null;
    } catch (err) {
      logger.warn(`⚠️ Could not retrieve customer ${charge.customer}: ${err.message}`);
    }
  }

  if (!userEmail) {
    logger.warn(`⚠️ No email available for refunded charge ${charge.id} (customer: ${charge.customer}). Logging for manual review.`);
    await admin.firestore().collection('stripeEvents').add({
      type: 'charge.refunded.unresolved',
      chargeId: charge.id,
      customerId: charge.customer,
      amountRefunded: charge.amount_refunded,
      isFullRefund: charge.refunded === true,
      error: 'No email found — guest customer or missing billing details',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  const context = await resolveUserContext({
    customerId: charge.customer,
    emailHint: userEmail
  });

  if (!context?.userId) {
    logger.warn(`⚠️ Cannot resolve user for refunded charge ${charge.id}, email: ${userEmail}`);
    // Still log it so it's visible for manual admin action
    await admin.firestore().collection('stripeEvents').add({
      type: 'charge.refunded.unresolved',
      chargeId: charge.id,
      customerId: charge.customer,
      userEmail,
      amountRefunded: charge.amount_refunded,
      isFullRefund: charge.refunded === true,
      error: 'User not found by email in Firestore',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  const db = admin.firestore();
  const isFullRefund = charge.refunded === true;

  if (isFullRefund) {
    const userSubscriptionsRef = db.collection('userSubscriptions').doc(context.userId);
    const userRef = db.collection('users').doc(context.userId);

    // Look up lifetime doc + user doc together to calculate trial restoration
    const [lifetimeDoc, userDoc] = await Promise.all([
      db.collection('lifetimeAccess').doc(context.userId).get(),
      userRef.get()
    ]);

    const lifetimeData = lifetimeDoc.exists ? lifetimeDoc.data() : null;
    const userData = userDoc.exists ? userDoc.data() : null;

    // Revoke lifetime doc if it matches this charge
    if (lifetimeDoc.exists && (lifetimeData?.metadata?.stripeChargeId === charge.id || lifetimeData?.status === 'active')) {
      await db.collection('lifetimeAccess').doc(context.userId).update({
        status: 'revoked',
        revokedAt: FieldValue.serverTimestamp(),
        revokedReason: 'refund',
        refundChargeId: charge.id,
      });
    }

    // ─── Trial Restoration ───────────────────────────────────────────────
    // If trial days were snapshotted at purchase, restore them from today.
    // Otherwise fall back to calculating from original createdAt.
    const now = new Date();
    let restoredTrialEndDate = null;
    let trialDaysRestored = 0;
    let trialRestoredNote = '';

    const snapshotDays = lifetimeData?.trialDaysRemainingAtPurchase;
    if (snapshotDays != null && snapshotDays > 0) {
      // We know exactly how many days were left — restore them from today
      restoredTrialEndDate = new Date(now.getTime() + snapshotDays * 24 * 60 * 60 * 1000);
      trialDaysRestored = snapshotDays;
      trialRestoredNote = `${snapshotDays} day(s) restored from purchase-time snapshot.`;
    } else if (userData) {
      // Fallback: calculate from original trial window
      const created = userData.createdAt?.toDate ? userData.createdAt.toDate() : userData.createdAt ? new Date(userData.createdAt) : null;
      let originalTrialEnd = null;
      if (userData.trialEndDate?.toDate) originalTrialEnd = userData.trialEndDate.toDate();
      else if (userData.trialEndDate) originalTrialEnd = new Date(userData.trialEndDate);
      else if (created) originalTrialEnd = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (originalTrialEnd && created) {
        // How many days of trial were consumed before purchase?
        const purchasedAt = lifetimeData?.grantedAt?.toDate ? lifetimeData.grantedAt.toDate() : now;
        const daysConsumed = Math.max(0, Math.floor((purchasedAt - created) / (24 * 60 * 60 * 1000)));
        const totalTrialDays = Math.round((originalTrialEnd - created) / (24 * 60 * 60 * 1000));
        const daysRemaining = Math.max(0, totalTrialDays - daysConsumed);
        if (daysRemaining > 0) {
          restoredTrialEndDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
          trialDaysRestored = daysRemaining;
          trialRestoredNote = `${daysRemaining} of ${totalTrialDays} trial day(s) restored (${daysConsumed} days were used before purchase).`;
        } else {
          trialRestoredNote = 'Trial period had already fully elapsed before purchase; no days to restore.';
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────

    const refundedSubscription = {
      status: restoredTrialEndDate ? 'trialing' : 'refunded',
      refundedAt: FieldValue.serverTimestamp(),
      hasLifetimeAccess: false,
      interval: restoredTrialEndDate ? 'trial' : null,
      plan: null,
      cancelAt: null,
      cancelAtPeriodEnd: false,
      lastUpdated: FieldValue.serverTimestamp(),
      ...(restoredTrialEndDate && {
        currentPeriodEnd: restoredTrialEndDate.toISOString(),
        trialRestoredAt: FieldValue.serverTimestamp(),
        trialRestoredDays: trialDaysRestored,
      }),
    };

    const batch = db.batch();

    batch.set(userSubscriptionsRef, {
      subscription: refundedSubscription,
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    // On the user doc, also restore trialEndDate so the trial countdown works
    const userRefundUpdate = {
      subscription: refundedSubscription,
      updatedAt: FieldValue.serverTimestamp(),
      ...(restoredTrialEndDate && { trialEndDate: restoredTrialEndDate }),
    };
    batch.set(userRef, userRefundUpdate, { merge: true });

    // Audit history: refund event
    const historyRefundRef = userSubscriptionsRef.collection('history').doc();
    batch.set(historyRefundRef, {
      eventType: 'charge.refunded',
      status: refundedSubscription.status,
      title: 'Refund processed — access revoked',
      description: `Full refund applied. Stripe charge ${charge.id}. Amount: $${charge.amount_refunded != null ? (charge.amount_refunded / 100).toFixed(2) : '?'}`,
      hasLifetimeAccess: false,
      stripeChargeId: charge.id,
      amountRefunded: charge.amount_refunded != null ? charge.amount_refunded / 100 : null,
      source: 'stripe_webhook',
      severity: 'error',
      eventTimestamp: FieldValue.serverTimestamp(),
    });

    // Audit history: trial restoration event (separate entry for clarity)
    const historyTrialRef = userSubscriptionsRef.collection('history').doc();
    batch.set(historyTrialRef, {
      eventType: restoredTrialEndDate ? 'trial_restored' : 'trial_expired_no_restore',
      status: refundedSubscription.status,
      title: restoredTrialEndDate ? 'Trial restored after refund' : 'Refunded — no trial days to restore',
      description: trialRestoredNote || 'No trial restoration applicable.',
      trialDaysRestored,
      restoredTrialEndDate: restoredTrialEndDate ? restoredTrialEndDate.toISOString() : null,
      source: 'stripe_webhook',
      severity: restoredTrialEndDate ? 'success' : 'warning',
      eventTimestamp: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    logger.info(`🚫 Access revoked for user ${context.userId} due to full refund. Trial restored: ${trialDaysRestored} day(s). ${trialRestoredNote}`);
    adminAlerts.alertRefund(context.userId, userEmail, charge.amount_refunded, 'stripe').catch(() => {});
  }

  await db.collection('stripeEvents').add({
    type: 'charge.refunded',
    chargeId: charge.id,
    customerId: charge.customer,
    userEmail,
    userId: context.userId,
    amountRefunded: charge.amount_refunded,
    isFullRefund,
    timestamp: FieldValue.serverTimestamp()
  });
}

/**
 * Handle trial_will_end -- notify user 3 days before trial ends
 */
async function handleTrialWillEnd(event, stripe) {
  const subscription = event.data.object;
  logger.info(`⏰ Trial ending soon for subscription: ${subscription.id}`);

  const customer = await stripe.customers.retrieve(subscription.customer);
  const userEmail = customer.email;
  if (!userEmail) return;

  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString().split('T')[0]
    : 'soon';

  await emailService.sendRenewalReminderEmail(userEmail, `Trial ending ${trialEnd}`);

  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.trial_will_end',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    userEmail,
    trialEnd,
    timestamp: FieldValue.serverTimestamp()
  });
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(event, stripe) {
  const subscription = event.data.object;
  logger.info(`⏸️ Subscription paused: ${subscription.id}`);

  const customer = await stripe.customers.retrieve(subscription.customer);
  await upsertSubscriptionState({
    stripeSubscription: subscription,
    customer,
    userIdHint: subscription.metadata?.userId,
    emailHint: customer?.email,
    statusOverride: 'paused'
  });
}

/**
 * Handle subscription resumed
 */
async function handleSubscriptionResumed(event, stripe) {
  const subscription = event.data.object;
  logger.info(`▶️ Subscription resumed: ${subscription.id}`);

  const customer = await stripe.customers.retrieve(subscription.customer);
  await upsertSubscriptionState({
    stripeSubscription: subscription,
    customer,
    userIdHint: subscription.metadata?.userId,
    emailHint: customer?.email,
    statusOverride: subscription.status || 'active'
  });
}

async function grantLifetimeAccessFromStripe({ userIdHint, userEmail, metadata, paymentIntent }) {
  const db = admin.firestore();
  const normalizedEmail = normalizeEmail(userEmail);

  if (!normalizedEmail) {
    logger.warn('⚠️ Unable to grant lifetime access without email.');
    throw new Error('Email is required to grant lifetime access');
  }

  logger.info(`🔍 Granting lifetime access - Email: ${normalizedEmail}, UserIdHint: ${userIdHint || 'none'}, PaymentIntent: ${paymentIntent.id}`);

  let resolvedUserId = userIdHint;
  if (!resolvedUserId) {
    logger.info(`🔍 UserId not in metadata, looking up by email: ${normalizedEmail}`);
    resolvedUserId = await findUserIdByEmail(normalizedEmail);
    if (resolvedUserId) {
      logger.info(`✅ Found user ID: ${resolvedUserId}`);
    } else {
      logger.warn(`⚠️ User not found by email: ${normalizedEmail} - will create pre-grant`);
    }
  }

  const amountPaid = typeof paymentIntent.amount === 'number' ? paymentIntent.amount / 100 : null;
  const currency = paymentIntent.currency ? paymentIntent.currency.toUpperCase() : null;
  const planName = metadata.planName || 'Lifetime Access';
  const founderApplied = metadata.founderApplied === 'true';
  const founderType = metadata.founderType && metadata.founderType !== 'none' ? metadata.founderType : null;
  const reasonSegments = [planName];
  if (founderApplied && founderType) {
    reasonSegments.push(`Founder (${founderType})`);
  } else if (founderApplied) {
    reasonSegments.push('Founder Offer');
  }
  const reason = `${reasonSegments.join(' – ')} via Stripe`;

  const metadataPayload = sanitizeObject({
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: paymentIntent.latest_charge || null,
    priceId: metadata.priceId || null,
    planName,
    amountPaid,
    currency,
    founderApplied,
    founderType,
    founderDiscountPercent: metadata.founderDiscountPercent ? Number(metadata.founderDiscountPercent) : undefined,
  });

  if (resolvedUserId) {
    const lifetimeDocRef = db.collection('lifetimeAccess').doc(resolvedUserId);
    const [existingLifetimeDoc, userDoc] = await Promise.all([
      lifetimeDocRef.get(),
      db.collection('users').doc(resolvedUserId).get()
    ]);

    if (existingLifetimeDoc.exists) {
      const existingData = existingLifetimeDoc.data();
      if (existingData?.status === 'active' && existingData?.metadata?.stripePaymentIntentId === paymentIntent.id) {
        logger.info(`ℹ️ Lifetime access already recorded for user ${resolvedUserId}; skipping duplicate Stripe sync.`);
        return;
      }
    }

    // Snapshot remaining trial days at time of purchase so they can be restored on refund
    const now = new Date();
    let trialDaysRemainingAtPurchase = null;
    let trialEndDateAtPurchase = null;
    if (userDoc.exists) {
      const userData = userDoc.data();
      let trialEnd = null;
      if (userData.trialEndDate?.toDate) {
        trialEnd = userData.trialEndDate.toDate();
      } else if (userData.trialEndDate) {
        trialEnd = new Date(userData.trialEndDate);
      } else if (userData.createdAt) {
        const created = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        trialEnd = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
      if (trialEnd && trialEnd > now) {
        trialDaysRemainingAtPurchase = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
        trialEndDateAtPurchase = trialEnd.toISOString();
      } else if (trialEnd) {
        trialDaysRemainingAtPurchase = 0;
        trialEndDateAtPurchase = trialEnd.toISOString();
      }
    }
    if (trialDaysRemainingAtPurchase !== null) {
      metadataPayload.trialDaysRemainingAtPurchase = trialDaysRemainingAtPurchase;
      metadataPayload.trialEndDateAtPurchase = trialEndDateAtPurchase;
    }

    await lifetimeDocRef.set({
      userId: resolvedUserId,
      email: normalizedEmail,
      reason,
      grantedBy: 'stripe-webhook',
      grantedAt: FieldValue.serverTimestamp(),
      status: 'active',
      trialDaysRemainingAtPurchase,
      trialEndDateAtPurchase,
      metadata: metadataPayload,
    }, { merge: true });

    const subscriptionData = sanitizeObject({
      hasLifetimeAccess: true,
      interval: 'lifetime',
      status: 'active',
      plan: 'lifetime',
      lifetimeReason: reason,
      lifetimeGrantedAt: FieldValue.serverTimestamp(),
      currentPeriodEnd: null,
      currentPeriodStart: FieldValue.serverTimestamp(),
      userId: resolvedUserId,
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId: paymentIntent.customer || null,
      amountPaid,
      currency,
      isFounder: founderApplied ? true : undefined,
      founderPricing: founderApplied ? true : undefined,
      founderType,
      founderDiscountPercent: founderApplied && metadata.founderDiscountPercent ? Number(metadata.founderDiscountPercent) : undefined,
      founderPlanName: planName,
      lastUpdated: FieldValue.serverTimestamp(),
    });

    await db.collection('userSubscriptions').doc(resolvedUserId).set({
      subscription: subscriptionData,
      lastUpdated: FieldValue.serverTimestamp(),
    }, { merge: true });

    const userUpdatePayload = sanitizeObject({
      stripeCustomerId: paymentIntent.customer || null,
      subscription: subscriptionData,
      updatedAt: FieldValue.serverTimestamp(),
      isFounder: founderApplied ? true : undefined,
      founderGrantedAt: founderApplied ? FieldValue.serverTimestamp() : undefined,
      founderType,
    });

    await db.collection('users').doc(resolvedUserId).set(userUpdatePayload, { merge: true });

    // History: record "trial on hold" so we know days to restore on refund
    await db.collection('userSubscriptions').doc(resolvedUserId).collection('history').add({
      eventType: 'trial_on_hold',
      status: 'active',
      title: 'Trial paused — lifetime access started',
      description: trialDaysRemainingAtPurchase != null
        ? `${trialDaysRemainingAtPurchase} trial day(s) remaining at time of purchase. These can be restored if refunded.`
        : 'Trial state snapshotted at lifetime purchase.',
      trialDaysRemainingAtPurchase,
      trialEndDateAtPurchase,
      stripePaymentIntentId: paymentIntent.id,
      source: 'stripe_webhook',
      severity: 'info',
      eventTimestamp: FieldValue.serverTimestamp(),
    });

    await emailService.sendLifetimeAccessGrantedEmail(userEmail, reason);
    logger.info(`🎉 Lifetime access granted to user ${resolvedUserId} (${normalizedEmail}) via Stripe payment ${paymentIntent.id}`);
  } else {
    const preGrantRef = db.collection('lifetimeAccessPreGrants').doc(normalizedEmail);
    await preGrantRef.set({
      email: normalizedEmail,
      reason,
      grantedBy: 'stripe-webhook',
      grantedAt: FieldValue.serverTimestamp(),
      status: 'pending',
      metadata: metadataPayload,
    }, { merge: true });

    await emailService.sendLifetimeAccessGrantedEmail(userEmail, reason);
    logger.info(`🕒 Lifetime access pre-granted for ${normalizedEmail}; will activate on signup.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shop-only webhook — uses the separate shop Stripe account's signing secret.
// Handles ONLY physical/digital planner orders; never touches app subscriptions.
// Endpoint: https://us-central1-tpp-splendide.cloudfunctions.net/shopStripeWebhook
// ─────────────────────────────────────────────────────────────────────────────
exports.shopStripeWebhook = onRequest(
  {
    cors: false,
    invoker: 'public',
    secrets: ['STRIPE_SHOP_SECRET_KEY', 'STRIPE_SHOP_WEBHOOK_SECRET'],
  },
  async (request, response) => {
    const sig = request.headers['stripe-signature'];

    const shopKey = process.env.STRIPE_SHOP_SECRET_KEY;
    const shopWebhookSecret = process.env.STRIPE_SHOP_WEBHOOK_SECRET;

    if (!shopKey || !shopWebhookSecret) {
      logger.error('❌ STRIPE_SHOP_SECRET_KEY or STRIPE_SHOP_WEBHOOK_SECRET not configured');
      return response.status(200).json({ received: false, error: 'Shop Stripe not configured' });
    }

    const shopStripe = require('stripe')(shopKey);

    let event;
    try {
      event = shopStripe.webhooks.constructEvent(request.rawBody, sig, shopWebhookSecret);
    } catch (err) {
      logger.error(`❌ Shop webhook signature verification failed: ${err.message}`);
      return response.status(200).json({ received: false, error: `Webhook Error: ${err.message}` });
    }

    logger.info(`📥 Shop webhook event: ${event.type} (${event.id})`);

    // Idempotency: skip already-processed events
    const eventRef = admin.firestore().collection('processedWebhookEvents').doc(event.id);
    const existingEvent = await eventRef.get();
    if (existingEvent.exists) {
      logger.info(`⏭️ Shop event ${event.id} already processed, skipping`);
      return response.status(200).json({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          if ((session.metadata || {}).type === 'physical_order') {
            await handlePhysicalOrder(session, shopStripe);
          } else {
            logger.warn(`Shop webhook: unexpected session type "${session.metadata?.type}" — skipping`);
          }
          break;
        }

        case 'checkout.session.expired': {
          const expiredSession = event.data.object;
          if ((expiredSession.metadata || {}).type === 'physical_order') {
            await handleAbandonedCheckout(expiredSession, shopStripe);
          }
          break;
        }

        default:
          logger.info(`🤷 Shop webhook: unhandled event type ${event.type}`);
      }

      await eventRef.set({ processedAt: FieldValue.serverTimestamp(), type: event.type });
      return response.status(200).json({ received: true });
    } catch (error) {
      logger.error(`❌ Shop webhook handler error for ${event.type}:`, error);
      return response.status(200).json({ received: true, processed: false, error: error.message });
    }
  }
);
