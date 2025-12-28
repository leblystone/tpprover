/**
 * Platform-Aware Subscription Modal
 * Routes to platform-specific subscription UI:
 * - Web/PWA: Custom Stripe modal
 * - Android: Google Play Billing dialog
 * - iOS: App Store IAP dialog
 */

import React from 'react';
import { isAndroid, isIOS } from '../../utils/platform';
import StripeSubscriptionModal from './StripeSubscriptionModal';
import GooglePlaySubscriptionModal from './GooglePlaySubscriptionModal';
import AppStoreSubscriptionModal from './AppStoreSubscriptionModal';

export default function SubscriptionModal(props) {
  // Route to platform-specific modal
  if (isAndroid()) {
    return <GooglePlaySubscriptionModal {...props} />;
  } else if (isIOS()) {
    return <AppStoreSubscriptionModal {...props} />;
  } else {
    // Web/PWA - use existing Stripe modal
    return <StripeSubscriptionModal {...props} />;
  }
}

