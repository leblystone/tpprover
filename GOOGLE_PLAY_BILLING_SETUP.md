# Google Play Billing Setup Guide

This guide covers setting up Google Play Billing for The Pep Planner Android app.

## Overview

Google Play Billing has been implemented to comply with Google Play Store policies. The implementation includes:

1. **Native Android Plugin** - Capacitor plugin for Google Play Billing Library
2. **Service Layer** - JavaScript service that routes Android purchases through Google Play
3. **Backend Verification** - Firebase function to verify purchases and sync to Firestore
4. **Configuration** - Product ID mapping and configuration files

## Prerequisites

1. **Google Play Console Access**
   - App must be published to Google Play (at least internal testing track)
   - Service account with Android Publisher API access

2. **Product Setup in Google Play Console**
   - Create subscription products:
     - `com.thepepplanner.app.monthly` (Subscription - Monthly)
     - `com.thepepplanner.app.annual` (Subscription - Annual)
   - Create one-time purchase:
     - `com.thepepplanner.app.lifetime` (One-time purchase)

3. **Service Account Setup**
   - Create a service account in Google Cloud Console
   - Grant it "Service Account User" and "Viewer" roles
   - Link it to your Google Play Console account
   - Download the JSON key file

## Setup Steps

### 1. Configure Product IDs in Google Play Console

1. Go to Google Play Console → Your App → Monetize → Products → Subscriptions
2. Create subscription products:
   - **Monthly**: `com.thepepplanner.app.monthly`
     - Price: $3.99/month (or your pricing)
     - Billing period: 1 month
   - **Annual**: `com.thepepplanner.app.annual`
     - Price: $36.99/year (or your pricing)
     - Billing period: 1 year

3. Go to Products → In-app products
4. Create one-time purchase:
   - **Lifetime**: `com.thepepplanner.app.lifetime`
     - Price: $99.99 (or your pricing)
     - Type: One-time purchase

### 2. Set Up Service Account

1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a new service account (or use existing)
3. Grant roles:
   - "Service Account User"
   - "Viewer"
4. Go to Google Play Console → Settings → API access
5. Link your service account
6. Grant permissions:
   - View financial data
   - View app information and download bulk reports
7. Download the JSON key file

### 3. Configure Firebase Functions

1. Add the service account JSON key to Firebase Functions environment:
   ```bash
   firebase functions:config:set googleplay.service_account_key="$(cat path/to/service-account-key.json)"
   ```

   Or set as environment variable:
   ```bash
   firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT_KEY
   # Paste the JSON contents when prompted
   ```

2. Install googleapis package:
   ```bash
   cd functions
   npm install googleapis
   ```

### 4. Update Environment Variables (Optional)

If you want to use custom product IDs, add to your `.env` file:
```
VITE_GOOGLE_PLAY_MONTHLY_PRODUCT_ID=com.thepepplanner.app.monthly
VITE_GOOGLE_PLAY_ANNUAL_PRODUCT_ID=com.thepepplanner.app.annual
VITE_GOOGLE_PLAY_LIFETIME_PRODUCT_ID=com.thepepplanner.app.lifetime
```

## Testing

### Test Accounts

1. Add test accounts in Google Play Console:
   - Settings → License Testing
   - Add email addresses of test accounts

### Testing Flow

1. Build and install the app on a test device
2. Sign in with a test account
3. Navigate to subscription page
4. Select a subscription plan
5. Complete the Google Play purchase flow
6. Verify subscription syncs to Firestore:
   - Check `userSubscriptions` collection
   - Check `users` collection for subscription data

### Test Products

For testing, you can use test products that don't charge real money:
- Google Play provides test subscriptions that auto-cancel after 5 minutes
- Use test accounts to avoid charges

## Implementation Details

### File Structure

```
src/
├── config/
│   └── googlePlayBilling.js          # Product ID configuration
├── services/
│   └── payment/
│       ├── googlePlayBillingService.js    # Main service
│       ├── googlePlayBillingBridge.ts     # TypeScript interface
│       └── googlePlayBillingBridge.web.ts # Web stub

android/
└── app/
    └── src/
        └── main/
            └── java/
                └── com/
                    └── thepepplanner/
                        └── app/
                            ├── GooglePlayBillingPlugin.java  # Native plugin
                            └── MainActivity.java             # Plugin registration

functions/
└── googlePlayBilling.js              # Backend verification
```

### Data Flow

1. **User initiates purchase** → `googlePlayBillingService.subscribe()`
2. **Service calls native plugin** → `GooglePlayBilling.launchPurchaseFlow()`
3. **Native plugin launches Google Play** → User completes purchase
4. **Purchase result returned** → `googlePlayBillingService` receives purchase data
5. **Backend verification** → `verifyGooglePlayPurchase` Firebase function
6. **Google Play API verification** → Verifies purchase token
7. **Firestore sync** → Updates `userSubscriptions` and `users` collections

### Subscription Data Format

Subscriptions are stored in Firestore in the same format as Stripe subscriptions:

```javascript
{
  subscription: {
    userId: "user123",
    status: "active",
    plan: "Monthly",
    interval: "month",  // or "year" or "lifetime"
    paymentProvider: "googleplay",
    googlePlayProductId: "com.thepepplanner.app.monthly",
    googlePlayPurchaseToken: "...",
    googlePlayOrderId: "...",
    currentPeriodStart: Timestamp,
    currentPeriodEnd: Timestamp,
    isAutoRenewing: true,
    lastUpdated: Timestamp
  }
}
```

## Troubleshooting

### Plugin Not Available

- Ensure app is running on Android device/emulator
- Check that Google Play Services are installed and updated
- Verify billing library is added to `build.gradle`

### Purchase Verification Fails

- Check service account key is properly configured
- Verify service account has correct permissions in Google Play Console
- Check Google Play API is enabled in Google Cloud Console
- Review Firebase Functions logs for detailed error messages

### Subscription Not Syncing

- Check Firebase Functions logs
- Verify user is authenticated
- Check Firestore security rules allow writes
- Verify purchase token is valid

## Next Steps

1. **Set up products in Google Play Console** (if not done)
2. **Configure service account** and add key to Firebase Functions
3. **Deploy Firebase Functions** with googleapis dependency
4. **Test with test accounts** before production release
5. **Monitor logs** for any issues during initial rollout

## Security Notes

- Never commit service account keys to version control
- Use Firebase Functions secrets for sensitive data
- Verify all purchases on the backend (never trust client-side only)
- Handle purchase token expiration and renewal

## Support

For issues or questions:
- Check Google Play Billing documentation: https://developer.android.com/google/play/billing
- Review Firebase Functions logs for backend errors
- Check Android logs for native plugin errors




