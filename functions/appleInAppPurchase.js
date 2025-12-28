/**
 * Apple In-App Purchase Verification
 * Verifies Apple App Store purchases and syncs subscription status to Firestore
 * 
 * Apple Server Notifications V2: https://developer.apple.com/documentation/appstoreservernotifications
 */

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const emailService = require('./emailService');

// Apple App Store Connect API Configuration
// Set via: firebase functions:secrets:set APPLE_APP_STORE_KEY_ID
// Set via: firebase functions:secrets:set APPLE_APP_STORE_ISSUER_ID  
// Set via: firebase functions:secrets:set APPLE_APP_STORE_PRIVATE_KEY

/**
 * Verify Apple App Store receipt with Apple's servers
 * @param {string} receiptData - Base64 encoded receipt
 * @param {boolean} production - Whether to use production or sandbox environment
 * @returns {Promise<Object>} Receipt verification response
 */
async function verifyAppleReceipt(receiptData, production = true) {
  const endpoint = production
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'receipt-data': receiptData,
        password: process.env.APPLE_APP_STORE_SHARED_SECRET || 'not-configured', // Set via Firebase secrets
      }),
    });

    const result = await response.json();

    // If status is 21007, receipt is from sandbox but we tried production
    if (result.status === 21007 && production) {
      logger.info('Receipt is from sandbox, retrying with sandbox endpoint');
      return verifyAppleReceipt(receiptData, false);
    }

    return result;
  } catch (error) {
    logger.error('❌ Failed to verify Apple receipt:', error);
    throw new Error(`Apple receipt verification failed: ${error.message}`);
  }
}

/**
 * Map Apple purchase to subscription format
 * @param {Object} transaction - Apple transaction data
 * @param {string} productId - Product ID
 * @param {Object} options - Additional options
 * @returns {Object} Subscription data for Firestore
 */
