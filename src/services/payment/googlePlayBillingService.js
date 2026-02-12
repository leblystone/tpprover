/**
 * Google Play Billing Service
 * Handles subscription payments for Android platform using Google Play Billing Library
 */

// Import Google Play Billing bridge
import GooglePlayBilling from './googlePlayBillingBridge.js';
import { getGooglePlayProductId, getGooglePlayProductType } from '../../config/googlePlayBilling';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

/**
 * Subscribe to a plan using Google Play Billing
 * 
 * @param {string} planKey - Plan key ('monthly', 'annual', 'lifetime')
 * @param {Object} options - Additional options
 * @param {string} options.userEmail - User's email
 * @param {string} options.userId - User's ID
 * @param {Object} options.plan - Plan details
 * @returns {Promise<void>}
 */
export async function subscribe(planKey, options = {}) {
  console.log('💳 GooglePlayBillingService: Processing subscription for', planKey);
  
  try {
    // Get the billing plugin instance
    console.log('💳 Getting GooglePlayBilling plugin...', GooglePlayBilling);
    console.log('💳 Plugin methods:', Object.keys(GooglePlayBilling || {}));
    
    if (!GooglePlayBilling) {
      throw new Error('Google Play Billing plugin not available. Make sure you are running on Android.');
    }
    
    // Check if billing is available
    let availability;
    try {
      console.log('💳 Checking billing availability...');
      availability = await GooglePlayBilling.isAvailable();
      console.log('💳 Billing availability:', availability);
    } catch (error) {
      console.error('❌ Error checking billing availability:', error);
      console.error('❌ Error details:', error.message, error.stack);
      throw new Error('Failed to check Google Play Billing availability: ' + (error.message || String(error)));
    }
    
    if (!availability || !availability.available) {
      throw new Error('Google Play Billing is not available. Please check your Google Play Services.');
    }
    
    // Get product ID and type from config
    const productId = getGooglePlayProductId(planKey);
    const productType = getGooglePlayProductType(planKey);
    
    if (!productId) {
      throw new Error(`No Google Play product ID found for plan ${planKey}`);
    }
    
    console.log(`💳 Launching purchase flow for ${productId} (${productType})`);
    
    // Launch the purchase flow with timeout
    const purchasePromise = GooglePlayBilling.launchPurchaseFlow({
      productId: productId,
      productType: productType
    });
    
    // Add timeout to prevent infinite "processing" state
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Purchase flow timed out. Please try again.'));
      }, 120000); // 2 minute timeout
    });
    
    console.log('💳 Waiting for purchase flow to complete...');
    const purchaseResult = await Promise.race([purchasePromise, timeoutPromise]);
    
    console.log('💳 Purchase completed:', purchaseResult);
    
    if (!purchaseResult || !purchaseResult.purchaseToken) {
      throw new Error('Purchase completed but no purchase token received');
    }
    
    // Acknowledge the purchase immediately on client side if not already acknowledged
    // This is a belt-and-suspenders approach - the server will also acknowledge
    if (!purchaseResult.isAcknowledged) {
      console.log('💳 Acknowledging purchase on client side...');
      try {
        await GooglePlayBilling.acknowledgePurchase({
          purchaseToken: purchaseResult.purchaseToken
        });
        console.log('✅ Purchase acknowledged on client');
      } catch (ackError) {
        // Don't fail the entire flow if client-side acknowledgement fails
        // The server will handle it
        console.warn('⚠️ Client-side acknowledgement failed (server will retry):', ackError);
      }
    }
    
    // Verify purchase on backend and sync to Firebase
    console.log('💳 Verifying purchase on backend...');
    const verificationResult = await verifyAndSyncPurchase(purchaseResult, options);
    console.log('✅ Purchase verified successfully');
    
    // Trigger subscription refresh in the app
    if (verificationResult && verificationResult.subscription) {
      console.log('🔄 Dispatching subscription update event...');
      window.dispatchEvent(new CustomEvent('subscription:updated', {
        detail: { subscription: verificationResult.subscription }
      }));
    }
    
    // Show success message
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: {
        message: '✅ Subscription activated successfully!',
        type: 'success'
      }
    }));
    
  } catch (error) {
    console.error('❌ GooglePlayBillingService: Subscription error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Don't show error toast for user cancellation
    if (error.message && (error.message.includes('canceled') || error.message.includes('User canceled'))) {
      return; // User canceled, don't show error
    }
    
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: {
        message: error.message || 'Failed to complete purchase. Please try again.',
        type: 'error'
      }
    }));
    
    throw error;
  }
}

/**
 * Verify purchase on backend and sync to Firebase
 * @param {Object} purchase - Purchase result from Google Play
 * @param {Object} options - User options
 */
async function verifyAndSyncPurchase(purchase, options) {
  const app = getApp();
  const functions = getFunctions(app);
  
  const verifyPurchaseFn = httpsCallable(functions, 'verifyGooglePlayPurchase');
  
  try {
    const result = await verifyPurchaseFn({
      purchaseToken: purchase.purchaseToken,
      orderId: purchase.orderId,
      packageName: purchase.packageName,
      signature: purchase.signature,
      products: purchase.products,
      userId: options.userId,
      userEmail: options.userEmail,
      purchaseTime: purchase.purchaseTime
    });
    
    console.log('✅ Purchase verified and synced:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to verify purchase:', error);
    throw new Error(`Purchase verification failed: ${error.message}`);
  }
}

/**
 * Check if Google Play Billing is available
 * @returns {Promise<boolean>}
 */
export async function isAvailable() {
  try {
    const availability = await GooglePlayBilling.isAvailable();
    return availability.available;
  } catch (error) {
    console.error('Error checking Google Play Billing availability:', error);
    return false;
  }
}

/**
 * Get available subscription products from Google Play
 * @returns {Promise<Array>}
 */
export async function getAvailableProducts() {
  try {
    const GooglePlayBilling = await getGooglePlayBilling();
    
    const availability = await GooglePlayBilling.isAvailable();
    if (!availability.available) {
      return [];
    }
    
    // Query for subscription products
    const subsResult = await GooglePlayBilling.queryProducts({
      productIds: [
        getGooglePlayProductId('monthly'),
        getGooglePlayProductId('annual')
      ],
      productType: 'subs'
    });
    
    // Query for one-time purchase (lifetime)
    const inappResult = await GooglePlayBilling.queryProducts({
      productIds: [getGooglePlayProductId('lifetime')],
      productType: 'inapp'
    });
    
    return [
      ...(subsResult.products || []),
      ...(inappResult.products || [])
    ];
  } catch (error) {
    console.error('Error querying Google Play products:', error);
    return [];
  }
}

/**
 * Query existing purchases for the current user
 * @returns {Promise<Array>}
 */
export async function queryPurchases() {
  try {
    const GooglePlayBilling = await getGooglePlayBilling();
    
    const availability = await GooglePlayBilling.isAvailable();
    if (!availability.available) {
      return [];
    }
    
    const [subsResult, inappResult] = await Promise.all([
      GooglePlayBilling.queryPurchases({ productType: 'subs' }),
      GooglePlayBilling.queryPurchases({ productType: 'inapp' })
    ]);
    
    return [
      ...(subsResult.purchases || []),
      ...(inappResult.purchases || [])
    ];
  } catch (error) {
    console.error('Error querying purchases:', error);
    return [];
  }
}

export default {
  subscribe,
  isAvailable,
  getAvailableProducts
};

