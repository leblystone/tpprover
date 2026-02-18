/**
 * App Store IAP Bridge - JavaScript wrapper
 * Uses Capacitor plugin registration to communicate with native Swift StoreKit code.
 * Mirrors the structure of googlePlayBillingBridge.js.
 */

import { registerPlugin } from '@capacitor/core';

class AppStoreIAPWeb {
  async isAvailable() {
    return { available: false };
  }

  async queryProducts() {
    throw new Error('App Store IAP is not available on web platform');
  }

  async purchase() {
    throw new Error('App Store IAP is not available on web platform');
  }

  async queryPurchases() {
    throw new Error('App Store IAP is not available on web platform');
  }

  async restorePurchases() {
    throw new Error('App Store IAP is not available on web platform');
  }

  async finishTransaction() {
    throw new Error('App Store IAP is not available on web platform');
  }
}

const AppStoreIAP = registerPlugin('AppStoreIAP', {
  web: () => new AppStoreIAPWeb(),
});

export default AppStoreIAP;
