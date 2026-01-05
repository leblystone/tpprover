# Cross-Platform Subscription Flow Diagrams

## 🔄 Subscription Purchase Flow

### 1️⃣ Web (Stripe) Purchase Flow

```
┌─────────────┐
│   User on   │
│   Web App   │
└──────┬──────┘
       │
       │ Clicks "Subscribe"
       ▼
┌─────────────────────┐
│ Stripe Checkout     │
│ (Hosted Page)       │
└──────┬──────────────┘
       │
       │ Payment Successful
       ▼
┌─────────────────────┐
│ Stripe Webhook      │ ← Stripe sends notification
│ (Cloud Function)    │
└──────┬──────────────┘
       │
       │ Writes subscription to Firestore
       ▼
┌─────────────────────────────────────┐
│ Firestore Collections:              │
│                                     │
│ users/{userId}/subscription ────┐  │
│ userSubscriptions/{userId} ─────┼──┤
│                                 │  │
│ {                               │  │
│   paymentProvider: 'stripe',  ←─┘  │
│   stripeCustomerId: 'cus_xxx',     │
│   status: 'active',                │
│   plan: 'Monthly',                 │
│   ...                              │
│ }                                  │
└────────────┬───────────────────────┘
             │
             │ Real-time sync via Firestore listeners
             ▼
    ┌────────────────────┐
    │ All User's Devices │
    │  ✓ Web             │
    │  ✓ Android         │
    │  ✓ iOS             │
    └────────────────────┘
```

---

### 2️⃣ Android (Google Play) Purchase Flow

```
┌─────────────┐
│   User on   │
│ Android App │
└──────┬──────┘
       │
       │ Initiates in-app purchase
       ▼
┌─────────────────────┐
│ Google Play Billing │
│ (Native Dialog)     │
└──────┬──────────────┘
       │
       │ Purchase successful
       ▼
┌──────────────────────────────┐
│ App calls Cloud Function:    │
│ verifyGooglePlayPurchase()   │
└──────┬───────────────────────┘
       │
       │ Sends purchase token
       ▼
┌─────────────────────────────┐
│ Google Play API             │ ← Verifies token
│ (purchases.subscriptions)   │
└──────┬──────────────────────┘
       │
       │ Returns verified purchase data
       ▼
┌─────────────────────┐
│ Cloud Function      │
│ Writes to Firestore │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Firestore Collections:              │
│                                     │
│ users/{userId}/subscription ────┐  │
│ userSubscriptions/{userId} ─────┼──┤
│                                 │  │
│ {                               │  │
│   paymentProvider: 'googleplay',│  │
│   googlePlayProductId: 'xxx', ←─┘  │
│   googlePlayPurchaseToken: 'yyy',  │
│   status: 'active',                │
│   ...                              │
│ }                                  │
└────────────┬───────────────────────┘
             │
             │ Real-time sync
             ▼
    ┌────────────────────┐
    │ All User's Devices │
    │  ✓ Web             │
    │  ✓ Android         │
    │  ✓ iOS             │
    └────────────────────┘
```

---

### 3️⃣ iOS (Apple) Purchase Flow (Future)

```
┌─────────────┐
│   User on   │
│   iOS App   │
└──────┬──────┘
       │
       │ Initiates in-app purchase
       ▼
┌─────────────────────┐
│ StoreKit (Apple)    │
│ (Native Sheet)      │
└──────┬──────────────┘
       │
       │ Purchase successful
       ▼
┌──────────────────────────────┐
│ App calls Cloud Function:    │
│ verifyAppleReceipt()         │
└──────┬───────────────────────┘
       │
       │ Sends receipt data
       ▼
┌─────────────────────────────┐
│ Apple Receipt Verification  │ ← Verifies receipt
│ (buy.itunes.apple.com)      │
└──────┬──────────────────────┘
       │
       │ Returns verified transaction
       ▼
┌─────────────────────┐
│ Cloud Function      │
│ Writes to Firestore │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Firestore Collections:              │
│                                     │
│ users/{userId}/subscription ────┐  │
│ userSubscriptions/{userId} ─────┼──┤
│                                 │  │
│ {                               │  │
│   paymentProvider: 'apple',   ←─┘  │
│   appleProductId: 'xxx',           │
│   appleTransactionId: 'yyy',       │
│   status: 'active',                │
│   ...                              │
│ }                                  │
└────────────┬───────────────────────┘
             │
             │ Real-time sync
             ▼
    ┌────────────────────┐
    │ All User's Devices │
    │  ✓ Web             │
    │  ✓ Android         │
    │  ✓ iOS             │
    └────────────────────┘
```

