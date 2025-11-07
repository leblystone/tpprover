# 🎯 Founder Pricing Setup Guide

Complete step-by-step instructions to enable 25% founder pricing for the first 100 users.

---

## ✅ Step 1: Create Stripe Coupon (25% off for subscriptions)

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/coupons
2. **Click "Create coupon"**
3. **Configure:**
   - **Name:** `Founder 25% Off`
   - **Coupon ID:** `founder_25_off` (or leave auto-generated)
   - **Amount off:** `25%`
   - **Duration:** `Forever` (this grandfathers the discount)
   - **Max redemptions:** `100` ⚠️ **IMPORTANT: Set this to 100**
   - **Applies to:** `All products`
4. **Click "Create coupon"**
5. **Copy the Coupon ID** (starts with `founder_` or similar) - you'll need this!

---

## ✅ Step 2: Create Founder Lifetime Price ($187.49)

**Note:** Stripe coupons don't work for one-time payments, so we need a separate price.

1. **Go to Stripe Dashboard:** https://dashboard.stripe.com/products
2. **Click "Add product"**
3. **Configure:**
   - **Product name:** `Founder Lifetime Access`
   - **Description:** `One-time payment for lifetime access - Founder pricing (25% off)`
   - **Pricing model:** `Standard pricing`
   - **Price:** `$187.49`
   - **Billing period:** `One time` ⚠️ **IMPORTANT: Choose "One time"**
   - **Currency:** `USD`
4. **Click "Save product"**
5. **Copy the Price ID** (starts with `price_`) - you'll need this!

---

## ✅ Step 3: Set Environment Variables

### Frontend (`.env` file in project root)

Add these to your `.env` file:

```env
# Founder Pricing Configuration
VITE_STRIPE_FOUNDER_COUPON_ID=founder_xxxxx
VITE_STRIPE_FOUNDER_LIFETIME_PRICE_ID=price_xxxxx
VITE_FOUNDER_DISCOUNT_PERCENT=25
```

**Replace `founder_xxxxx` and `price_xxxxx` with the actual IDs from Steps 1 & 2.**

### Backend (Firebase Functions)

You have two options:

#### Option A: Firebase Secret Manager (Recommended for production)

```bash
cd functions
firebase functions:secrets:set STRIPE_FOUNDER_COUPON_ID
firebase functions:secrets:set STRIPE_FOUNDER_LIFETIME_PRICE_ID
firebase functions:secrets:set FOUNDER_CAP
firebase functions:secrets:set FOUNDER_DISCOUNT_PERCENT
```

When prompted, enter:
- `STRIPE_FOUNDER_COUPON_ID`: The coupon ID from Step 1
- `STRIPE_FOUNDER_LIFETIME_PRICE_ID`: The price ID from Step 2
- `FOUNDER_CAP`: `100`
- `FOUNDER_DISCOUNT_PERCENT`: `25`

#### Option B: Local `.env` file (For development)

Create `functions/.env`:

```env
STRIPE_FOUNDER_COUPON_ID=founder_xxxxx
STRIPE_FOUNDER_LIFETIME_PRICE_ID=price_xxxxx
FOUNDER_CAP=100
FOUNDER_DISCOUNT_PERCENT=25
```

⚠️ **Note:** Make sure `functions/.env` is in your `.gitignore` to avoid committing secrets!

---

## ✅ Step 4: Update Stripe Config

Update `src/config/stripe.js` to include founder pricing (if not already done):

The code should already have this, but verify your `.env` values are being used:

```javascript
export const STRIPE_CONFIG = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  prices: {
    monthly: getEnvVar('VITE_STRIPE_MONTHLY_PRICE_ID'),
    annual: getEnvVar('VITE_STRIPE_ANNUAL_PRICE_ID'),
    lifetime: getEnvVar('VITE_STRIPE_LIFETIME_PRICE_ID')
  },
  founder: {
    coupon: getEnvVar('VITE_STRIPE_FOUNDER_COUPON_ID'),
    lifetimePrice: getEnvVar('VITE_STRIPE_FOUNDER_LIFETIME_PRICE_ID')
  }
};
```

---

## ✅ Step 5: Deploy Firebase Functions

