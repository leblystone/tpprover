# Payment Service Architecture

## Overview

This directory contains the platform-aware payment system for The Pep Planner. The system automatically routes subscription requests to the appropriate payment provider based on the user's platform.

## Structure

```
payment/
├── paymentService.js          # Main router - routes to platform-specific services
├── stripeService.js           # Stripe implementation (Web/PWA)
├── googlePlayBillingService.js # Google Play Billing (Android) - TODO
├── appStoreIAPService.js      # App Store IAP (iOS) - TODO
└── README.md                  # This file
```

## Platform Routing

- **Web/PWA** → Stripe
- **Android** → Google Play Billing
- **iOS** → App Store IAP

## Usage

### Basic Subscription

```javascript
import { subscribe } from '../../services/payment/paymentService';

// Automatically routes to correct provider
await subscribe('monthly', {
  userEmail: user.email,
  userId: user.uid,
  plan: { label: 'Monthly', price: 3.99 }
});
```

### Check Payment Provider

```javascript
import { getActivePaymentProvider, isPaymentProviderAvailable } from '../../services/payment/paymentService';

const provider = getActivePaymentProvider(); // 'stripe', 'googleplay', or 'appstore'
const isAvailable = isPaymentProviderAvailable('stripe'); // true on web, false on mobile
```

## Implementation Status

- ✅ **Stripe (Web/PWA)**: Fully implemented
- ⏳ **Google Play Billing (Android)**: Structure created, needs implementation
- ⏳ **App Store IAP (iOS)**: Structure created, needs implementation

## Next Steps

1. **Android**: Implement Google Play Billing Library integration
2. **iOS**: Implement App Store IAP integration
3. **Backend**: Create purchase verification endpoints for both platforms
4. **Sync**: Ensure all platforms sync subscription status to Firebase

