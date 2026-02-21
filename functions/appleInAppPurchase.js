/**
 * Apple In-App Purchase Verification
 * Verifies Apple App Store purchases and syncs subscription status to Firestore.
 * Handles App Store Server Notifications V2.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const emailService = require('./emailService');
const adminAlerts = require('./adminAlerts');

const FieldValue = admin.firestore.FieldValue;

async function verifyAppleReceipt(receiptData, production = true) {
  const endpoint = production
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  const sharedSecret = process.env.APPLE_APP_STORE_SHARED_SECRET;
  if (!sharedSecret) {
    throw new Error('APPLE_APP_STORE_SHARED_SECRET not configured');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      password: sharedSecret,
    }),
  });

  const result = await response.json();

  // 21007 means receipt is from sandbox but we tried production
  if (result.status === 21007 && production) {
    return verifyAppleReceipt(receiptData, false);
  }

  return result;
}

function mapApplePurchaseToSubscription(transaction, productId, options = {}) {
  const { userId, userEmail } = options;

  const planMapping = {
    'monthly.apple': { key: 'monthly', name: 'Monthly', interval: 'month' },
    'annual.apple': { key: 'annual', name: 'Annual', interval: 'year' },
    'lifetime.apple': { key: 'lifetime', name: 'Lifetime Access', interval: 'lifetime' },
  };

  const planDetails = planMapping[productId] || { key: productId, name: productId, interval: 'month' };

  const subscriptionData = {
    userId,
    userEmail,
    status: 'active',
    plan: planDetails.name,
    interval: planDetails.interval,
    paymentProvider: 'apple',
    appleProductId: productId,
    appleTransactionId: transaction.transaction_id || transaction.transactionId,
    appleOriginalTransactionId: transaction.original_transaction_id || transaction.originalTransactionId,
    lastUpdated: FieldValue.serverTimestamp(),
  };

  if (transaction.expires_date_ms || transaction.expiresDate) {
    subscriptionData.currentPeriodEnd = new Date(parseInt(transaction.expires_date_ms || transaction.expiresDate));
  }

  if (transaction.purchase_date_ms || transaction.purchaseDate) {
    subscriptionData.currentPeriodStart = new Date(parseInt(transaction.purchase_date_ms || transaction.purchaseDate));
  }

  if (planDetails.interval === 'lifetime' || !subscriptionData.currentPeriodEnd) {
    subscriptionData.hasLifetimeAccess = true;
    subscriptionData.lifetimeReason = 'apple_store_purchase';
    subscriptionData.currentPeriodEnd = null;
  }

  return subscriptionData;
}

async function syncAppleSubscriptionToFirestore(userId, userEmail, subscriptionData) {
  const db = admin.firestore();
  const batch = db.batch();
  const subRef = db.collection('userSubscriptions').doc(userId);
  const userRef = db.collection('users').doc(userId);

  batch.set(subRef, {
    subscription: subscriptionData,
    lastUpdated: FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(userRef, {
    subscription: subscriptionData,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  // Audit trail
  const historyRef = subRef.collection('history').doc();
  batch.set(historyRef, {
    ...subscriptionData,
    eventTimestamp: FieldValue.serverTimestamp(),
    source: 'apple_iap',
  });

  if (subscriptionData.hasLifetimeAccess) {
    const lifetimeRef = db.collection('lifetimeAccess').doc(userId);
    batch.set(lifetimeRef, {
      userId,
      email: userEmail,
      reason: 'apple_store_purchase',
      grantedBy: 'apple-in-app-purchase',
      grantedAt: FieldValue.serverTimestamp(),
      status: 'active',
      metadata: {
        appleProductId: subscriptionData.appleProductId,
        appleTransactionId: subscriptionData.appleTransactionId,
        appleOriginalTransactionId: subscriptionData.appleOriginalTransactionId,
      },
    }, { merge: true });
  }

  await batch.commit();
  logger.info(`✅ Apple subscription synced for user ${userId}`);
}

async function findUserByAppleTransactionId(originalTransactionId) {
  const db = admin.firestore();
  const query = await db.collection('userSubscriptions')
    .where('subscription.appleOriginalTransactionId', '==', originalTransactionId)
    .limit(1)
    .get();

  if (!query.empty) {
    const doc = query.docs[0];
    return { userId: doc.id, ...doc.data() };
  }
  return null;
}

// --- App Store Server Notifications V2 Webhook ---

exports.appleWebhook = onRequest(
  {
    cors: true,
    invoker: 'public',
    secrets: ['RESEND_API_KEY'],
  },
  async (request, response) => {
    logger.info('📥 Received Apple App Store notification');

    try {
      const { signedPayload } = request.body;

      if (!signedPayload) {
        logger.warn('⚠️ No signedPayload in notification');
        return response.status(200).json({ received: true });
      }

      // Decode the JWT payload (header.payload.signature)
      // In production, you should verify the JWT signature with Apple's public keys
      const parts = signedPayload.split('.');
      if (parts.length !== 3) {
        logger.warn('⚠️ Invalid JWT format');
        return response.status(200).json({ received: true });
      }

      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson);
      const notificationType = payload.notificationType;
      const subtype = payload.subtype;

      logger.info(`📥 Apple notification: ${notificationType} (subtype: ${subtype})`);

      // Decode the transaction info from the signed payload
      let transactionInfo = null;
      if (payload.data?.signedTransactionInfo) {
        const txParts = payload.data.signedTransactionInfo.split('.');
        if (txParts.length === 3) {
          transactionInfo = JSON.parse(Buffer.from(txParts[1], 'base64').toString('utf-8'));
        }
      }

      if (!transactionInfo) {
        logger.warn('⚠️ Could not decode transaction info');
        return response.status(200).json({ received: true });
      }

      const originalTransactionId = transactionInfo.originalTransactionId;
      const userRecord = await findUserByAppleTransactionId(String(originalTransactionId));

      if (!userRecord) {
        logger.warn(`⚠️ No user found for Apple originalTransactionId: ${originalTransactionId}`);
        return response.status(200).json({ received: true });
      }

      const userId = userRecord.userId;
      const userEmail = userRecord.subscription?.userEmail;
      const db = admin.firestore();

      switch (notificationType) {
        case 'DID_RENEW':
        case 'SUBSCRIBED': {
          const subData = mapApplePurchaseToSubscription(transactionInfo, transactionInfo.productId, { userId, userEmail });
          await syncAppleSubscriptionToFirestore(userId, userEmail, subData);
          if (userEmail) await emailService.sendPaymentSuccessfulEmail(userEmail, null, 'USD', null);
          break;
        }

        case 'DID_CHANGE_RENEWAL_STATUS': {
          const autoRenew = subtype !== 'AUTO_RENEW_DISABLED';
          await db.collection('userSubscriptions').doc(userId).set({
            subscription: {
              cancelAtPeriodEnd: !autoRenew,
              lastUpdated: FieldValue.serverTimestamp(),
            }
          }, { merge: true });
          await db.collection('users').doc(userId).set({
            subscription: {
              cancelAtPeriodEnd: !autoRenew,
              lastUpdated: FieldValue.serverTimestamp(),
            }
          }, { merge: true });
          break;
        }

        case 'DID_FAIL_TO_RENEW': {
          const failPayload = {
            status: subtype === 'GRACE_PERIOD' ? 'grace_period' : 'past_due',
            billingStatus: 'payment_failed',
            lastUpdated: FieldValue.serverTimestamp(),
          };
          await db.collection('userSubscriptions').doc(userId).set(
            { subscription: failPayload }, { merge: true }
          );
          await db.collection('users').doc(userId).set(
            { subscription: failPayload }, { merge: true }
          );
          if (userEmail) await emailService.sendPaymentFailedEmail(userEmail, null, 'USD', null);
          break;
        }

        case 'EXPIRED': {
          const expPayload = {
            status: 'expired',
            lastUpdated: FieldValue.serverTimestamp(),
          };
          await db.collection('userSubscriptions').doc(userId).set(
            { subscription: expPayload }, { merge: true }
          );
          await db.collection('users').doc(userId).set(
            { subscription: expPayload }, { merge: true }
          );
          break;
        }

        case 'REFUND': {
          await db.collection('userSubscriptions').doc(userId).set({
            subscription: {
              status: 'refunded',
              hasLifetimeAccess: false,
              refundedAt: FieldValue.serverTimestamp(),
              lastUpdated: FieldValue.serverTimestamp(),
            }
          }, { merge: true });
          await db.collection('users').doc(userId).set({
            subscription: {
              status: 'refunded',
              hasLifetimeAccess: false,
              lastUpdated: FieldValue.serverTimestamp(),
            }
          }, { merge: true });

          const lifetimeDoc = await db.collection('lifetimeAccess').doc(userId).get();
          if (lifetimeDoc.exists) {
            await db.collection('lifetimeAccess').doc(userId).update({
              status: 'revoked',
              revokedAt: FieldValue.serverTimestamp(),
              revokedReason: 'apple_refund',
            });
          }

          adminAlerts.alertRefund(userId, userEmail, null, 'apple').catch(() => {});
          logger.info(`🚫 Access revoked for user ${userId} due to Apple refund`);
          if (userEmail) {
            await emailService.sendDisputeNotificationEmail(userEmail, 'App Store refund', null);
          }
          break;
        }

        case 'REVOKE': {
          await db.collection('userSubscriptions').doc(userId).set({
            subscription: {
              status: 'revoked',
              lastUpdated: FieldValue.serverTimestamp(),
            }
          }, { merge: true });
          await db.collection('users').doc(userId).set({
            subscription: {
              status: 'revoked',
              lastUpdated: FieldValue.serverTimestamp(),
            }
          }, { merge: true });
          if (userEmail) {
            await emailService.sendDisputeNotificationEmail(userEmail, 'App Store subscription revoked', null);
          }
          break;
        }

        default:
          logger.info(`🤷 Unhandled Apple notification: ${notificationType}`);
      }

      response.status(200).json({ received: true, notificationType });
    } catch (error) {
      logger.error(`❌ Error processing Apple webhook: ${error.message}`, error);

      const isTransient = error.code === 'UNAVAILABLE' || error.code === 'DEADLINE_EXCEEDED';
      if (isTransient) {
        response.status(500).json({ error: error.message, retryable: true });
      } else {
        await admin.firestore().collection('webhookFailures').add({
          source: 'apple',
          error: error.message,
          stack: error.stack,
          timestamp: FieldValue.serverTimestamp(),
        });
        response.status(200).json({ received: true, processed: false, error: error.message });
      }
    }
  }
);

// --- Client Receipt Verification ---

exports.verifyAppleReceipt = onCall(
  {
    cors: true,
    secrets: ['RESEND_API_KEY'],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated.');
    }

    const { receiptData, transactionId, originalTransactionId, productId, userId, userEmail } = request.data;

    if (!receiptData) {
      throw new HttpsError('invalid-argument', 'receiptData is required');
    }

    const resolvedUserId = userId || request.auth.uid;

    logger.info(`🔍 Verifying Apple receipt for user ${resolvedUserId}`);

    try {
      const verificationResult = await verifyAppleReceipt(receiptData);

      if (verificationResult.status !== 0) {
        throw new HttpsError('failed-precondition', `Receipt verification failed: status ${verificationResult.status}`);
      }

      const latestReceiptInfo = verificationResult.latest_receipt_info;
      if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
        throw new HttpsError('failed-precondition', 'No receipt info found');
      }

      const latestTransaction = latestReceiptInfo[latestReceiptInfo.length - 1];
      const resolvedProductId = productId || latestTransaction.product_id;

      const subscriptionData = mapApplePurchaseToSubscription(latestTransaction, resolvedProductId, {
        userId: resolvedUserId,
        userEmail,
      });

      await syncAppleSubscriptionToFirestore(resolvedUserId, userEmail, subscriptionData);

      if (userEmail) {
        try {
          await emailService.sendSubscriptionConfirmedEmail(userEmail, subscriptionData.plan || 'Premium Plan');
        } catch (emailError) {
          logger.error('❌ Failed to send subscription email:', emailError);
        }
      }

      return { success: true, subscription: subscriptionData };
    } catch (error) {
      logger.error('❌ Error verifying Apple receipt:', error);
      throw new HttpsError('internal', `Failed to verify receipt: ${error.message}`);
    }
  }
);
