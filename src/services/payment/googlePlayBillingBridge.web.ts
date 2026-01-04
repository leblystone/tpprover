/**
 * Web implementation of Google Play Billing Bridge
 * Returns mock/stub implementation for web platform
 */

import { GooglePlayBillingPlugin } from './googlePlayBillingBridge';

export class GooglePlayBillingWeb implements GooglePlayBillingPlugin {
  async isAvailable(): Promise<{ available: boolean }> {
    return { available: false };
  }
  
  async queryProducts(): Promise<any> {
    throw new Error('Google Play Billing is not available on web platform');
  }
  
  async launchPurchaseFlow(): Promise<any> {
    throw new Error('Google Play Billing is not available on web platform');
  }
  
  async acknowledgePurchase(): Promise<void> {
    throw new Error('Google Play Billing is not available on web platform');
  }
  
  async queryPurchases(): Promise<any> {
    throw new Error('Google Play Billing is not available on web platform');
  }
}




