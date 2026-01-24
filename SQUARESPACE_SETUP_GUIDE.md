# 🛒 Squarespace Subscription Setup Guide

## ✅ What's Already Done

- ✅ Backend functions deployed (polling, webhooks, activation)
- ✅ Email templates configured
- ✅ Frontend activation page deployed
- ✅ All code is ready and working

## 📋 What You Need to Do Next

### Step 1: Create Subscription Products on Squarespace

Go to your Squarespace dashboard and create **3 products**:

#### 1. **Monthly Subscription**
- **Product Name:** Monthly Research Access (or your preferred name)
- **SKU:** `monthly-access` ⚠️ **MUST match exactly**
- **Type:** Subscription (recurring monthly)
- **Price:** Your monthly price (e.g., $8.99/month)
- **Description:** Monthly subscription to The Pep Planner

#### 2. **Annual Subscription**
- **Product Name:** Annual Research Access (or your preferred name)
- **SKU:** `annual-access` ⚠️ **MUST match exactly**
- **Type:** Subscription (recurring annually)
- **Price:** Your annual price (e.g., $79.99/year)
- **Description:** Annual subscription to The Pep Planner

#### 3. **Lifetime Access**
- **Product Name:** Lifetime Research Access (or your preferred name)
- **SKU:** `lifetime-access` ⚠️ **MUST match exactly**
- **Type:** One-time purchase (NOT a subscription)
- **Price:** Your lifetime price (e.g., $199.99)
- **Description:** One-time payment for lifetime access to The Pep Planner

---

## ⚠️ CRITICAL: SKU Requirements

The SKUs **MUST** match exactly what's in the code:
- ✅ `monthly-access` (lowercase, with hyphen)
- ✅ `annual-access` (lowercase, with hyphen)
- ✅ `lifetime-access` (lowercase, with hyphen)

**DO NOT use:**
- ❌ `Monthly-Access` (wrong case)
- ❌ `monthly_access` (wrong separator)
- ❌ `monthly access` (space instead of hyphen)
- ❌ `monthly` (missing `-access`)

---

## 📍 Where to Set SKUs in Squarespace

1. Go to **Commerce** → **Products**
2. Create or edit each product
3. Find the **SKU** field (usually in product settings/details)
4. Enter the exact SKU: `monthly-access`, `annual-access`, or `lifetime-access`
5. Save the product

---

## 🔄 How It Works

Once products are set up:

1. **Customer purchases** on Squarespace → Order created
2. **Polling function** (runs every 1 minute) detects the order
3. **Activation email** sent to customer with account creation link
4. **Customer clicks link** → Account automatically created
5. **Subscription granted** → Access enabled immediately
6. **Confirmation email** sent → "Access The Pep Planner App"

---

## ✅ Testing Checklist

After setting up products:

- [ ] Create a test order for monthly subscription
- [ ] Verify activation email is received (check spam folder)
- [ ] Click activation link and verify account is created
- [ ] Verify subscription access is granted
- [ ] Test annual subscription
- [ ] Test lifetime purchase

---

## 🆘 Troubleshooting

### Orders Not Being Detected
- Check that SKUs match exactly (case-sensitive)
- Verify products are published/active
- Check Firebase Functions logs for errors
- Use `manualProcessSquarespaceOrder` function to process specific orders

### Emails Not Sending
- Check `RESEND_API_KEY` is set in Firebase Secrets
- Verify email templates exist in Firestore (`emailTemplates` collection)
- Check email history in Firestore for delivery status

### Account Not Created
- Verify activation link is correct format
- Check Firebase Functions logs for errors
- Ensure `activateSquarespaceSubscription` function is deployed

---

## 📞 Support

If you run into issues:
1. Check Firebase Functions logs
2. Verify SKUs match exactly
3. Test with `manualProcessSquarespaceOrder` function
4. Contact support if needed

---

## 🎉 You're Almost Done!

Once you create the 3 products with the correct SKUs, the entire flow will work automatically. The system will:
- Detect new orders every minute
- Send activation emails
- Create accounts automatically
- Grant subscription access

No additional configuration needed! 🚀
