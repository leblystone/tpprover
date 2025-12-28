# Google Play & iOS Subscription Emails Setup

## ✅ Changes Made

### 1. Google Play Integration Enhanced

**File**: `functions/googlePlayBilling.js`
- ✅ Added subscription confirmation email when purchase is verified
- ✅ Sends email after successful verification

**File**: `functions/googlePlayWebhooks.js` (NEW)
- ✅ Real-time Developer Notifications webhook handler
- ✅ Handles all subscription lifecycle events
- ✅ Sends appropriate emails for each event

### 2. Email Triggers Added for Google Play

| Event | Email Sent | Status |
|-------|-----------|--------|
| **Subscription Purchased** | Subscription Confirmed | ✅ ADDED |
| **Subscription Renewed** | Payment Successful | ✅ ADDED |
| **Payment Failed / On Hold** | Payment Failed | ✅ ADDED |
| **Grace Period** | Payment Failed (with grace period notice) | ✅ ADDED |
| **Subscription Canceled** | Subscription Cancelled | ✅ ADDED |
| **Subscription Expired** | (Can add if needed) | ✅ ADDED |
| **Subscription Recovered** | Payment Successful | ✅ ADDED |
| **Renewal Reminder** | Will use existing scheduled function | ⏳ TODO |

---

## 🔧 Setup Required

### Google Play Console Setup

1. **Enable Real-time Developer Notifications**:
   - Go to: Google Play Console → Monetization setup → Real-time developer notifications
   - Click "Enable real-time developer notifications"
   - Create or select a Cloud Pub/Sub topic
   - Copy the topic name (e.g., `projects/YOUR_PROJECT/topics/play-billing`)

2. **Configure Webhook** (after deployment):
   - Deploy the functions first: `firebase deploy --only functions`
   - Get the webhook URL (will be shown in deployment output)
   - Format: `https://googleplaywebhook-aqqitvxp7a-uc.a.run.app`
   - The notifications will be pushed via Pub/Sub (Google handles this automatically)

3. **Test the Integration**:
   - Use Google Play Console → Settings → License testing
   - Make a test purchase
   - Check Firebase Functions logs to see webhook events

---

## 📱 iOS Setup (Coming Soon)

For iOS subscriptions, you'll need to implement similar webhook handling:

### Required:
1. **App Store Server Notifications V2**
   - Configure in App Store Connect → App → General → App Information
   - Add server URL (will be a new Firebase function)
   - Similar to Google Play webhooks

2. **Email Triggers Needed**:
   - `INITIAL_BUY` → Subscription Confirmed
   - `DID_RENEW` → Payment Successful
   - `DID_FAIL_TO_RENEW` → Payment Failed
   - `CANCEL` → Subscription Cancelled
   - `EXPIRED` → Subscription Expired
   - `GRACE_PERIOD_EXPIRED` → Payment Failed

---

## 🚀 Deployment

Deploy the updated functions:

```bash
firebase deploy --only functions:verifyGooglePlayPurchase,functions:googlePlayWebhook
```

Or deploy all functions:

```bash
firebase deploy --only functions
```

---

## 🧪 Testing

### Test Google Play Purchase Flow:

1. Make a test purchase in your app (using test account)
2. Check Firebase logs:
   ```bash
   firebase functions:log --only verifyGooglePlayPurchase
   ```
3. Check Resend dashboard for confirmation email
4. Check Email History in admin panel

### Test Google Play Webhooks:

1. After webhook is configured in Google Play Console
2. Make a test purchase/cancellation
3. Check Firebase logs:
   ```bash
   firebase functions:log --only googlePlayWebhook
   ```
4. Verify emails are sent for subscription events

---

## 📋 Webhook Events Reference

### Google Play RTDN Notification Types:

| Type | Code | Email Sent |
|------|------|-----------|
| SUBSCRIPTION_PURCHASED | 4 | Subscription Confirmed |
| SUBSCRIPTION_RENEWED | 2 | Payment Successful |
| SUBSCRIPTION_CANCELED | 3 | Subscription Cancelled |
| SUBSCRIPTION_EXPIRED | 13 | (Optional) |
| SUBSCRIPTION_ON_HOLD | 5 | Payment Failed |
| SUBSCRIPTION_IN_GRACE_PERIOD | 6 | Payment Failed |
| SUBSCRIPTION_RECOVERED | 1 | Payment Successful |
| SUBSCRIPTION_PAUSED | 10 | (No email) |
| SUBSCRIPTION_REVOKED | 12 | (No email) |

Full reference: https://developer.android.com/google/play/billing/rtdn-reference

---

## 🔍 Troubleshooting

### No emails being sent from Google Play:
1. Check that `RESEND_API_KEY` secret is set
2. Check Firebase Functions logs for errors
3. Verify webhook is configured in Google Play Console
4. Check that user email is stored with subscription data

### Webhook not receiving events:
1. Verify Pub/Sub topic is created and linked
2. Check Google Play Console → Monetization → RTDN status
3. Send a test notification from Play Console
4. Check Cloud Pub/Sub logs in Google Cloud Console

---

## ✅ Current Status

- ✅ Google Play purchase verification sends confirmation email
- ✅ Google Play webhooks handle subscription lifecycle
- ✅ All subscription emails use custom templates
- ✅ Email history logging for all Google Play events
- ⏳ iOS webhooks - TO DO
- ⏳ Renewal reminders for Google Play/iOS - TO DO (needs scheduled function)

---

## Next Steps

1. **Deploy the functions**
2. **Configure Google Play webhook** in Play Console
3. **Test with a purchase**
4. **Monitor logs and email history**
5. **Add iOS webhook handler** (similar structure to Google Play)
6. **Add renewal reminders** for Google Play/iOS subscriptions (scheduled function)

