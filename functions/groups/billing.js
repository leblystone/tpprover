/**
 * BILLING FUNCTIONS
 * Handles: Stripe, Google Play, Apple IAP, Squarespace payments, Shipping
 * 
 * Functions: 16
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

// Import existing modules
const stripe = require('../stripe');
const founderOffer = require('../founderOffer');
const googlePlayBilling = require('../googlePlayBilling');
const googlePlayWebhooks = require('../googlePlayWebhooks');
const squarespaceWebhooks = require('../squarespaceWebhooks');
const squarespacePolling = require('../squarespacePolling');
const manualProcessSquarespaceOrder = require('../manualProcessSquarespaceOrder');
const stripeWebhooks = require('../stripeWebhooks');
const shippo = require('../shippo');

// Helper function to find user by email
async function findUserIdByEmail(email) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : null;
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

// Activate Squarespace subscription (auto-create account + auto-login)
const activateSquarespaceSubscription = onCall(
  {
    cors: true
  },
  async (request) => {
    const { token } = request.data;
    
    if (!token) {
      throw new Error('Activation token is required');
    }
    
    logger.info(`🔍 Activating Squarespace subscription with token: ${token.substring(0, 8)}...`);
    
    try {
      // Get pending grant
      const grantRef = admin.firestore()
        .collection('pendingSubscriptions')
        .doc(token);
      const grantDoc = await grantRef.get();
      
      if (!grantDoc.exists) {
        logger.warn(`⚠️ Invalid activation token: ${token.substring(0, 8)}...`);
        throw new HttpsError('not-found', 'Invalid activation link. Please request a new activation email.');
      }
      
      const grant = grantDoc.data();
      
      // Check if grant is expired
      if (grant.expiresAt && grant.expiresAt.toDate() < new Date()) {
        logger.warn(`⚠️ Activation token expired: ${token.substring(0, 8)}...`);
        throw new HttpsError('deadline-exceeded', 'Activation link has expired. Please contact support at contact@thepepplanner.com');
      }
      
      // Check if already activated
      if (grant.status === 'activated') {
        logger.info(`✅ Subscription already activated for token: ${token.substring(0, 8)}...`);
        return { 
          success: true, 
          message: 'Account already activated',
          alreadyActivated: true
        };
      }
      
      // Check if user already exists (race condition protection)
      let userId = await findUserIdByEmail(grant.email);
      let isNewUser = false;
      
      if (!userId) {
        // Auto-create Firebase Auth account
        logger.info(`👤 Creating new user account for: ${grant.email}`);
        const userRecord = await admin.auth().createUser({
          email: grant.email,
          emailVerified: true,
          displayName: grant.customerName || null
        });
        
        userId = userRecord.uid;
        isNewUser = true;
        
        // Create user document in Firestore
        await admin.firestore().collection('users').doc(userId).set({
          email: grant.email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          source: 'squarespace',
          squarespaceOrderId: grant.orderId
        });
        
        logger.info(`✅ User account created: ${userId}`);
      }
      
      // Grant subscription immediately
      const now = new Date();
      let periodEnd = null;
      
      if (grant.plan === 'monthly') {
        periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else if (grant.plan === 'annual') {
        periodEnd = new Date(now);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else if (grant.plan === 'lifetime') {
        periodEnd = null;
      }
      
      const subscriptionData = {
        plan: grant.plan,
        interval: grant.plan === 'lifetime' ? 'lifetime' : grant.plan === 'monthly' ? 'month' : 'year',
        status: 'active',
        source: 'squarespace',
        squarespaceOrderId: grant.orderId,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd?.toISOString() || null,
        hasLifetimeAccess: grant.plan === 'lifetime',
        cancelAtPeriodEnd: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Write to userSubscriptions collection
      await admin.firestore()
        .collection('userSubscriptions')
        .doc(userId)
        .set({
          subscription: subscriptionData,
          userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      
      // Update users collection
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .set({
          subscription: subscriptionData,
          email: grant.email,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      
      // Mark grant as activated
      await grantRef.update({
        status: 'activated',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        activatedBy: userId
      });
      
      logger.info(`✅ Subscription granted: ${grant.plan} to ${grant.email} (userId: ${userId})`);
      
      // Generate custom token for auto-login
      const customToken = await admin.auth().createCustomToken(userId);
      
      return {
        success: true,
        customToken,
        isNewUser,
        plan: grant.plan
      };
      
    } catch (error) {
      logger.error('❌ Failed to activate Squarespace subscription:', error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError('internal', `Failed to activate subscription: ${error.message}`);
    }
  }
);

module.exports = {
  // Stripe
  createCheckoutSession: stripe.createCheckoutSession,
  createPortalSession: stripe.createPortalSession,
  cancelSubscription: stripe.cancelSubscription,
  updatePaymentMethod: stripe.updatePaymentMethod,
  generateInvoiceReceipt: stripe.generateInvoiceReceipt,
  getStripeSubscriptions: stripe.getStripeSubscriptions,
  completeGiftFromSession: stripe.completeGiftFromSession,
  stripeWebhook: stripeWebhooks.stripeWebhook,
  
  // Founder Offer
  getFounderOfferStatus: founderOffer.getFounderOfferStatus,
  
  // Google Play
  verifyGooglePlayPurchase: googlePlayBilling.verifyGooglePlayPurchase,
  googlePlayWebhook: googlePlayWebhooks.googlePlayWebhook,
  
  // Squarespace
  squarespaceWebhook: squarespaceWebhooks.squarespaceWebhook,
  pollSquarespaceOrders: squarespacePolling.pollSquarespaceOrders,
  manualProcessSquarespaceOrder: manualProcessSquarespaceOrder.manualProcessSquarespaceOrder,
  activateSquarespaceSubscription,
  
  // Shipping
  getTrackingInfo: shippo.getTrackingInfo,
};
