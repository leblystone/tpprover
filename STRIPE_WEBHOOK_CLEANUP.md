# 🧹 Stripe Webhook Cleanup Guide

## Current Situation
You have **4 webhook endpoints** in Stripe, but only **1 is actually used** by your code.

## ✅ The ONE You Need (THE BROKEN ONE)

**`exquisite-radiance-snapshot`**
- URL: `https://us-central1-tpp-splendide.cloudfunctions.net/stripeWebhook`
- Status: ❌ **99% Error Rate** (this is the one from the email!)
- Events: 222 events
- **This is the one you need to fix**

## Steps to Fix It

### 1. Click on `exquisite-radiance-snapshot` in Stripe Dashboard
   - This is the webhook with the 99% error rate

### 2. Get the NEW Webhook Secret
   - Click on the webhook endpoint
   - Find "Signing secret" section
   - Click "Reveal" or "Reveal test key"
   - Copy the secret (starts with `whsec_`)

### 3. Update Firebase Secret
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   ```
   - Paste the secret when prompted

### 4. Deploy the Fixed Webhook
   ```bash
   firebase deploy --only functions:stripeWebhook
   ```

### 5. Test It
   - In Stripe Dashboard, click "Send test webhook" on `exquisite-radiance-snapshot`
   - Should see 200 response and 0% error rate

## 🗑️ Optional Cleanup (Delete These Later)

These are NOT used by your current code:

1. **`exquisite-radiance-thin`** - Only 2 events, likely a test
   - Safe to delete after confirming the snapshot one works

2. **`upbeat-glow`** - Different URL (`a.run.app`)
   - This is NOT your Firebase function
   - Safe to delete

3. **`SPENDIDE GLOWTEST`** - Netlify URL
   - Old test endpoint
   - Safe to delete

## ⚠️ Important Notes

- **"Snapshot" vs "Thin"**: These are different payload formats. Your code uses "Snapshot" format, so keep `exquisite-radiance-snapshot` and delete the "thin" one after testing.

- **Don't delete until after you've fixed the snapshot one** - You want to make sure the fix works first!