---

## 💳 Billing Management Flow

### Scenario 1: User Subscribed on Web, Tries to Manage on Android

```
┌─────────────┐
│   User on   │
│ Android App │
└──────┬──────┘
       │
       │ Opens "Manage Billing"
       ▼
┌──────────────────────────────┐
│ Platform Detection Logic     │
│ (subscriptionPlatform.js)    │
└──────┬───────────────────────┘
       │
       │ Checks subscription.paymentProvider
       │ → 'stripe'
       ▼
┌──────────────────────────────┐
│ canManageBillingOnPlatform() │
│                              │
│ subPlatform: 'stripe'        │
│ currentPlatform: 'android'   │
│                              │
│ → canManage: false ❌        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Shows Toast Message:                 │
│ "This subscription was purchased     │
│  on the web. Please manage it from   │
│  the web app or desktop browser."    │
│                                      │
│ Optional: Link to web app            │
└──────────────────────────────────────┘
```

---

### Scenario 2: User Subscribed on Google Play, Tries to Manage on Web

```
┌─────────────┐
│   User on   │
│   Web App   │
└──────┬──────┘
       │
       │ Clicks "Manage Billing"
       ▼
┌──────────────────────────────┐
│ Platform Detection Logic     │
│ (subscriptionPlatform.js)    │
└──────┬───────────────────────┘
       │
       │ Checks subscription.paymentProvider
       │ → 'googleplay'
       ▼
┌──────────────────────────────┐
│ canManageBillingOnPlatform() │
│                              │
│ subPlatform: 'googleplay'    │
│ currentPlatform: 'web'       │
│                              │
│ → canManage: false ❌        │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Shows Toast Message:                 │
│ "This subscription was purchased     │
│  through Google Play. Please manage  │
│  it from your Android device or      │
│  Google Play Store."                 │
│                                      │
│ Opens: play.google.com/subscriptions │
└──────────────────────────────────────┘
```

---

### Scenario 3: User Subscribed on Web, Manages on Web ✅

```
┌─────────────┐
│   User on   │
│   Web App   │
└──────┬──────┘
       │
       │ Clicks "Manage Billing"
       ▼
┌──────────────────────────────┐
│ Platform Detection Logic     │
│ (subscriptionPlatform.js)    │
└──────┬───────────────────────┘
       │
       │ Checks subscription.paymentProvider
       │ → 'stripe'
       ▼
┌──────────────────────────────┐
│ canManageBillingOnPlatform() │
│                              │
│ subPlatform: 'stripe'        │
│ currentPlatform: 'web'       │
│                              │
│ → canManage: true ✅         │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Calls createPortalSession()  │
│ (Cloud Function)             │
└──────┬───────────────────────┘
       │
       │ Returns Stripe portal URL
       ▼
┌──────────────────────────────┐
│ Opens Stripe Customer Portal │
│ in new tab                   │
│                              │
│ User can:                    │
│ • Update payment method      │
│ • View invoices              │
│ • Cancel subscription        │
└──────────────────────────────┘
```

---

## 🔍 Platform Detection Algorithm

```
┌─────────────────────┐
│ Load Subscription   │
│ from Firestore      │
└──────┬──────────────┘
       │
       ▼
   ┌───────────────────────────┐
   │ Check paymentProvider     │ ← New field (preferred)
   │ field exists?             │
   └───┬───────────────────┬───┘
       │ YES              │ NO
       │                  │
       ▼                  ▼
   ┌───────────┐    ┌──────────────────────┐
   │ Return    │    │ Legacy Detection     │
   │ provider  │    │ (check for specific  │
   │ value     │    │  fields)             │
   └───────────┘    └──────┬───────────────┘
                           │
                           ▼
                    ┌─────────────────────────┐
                    │ If stripeCustomerId     │
                    │ → 'stripe'              │
                    │                         │
                    │ If googlePlayPurchase   │
                    │ Token → 'googleplay'    │
                    │                         │
                    │ If appleTransactionId   │
                    │ → 'apple'               │
                    │                         │
                    │ If admin lifetime grant │
                    │ → 'admin'               │
                    │                         │
                    │ Else → 'unknown'        │
                    └─────────────────────────┘
```

