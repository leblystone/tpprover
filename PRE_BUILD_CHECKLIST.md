# 🔍 Pre-Build Checklist for Android

## ✅ Firebase Functions Status

### 1. **Scheduled Research Reminders Function**
- ✅ **Status**: Properly configured
- **Location**: `functions/index.js` - `exports.scheduledResearchReminders`
- **Schedule**: Runs hourly (`'0 * * * *'`) to check all timezones
- **Requirements**:
  - ✅ Checks for `researchRemindersAM` and `researchRemindersPM` flags (recently fixed)
  - ✅ Checks for FCM tokens in Firestore
  - ✅ Sends push notifications via FCM
- **Secret Required**: `RESEND_API_KEY` (only for email fallback, not required for push notifications)

### 2. **Push Notification System**
- ✅ **Status**: Properly configured
- **Location**: `functions/pushNotifications.js`
- **Requirements**:
  - ✅ FCM tokens saved to Firestore (fixed in mobileNotifications.js)
  - ✅ User notification settings synced to Firestore (fixed in settingsHelpers.js)
  - ✅ No additional secrets required for push notifications

### 3. **Dependencies**
- ✅ **firebase-admin**: 12.7.0 (installed)
- ✅ **firebase-functions**: 6.4.0 (installed)
- ✅ All required packages are installed

## ⚠️ Before Building for Android

### Required Actions:

1. **Deploy Firebase Functions** (if not already deployed):
   ```bash
   cd functions
   firebase deploy --only functions:scheduledResearchReminders
   ```
   
   Or deploy all functions:
   ```bash
   firebase deploy --only functions
   ```

2. **Verify Scheduled Function is Active**:
   - Go to Firebase Console → Functions
   - Check that `scheduledResearchReminders` is deployed and active
   - Verify it shows "Enabled" status

3. **Optional: Set RESEND_API_KEY Secret** (only if you want email fallback):
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   ```
   Note: Push notifications work WITHOUT this secret. This is only for email notifications.

### Not Required for Push Notifications:
- ❌ RESEND_API_KEY (only needed for email)
- ❌ STRIPE_SECRET_KEY (only needed for payments)
- ❌ GOOGLE_PLAY_SERVICE_ACCOUNT_KEY (only needed for Google Play billing)

## ✅ Code Changes Made (Ready for Build)

1. **Mobile Notification Initialization** (`src/App.jsx`):
   - ✅ Added automatic initialization on native platforms
   - ✅ Requests permissions and registers for FCM tokens

2. **FCM Token Saving** (`src/services/mobileNotifications.js`):
   - ✅ Fixed to use correct user ID format (`uid || email.toLowerCase()`)
   - ✅ Saves to correct Firestore document

3. **Settings Sync** (`src/utils/settingsHelpers.js`):
   - ✅ Fixed to sync `researchRemindersAM` and `researchRemindersPM` flags
   - ✅ Syncs all reminder types to Firestore

4. **Scheduled Function** (`functions/index.js`):
   - ✅ Already checks for `researchRemindersAM` and `researchRemindersPM`
   - ✅ No changes needed

## 🧪 Testing After Build

1. **Check Mobile Notification Initialization**:
   - Look for console logs: `📱 Initializing mobile push notifications on native platform...`
   - Should see: `✅ Mobile push notifications initialized successfully`

2. **Verify FCM Token**:
   - Run diagnostic: `window.checkNotificationStatus()`
   - Check that `hasFCMToken: true` in Firestore section

3. **Enable Reminders**:
   - Go to Protocol page
   - Enable AM or PM research reminders
   - Verify settings sync to Firestore

4. **Check Firestore**:
   - Go to Firebase Console → Firestore
   - Check `users/{userId}` document
   - Verify:
     - `fcmToken` exists
     - `notificationSettings.push: true`
     - `notificationSettings.researchRemindersAM: true` (or PM)

## 📝 Summary

**✅ You're ready to build!** 

The functions are properly configured. The only thing you might want to do is:
- Deploy the scheduled function if it's not already deployed
- That's it! Push notifications don't require any secrets or additional setup.

The scheduled function will automatically:
- Run every hour
- Check all users with push notifications enabled
- Send reminders to users with active protocols and enabled AM/PM reminders
- Use FCM tokens saved in Firestore




