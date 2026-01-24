# 🔍 Push Notification Diagnostic Guide

## 🎯 **Problem**: Admin test notifications work, but scheduled/triggered notifications never arrive

### ✅ **What We Know Works**
- Admin test notifications (from admin panel) ✅
- FCM tokens are being saved ✅
- Push notification sending mechanism works ✅

### ❌ **What's Not Working**
- Scheduled research reminders (hourly function)
- Triggered notifications from data changes
- Real-time notifications (order status, group buys, etc.)

---

## 🔍 **Step 1: Check Firebase Functions Logs**

The scheduled functions might be failing silently. Check the logs:

1. **Go to Firebase Console** → Functions → Logs
2. **Search for**: `scheduledResearchReminders`
3. **Look for**:
   - `🔬 Running scheduled research reminders (hourly check)...`
   - Error messages
   - `📱 No FCM token for user`
   - `📱 Push notifications disabled for user`

**Command line method**:
```bash
firebase functions:log --only scheduledResearchReminders
```

---

## 🔍 **Step 2: Check if Scheduled Functions Are Enabled**

1. **Go to Firebase Console** → Functions
2. **Look for**: `scheduledResearchReminders`
3. **Check status**: Should show "Active" or "Enabled"
4. **If disabled**: Click "Enable" or redeploy

**Deploy/Enable functions**:
```bash
cd functions
npm install
firebase deploy --only functions:scheduledResearchReminders
```

---

## 🔍 **Step 3: Check User Data in Firestore**

The scheduled function queries for users with `notificationSettings.push == true`. Check if your user document has this:

1. **Go to Firebase Console** → Firestore
2. **Navigate to**: `users/{your-user-id}`
3. **Check**: `notificationSettings.push` should be `true`
4. **Also check**: `fcmToken` should exist (string)

**Query to check**:
```javascript
// In Firestore console, run:
users
  .where('notificationSettings.push', '==', true)
  .get()
```

If this returns 0 results, users don't have `push: true` set correctly.

---

## 🔍 **Step 4: Test Scheduled Function Manually**

There's a test function you can call manually:

**From Firebase Console**:
1. Go to Functions → `testResearchReminders`
2. Click "Test" button
3. This will trigger the function immediately (instead of waiting for schedule)

**Or from browser console** (if you have a client call wrapper):
```javascript
// This function exists but might need to be called via Firebase Functions SDK
// Check if there's a client-side wrapper in src/services/
```

---

## 🔍 **Step 5: Check Function Execution Times**

The scheduled function runs **every hour** (`'0 * * * *'` - at minute 0 of every hour).

1. **Check last execution**: Firebase Console → Functions → `scheduledResearchReminders` → View logs
2. **Check execution frequency**: Should show executions every hour
3. **If no executions**: The function might not be deployed or enabled

---

## 🔍 **Step 6: Verify Notification Settings Structure**

The scheduled function checks multiple conditions:

1. ✅ `notificationSettings.push == true` (master toggle)
2. ✅ `notificationSettings.researchRemindersAM == true` OR `researchRemindersPM == true`
3. ✅ User has active protocols today
4. ✅ Current time matches user's reminder time (AM/PM)

**Check your user document**:
```json
{
  "notificationSettings": {
    "push": true,  // ← Must be true
    "researchRemindersAM": true,  // ← Must be true (or PM)
    "researchReminderTimeAM": "08:00",  // ← Reminder time
    // ... other settings
  },
  "fcmToken": "your-fcm-token-here",  // ← Must exist
  "settings": {
    "region": {
      "timeZone": "America/New_York"  // ← User's timezone
    }
  }
}
```

---

## 🔍 **Step 7: Check Trigger Functions**

Trigger functions (like `onOrderStatusChange`) might also not be working:

1. **Check**: `onOrderStatusChange` function logs
2. **Test**: Make an order status change in Firestore
3. **Watch**: Function logs for errors

**Functions to check**:
- `onOrderStatusChange` (order status updates)
- `onGroupBuyStatusChange` (group buy updates)
- `onSubscriptionStatusChange` (subscription updates)

---

## 🛠️ **Quick Fixes**

### **Fix 1: Ensure Users Have `push: true`**

If users only have `pushEnabled: true` but not `push: true`, the query won't match them.

**Solution**: We just fixed the client code to save both. But existing users might need updating.

**Manual update in Firestore**:
```javascript
// Update all users with pushEnabled: true to also have push: true
const users = await db.collection('users')
  .where('notificationSettings.pushEnabled', '==', true)
  .get();

users.forEach(async (doc) => {
  await doc.ref.update({
    'notificationSettings.push': true
  });
});
```

### **Fix 2: Check Function Deployment**

Make sure functions are deployed:
```bash
cd functions
firebase deploy --only functions
```

### **Fix 3: Enable Cloud Scheduler**

Firebase scheduled functions use Cloud Scheduler. Check:
1. Google Cloud Console → Cloud Scheduler
2. Look for jobs starting with `firebase-schedule-`
3. Ensure they're enabled

---

## 📊 **Debugging Commands**

### **Check Function Status**
```bash
firebase functions:list
```

### **View Function Logs**
```bash
firebase functions:log --only scheduledResearchReminders --limit 50
```

### **Test Function Locally**
```bash
cd functions
firebase functions:shell
> scheduledResearchReminders()
```

---

## 🎯 **Most Likely Issues**

Based on the symptoms (admin test works, scheduled doesn't):

1. **Scheduled functions not enabled/deployed** (most likely)
2. **Function query not finding users** (users don't have `push: true`)
3. **Time-based logic preventing sends** (user's reminder time not matching)
4. **Function errors not visible** (check logs)

---

## ✅ **Next Steps**

1. Check Firebase Functions logs (Step 1)
2. Verify functions are enabled (Step 2)
3. Check user data structure (Step 3)
4. Test function manually (Step 4)
5. Review function execution times (Step 5)


