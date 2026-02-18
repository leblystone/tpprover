/**
 * Google Play Real-time Developer Notifications (RTDN) Webhook Handler
 * Handles subscription lifecycle events from Google Play
 * 
 * Setup Instructions:
 * 1. Go to Google Play Console → Monetization setup → Real-time developer notifications
 * 2. Set Topic name (or create new Pub/Sub topic)
 * 3. This webhook receives notifications about subscription changes
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const emailService = require('./emailService');

/**
 * Notification types from Google Play
 * Reference: https://developer.android.com/google/play/billing/rtdn-reference
 */
const NOTIFICATION_TYPES = {
  // Subscription notifications
  SUBSCRIPTION_RECOVERED: 1,      // Subscription was recovered from account hold
  SUBSCRIPTION_RENEWED: 2,        // Active subscription was renewed
  SUBSCRIPTION_CANCELED: 3,       // Subscription was voluntarily or involuntarily canceled
  SUBSCRIPTION_PURCHASED: 4,      // New subscription was purchased
  SUBSCRIPTION_ON_HOLD: 5,        // Subscription entered account hold (suspended due to payment issues)
  SUBSCRIPTION_IN_GRACE_PERIOD: 6, // Subscription entered grace period
  SUBSCRIPTION_RESTARTED: 7,      // User restarted subscription
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED: 8, // User accepted a subscription price change
  SUBSCRIPTION_DEFERRED: 9,       // Subscription renewal was deferred
  SUBSCRIPTION_PAUSED: 10,        // Subscription was paused
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED: 11, // Subscription pause schedule changed
  SUBSCRIPTION_REVOKED: 12,       // Subscription was revoked before expiration
  SUBSCRIPTION_EXPIRED: 13,       // Subscription expired
  
  // One-time product notifications
  ONE_TIME_PRODUCT_PURCHASED: 20, // One-time product was purchased
  ONE_TIME_PRODUCT_CANCELED: 21,  // One-time product was canceled
};

/**
 * Handle Google Play RTDN webhook
 */
