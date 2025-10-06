# 📱 Push Notification System Setup Guide

## 🚀 **Push Notifications Only - Simplified Setup**

**✅ No external services needed!** Push notifications use Firebase Cloud Messaging (FCM) which is built into your existing Firebase setup.

### **Why Push Notifications Only?**
- **Instant delivery** - No email delays
- **Higher engagement** - 90%+ open rates vs 20% for email  
- **Less intrusive** - Users control when they see them
- **Mobile-first** - Perfect for research reminders
- **Cost-effective** - Completely free through Firebase
- **No spam issues** - Users opt-in explicitly

---

## 🔥 **Firebase Functions Deployment**

### **Install Dependencies**
```bash
cd functions
npm install
```

### **Deploy Functions**
```bash
firebase deploy --only functions
```

### **Test Functions**
```bash
# Test scheduled function manually
firebase functions:shell
> scheduledResearchReminders()

# Test push notification function
> sendTestNotification({type: 'researchReminders', testData: {title: 'Test Research Reminder', body: 'You have 2 tasks scheduled today'}})
```

---

## 🎯 **Trigger Logic Implementation**

### **1. Research Reminders**
- **Trigger**: Daily at 8 AM (configurable)
- **Logic**: Check user's active protocols for today's tasks
- **Data Source**: `userdata/{userId}/protocols`
- **Condition**: Protocol active today + research reminders enabled

### **2. Billing Updates**
- **Trigger**: Real-time on data changes
- **Logic**: Monitor subscription and order status changes
- **Data Sources**: 
  - `users/{userId}` (subscription changes)
  - `userdata/{userId}/orders/{orderId}` (order status changes)
- **Condition**: Status changed + billing notifications enabled

### **3. Group Buy Updates**
- **Trigger**: Real-time on status changes
- **Logic**: Monitor group buy status updates
- **Data Source**: `userdata/{userId}/scheduledBuys/{buyId}`
- **Condition**: Status changed + group buy notifications enabled

---

## 📱 **Push Notifications Setup**

### **Firebase Cloud Messaging (FCM)**
Push notifications are handled automatically through Firebase:
1. Users enable push notifications in app settings
2. App registers FCM token with Firebase
3. Functions send push notifications via FCM
4. Service worker handles display

### **Testing Push Notifications**
```javascript
// In browser console
window.testPWANotifications() // Test PWA notifications
```

---

## 🔧 **Configuration Options**

### **Scheduling Options**
You can modify the schedule in `functions/index.js`:
```javascript
// Current: Every day at 8 AM
.schedule('0 8 * * *')

// Options:
// Every 2 hours: '0 */2 * * *'
// Weekdays only: '0 8 * * 1-5'
// Multiple times: '0 8,12,18 * * *'
```

### **Push Notification Data**
Push notifications include structured data for the app to handle:
- **Research Reminders**: Task details, protocol info, timing
- **Billing Updates**: Order status, subscription changes
- **Group Buy Updates**: Status changes, delivery info

### **Notification Preferences**
Users can control notifications in Settings:
- Push notifications (master toggle)
- Billing updates
- Research reminders  
- Group buy updates

---

## 🧪 **Testing**

### **Test Push Notifications**
```javascript
// In Firebase Functions shell
sendTestNotification({
  type: 'researchReminders',
  testData: {
    title: 'Test Research Reminder',
    body: 'You have 2 research tasks scheduled today',
    clickAction: 'OPEN_DASHBOARD',
    taskCount: '2'
  }
})
```

### **Test PWA Notifications**
```javascript
// In browser console
window.testPWANotifications()
```

### **Monitor Function Logs**
```bash
firebase functions:log --only scheduledResearchReminders
firebase functions:log --only onOrderStatusChange
```

---

## 📊 **Monitoring & Analytics**

### **Function Metrics**
- Monitor function execution in Firebase Console
- Check error rates and performance
- Set up alerts for failures

### **Push Notification Analytics**
- Track notification delivery in Firebase Console
- Monitor open rates and click rates
- View user engagement metrics

### **User Preferences**
- Track notification preference changes
- Monitor opt-out rates
- Analyze engagement patterns

---

## 🚀 **Production Checklist**

- [ ] Firebase Functions deployed
- [ ] Scheduled functions enabled
- [ ] Trigger functions active
- [ ] Push notifications working
- [ ] User preferences saving
- [ ] FCM tokens being registered
- [ ] Service worker handling notifications
- [ ] Monitoring set up
- [ ] Error handling tested

---

## 💰 **Costs**

### **Firebase Cloud Messaging (FCM)**
- **Completely FREE** - No limits on push notifications
- Unlimited notifications to unlimited users
- Perfect for any scale

### **Firebase Functions**
- First 2M invocations/month: Free
- $0.40 per million after that
- Very cost-effective for notification triggers

### **Firebase Firestore**
- Reads/writes for user data
- Minimal cost for notification triggers

---

## 🔒 **Security**

- FCM tokens stored securely in Firestore
- User authentication required for manual triggers
- User preferences respected and enforced
- Opt-out functionality included
- No external API keys needed
