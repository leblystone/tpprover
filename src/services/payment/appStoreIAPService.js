/**
 * App Store IAP Service
 * Handles subscription payments for iOS via native StoreKit plugin.
 * Mirrors the structure of googlePlayBillingService.js.
 */

import AppStoreIAP from './appStoreIAPBridge.js';
import { getAppStoreProductId } from '../../config/appStoreIAP';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

/**
 * Subscribe to a plan using App Store IAP
 */
export async function subscribe(planKey, options = {}) {
  console.log('💳 AppStoreIAPService: Processing subscription for', planKey);

  try {
    if (!AppStoreIAP) {
      throw new Error('App Store IAP plugin not available. Make sure you are running on iOS.');
    }

    let availability;
    try {
      availability = await AppStoreIAP.isAvailable();
    } catch (pluginErr) {
      // UNIMPLEMENTED = native StoreKit plugin not registered with Capacitor bridge.
      // Clean build in Xcode (Product → Clean Build Folder) typically resolves this.
      if (pluginErr?.code === 'UNIMPLEMENTED') {
        throw new Error('Apple IAP is not available on this device. Please restart the app and try again. If the issue persists, contact support.');
      }
      throw pluginErr;
    }

    if (!availability || !availability.available) {
      throw new Error('In-App Purchases are disabled. Please check your device settings under Screen Time or Restrictions.');
    }

    const productId = getAppStoreProductId(planKey);
    if (!productId) {
      throw new Error(`No App Store product ID found for plan ${planKey}`);
    }

    // Query the product first to confirm it exists
    const productResult = await AppStoreIAP.queryProducts({ productIds: [productId] });
    if (!productResult.products || productResult.products.length === 0) {
      throw new Error(`Product ${productId} not found in App Store`);
    }

    console.log(`💳 Launching purchase flow for ${productId}`);

    const purchasePromise = AppStoreIAP.purchase({ productId });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Purchase flow timed out. Please try again.')), 120000);
    });

    const purchaseResult = await Promise.race([purchasePromise, timeoutPromise]);
    console.log('💳 Purchase completed:', purchaseResult);

    if (!purchaseResult || !purchaseResult.transactionId) {
      throw new Error('Purchase completed but no transaction received');
    }

    // Finish the transaction (acknowledge it with Apple)
    try {
      await AppStoreIAP.finishTransaction({ transactionId: purchaseResult.transactionId });
      console.log('✅ Transaction finished');
    } catch (finishError) {
      console.warn('⚠️ Failed to finish transaction (server will handle):', finishError);
    }

    // Verify receipt on backend
    console.log('💳 Verifying receipt on backend...');
    const verificationResult = await verifyAndSyncReceipt(purchaseResult, options);
    console.log('✅ Receipt verified successfully');

    if (verificationResult?.subscription) {
      window.dispatchEvent(new CustomEvent('subscription:updated', {
        detail: { subscription: verificationResult.subscription }
      }));
    }

    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: 'Subscription activated successfully!', type: 'success' }
    }));

  } catch (error) {
    console.error('❌ AppStoreIAPService: Subscription error:', error);

    if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
      return;
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

async function verifyAndSyncReceipt(purchase, options) {
  const app = getApp();
  const functions = getFunctions(app);
  const verifyFn = httpsCallable(functions, 'verifyAppleReceipt');

  try {
    const result = await verifyFn({
      receiptData: purchase.receiptData,
      transactionId: purchase.transactionId,
      originalTransactionId: purchase.originalTransactionId,
      productId: purchase.productId,
      userId: options.userId,
      userEmail: options.userEmail,
    });

    console.log('✅ Receipt verified and synced:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ Failed to verify receipt:', error);
    throw new Error(`Receipt verification failed: ${error.message}`);
  }
}

export async function isAvailable() {
  try {
    const availability = await AppStoreIAP.isAvailable();
    return availability?.available || false;
  } catch {
    return false;
  }
}

export async function getAvailableProducts() {
  try {
    const availability = await AppStoreIAP.isAvailable();
    if (!availability?.available) return [];

    const result = await AppStoreIAP.queryProducts({
      productIds: [
        // Research+ (new signups — 2.0)
        getAppStoreProductId('researchPlusMonthly'),
        getAppStoreProductId('researchPlusAnnual'),
        getAppStoreProductId('researchPlusLifetime'),
        // Founder / legacy (grandfathered subscribers)
        getAppStoreProductId('monthly'),
        getAppStoreProductId('annual'),
        getAppStoreProductId('lifetime'),
      ].filter(Boolean),
    });

    return result.products || [];
  } catch (error) {
    console.error('Error querying App Store products:', error);
    return [];
  }
}

export async function restorePurchases(options = {}) {
  console.log('🔄 AppStoreIAPService: Restoring purchases...');

  const result = {
    success: false,
    purchasesFound: 0,
    purchasesVerified: 0,
    subscription: null,
    errors: [],
  };

  try {
    const availability = await AppStoreIAP.isAvailable();
    if (!availability?.available) {
      throw new Error('App Store IAP is not available on this device.');
    }

    const restoreResult = await AppStoreIAP.restorePurchases();
    const purchases = restoreResult?.purchases || [];
    result.purchasesFound = purchases.length;

    if (purchases.length === 0) {
      result.success = true;
      return result;
    }

    for (const purchase of purchases) {
      try {
        const verification = await verifyAndSyncReceipt(purchase, options);
        if (verification?.subscription) {
          result.purchasesVerified++;
          result.subscription = verification.subscription;
        }
      } catch (error) {
        result.errors.push({ transactionId: purchase.transactionId, error: error.message });
      }
    }

    if (result.purchasesVerified > 0) {
      result.success = true;
      if (result.subscription) {
        window.dispatchEvent(new CustomEvent('subscription:updated', {
          detail: { subscription: result.subscription }
        }));
      }
    }

    return result;
  } catch (error) {
    console.error('❌ AppStoreIAPService: Restore error:', error);
    result.errors.push({ error: error.message });
    throw error;
  }
}

export default {
  subscribe,
  isAvailable,
  getAvailableProducts,
  restorePurchases,
};