exports.googlePlayWebhook = onRequest(
  {
    cors: true,
    invoker: 'public',
    secrets: ['GOOGLE_PLAY_SERVICE_ACCOUNT_KEY', 'RESEND_API_KEY']
  },
  async (request, response) => {
    logger.info('📥 Received Google Play RTDN notification');

    try {
      // Parse the Pub/Sub message
      const pubsubMessage = request.body.message;
      if (!pubsubMessage || !pubsubMessage.data) {
        logger.warn('⚠️ Invalid Pub/Sub message format');
        return response.status(400).json({ error: 'Invalid message format' });
      }

      // Decode base64 data
      const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
      const notification = JSON.parse(decodedData);

      logger.info('📦 Decoded notification:', JSON.stringify(notification));

      // Check notification version
      if (notification.version !== '1.0') {
        logger.warn(`⚠️ Unsupported notification version: ${notification.version}`);
      }

      // Handle subscription notification
      if (notification.subscriptionNotification) {
        await handleSubscriptionNotification(notification.subscriptionNotification);
      }
      // Handle one-time product notification
      else if (notification.oneTimeProductNotification) {
        await handleOneTimeProductNotification(notification.oneTimeProductNotification);
      }
      // Handle test notification
      else if (notification.testNotification) {
        logger.info('✅ Received test notification from Google Play');
      }
      else {
        logger.warn('⚠️ Unknown notification type');
      }

      response.status(200).json({ received: true });

    } catch (error) {
      logger.error('❌ Error processing Google Play notification:', error);

      const isTransient = error.code === 'UNAVAILABLE' || 
                          error.code === 'DEADLINE_EXCEEDED' ||
                          error.message?.includes('ECONNRESET');

      if (isTransient) {
        response.status(500).json({ error: error.message, retryable: true });
      } else {
        await admin.firestore().collection('webhookFailures').add({
          source: 'google_play',
          error: error.message,
          stack: error.stack,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        response.status(200).json({ error: error.message });
      }
    }
  }
);

/**
 * Handle subscription notification
 */
async function handleSubscriptionNotification(notification) {
  const { subscriptionId, purchaseToken, notificationType } = notification;
  
  logger.info(`📱 Subscription notification: ${subscriptionId}, type: ${notificationType}`);

  // Get subscription details from Google Play
  const subscriptionDetails = await getSubscriptionDetails(subscriptionId, purchaseToken);
  if (!subscriptionDetails) {
    logger.error('❌ Could not retrieve subscription details');
    return;
  }

  const db = admin.firestore();
  
  // Find user by purchase token
  const userQuery = await db.collection('userSubscriptions')
    .where('subscription.googlePlayPurchaseToken', '==', purchaseToken)
    .limit(1)
    .get();

  if (userQuery.empty) {
    logger.warn(`⚠️ No user found with purchase token: ${purchaseToken}`);
    return;
  }

  const userDoc = userQuery.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();
  const userEmail = userData.subscription?.userEmail;

  logger.info(`👤 Found user: ${userId} (${userEmail})`);

  // Handle different notification types
  switch (notificationType) {
    case NOTIFICATION_TYPES.SUBSCRIPTION_PURCHASED:
      await handleSubscriptionPurchased(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_RENEWED:
      await handleSubscriptionRenewed(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_CANCELED:
      await handleSubscriptionCanceled(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED:
      await handleSubscriptionExpired(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_ON_HOLD:
      await handleSubscriptionOnHold(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_IN_GRACE_PERIOD:
      await handleSubscriptionGracePeriod(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_RECOVERED:
      await handleSubscriptionRecovered(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_PAUSED:
      await handleSubscriptionPaused(userId, userEmail, subscriptionDetails);
      break;
    
    case NOTIFICATION_TYPES.SUBSCRIPTION_REVOKED:
      await handleSubscriptionRevoked(userId, userEmail, subscriptionDetails);
      break;

    case NOTIFICATION_TYPES.SUBSCRIPTION_RESTARTED:
      await handleSubscriptionRestarted(userId, userEmail, subscriptionDetails);
      break;

    case NOTIFICATION_TYPES.SUBSCRIPTION_PRICE_CHANGE_CONFIRMED:
      logger.info(`💲 Price change confirmed for user ${userId}`);
      await updateSubscriptionStatus(userId, 'active', subscriptionDetails);
      break;

    case NOTIFICATION_TYPES.SUBSCRIPTION_DEFERRED:
      logger.info(`⏭️ Subscription deferred for user ${userId}`);
      await updateSubscriptionStatus(userId, 'active', subscriptionDetails);
      break;

    case NOTIFICATION_TYPES.SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED:
      logger.info(`📅 Pause schedule changed for user ${userId}`);
      await updateSubscriptionStatus(userId, userData.subscription?.status || 'active', subscriptionDetails);
      break;

    default:
      logger.info(`ℹ️ Unhandled notification type: ${notificationType}`);
  }
}

/**
 * Handle one-time product notification
 */
async function handleOneTimeProductNotification(notification) {
  const { sku, purchaseToken, notificationType } = notification;
  
  logger.info(`🛍️ One-time product notification: ${sku}, type: ${notificationType}`);

  // For one-time products (like lifetime access), these are already handled
  // in verifyGooglePlayPurchase function
  // This webhook is mainly for tracking refunds
  
  if (notificationType === NOTIFICATION_TYPES.ONE_TIME_PRODUCT_CANCELED) {
    logger.warn(`⚠️ One-time product canceled/refunded: ${sku}, token: ${purchaseToken}`);
    
    const db = admin.firestore();
    
    // Find user by purchase token in lifetimeAccess or userSubscriptions
    const subQuery = await db.collection('userSubscriptions')
      .where('subscription.googlePlayPurchaseToken', '==', purchaseToken)
      .limit(1)
      .get();

    let userId = null;
    let userEmail = null;

    if (!subQuery.empty) {
      userId = subQuery.docs[0].id;
      userEmail = subQuery.docs[0].data()?.subscription?.userEmail;
    }

    if (!userId) {
      const lifetimeQuery = await db.collection('lifetimeAccess')
        .where('metadata.googlePlayPurchaseToken', '==', purchaseToken)
        .limit(1)
        .get();
      if (!lifetimeQuery.empty) {
        userId = lifetimeQuery.docs[0].id;
        userEmail = lifetimeQuery.docs[0].data()?.email;
      }
    }

    if (userId) {
      // Revoke lifetime access
      await db.collection('lifetimeAccess').doc(userId).update({
        status: 'revoked',
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedReason: 'google_play_refund',
        refundPurchaseToken: purchaseToken,
      });

      await db.collection('userSubscriptions').doc(userId).set({
        subscription: {
          status: 'refunded',
          hasLifetimeAccess: false,
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }
      }, { merge: true });

      await db.collection('users').doc(userId).set({
        subscription: {
          status: 'refunded',
          hasLifetimeAccess: false,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }
      }, { merge: true });

      logger.info(`🚫 Lifetime access revoked for user ${userId} due to Google Play refund`);
    } else {
      logger.warn(`⚠️ Could not find user for refunded one-time product: ${sku}`);
    }
  }
}

/**
 * Get subscription details from Google Play API
 */
async function getSubscriptionDetails(subscriptionId, purchaseToken) {
  try {
    const keyValue = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;
    if (!keyValue) {
      logger.error('❌ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY not configured');
      return null;
    }

    const serviceAccountKey = JSON.parse(keyValue.trim().replace(/\r?\n/g, ''));
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const client = google.androidpublisher({ version: 'v3', auth });
    
    const response = await client.purchases.subscriptions.get({
      packageName: 'com.thepepplanner.app',
      subscriptionId,
      token: purchaseToken,
    });

    return response.data;
  } catch (error) {
    logger.error('❌ Failed to get subscription details:', error);
    return null;
  }
}

/**
 * Handlers for different subscription states
 */

async function handleSubscriptionPurchased(userId, userEmail, details) {
  logger.info(`✅ Subscription purchased: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'active', details);
  
  // Send confirmation email
  if (userEmail) {
    await emailService.sendSubscriptionConfirmedEmail(userEmail, 'Premium Plan (Google Play)');
  }
}

async function handleSubscriptionRenewed(userId, userEmail, details) {
  logger.info(`🔄 Subscription renewed: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'active', details);
  
  // Send renewal confirmation email
  if (userEmail) {
    await emailService.sendPaymentSuccessfulEmail(
      userEmail,
      null, // Amount not available in renewal notification
      'USD',
      null
    );
  }
}

async function handleSubscriptionCanceled(userId, userEmail, details) {
  logger.info(`❌ Subscription canceled: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'canceled', details);
  
  // Send cancellation email
  if (userEmail) {
    const expiryDate = details.expiryTimeMillis 
      ? new Date(parseInt(details.expiryTimeMillis)).toISOString().split('T')[0]
      : 'end of billing period';
    
    await emailService.sendSubscriptionCancelledEmail(
      userEmail,
      'Premium Plan (Google Play)',
      expiryDate
    );
  }
}

async function handleSubscriptionExpired(userId, userEmail, details) {
  logger.info(`⏰ Subscription expired: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'expired', details);
  
  // Optionally send expiration notice
  // You may already have a trial expired email template
}

async function handleSubscriptionOnHold(userId, userEmail, details) {
  logger.info(`⚠️ Subscription on hold (payment issue): ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'on_hold', details);
  
  // Send payment failed email
  if (userEmail) {
    await emailService.sendPaymentFailedEmail(
      userEmail,
      null,
      'USD',
      null
    );
  }
}

async function handleSubscriptionGracePeriod(userId, userEmail, details) {
  logger.info(`⏳ Subscription in grace period: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'grace_period', details);
  
  // Send payment failed email with grace period notice
  if (userEmail) {
    await emailService.sendPaymentFailedEmail(
      userEmail,
      null,
      'USD',
      null
    );
  }
}

async function handleSubscriptionRecovered(userId, userEmail, details) {
  logger.info(`✅ Subscription recovered: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'active', details);
  
  // Send recovery confirmation
  if (userEmail) {
    await emailService.sendPaymentSuccessfulEmail(
      userEmail,
      null,
      'USD',
      null
    );
  }
}

async function handleSubscriptionPaused(userId, userEmail, details) {
  logger.info(`⏸️ Subscription paused: ${userId}`);
  
  // Update Firestore
  await updateSubscriptionStatus(userId, 'paused', details);
}

async function handleSubscriptionRevoked(userId, userEmail, details) {
  logger.info(`🚫 Subscription revoked: ${userId}`);
  await updateSubscriptionStatus(userId, 'revoked', details);
}

async function handleSubscriptionRestarted(userId, userEmail, details) {
  logger.info(`▶️ Subscription restarted: ${userId}`);
  await updateSubscriptionStatus(userId, 'active', details);
  
  if (userEmail) {
    await emailService.sendSubscriptionConfirmedEmail(userEmail, 'Premium Plan (Google Play)');
  }
}

/**
 * Update subscription status in Firestore
 */
async function updateSubscriptionStatus(userId, status, details) {
  const db = admin.firestore();
  
  const subscriptionData = {
    status,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (details.expiryTimeMillis) {
    subscriptionData.currentPeriodEnd = new Date(parseInt(details.expiryTimeMillis));
  }
  
  if (details.startTimeMillis) {
    subscriptionData.currentPeriodStart = new Date(parseInt(details.startTimeMillis));
  }

  subscriptionData.isAutoRenewing = details.autoRenewing === true;

  const batch = db.batch();
  const subRef = db.collection('userSubscriptions').doc(userId);
  const userRef = db.collection('users').doc(userId);

  batch.set(subRef, { subscription: subscriptionData }, { merge: true });
  batch.set(userRef, { subscription: subscriptionData }, { merge: true });

  // Audit trail
  const historyRef = subRef.collection('history').doc();
  batch.set(historyRef, {
    ...subscriptionData,
    eventTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    source: 'google_play_webhook',
  });

  await batch.commit();
  logger.info(`✅ Updated subscription status to ${status} for user ${userId}`);
}