```bash
cd functions
firebase deploy --only functions:getFounderOfferStatus
```

This deploys the function that tracks founder spots and returns pricing info.

**To deploy all functions:**
```bash
firebase deploy --only functions
```

---

## ✅ Step 6: Initialize Firestore (Automatic)

The function will automatically create the necessary Firestore documents on first run:

- `appConfig/founderOffer` - Stores founder offer configuration
- `analytics/founderCount` - Tracks total founders granted

**No manual setup needed!** The function creates these automatically.

---

## ✅ Step 7: Test the Setup

### Test 1: Check Function is Working

1. Open your app in the browser
2. Open browser DevTools (F12)
3. Check the console - you should see:
   - `ℹ️ Using default founder pricing` (before deployment) OR
   - No errors after function is deployed

### Test 2: Verify Founder Pricing Display

1. Navigate to `/app/account` or any subscription modal
2. You should see:
   - **Founder Pricing banner** with remaining spots
   - **Strikethrough prices** showing full price → founder price
   - **Discount badges** showing savings

### Test 3: Test Checkout (Use Stripe Test Mode)

1. Click "Start Monthly" or any plan
2. Complete checkout with test card: `4242 4242 4242 4242`
3. Check Stripe Dashboard → Coupons
4. Verify the coupon was applied (if subscription)
5. Check Firestore → `analytics/founderCount`
6. Verify `totalFounders` increased by 1

---

## ✅ Step 8: Monitor Founder Spots

### Check Remaining Spots

1. **Firestore Console:** https://console.firebase.google.com
2. Navigate to: `appConfig` → `founderOffer`
3. Check `remaining` field (should decrease as founders sign up)

### Manual Override (If Needed)

If you need to adjust the cap or disable founder pricing:

1. Go to Firestore → `appConfig` → `founderOffer`
2. Edit fields:
   - `enabled`: `true`/`false` (disable/enable offer)
   - `cap`: `100` (change max founders)
   - `totalGranted`: Adjust if needed
   - `discountPercent`: Change discount (default: 25)

---

## 🎯 What Happens When 100 Founders Are Reached?

**Automatically:**
- `remaining` becomes `0`
- UI stops showing founder discount
- New users see standard pricing ($8.99/month, $89.99/year, $249.99/lifetime)
- Existing founders keep their 25% discounted rates forever (grandfathered)

**No action needed!** The system handles this automatically.

---

## 🐛 Troubleshooting

### Function not working?

1. **Check deployment:**
   ```bash
   firebase functions:list
   ```
   Should show `getFounderOfferStatus`

2. **Check logs:**
   ```bash
   firebase functions:log --only getFounderOfferStatus
   ```

3. **Verify environment variables are set:**
   ```bash
   # If using secrets
   firebase functions:secrets:access STRIPE_FOUNDER_COUPON_ID
   ```

### CORS Errors?

- Function must be deployed first
- Check that `cors: true` is in function config (already done)
- Verify function region matches your Firebase config (`us-central1`)

### Pricing Not Showing?

- Check browser console for errors
- Verify `.env` file has correct variable names (must start with `VITE_`)
- Restart dev server after changing `.env` file
- Clear browser cache

### Coupon Not Applied?

- Verify coupon ID is correct in Stripe Dashboard
- Check that `max_redemptions` is set to 100
- Verify coupon is active (not expired/disabled)
- Check Stripe Dashboard → Customers → Subscriptions to see if coupon was applied

---

## 📋 Quick Checklist

- [ ] Created Stripe coupon (50% off, max 100 redemptions)
- [ ] Created Stripe lifetime price ($124.99)
- [ ] Added frontend env variables (`.env`)
- [ ] Added backend env variables (`functions/.env` or Secrets)
- [ ] Deployed `getFounderOfferStatus` function
- [ ] Tested founder pricing display in UI
- [ ] Tested checkout with test card
- [ ] Verified founder count increments in Firestore

---

## 🎉 You're Done!

Once all steps are complete:
- ✅ First 100 users get 25% off forever
- ✅ UI shows remaining founder spots
- ✅ Pricing automatically switches to standard after 100 founders
- ✅ Existing founders are grandfathered at discount rate

**Questions?** Check the troubleshooting section or review Firebase/Stripe logs.

