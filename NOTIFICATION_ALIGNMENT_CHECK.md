# Push Notification Alignment Check

## Settings Notifications (User Toggles)
From `SettingsNotifications.jsx`:
1. ✅ `push` - Master toggle
2. ✅ `researchReminders` - Research reminders
3. ✅ `washoutReminders` - Washout reminders  
4. ✅ `cycleReminders` - Cycle reminders
5. ✅ `lowStockAlerts` - Low stock alerts
6. ✅ `orderStatusUpdates` - Order status updates
7. ✅ `groupBuys` - Group buy updates
8. ✅ `billing` - Billing alerts (renewals, payments, trial status)

## Triggered Notifications (Admin Panel)
From `TriggeredNotificationManager.jsx`:
1. `welcome` - Welcome Message (first_login) - **No setting** (automatic)
2. ✅ `lowStock` - Maps to `lowStockAlerts` setting
3. `inactiveUser` - Re-engagement (disabled by default) - **No setting**
4. ✅ `researchReminders` - Maps to `researchReminders` setting
5. ✅ `groupBuys` - Maps to `groupBuys` setting
6. ✅ `orderStatusUpdates` - Maps to `orderStatusUpdates` setting
7. ✅ `washoutReminders` - Maps to `washoutReminders` setting
8. ✅ `cycleReminders` - Maps to `cycleReminders` setting
9. ✅ `trialEnding` - Maps to `billing` setting (trial is billing-related)

## Backend Implementation Issues Found

### ❌ ISSUE 1: Order Status Change uses wrong type
**Location:** `functions/index.js:735`
- **Current:** Uses type `'billing'` 
- **Should be:** Type `'orderStatusUpdates'`
- **Impact:** Order status notifications won't respect the `orderStatusUpdates` setting

### ✅ Correct Backend Usage:
- `researchReminders` - Used correctly ✅
- `groupBuys` - Used correctly ✅
- `billing` - Used for:
  - Subscription changes ✅
  - Trial ending push notifications ✅
  - **BUT:** Also incorrectly used for order status changes ❌

## Summary

**All settings have corresponding implementations EXCEPT:**
- Order status change notifications are using `'billing'` type instead of `'orderStatusUpdates'`

**Notifications without user settings (intentional):**
- `welcome` - Automatic on first login (no toggle needed)
- `inactiveUser` - Disabled by default (no toggle needed)
