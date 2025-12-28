# Platform Payment Architecture

## Overview

The Pep Planner now uses a platform-aware payment system that automatically routes subscription requests to the appropriate payment provider:

- **Web/PWA** → Stripe
- **Android** → Google Play Billing
- **iOS** → App Store IAP

## File Structure

```
src/
├── services/
│   └── payment/
│       ├── paymentService.js          # Main router
│       ├── stripeService.js           # Stripe (Web/PWA) ✅ Implemented
│       ├── googlePlayBillingService.js # Google Play (Android) ⏳ TODO
│       ├── appStoreIAPService.js       # App Store (iOS) ⏳ TODO
│       ├── index.js                    # Exports
│       └── README.md                   # Documentation
│
├── components/
│   └── subscription/
│       ├── SubscriptionModal.jsx      # Platform router component
│       ├── StripeSubscriptionModal.jsx # Stripe UI (Web/PWA) ✅
│       ├── GooglePlaySubscriptionModal.jsx # Google Play UI (Android) ⏳
│       └── AppStoreSubscriptionModal.jsx   # App Store UI (iOS) ⏳
│
├── config/
│   └── payment.config.js              # Payment configuration
│
└── utils/
    └── platform.js                    # Platform detection (existing)
```

## Usage

### In Components

```javascript
import { subscribe } from '../../services/payment/paymentService';

// Automatically routes to correct provider
await subscribe('monthly', {
  userEmail: user.email,
  userId: user.uid,
  plan: { label: 'Monthly', price: 3.99 }
});
```

### Platform-Aware Components

```javascript
import SubscriptionModal from '../../components/subscription/SubscriptionModal';

// Automatically shows correct UI for platform
<SubscriptionModal isOpen={true} onClose={handleClose} theme={theme} />
```

## Implementation Status

### ✅ Completed
- Payment service router structure
- Stripe service wrapper (uses existing Stripe implementation)
- Platform detection utilities
- Platform-aware SubscriptionModal component
- StripeSubscriptionModal (Web/PWA UI)
- Payment configuration

### ⏳ TODO - Android
1. Install Google Play Billing Library
2. Create products in Google Play Console
3. Implement `googlePlayBillingService.js`
4. Implement `GooglePlaySubscriptionModal.jsx`
5. Create backend verification endpoint
6. Sync subscription status to Firebase

### ⏳ TODO - iOS
1. Install App Store IAP library
2. Create products in App Store Connect
3. Implement `appStoreIAPService.js`
4. Implement `AppStoreSubscriptionModal.jsx`
5. Create backend receipt verification endpoint
6. Sync subscription status to Firebase

## Migration Path

### Existing Components to Update

1. **ConversionWidget.jsx** - Update to use `subscribe()` from paymentService
2. **TrialExpired.jsx** - Update to use `subscribe()` from paymentService
3. **AccountSubscription.jsx** - Update to use `subscribe()` from paymentService
4. **UpgradeButton.jsx** - Update to use `subscribe()` from paymentService
5. **TrialButton.jsx** - Update to use `subscribe()` from paymentService

### Current State

- ✅ Payment router structure created
- ✅ Stripe service integrated
- ⏳ Google Play Billing - Structure ready, needs implementation
- ⏳ App Store IAP - Structure ready, needs implementation
- ⏳ Components need migration to use payment router

## Next Steps

1. **Immediate**: Test Stripe flow still works (should be unchanged)
2. **Android**: Implement Google Play Billing integration
3. **iOS**: Implement App Store IAP integration
4. **Migration**: Update all subscription components to use payment router
5. **Testing**: Test all platforms independently

## Notes

- All payment providers sync to the same Firebase subscription data
- Platform detection happens automatically
- No code changes needed in components once migrated to payment router
- Each platform can have different UI while sharing business logic

