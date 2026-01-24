/**
 * Google Play Billing Bridge
 * TypeScript interface for the Capacitor Google Play Billing plugin
 */

import { registerPlugin } from '@capacitor/core';

export interface GooglePlayBillingPlugin {
  /**
   * Check if Google Play Billing is available
   */
  isAvailable(): Promise<{ available: boolean }>;
  
  /**
   * Query product details from Google Play
   */
  queryProducts(options: {
    productIds: string[];
    productType: 'subs' | 'inapp';
  }): Promise<{
    products: Array<{
      productId: string;
      title: string;
      description: string;
      price?: number;
      priceCurrencyCode?: string;
      billingPeriod?: string;
    }>;
  }>;
  
  /**
   * Launch the purchase flow for a product
   */
  launchPurchaseFlow(options: {
    productId: string;
    productType: 'subs' | 'inapp';
  }): Promise<{
    orderId: string;
    packageName: string;
    purchaseToken: string;
    signature: string;
    purchaseTime: number;
    products: string[];
    isAcknowledged: boolean;
    isAutoRenewing: boolean;
  }>;
  
  /**
   * Acknowledge a purchase
   */
  acknowledgePurchase(options: {
    purchaseToken: string;
  }): Promise<void>;
  
  /**
   * Query existing purchases
   */
  queryPurchases(options: {
    productType: 'subs' | 'inapp';
  }): Promise<{
    purchases: Array<{
      orderId: string;
      packageName: string;
      purchaseToken: string;
      signature: string;
      purchaseTime: number;
      products: string[];
      isAcknowledged: boolean;
      isAutoRenewing: boolean;
    }>;
  }>;
}

const GooglePlayBilling = registerPlugin<GooglePlayBillingPlugin>('GooglePlayBilling', {
  web: () => import('./googlePlayBillingBridge.web').then(m => new m.GooglePlayBillingWeb()),
});

export default GooglePlayBilling;