function mapApplePurchaseToSubscription(transaction, productId, options = {}) {
  const { userId, userEmail } = options;

  // Determine plan details from product ID
  const planMapping = {
    'com.thepepplanner.app.monthly': {
      key: 'monthly',
      name: 'Monthly',
      interval: 'month',
    },
    'com.thepepplanner.app.annual': {
      key: 'annual',
      name: 'Annual',
      interval: 'year',
    },
    'com.thepepplanner.app.lifetime': {
      key: 'lifetime',
      name: 'Lifetime Access',
      interval: 'lifetime',
    },
  };

  const planDetails = planMapping[productId] || {
    key: productId,
    name: productId,
    interval: 'month',
  };

  const subscriptionData = {
    userId,
    status: 'active',
    plan: planDetails.name,
    interval: planDetails.interval,
    paymentProvider: 'apple',
    appleProductId: productId,
    appleTransactionId: transaction.transaction_id || transaction.transactionId,
    appleOriginalTransactionId: transaction.original_transaction_id || transaction.originalTransactionId,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Subscription-specific fields
  if (transaction.expires_date_ms || transaction.expiresDate) {
    const expiresMs = transaction.expires_date_ms || transaction.expiresDate;
    subscriptionData.currentPeriodEnd = new Date(parseInt(expiresMs));
  }

  if (transaction.purchase_date_ms || transaction.purchaseDate) {
    const purchaseMs = transaction.purchase_date_ms || transaction.purchaseDate;
    subscriptionData.currentPeriodStart = new Date(parseInt(purchaseMs));
  }

  // Lifetime purchase detection
  if (planDetails.interval === 'lifetime' || !subscriptionData.currentPeriodEnd) {
    subscriptionData.hasLifetimeAccess = true;
    subscriptionData.lifetimeReason = 'apple_store_purchase';
    subscriptionData.currentPeriodEnd = null; // Lifetime never expires
  }

  return subscriptionData;
}

/**
 * Sync Apple subscription to Firestore
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {Object} subscriptionData - Subscription data
 */
async function syncAppleSubscriptionToFirestore(userId, userEmail, subscriptionData) {
  const db = admin.firestore();

  try {
    // Update userSubscriptions collection
    await db.collection('userSubscriptions').doc(userId).set(
      {
        subscription: subscriptionData,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Update users collection
    await db.collection('users').doc(userId).set(
      {
        subscription: subscriptionData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // If lifetime, also update lifetimeAccess collection
    if (subscriptionData.hasLifetimeAccess) {
      await db.collection('lifetimeAccess').doc(userId).set(
        {
          userId: userId,
          email: userEmail,
          reason: 'apple_store_purchase',
          grantedBy: 'apple-in-app-purchase',
          grantedAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
          metadata: {
            appleProductId: subscriptionData.appleProductId,
            appleTransactionId: subscriptionData.appleTransactionId,
            appleOriginalTransactionId: subscriptionData.appleOriginalTransactionId,
          },
        },
        { merge: true }
      );
    }

    logger.info(`✅ Apple subscription synced for user ${userId}`);
  } catch (error) {
    logger.error('❌ Failed to sync Apple subscription to Firestore:', error);
    throw error;
  }
}

/**
 * Apple App Store Server Notifications Webhook
 * Receives notifications about subscription status changes
 * 
 * Notification Types:
 * - INITIAL_BUY: New subscription
 * - DID_RENEW: Subscription renewed
 * - DID_CHANGE_RENEWAL_STATUS: Auto-renew status changed
 * - DID_FAIL_TO_RENEW: Renewal failed
 * - EXPIRED: Subscription expired
 * - REFUND: Purchase refunded
 */
exports.appleWebhook = onRequest(
  {
    cors: true,
    invoker: 'public',
    // Commented out secrets for now - set these when Apple integration is ready
    // secrets: ['APPLE_APP_STORE_SHARED_SECRET', 'RESEND_API_KEY'],
  },
  async (request, response) => {
    logger.info('📥 Received Apple App Store notification');

    try {
      const notification = request.body;

      // Apple sends notifications in a specific format
      // V2 format: signedPayload contains the actual notification data
      if (!notification) {
        logger.warn('⚠️ Empty notification received');
        response.status(200).json({ received: true });
        return;
      }

      // TODO: Verify JWT signature from Apple
      // This requires parsing the signedPayload JWT and verifying with Apple's public keys
      // See: https://developer.apple.com/documentation/appstoreservernotifications/jwstransaction

      logger.info(`📥 Apple notification type: ${notification.notificationType}`);

      // Handle different notification types
      const notificationType = notification.notificationType;

      switch (notificationType) {
        case 'INITIAL_BUY':
          await handleAppleInitialBuy(notification);
          break;

        case 'DID_RENEW':
          await handleAppleRenewal(notification);
          break;

        case 'DID_CHANGE_RENEWAL_STATUS':
          await handleAppleRenewalStatusChange(notification);
          break;

        case 'DID_FAIL_TO_RENEW':
          await handleAppleRenewalFailure(notification);
          break;

        case 'EXPIRED':
          await handleAppleExpiration(notification);
          break;

        case 'REFUND':
          await handleAppleRefund(notification);
          break;

        default:
          logger.info(`🤷 Unhandled Apple notification type: ${notificationType}`);
      }

      response.status(200).json({ received: true, notificationType });
    } catch (error) {
      logger.error(`❌ Error processing Apple webhook: ${error.message}`, error);
      // Return 200 to acknowledge receipt even on processing errors
      response.status(200).json({
        received: true,
        processed: false,
        error: error.message,
      });
    }
  }
);

/**
 * Handler for initial subscription purchase
 */
async function handleAppleInitialBuy(notification) {
  logger.info('🎉 Apple: Initial subscription purchase');
  // TODO: Extract transaction data and sync to Firestore
  // This requires decoding the signedPayload JWT
}

/**
 * Handler for subscription renewal
 */
async function handleAppleRenewal(notification) {
  logger.info('🔄 Apple: Subscription renewed');
  // TODO: Update subscription period end date
}

/**
 * Handler for renewal status change (e.g., auto-renew turned off)
 */
async function handleAppleRenewalStatusChange(notification) {
  logger.info('⚙️ Apple: Renewal status changed');
  // TODO: Update subscription cancelAtPeriodEnd status
}

/**
 * Handler for renewal failure
 */
async function handleAppleRenewalFailure(notification) {
  logger.info('⚠️ Apple: Subscription renewal failed');
  // TODO: Mark subscription as past_due
}

/**
 * Handler for subscription expiration
 */
async function handleAppleExpiration(notification) {
  logger.info('⏰ Apple: Subscription expired');
  // TODO: Mark subscription as expired/cancelled
}

/**
 * Handler for refund
 */
async function handleAppleRefund(notification) {
  logger.info('💸 Apple: Purchase refunded');
  // TODO: Revoke subscription access
}

/**
 * Callable function for client-side receipt verification
 * iOS app calls this function with receipt data after purchase
 */
exports.verifyAppleReceipt = require('firebase-functions/v2/https').onCall(
  {
    cors: true,
    // Commented out secrets for now - set these when Apple integration is ready
    // secrets: ['APPLE_APP_STORE_SHARED_SECRET', 'RESEND_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('The function must be called while authenticated.');
    }

    const { receiptData, userId, userEmail } = request.data;

    if (!receiptData) {
      throw new Error('Receipt data is required');
    }

    const resolvedUserId = userId || request.auth.uid;

    logger.info(`🔍 Verifying Apple receipt for user ${resolvedUserId}`);

    try {
      // Verify receipt with Apple
      const verificationResult = await verifyAppleReceipt(receiptData);

      if (verificationResult.status !== 0) {
        logger.error(`❌ Apple receipt verification failed: ${verificationResult.status}`);
        throw new Error(`Receipt verification failed with status: ${verificationResult.status}`);
      }

      // Extract latest receipt info
      const latestReceiptInfo = verificationResult.latest_receipt_info;
      if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
        throw new Error('No receipt info found');
      }

      // Get the most recent transaction
      const latestTransaction = latestReceiptInfo[latestReceiptInfo.length - 1];
      const productId = latestTransaction.product_id;

      // Map to subscription format
      const subscriptionData = mapApplePurchaseToSubscription(latestTransaction, productId, {
        userId: resolvedUserId,
        userEmail,
      });

      // Sync to Firestore
      await syncAppleSubscriptionToFirestore(resolvedUserId, userEmail, subscriptionData);

      // Send confirmation email
      if (userEmail) {
        try {
          logger.info(`📧 Sending subscription confirmation email to ${userEmail}`);
          const planName = subscriptionData.plan || 'Premium Plan';
          await emailService.sendSubscriptionConfirmedEmail(userEmail, planName);
          logger.info(`✅ Subscription confirmation email sent to ${userEmail}`);
        } catch (emailError) {
          logger.error('❌ Failed to send subscription confirmation email:', emailError);
          // Don't fail the whole function if email fails
        }
      }

      return {
        success: true,
        subscription: subscriptionData,
      };
    } catch (error) {
      logger.error('❌ Error verifying Apple receipt:', error);
      throw new Error(`Failed to verify receipt: ${error.message}`);
    }
  }
);

