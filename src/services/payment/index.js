/**
 * Payment Service Index
 * Central export point for payment services
 */

export { subscribe, isPaymentProviderAvailable, getActivePaymentProvider } from './paymentService';
export { subscribe as stripeSubscribe } from './stripeService';
export { subscribe as googlePlaySubscribe } from './googlePlayBillingService';
export { subscribe as appStoreSubscribe } from './appStoreIAPService';

