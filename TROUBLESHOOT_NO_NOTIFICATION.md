# 🔍 Troubleshooting: Not Receiving Scheduled Notifications

## ✅ **Checklist - Do You Meet All Conditions?**

For you to receive a scheduled notification, you need **ALL** of these:

### **1. Push Notifications Enabled** ✅
- Go to Firebase Console → Firestore → `users/{your-user-id}`
- Check for:
  - `fcmToken` exists (string) OR
  - `notificationSettings.push = true` OR
  - `notificationSettings.pushEnabled = true`

### **2. Research Reminders Enabled** ✅
- In Firestore: `notificationSettings.researchRemindersAM = true` OR `researchRemindersPM = true`
- In app: Settings → Notifications → Research Reminders (AM or PM) = ON

### **3. Active Protocols with Tasks Today** ✅
- You need at least one protocol that:
  - Has `startDate` and `endDate`
  - Today's date is between startDate and endDate
  - Has peptides with scheduled times (`peptide.frequency.time`)

### **4. Reminder Time Matches Current Hour** ✅
- Your reminder time (AM or PM) must match the current hour
- Example: If reminder is 8:00 AM, function must run at 8:00 AM (your timezone)
- Function runs every hour at :00 (8:00, 9:00, 10:00, etc.)

## 🔍 **How to Check Each Condition**

### **Check 1: Push Notifications**
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
console.log('User ID:', user?.uid || user?.email);

// Then check Firestore: users/{userId}
// Look for: fcmToken, notificationSettings.push, notificationSettings.pushEnabled
```

### **Check 2: Research Reminders**
```javascript
// In browser console
const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
console.log('Research Reminders AM:', settings.notifications?.researchRemindersAM);
console.log('Research Reminders PM:', settings.notifications?.researchRemindersPM);
console.log('AM Time:', settings.notifications?.researchReminderTimeAM);
console.log('PM Time:', settings.notifications?.researchReminderTimePM);
```

### **Check 3: Active Protocols**
- Go to Protocols page in app
- Do you have any protocols active today?
- Do they have peptides with scheduled times?

### **Check 4: Reminder Time**
- What time is it now? (your timezone)
- What's your reminder time set to?
- Function runs at :00 of every hour, so if your reminder is 8:00 AM, it will send at 8:00 AM

## 📊 **Check Function Logs**

```bash
firebase functions:log --only scheduledResearchReminders
```

**Look for:**
- `📱 Found X users with push notifications enabled` - Should be > 0
- `⏰ Sending AM/PM reminder for user {userId}` - Should see your user ID
- `✅ Research reminders sent: X/X` - Should show notifications sent

## 🎯 **Most Common Issues**

### **Issue 1: Function Not Finding Users**
**Symptom:** Logs show `Found 0 users`
**Fix:** We just fixed this! Make sure you have `fcmToken` or `push: true` or `pushEnabled: true`

### **Issue 2: Reminders Not Enabled**
**Symptom:** Function finds users but skips them
**Fix:** Enable research reminders (AM or PM) in Settings → Notifications

### **Issue 3: No Active Protocols**
**Symptom:** Function finds you but no tasks today
**Fix:** Create a protocol with tasks scheduled for today

### **Issue 4: Wrong Time**
**Symptom:** Everything looks good but no notification
**Fix:** Check if current hour matches your reminder hour. Function runs at :00, so if reminder is 8:38, it sends at 8:00

### **Issue 5: Function Hasn't Run Yet**
**Symptom:** Just deployed, waiting for next hour
**Fix:** Function runs at :00 of every hour. Wait for next hour or check logs to see if it ran

## 🧪 **Quick Test**

1. **Check your reminder time** - What hour is it set to?
2. **Check current time** - What hour is it now?
3. **Wait for next hour** - If reminder is 8:00 AM and it's 7:30 AM, wait until 8:00 AM
4. **Check logs after function runs** - Should see your user ID in logs

## 📝 **Next Steps**

1. Check Firebase Functions logs (see if function ran and found users)
2. Check your Firestore user document (verify all conditions)
3. Check your app settings (verify reminders enabled)
4. Check if you have active protocols with tasks today
5. Wait for the next hour when your reminder time matches


