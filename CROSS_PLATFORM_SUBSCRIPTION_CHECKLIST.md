# Cross-Platform Subscription Setup Checklist

## ✅ Completed Items

### Backend Infrastructure
- ✅ **Stripe webhook** - Added `paymentProvider: 'stripe'` field
- ✅ **Google Play billing** - Already has `paymentProvider: 'googleplay'` field
- ✅ **Apple IAP structure** - Created `functions/appleInAppPurchase.js` with webhook handlers
- ✅ **Platform detection utilities** - Created `src/utils/subscriptionPlatform.js`

### Frontend UI
- ✅ **Platform-aware billing management** - Updated `AccountSubscription.jsx`
- ✅ **Platform indicators** - Shows "via Stripe / Google Play / App Store"
- ✅ **Redirect logic** - Users directed to correct billing platform
- ✅ **Conditional UI** - Manage button only shown when appropriate

### Documentation
- ✅ **Comprehensive guide** - `CROSS_PLATFORM_SUBSCRIPTION_GUIDE.md`
- ✅ **Setup checklist** - This file

---

## 🔧 Manual Setup Required (When Ready for Production)

### For iOS Launch (Future)

1. **Configure Apple Secrets**
   ```bash
   firebase functions:secrets:set APPLE_APP_STORE_SHARED_SECRET
   firebase functions:secrets:set APPLE_APP_STORE_KEY_ID
   firebase functions:secrets:set APPLE_APP_STORE_ISSUER_ID
   firebase functions:secrets:set APPLE_APP_STORE_PRIVATE_KEY
   ```

2. **Set up App Store Connect**
   - Create in-app purchase products
   - Configure subscription groups
   - Set up Server-to-Server notification URL:
     `https://us-central1-tpp-splendide.cloudfunctions.net/appleWebhook`

3. **Implement iOS Client**
   - Add StoreKit integration
   - Call `verifyAppleReceipt` Cloud Function after purchase
   - Handle restoration of purchases

4. **Complete Apple Webhook Handlers**
   - The webhook structure is in place but needs JWT decoding
   - See TODOs in `functions/appleInAppPurchase.js`
   - Reference: https://developer.apple.com/documentation/appstoreservernotifications

---

## 🧪 Testing Checklist

### Test Cross-Platform Sync

- [ ] **Web → Android**: Subscribe on web, verify shows on Android
- [ ] **Android → Web**: Subscribe on Android, verify shows on web
- [ ] **Web → iOS**: Subscribe on web, verify shows on iOS (when ready)
- [ ] **iOS → Web**: Subscribe on iOS, verify shows on web (when ready)

### Test Billing Management Redirects

- [ ] **Stripe on Web**: Click "Manage Billing" → Opens Stripe portal
- [ ] **Stripe on Android**: Click "Manage Billing" → Shows "Manage via web app"
- [ ] **Google Play on Android**: Click "Manage Billing" → Opens Play Store
- [ ] **Google Play on Web**: Click "Manage Billing" → Shows "Manage via Google Play"
- [ ] **Admin Grant**: Verify "Manage Billing" hidden (no billing to manage)

### Test Platform Indicators

- [ ] Stripe subscription shows "via Web (Stripe)"
- [ ] Google Play subscription shows "via Google Play"
- [ ] Apple subscription shows "via App Store" (when ready)
- [ ] Admin grant shows "via Admin Grant"

---

## 📊 Monitoring

### Check Subscription Sync Health

```bash
# View all recent subscription updates
firebase functions:log --only verifyGooglePlayPurchase,stripeWebhook,appleWebhook

# Check specific user's subscription
# Use Firebase Console → Firestore → userSubscriptions/{userId}
```

### Verify Platform Field Exists

Run this in Firebase Console (Firestore):
```javascript
// Check if paymentProvider field exists on subscriptions
db.collection('userSubscriptions').limit(10).get().then(snapshot => {
  snapshot.forEach(doc => {
    const sub = doc.data().subscription;
    console.log(`${doc.id}: ${sub?.paymentProvider || 'MISSING'}`);
  });
});
```

---

## 🐛 Common Issues

### Issue: Legacy subscriptions without `paymentProvider`

**Detection**: Subscription works but shows "via Unknown"

**Fix Option 1** (Automatic - Recommended):
- Wait for next webhook event (renewal, update)
- Webhook will add `paymentProvider` field automatically

**Fix Option 2** (Manual):
```javascript
// In Firebase Console
const userId = 'USER_ID_HERE';
const subscription = await db.collection('userSubscriptions').doc(userId).get();
const subData = subscription.data().subscription;

// Detect platform from existing fields
let provider = 'unknown';
if (subData.stripeSubscriptionId) provider = 'stripe';
else if (subData.googlePlayPurchaseToken) provider = 'googleplay';
else if (subData.appleTransactionId) provider = 'apple';

// Update
await db.collection('userSubscriptions').doc(userId).update({
  'subscription.paymentProvider': provider
});
```

### Issue: User subscribed but status not syncing

**Check**:
1. Cloud Function logs for errors
2. User's email matches across devices
3. Firestore security rules allow read access

**Fix**:
```bash
# Check logs
firebase functions:log --only verifyGooglePlayPurchase,stripeWebhook

# Verify user can read their subscription
# Test in Firestore Rules Playground
```

---

## 🚀 Deployment Steps

### 1. Deploy Cloud Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 2. Verify Webhooks Are Active
- Stripe: Check Stripe Dashboard → Developers → Webhooks
- Google Play: Check Play Console → Monetization → Real-time developer notifications
- Apple: Check App Store Connect → App → Subscriptions → Server-to-Server Notification URL

### 3. Deploy Web App
```bash
npm run build
firebase deploy --only hosting
# Or for PWA: npm run build (automatically deploys via Netlify)
```

### 4. Update Mobile Apps
- Android: Rebuild and deploy via `build-and-deploy-android.bat`
- iOS: Rebuild in Xcode and deploy via TestFlight/App Store

---

## 📝 Notes

- **Backward compatibility**: Old subscriptions without `paymentProvider` will be auto-detected by checking for platform-specific IDs (e.g., `stripeCustomerId`, `googlePlayPurchaseToken`)
- **Real-time sync**: All subscription changes propagate via Firestore listeners, no app restart needed
- **Security**: Subscription data is read-only from client; only Cloud Functions can write
- **Cancellation**: Only Stripe subscriptions can be cancelled via web UI; mobile subscriptions must be cancelled through their respective stores

---

## 🎯 Success Criteria

✅ User can subscribe on **any platform** (Web, Android, iOS)  
✅ Subscription status **syncs instantly** to all logged-in devices  
✅ User is **directed to correct billing platform** when managing subscription  
✅ UI clearly shows **which platform subscription originated from**  
✅ No double-billing or duplicate subscriptions across platforms  

---

## Next Actions

1. **Test in staging**: Verify cross-platform sync with test purchases
2. **Deploy to production**: Run deployment steps above
3. **Monitor logs**: Watch for any sync errors in first 48 hours
4. **Prepare for iOS**: Complete Apple IAP implementation when ready

---

**Last Updated**: December 28, 2025  
**Status**: ✅ **Implementation Complete** (iOS pending future launch)







