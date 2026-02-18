// 🎁 Gift Access System for The Pep Planner
// Handles gift subscription purchases and redemptions

const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

/**
 * Create a gift access purchase
 * @param {string} giftGiverEmail - Email of person buying the gift
 * @param {string} giftGiverName - Name of person buying the gift
 * @param {string} recipientEmail - Email of gift recipient
 * @param {string} recipientName - Name of gift recipient (optional)
 * @param {string} giftMessage - Personal message from giver
 * @param {string} subscriptionType - monthly, quarterly, annual
 * @param {string} stripePaymentIntentId - Stripe payment intent ID
 * @param {number} pricePaid - Amount paid for the gift
 * @returns {Promise<Object>} Gift access record
 */
exports.createGiftAccess = async (
  giftGiverEmail,
  giftGiverName,
  recipientEmail,
  recipientName = null,
  giftMessage = '',
  subscriptionType,
  stripePaymentIntentId,
  pricePaid
) => {
  try {
    // Generate unique gift ID
    const giftId = `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiration date (configurable via environment variable, default 60 days)
    const expirationDays = parseInt(process.env.GIFT_EXPIRATION_DAYS || '60', 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
    
    const giftData = {
      giftId,
      giftGiverEmail: giftGiverEmail.toLowerCase(),
      giftGiverName,
      recipientEmail: recipientEmail.toLowerCase(),
      recipientName,
      giftMessage,
      subscriptionType,
      pricePaid,
      stripePaymentIntentId,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      redeemedAt: null,
      redeemedByUserId: null
    };
    
    // Save to Firestore
    await admin.firestore()
      .collection('giftAccess')
      .doc(giftId)
      .set(giftData);
    
    logger.info(`🎁 Gift access created: ${giftId} for ${recipientEmail}`);
    
    // Send gift notification email to recipient
    await emailService.sendGiftNotificationEmail(
      recipientEmail,
      recipientName,
      giftGiverName,
      giftMessage,
      giftId,
      subscriptionType
    );
    
    // Send confirmation email to gift giver
    await emailService.sendGiftPurchaseConfirmationEmail(
      giftGiverEmail,
      giftGiverName,
      recipientEmail,
      giftMessage,
      giftId,
      subscriptionType,
      pricePaid
    );
    
    return giftData;
    
  } catch (error) {
    logger.error('❌ Failed to create gift access:', error);
    throw new Error(`Failed to create gift access: ${error.message}`);
  }
};

/**
 * Redeem a gift access
 * @param {string} giftId - Gift ID to redeem
 * @param {string} userId - User ID of the person redeeming
 * @param {string} userEmail - Email of the person redeeming
 * @returns {Promise<Object>} Updated gift record and subscription info
 */
exports.redeemGiftAccess = async (giftId, userId, userEmail) => {
  try {
    // Get gift record
    const giftRef = admin.firestore().collection('giftAccess').doc(giftId);
    const giftDoc = await giftRef.get();
    
    if (!giftDoc.exists) {
      throw new Error('Gift not found');
    }
    
    const giftData = giftDoc.data();
    
    // Validate gift
    if (giftData.status !== 'pending') {
      throw new Error('Gift has already been redeemed or expired');
    }
    
    if (giftData.recipientEmail.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('This gift is not for your email address');
    }
    
    // Check if gift is expired
    const now = new Date();
    const expiresAt = giftData.expiresAt.toDate();
    if (now > expiresAt) {
      // Mark as expired
      await giftRef.update({
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp()
      });
      throw new Error('This gift has expired');
    }
    
    // Calculate subscription end date based on type
    const subscriptionEndDate = new Date();
    switch (giftData.subscriptionType) {
      case 'monthly':
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        break;
      case 'quarterly':
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 3);
        break;
      case 'annual':
        subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        break;
      default:
        throw new Error('Invalid subscription type');
    }
    
    // Create subscription for the user
    const subscriptionData = {
      id: `gift_${giftId}`,
      status: 'active',
      type: 'gift',
      plan: giftData.subscriptionType,
      interval: giftData.subscriptionType === 'monthly' ? 'month' : 
                giftData.subscriptionType === 'quarterly' ? 'quarter' : 'year',
      startDate: admin.firestore.FieldValue.serverTimestamp(),
      endDate: admin.firestore.Timestamp.fromDate(subscriptionEndDate),
      price: giftData.pricePaid,
      currency: 'USD',
      giftId: giftId,
      giftGiverEmail: giftData.giftGiverEmail,
      giftGiverName: giftData.giftGiverName,
      giftMessage: giftData.giftMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save subscription to user's data (merge to preserve existing fields)
    await admin.firestore()
      .collection('userSubscriptions')
      .doc(userId)
      .set({ subscription: subscriptionData }, { merge: true });
    
    // Update gift record as redeemed
    await giftRef.update({
      status: 'redeemed',
      redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
      redeemedByUserId: userId
    });
    
    logger.info(`🎁 Gift redeemed: ${giftId} by ${userEmail}`);
    
    // Send redemption confirmation email to recipient
    await emailService.sendGiftRedeemedEmail(
      userEmail,
      giftData.giftGiverName,
      giftData.subscriptionType,
      subscriptionEndDate
    );
    
    // Send notification to gift giver
    await emailService.sendGiftRedeemedNotificationEmail(
      giftData.giftGiverEmail,
      giftData.giftGiverName,
      userEmail,
      giftData.subscriptionType
    );
    
    return {
      giftData: { ...giftData, status: 'redeemed' },
      subscriptionData
    };
    
  } catch (error) {
    logger.error('❌ Failed to redeem gift access:', error);
    throw new Error(`Failed to redeem gift: ${error.message}`);
  }
};

/**
 * Get gift access by ID
 * @param {string} giftId - Gift ID
 * @returns {Promise<Object>} Gift data
 */
exports.getGiftAccess = async (giftId) => {
  try {
    const giftDoc = await admin.firestore()
      .collection('giftAccess')
      .doc(giftId)
      .get();
    
    if (!giftDoc.exists) {
      throw new Error('Gift not found');
    }
    
    return giftDoc.data();
    
  } catch (error) {
    logger.error('❌ Failed to get gift access:', error);
    throw new Error(`Failed to get gift: ${error.message}`);
  }
};

/**
 * Get all gifts sent by a user
 * @param {string} giftGiverEmail - Email of gift giver
 * @returns {Promise<Array>} Array of gift records
 */
exports.getGiftsSentByUser = async (giftGiverEmail) => {
  try {
    const giftsSnapshot = await admin.firestore()
      .collection('giftAccess')
      .where('giftGiverEmail', '==', giftGiverEmail.toLowerCase())
      .orderBy('createdAt', 'desc')
      .get();
    
    return giftsSnapshot.docs.map(doc => doc.data());
    
  } catch (error) {
    logger.error('❌ Failed to get gifts sent by user:', error);
    throw new Error(`Failed to get gifts: ${error.message}`);
  }
};

/**
 * Get all gifts received by a user
 * @param {string} recipientEmail - Email of recipient
 * @returns {Promise<Array>} Array of gift records
 */
exports.getGiftsReceivedByUser = async (recipientEmail) => {
  try {
    const giftsSnapshot = await admin.firestore()
      .collection('giftAccess')
      .where('recipientEmail', '==', recipientEmail.toLowerCase())
      .orderBy('createdAt', 'desc')
      .get();
    
    return giftsSnapshot.docs.map(doc => doc.data());
    
  } catch (error) {
    logger.error('❌ Failed to get gifts received by user:', error);
    throw new Error(`Failed to get gifts: ${error.message}`);
  }
};

/**
 * Clean up expired gifts (run as scheduled function)
 */
exports.cleanupExpiredGifts = async () => {
  try {
    const now = admin.firestore.Timestamp.now();
    
    const expiredGiftsSnapshot = await admin.firestore()
      .collection('giftAccess')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', now)
      .get();
    
    const batch = admin.firestore().batch();
    let count = 0;
    
    expiredGiftsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;
    });
    
    if (count > 0) {
      await batch.commit();
      logger.info(`🧹 Cleaned up ${count} expired gifts`);
    }
    
    return { cleanedUp: count };
    
  } catch (error) {
    logger.error('❌ Failed to cleanup expired gifts:', error);
    throw new Error(`Failed to cleanup gifts: ${error.message}`);
  }
};

/**
 * Get gift access analytics for admin
 */
exports.getGiftAnalytics = async () => {
  try {
    const giftsSnapshot = await admin.firestore()
      .collection('giftAccess')
      .get();
    
    const gifts = giftsSnapshot.docs.map(doc => doc.data());
    
    const analytics = {
      total: gifts.length,
      pending: gifts.filter(g => g.status === 'pending').length,
      redeemed: gifts.filter(g => g.status === 'redeemed').length,
      expired: gifts.filter(g => g.status === 'expired').length,
      totalRevenue: gifts.reduce((sum, g) => sum + (g.pricePaid || 0), 0),
      byType: {
        monthly: gifts.filter(g => g.subscriptionType === 'monthly').length,
        quarterly: gifts.filter(g => g.subscriptionType === 'quarterly').length,
        annual: gifts.filter(g => g.subscriptionType === 'annual').length
      },
      recentGifts: gifts
        .sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate())
        .slice(0, 10)
    };
    
    return analytics;
    
  } catch (error) {
    logger.error('❌ Failed to get gift analytics:', error);
    throw new Error(`Failed to get analytics: ${error.message}`);
  }
};
