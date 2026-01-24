// 🛒 Squarespace Webhook Handler for The Pep Planner
// Receives Squarespace webhook events and grants/manages subscriptions

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');
const crypto = require('crypto');

const FieldValue = admin.firestore.FieldValue;

// Map Squarespace product SKUs to subscription plans
const PRODUCT_TO_PLAN = {
  'app-monthly': 'monthly',
  'app-annual': 'annual',
  'app-lifetime': 'lifetime',
  'monthly-access': 'monthly',
  'annual-access': 'annual',
  'lifetime-access': 'lifetime'
};

// Helper function to normalize email
function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

// Helper function to find user by email
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

// Helper function to generate secure activation token
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to calculate subscription period end
function calculatePeriodEnd(planKey, startDate = new Date()) {
  const endDate = new Date(startDate);
  
  switch (planKey) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'annual':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    case 'lifetime':
      return null; // Lifetime never expires
    default:
      throw new Error(`Unknown plan key: ${planKey}`);
  }
  
  return endDate;
}

// Grant subscription to user
async function grantSubscription(userId, email, planKey, orderId, subscriptionId = null) {
  const now = new Date();
  const periodEnd = calculatePeriodEnd(planKey, now);
  
  const subscriptionData = {
    plan: planKey,
    interval: planKey === 'lifetime' ? 'lifetime' : planKey === 'monthly' ? 'month' : 'year',
    status: 'active',
    source: 'squarespace',
    squarespaceOrderId: orderId,
    squarespaceSubscriptionId: subscriptionId,
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd?.toISOString() || null,
    hasLifetimeAccess: planKey === 'lifetime',
    cancelAtPeriodEnd: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  
  // Write to userSubscriptions collection (where app reads from)
  await admin.firestore()
    .collection('userSubscriptions')
    .doc(userId)
    .set({
      subscription: subscriptionData,
      userId,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  // Also update users collection
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .set({
      subscription: subscriptionData,
      email: normalizeEmail(email),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  logger.info(`✅ Subscription granted: ${planKey} to ${email} (userId: ${userId})`);
  
  return subscriptionData;
}

// Create pending subscription grant
async function createPendingSubscriptionGrant(email, planKey, activationToken, orderId, customerName = null) {
  const expirationDays = 30; // Activation link expires in 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);
  
  const grantData = {
    email: normalizeEmail(email),
    plan: planKey,
    activationToken,
    orderId,
    customerName,
    source: 'squarespace',
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    activatedAt: null,
    activatedBy: null
  };
  
  await admin.firestore()
    .collection('pendingSubscriptions')
    .doc(activationToken)
    .set(grantData);
  
  logger.info(`📝 Pending subscription grant created: ${activationToken} for ${email}`);
  
  return grantData;
}

// Process Squarespace subscription purchase (exported for polling service)
async function processSquarespaceSubscription(email, planKey, order, subscription = null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Invalid email address');
  }
  
  const orderId = order.id || order.orderId;
  const subscriptionId = subscription?.id || subscription?.subscriptionId || null;
  const customerName = order.customerName || order.billingAddress?.name || null;
  
  // Check if user exists
  let userId = await findUserIdByEmail(normalizedEmail);
  
  if (userId) {
    // User exists - grant immediately
    logger.info(`✅ User exists, granting subscription immediately: ${normalizedEmail}`);
    
    await grantSubscription(userId, normalizedEmail, planKey, orderId, subscriptionId);
    
    // Send subscription activated email
    await emailService.sendSquarespaceSubscriptionActivatedEmail(
      normalizedEmail,
      customerName,
      planKey
    );
    
    return { granted: true, userId, isNewUser: false };
  } else {
    // User doesn't exist - create pending grant
    logger.info(`📝 User doesn't exist, creating pending grant: ${normalizedEmail}`);
    
    const activationToken = generateSecureToken();
    
    await createPendingSubscriptionGrant(
      normalizedEmail,
      planKey,
      activationToken,
      orderId,
      customerName
    );
    
    // Send activation email
    await emailService.sendSquarespaceActivationEmail(
      normalizedEmail,
      customerName,
      planKey,
      activationToken
    );
    
    return { granted: false, activationToken, isNewUser: true };
  }
}

// Handle subscription created/purchased
async function handleSquarespaceSubscriptionCreated(order, subscription = null) {
  const email = order.customerEmail || order.email;
  if (!email) {
    logger.warn('⚠️ No email found in Squarespace order');
    return;
  }
  
  // Find subscription product in order
  const lineItems = order.lineItems || order.items || [];
  let planKey = null;
  
  for (const item of lineItems) {
    const sku = item.sku || item.productSku;
    if (sku && PRODUCT_TO_PLAN[sku]) {
      planKey = PRODUCT_TO_PLAN[sku];
      break;
    }
  }
  
  if (!planKey) {
    logger.warn('⚠️ No subscription product found in order');
    return;
  }
  
  logger.info(`🛒 Processing Squarespace subscription: ${planKey} for ${email}`);
  
  await processSquarespaceSubscription(email, planKey, order, subscription);
}

// Handle subscription cancelled
async function handleSquarespaceSubscriptionCancelled(order, subscription) {
  const email = order.customerEmail || order.email;
  if (!email) {
    logger.warn('⚠️ No email found in cancelled subscription');
    return;
  }
  
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    logger.warn(`⚠️ No user found for cancelled subscription: ${email}`);
    return;
  }
  
  const subscriptionId = subscription?.id || subscription?.subscriptionId;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd !== false; // Default to true
  const periodEndDate = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd)
    : calculatePeriodEnd('monthly', new Date()); // Fallback
  
  // Update subscription status
  await admin.firestore()
    .collection('userSubscriptions')
    .doc(userId)
    .set({
      subscription: {
        status: 'canceled',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: periodEndDate.toISOString(),
        canceledAt: FieldValue.serverTimestamp(),
        squarespaceSubscriptionId: subscriptionId,
        source: 'squarespace'
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  // Update users collection
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .set({
      subscription: {
        status: 'canceled',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: periodEndDate.toISOString()
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  // Send cancellation email
  await emailService.sendSubscriptionCancelledEmail(
    email,
    'Subscription',
    periodEndDate.toISOString().split('T')[0]
  );
  
  logger.info(`❌ Subscription cancelled (access until ${periodEndDate}): ${email}`);
}

// Handle subscription expired/ended
async function handleSquarespaceSubscriptionExpired(order, subscription) {
  const email = order.customerEmail || order.email;
  if (!email) {
    logger.warn('⚠️ No email found in expired subscription');
    return;
  }
  
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    return;
  }
  
  // Revoke access
  await admin.firestore()
    .collection('userSubscriptions')
    .doc(userId)
    .set({
      subscription: {
        status: 'expired',
        currentPeriodEnd: null,
        expiredAt: FieldValue.serverTimestamp(),
        squarespaceSubscriptionId: subscription?.id || subscription?.subscriptionId,
        source: 'squarespace'
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  // Update users collection
  await admin.firestore()
    .collection('users')
    .doc(userId)
    .set({
      subscription: {
        status: 'expired',
        plan: null,
        interval: null
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  logger.info(`❌ Subscription expired, access revoked: ${email}`);
}

// Handle subscription renewed
async function handleSquarespaceSubscriptionRenewed(order, subscription) {
  const email = order.customerEmail || order.email;
  if (!email) {
    logger.warn('⚠️ No email found in renewed subscription');
    return;
  }
  
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    return;
  }
  
  // Determine plan from subscription
  const lineItems = order.lineItems || order.items || [];
  let planKey = null;
  
  for (const item of lineItems) {
    const sku = item.sku || item.productSku;
    if (sku && PRODUCT_TO_PLAN[sku]) {
      planKey = PRODUCT_TO_PLAN[sku];
      break;
    }
  }
  
  if (!planKey) {
    logger.warn('⚠️ Could not determine plan from renewal order');
    return;
  }
  
  const periodEnd = calculatePeriodEnd(planKey, new Date());
  const subscriptionId = subscription?.id || subscription?.subscriptionId;
  
  // Update subscription (renewed)
  await admin.firestore()
    .collection('userSubscriptions')
    .doc(userId)
    .set({
      subscription: {
        status: 'active',
        cancelAtPeriodEnd: false, // Reset if they reactivated
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: periodEnd?.toISOString() || null,
        squarespaceSubscriptionId: subscriptionId,
        source: 'squarespace',
        lastRenewedAt: FieldValue.serverTimestamp()
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  logger.info(`✅ Subscription renewed until ${periodEnd}: ${email}`);
}

// Handle payment failed
async function handleSquarespacePaymentFailed(order, subscription) {
  const email = order.customerEmail || order.email;
  if (!email) {
    logger.warn('⚠️ No email found in failed payment');
    return;
  }
  
  const userId = await findUserIdByEmail(email);
  if (!userId) {
    return;
  }
  
  // Mark subscription as past_due
  await admin.firestore()
    .collection('userSubscriptions')
    .doc(userId)
    .set({
      subscription: {
        status: 'past_due',
        paymentFailedAt: FieldValue.serverTimestamp(),
        squarespaceSubscriptionId: subscription?.id || subscription?.subscriptionId,
        source: 'squarespace'
      },
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  
  // Send payment failed email
  const lineItems = order.lineItems || order.items || [];
  const amount = lineItems[0]?.price || order.totalAmount || 0;
  
  await emailService.sendPaymentFailedEmail(
    email,
    amount / 100, // Convert cents to dollars
    'USD'
  );
  
  logger.warn(`⚠️ Payment failed for subscription: ${email}`);
}

// Verify Squarespace webhook signature (if they provide one)
function verifySquarespaceWebhook(req) {
  // TODO: Implement signature verification when Squarespace provides webhook secret
  // For now, we'll accept all webhooks (you should add IP whitelist or signature verification)
  const webhookSecret = process.env.SQUARESPACE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.warn('⚠️ SQUARESPACE_WEBHOOK_SECRET not set - webhook verification disabled');
    return true; // Allow for now, but you should set this up
  }
  
  // If Squarespace provides signature header, verify it here
  // const signature = req.headers['x-squarespace-signature'];
  // if (!signature) return false;
  // ... verification logic ...
  
  return true;
}

// Main webhook handler
// Export for polling service
exports.processOrderWebhook = async (webhookPayload) => {
  try {
    const { type, order, subscription } = webhookPayload;
    
    if (type === 'order.created' || type === 'subscription.create') {
      await handleSquarespaceSubscriptionCreated(order, subscription);
    } else if (type === 'subscription.cancel' || type === 'subscription.cancelled') {
      await handleSquarespaceSubscriptionCancelled(order, subscription);
    } else if (type === 'subscription.expire' || type === 'subscription.expired') {
      await handleSquarespaceSubscriptionExpired(order, subscription);
    } else if (type === 'subscription.renew' || type === 'subscription.renewed') {
      await handleSquarespaceSubscriptionRenewed(order, subscription);
    } else {
      logger.warn(`Unknown webhook type: ${type}`);
    }
  } catch (error) {
    logger.error('Error processing order webhook:', error);
    throw error;
  }
};

exports.squarespaceWebhook = onRequest(
  {
    cors: true,
    maxInstances: 10
  },
  async (req, res) => {
    // Verify webhook (basic check)
    if (!verifySquarespaceWebhook(req)) {
      logger.warn('⚠️ Invalid Squarespace webhook signature');
      return res.status(401).send('Unauthorized');
    }
    
    const event = req.body;
    const eventType = event.type || event.eventType;
    const order = event.order || event.data?.order || event;
    const subscription = event.subscription || event.data?.subscription || null;
    
    logger.info(`📦 Squarespace webhook received: ${eventType}`);
    
    try {
      switch (eventType) {
        case 'order.created':
        case 'subscription.created':
          // New subscription purchase
          await handleSquarespaceSubscriptionCreated(order, subscription);
          break;
          
        case 'subscription.cancelled':
        case 'subscription.canceled':
          // User cancelled (but access continues until period end)
          await handleSquarespaceSubscriptionCancelled(order, subscription);
          break;
          
        case 'subscription.expired':
        case 'subscription.ended':
          // Subscription period ended - revoke access
          await handleSquarespaceSubscriptionExpired(order, subscription);
          break;
          
        case 'subscription.renewed':
        case 'subscription.renewal':
          // Successful renewal
          await handleSquarespaceSubscriptionRenewed(order, subscription);
          break;
          
        case 'subscription.updated':
          // Status change (reactivated, plan changed, etc.)
          // Check status and handle accordingly
          if (subscription?.status === 'cancelled' || subscription?.status === 'canceled') {
            await handleSquarespaceSubscriptionCancelled(order, subscription);
          } else if (subscription?.status === 'active') {
            await handleSquarespaceSubscriptionRenewed(order, subscription);
          }
          break;
          
        case 'payment.failed':
        case 'payment.failure':
          // Renewal payment failed
          await handleSquarespacePaymentFailed(order, subscription);
          break;
          
        case 'order.refunded':
          // Refund issued - handle based on your policy
          logger.info(`💰 Refund issued for order: ${order.id}`);
          // You may want to revoke access or handle differently
          break;
          
        default:
          logger.warn(`⚠️ Unhandled Squarespace event: ${eventType}`);
      }
      
      res.status(200).send('OK');
    } catch (error) {
      logger.error(`❌ Error processing Squarespace webhook:`, error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        eventType,
        orderId: order?.id
      });
      res.status(500).send('Error processing webhook');
    }
  }
);

