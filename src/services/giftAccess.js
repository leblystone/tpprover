// 🎁 Gift Access Service for The Pep Planner
// Handles gift access operations on the frontend

import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

const functions = getFunctions();

/**
 * Create a gift access purchase
 * @param {Object} giftData - Gift purchase data
 * @returns {Promise<Object>} Gift access record
 */
export async function createGiftAccess(giftData) {
  try {
    const createGiftAccessFn = httpsCallable(functions, 'createGiftAccess');
    const result = await createGiftAccessFn(giftData);
    
    if (result.data.success) {
      return result.data.giftData;
    } else {
      throw new Error('Failed to create gift access');
    }
  } catch (error) {
    console.error('Error creating gift access:', error);
    throw new Error(error.message || 'Failed to create gift access');
  }
}

/**
 * Redeem a gift access
 * @param {string} giftId - Gift ID to redeem
 * @param {string} userId - User ID of the person redeeming
 * @param {string} userEmail - Email of the person redeeming
 * @returns {Promise<Object>} Updated gift record and subscription info
 */
export async function redeemGiftAccess(giftId, userId, userEmail) {
  try {
    const redeemGiftAccessFn = httpsCallable(functions, 'redeemGiftAccess');
    const result = await redeemGiftAccessFn({
      giftId,
      userId,
      userEmail
    });
    
    if (result.data.success) {
      return {
        giftData: result.data.giftData,
        subscriptionData: result.data.subscriptionData
      };
    } else {
      throw new Error('Failed to redeem gift access');
    }
  } catch (error) {
    console.error('Error redeeming gift access:', error);
    throw new Error(error.message || 'Failed to redeem gift access');
  }
}

/**
 * Get gift access by ID
 * @param {string} giftId - Gift ID
 * @returns {Promise<Object>} Gift data
 */
export async function getGiftAccess(giftId) {
  try {
    const getGiftAccessFn = httpsCallable(functions, 'getGiftAccess');
    const result = await getGiftAccessFn({ giftId });
    
    if (result.data.success) {
      return result.data.giftData;
    } else {
      throw new Error('Gift not found');
    }
  } catch (error) {
    console.error('Error getting gift access:', error);
    throw new Error(error.message || 'Failed to get gift access');
  }
}

/**
 * Get all gifts sent by a user
 * @param {string} giftGiverEmail - Email of gift giver
 * @returns {Promise<Array>} Array of gift records
 */
export async function getGiftsSentByUser(giftGiverEmail) {
  try {
    const getGiftsSentByUserFn = httpsCallable(functions, 'getGiftsSentByUser');
    const result = await getGiftsSentByUserFn({ giftGiverEmail });
    
    if (result.data.success) {
      return result.data.gifts;
    } else {
      throw new Error('Failed to get gifts sent by user');
    }
  } catch (error) {
    console.error('Error getting gifts sent by user:', error);
    throw new Error(error.message || 'Failed to get gifts sent by user');
  }
}

/**
 * Get all gifts received by a user
 * @param {string} recipientEmail - Email of recipient
 * @returns {Promise<Array>} Array of gift records
 */
export async function getGiftsReceivedByUser(recipientEmail) {
  try {
    const getGiftsReceivedByUserFn = httpsCallable(functions, 'getGiftsReceivedByUser');
    const result = await getGiftsReceivedByUserFn({ recipientEmail });
    
    if (result.data.success) {
      return result.data.gifts;
    } else {
      throw new Error('Failed to get gifts received by user');
    }
  } catch (error) {
    console.error('Error getting gifts received by user:', error);
    throw new Error(error.message || 'Failed to get gifts received by user');
  }
}

/**
 * Get gift analytics (admin only)
 * @returns {Promise<Object>} Gift analytics data
 */
export async function getGiftAnalytics() {
  try {
    const getGiftAnalyticsFn = httpsCallable(functions, 'getGiftAnalytics');
    const result = await getGiftAnalyticsFn();
    
    if (result.data.success) {
      return result.data.analytics;
    } else {
      throw new Error('Failed to get gift analytics');
    }
  } catch (error) {
    console.error('Error getting gift analytics:', error);
    throw new Error(error.message || 'Failed to get gift analytics');
  }
}

/**
 * Format subscription type for display
 * @param {string} subscriptionType - Subscription type
 * @returns {string} Formatted subscription type
 */
export function formatSubscriptionType(subscriptionType) {
  const types = {
    monthly: '1 Month',
    quarterly: '3 Months',
    annual: '1 Year'
  };
  return types[subscriptionType] || subscriptionType;
}

/**
 * Format gift status for display
 * @param {string} status - Gift status
 * @returns {Object} Status info with text and color
 */
export function formatGiftStatus(status) {
  const statuses = {
    pending: { text: 'Pending', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    redeemed: { text: 'Redeemed', color: 'text-green-600', bg: 'bg-green-50' },
    expired: { text: 'Expired', color: 'text-red-600', bg: 'bg-red-50' }
  };
  return statuses[status] || { text: status, color: 'text-gray-600', bg: 'bg-gray-50' };
}

/**
 * Calculate days until gift expires
 * @param {Date} expiresAt - Expiration date
 * @returns {number} Days until expiration
 */
export function getDaysUntilExpiration(expiresAt) {
  const now = new Date();
  const expiration = new Date(expiresAt);
  const diffTime = expiration - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Check if gift is expired
 * @param {Date} expiresAt - Expiration date
 * @returns {boolean} True if expired
 */
export function isGiftExpired(expiresAt) {
  return getDaysUntilExpiration(expiresAt) === 0;
}