---

## 📊 Firestore Data Structure

### Complete Subscription Object

```javascript
{
  // ========== Common Fields (All Platforms) ==========
  status: 'active' | 'trialing' | 'past_due' | 'cancelled',
  plan: 'Monthly' | 'Annual' | 'Lifetime Access',
  interval: 'month' | 'year' | 'lifetime',
  currentPeriodStart: Timestamp,
  currentPeriodEnd: Timestamp | null,
  lastUpdated: Timestamp,
  
  // ========== Platform Identifier (NEW) ==========
  paymentProvider: 'stripe' | 'googleplay' | 'apple' | 'admin',
  
  // ========== Stripe-Specific Fields ==========
  stripeCustomerId: 'cus_xxxxx',              // Only if Stripe
  stripeSubscriptionId: 'sub_xxxxx',          // Only if Stripe
  latestInvoiceId: 'in_xxxxx',                // Only if Stripe
  cancelAtPeriodEnd: false,                   // Only if Stripe
  
  // ========== Google Play-Specific Fields ==========
  googlePlayProductId: 'com.thepepplanner.app.monthly',  // Only if Google Play
  googlePlayPurchaseToken: 'xxxxxxxxxx',                  // Only if Google Play
  googlePlayOrderId: 'GPA.xxxx-xxxx',                     // Only if Google Play
  isAutoRenewing: true,                                   // Only if Google Play
  
  // ========== Apple-Specific Fields ==========
  appleProductId: 'com.thepepplanner.app.monthly',       // Only if Apple
  appleTransactionId: 'xxxxxxxxxx',                       // Only if Apple
  appleOriginalTransactionId: 'xxxxxxxxxx',               // Only if Apple
  
  // ========== Lifetime Access Fields ==========
  hasLifetimeAccess: true,                    // Only if lifetime
  lifetimeReason: 'google_play_purchase' | 'apple_store_purchase' | 'Admin grant',
  lifetimeGrantedAt: Timestamp,               // Only if lifetime
}
```

---

## 🎯 Decision Tree: "Can User Manage Billing?"

```
                    ┌─────────────────┐
                    │ User clicks     │
                    │ "Manage Billing"│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Check platform  │
                    │ of subscription │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┬──────────────┐
              ▼              ▼              ▼              ▼
      ┌───────────┐   ┌───────────┐  ┌──────────┐  ┌──────────┐
      │  'stripe' │   │'googleplay'│  │ 'apple'  │  │ 'admin'  │
      └─────┬─────┘   └─────┬──────┘  └────┬─────┘  └────┬─────┘
            │               │              │             │
            ▼               ▼              ▼             ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
    │ On web?      │ │ On Android?  │ │ On iOS?  │ │ Show msg:│
    │              │ │              │ │          │ │ "Admin   │
    │ YES → Open   │ │ YES → Open   │ │ YES → Op │ │  granted"│
    │ Stripe portal│ │ Play Store   │ │ App Store│ │          │
    │              │ │              │ │          │ │ NO action│
    │ NO → Show    │ │ NO → Show    │ │ NO → Show│ └──────────┘
    │ "Manage via  │ │ "Manage via  │ │ "Manage  │
    │  web app"    │ │  Google Play"│ │  via iOS"│
    └──────────────┘ └──────────────┘ └──────────┘
```

---

## 🔐 Security Flow

```
┌─────────────────────┐
│ User attempts to    │
│ read subscription   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Firestore Security  │
│ Rules check:        │
│                     │
│ request.auth.uid    │
│ == userId?          │
└──────┬──────────────┘
       │
       ├─ YES → Allow read ✅
       │
       └─ NO  → Deny read ❌
       
       
┌─────────────────────┐
│ User attempts to    │
│ write subscription  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Firestore Security  │
│ Rules check:        │
│                     │
│ ALWAYS DENY ❌      │
│                     │
│ Only Cloud Functions│
│ can write           │
└─────────────────────┘
```

---

**These diagrams provide a visual reference for understanding cross-platform subscription management in The Pep Planner.**





