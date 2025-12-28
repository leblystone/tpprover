/**
 * Google Play Billing Bridge - JavaScript wrapper
 * Directly uses the Capacitor plugin registration
 */

import { registerPlugin } from '@capacitor/core';

// Web implementation stub
class GooglePlayBillingWeb {
  async isAvailable() {
    return { available: false };
  }
  
  async queryProducts() {
    throw new Error('Google Play Billing is not available on web platform');
  }
  
  async launchPurchaseFlow() {
    throw new Error('Google Play Billing is not available on web platform');
  }
  
  async acknowledgePurchase() {
    throw new Error('Google Play Billing is not available on web platform');
  }
  
  async queryPurchases() {
    throw new Error('Google Play Billing is not available on web platform');
  }
}

// Register the plugin directly
const GooglePlayBilling = registerPlugin('GooglePlayBilling', {
  web: () => new GooglePlayBillingWeb(),
});

export default GooglePlayBilling;

