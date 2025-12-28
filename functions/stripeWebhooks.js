// 🔗 Stripe Webhook Handler for The Pep Planner
// Receives Stripe webhook events and triggers appropriate email automation

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

const FieldValue = admin.firestore.FieldValue;
const DEFAULT_FOUNDER_CAP = parseInt(process.env.FOUNDER_CAP || '100', 10);
const DEFAULT_FOUNDER_DISCOUNT = parseInt(process.env.FOUNDER_DISCOUNT_PERCENT || '50', 10);
const DEFAULT_LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || null;
const FOUNDER_LIFETIME_PRICE_ID = process.env.STRIPE_FOUNDER_LIFETIME_PRICE_ID || null;

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
  return [DEFAULT_LIFETIME_PRICE_ID, FOUNDER_LIFETIME_PRICE_ID]
    .filter(Boolean)
    .includes(normalized);
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

async function upsertSubscriptionState({
  stripeSubscription,
  invoice,
  customer,
  statusOverride,
  paymentState,
  userIdHint,
  emailHint
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

  const subscriptionRecord = sanitizeObject({
    id: stripeSubscription?.id || invoice?.subscription || null,
    stripeSubscriptionId: stripeSubscription?.id || invoice?.subscription || null,
    stripeCustomerId: customerId,
    status: subscriptionStatus,
    plan: planDetails.planName,
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

  const db = admin.firestore();
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

  await userSubscriptionsRef.set(subscriptionUpdate, { merge: true });

  const userSubscriptionSnapshot = sanitizeObject({
    status: subscriptionRecord.status,
    plan: subscriptionRecord.plan,
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

  await userRef.set({
    stripeCustomerId: subscriptionRecord.stripeCustomerId,
    subscription: userSubscriptionSnapshot,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

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

    logger.info(`📥 Received Stripe webhook event: ${event.type}`);

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

        // Dispute Events (for chargebacks, not refunds)
        case 'charge.dispute.created':
          await handleDisputeCreated(event, stripe);
          break;

        case 'charge.dispute.updated':
          await handleDisputeUpdated(event, stripe);
          break;

        case 'charge.dispute.closed':
          await handleDisputeClosed(event, stripe);
          break;

        default:
          logger.info(`🤷 Unhandled event type: ${event.type}`);
      }

      // Always return 200 to acknowledge receipt to Stripe
      response.status(200).json({ received: true, eventType: event.type });
    } catch (error) {
      logger.error(`❌ Error processing webhook: ${error.message}`, error);
      // Return 200 to acknowledge receipt to Stripe even on processing errors
      // This prevents Stripe from retrying indefinitely
      response.status(200).json({ 
        received: true, 
        processed: false,
        error: error.message 
      });
    }
  }
);

/**
 * Handle checkout session completed (for founder pricing tracking)
 */
async function handleCheckoutSessionCompleted(event, stripe) {
  const session = event.data.object;
  const metadata = session.metadata || {};

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

  // Send payment failed email
  await emailService.sendPaymentFailedEmail(
    userEmail,
    paymentIntent.amount / 100,
    paymentIntent.currency.toUpperCase(),
    null // No invoice URL available in payment intent
  );

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'payment_intent.payment_failed',
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
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

  await upsertSubscriptionState({
    stripeSubscription: subscription,
    customer,
    userIdHint: subscription.metadata?.userId,
    emailHint: userEmail,
    statusOverride: 'canceled',
    paymentState: 'canceled'
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

  // Send payment successful email with invoice link
  await emailService.sendPaymentSuccessfulEmail(
    userEmail,
    invoice.amount_paid / 100,
    invoice.currency.toUpperCase(),
    invoice.hosted_invoice_url
  );

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

  // Send payment failed email
  await emailService.sendPaymentFailedEmail(
    userEmail,
    invoice.amount_due / 100,
    invoice.currency.toUpperCase(),
    invoice.hosted_invoice_url
  );

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
}

/**
 * Handle upcoming invoice (renewal reminder)
 */
async function handleInvoiceUpcoming(event, stripe) {
  const invoice = event.data.object;
  logger.info(`📅 Invoice upcoming: ${invoice.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', invoice.customer);
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const planName = subscription.items.data[0]?.price?.nickname || 'Pro Plan';

  // Send renewal reminder email
  await emailService.sendRenewalReminderEmail(userEmail, planName);

  // Log the event
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

  // Get customer email
  const charge = await stripe.charges.retrieve(dispute.charge);
  const customer = await stripe.customers.retrieve(charge.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Send dispute notification email
  await emailService.sendDisputeNotificationEmail(userEmail, dispute.reason, dispute.amount);

  logger.info(`✅ Dispute notification sent to: ${userEmail}`);
}

/**
 * Handle dispute updated
 */
async function handleDisputeUpdated(event, stripe) {
  const dispute = event.data.object;
  logger.info(`📝 Dispute updated: ${dispute.id} - Status: ${dispute.status}`);

  // Get customer email
  const charge = await stripe.charges.retrieve(dispute.charge);
  const customer = await stripe.customers.retrieve(charge.customer);
  const userEmail = customer.email;

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

  // Get customer email
  const charge = await stripe.charges.retrieve(dispute.charge);
  const customer = await stripe.customers.retrieve(charge.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Send dispute resolution email
  await emailService.sendDisputeResolutionEmail(userEmail, dispute.status, dispute.reason);

  logger.info(`✅ Dispute resolution sent to: ${userEmail}`);
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
    const existingLifetimeDoc = await lifetimeDocRef.get();

    if (existingLifetimeDoc.exists) {
      const existingData = existingLifetimeDoc.data();
      if (existingData?.status === 'active' && existingData?.metadata?.stripePaymentIntentId === paymentIntent.id) {
        logger.info(`ℹ️ Lifetime access already recorded for user ${resolvedUserId}; skipping duplicate Stripe sync.`);
        return;
      }
    }

    await lifetimeDocRef.set({
      userId: resolvedUserId,
      email: normalizedEmail,
      reason,
      grantedBy: 'stripe-webhook',
      grantedAt: FieldValue.serverTimestamp(),
      status: 'active',
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
