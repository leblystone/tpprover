# Trial Countdown & Expiration Flow Confirmation ✅

## 📊 How It Works

### 1. **Trial Creation (On Signup)**
**File:** `src/pages/Login.jsx` (lines 1168-1179)

```javascript
const now = new Date();  // Signup timestamp
const end = new Date(now);
end.setDate(end.getDate() + 30);  // 30 days from signup

const trial = {
  startedAt: now.toISOString(),           // Signup time
  currentPeriodEnd: end.toISOString(),     // 30 days from signup
  status: 'trialing'
}
```

✅ **Confirmed:** Trial is timestamped **30 days from account creation** (signup time)

---

### 2. **Widget Countdown**
**File:** `src/components/dashboard/ResearchStatusWidget.jsx` (lines 15-39)

```javascript
calculateTrialDaysLeft() {
  const now = new Date();
  const end = new Date(subscription.currentPeriodEnd);  // 30 days from signup
  const diffTime = end - now;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
```

✅ **Confirmed:** 
- Widget counts down from `currentPeriodEnd` (which is 30 days from signup)
- Updates every minute
- Shows days/hours/minutes remaining

---

### 3. **Expiration Detection**
**File:** `src/utils/useSubscriptionAccess.js` (lines 288-371)

```javascript
const now = new Date();
const endDate = new Date(effectiveSubscription.currentPeriodEnd);  // 30 days from signup
const timeLeft = endDate.getTime() - now.getTime();

// Active trial
if (status === 'trialing' && timeLeft > 0) {
  hasAccess: true
}

// Trial expired
if (timeLeft <= 0) {
  hasAccess: false
  isTrialExpired: true
  isReadOnly: true
}
```

✅ **Confirmed:** 
- Checks `currentPeriodEnd` against current time
- When `timeLeft <= 0` → Trial is expired
- Sets `hasAccess: false` and `isTrialExpired: true`

---

### 4. **Lockout Page Trigger**
**File:** `src/components/common/SubscriptionGuard.jsx` (lines 60-69)

```javascript
if (!hasAccess && !isAllowedRoute) {
  if (isSubscriptionEnded) {
    return <Navigate to="/app/subscription-expired" replace />;
  } else {
    return <Navigate to="/app/trial-expired" replace />;  // ← Triggers here
  }
}
```

✅ **Confirmed:**
- When `hasAccess: false` and `isTrialExpired: true`
- User is redirected to `/app/trial-expired` (lockout page)
- Happens automatically when `currentPeriodEnd` timestamp passes

---

## ✅ Complete Flow Summary

1. **User signs up** → `currentPeriodEnd` set to **30 days from signup** ✅
2. **Widget displays** → Counts down from `currentPeriodEnd` ✅
3. **Countdown updates** → Every minute, shows days/hours/minutes left ✅
4. **When timeLeft <= 0** → `isTrialExpired: true`, `hasAccess: false` ✅
5. **SubscriptionGuard redirects** → To `/app/trial-expired` (lockout page) ✅

---

## 🔧 Fix Applied

**File:** `src/components/dashboard/ResearchStatusWidget.jsx` (line 99)
- Changed: "7-Day Lab Access" → "30-Day Lab Access"
- This was leftover from the old 10-day trial period

---

## ✅ Confirmation

**YES - The widget counts down from signup (30 days) and triggers the expired page when the timestamp passes.**

The flow is:
- Signup → `currentPeriodEnd` = signup time + 30 days
- Widget → Counts down from `currentPeriodEnd`
- Expiration → When `currentPeriodEnd` < now → Lockout page

**All working correctly!** 🎉
