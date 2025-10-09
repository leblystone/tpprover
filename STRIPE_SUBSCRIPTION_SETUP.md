# 🔧 Stripe Subscription Setup Checklist

## 📋 Step-by-Step Setup Guide

### 1. **Create Products in Stripe Dashboard**

Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)

#### 🟦 **Monthly Subscription**
1. Click **"+ Add product"**
2. **Product name**: `Pro Monthly` (or your preferred name)
3. **Description**: `Monthly subscription to TPP Splendide Pro features`
4. **Statement descriptor**: `TPP Pro Monthly`
5. **Pricing model**: `Standard pricing`
6. **Price**: `$6.00`
7. **Billing period**: `Monthly`
8. **Currency**: `USD`
9. Click **"Save product"**
10. **📝 Copy the Price ID** (starts with `price_`) - you'll need this!

#### 🟨 **Annual Subscription**  
1. Click **"+ Add product"**
2. **Product name**: `Pro Annual`
3. **Description**: `Annual subscription to TPP Splendide Pro features (Save 33%)`
4. **Statement descriptor**: `TPP Pro Annual`
5. **Pricing model**: `Standard pricing`
6. **Price**: `$79.00`
7. **Billing period**: `Yearly`
8. **Currency**: `USD`
9. Click **"Save product"**
10. **📝 Copy the Price ID**

#### 🟪 **Lifetime Access**
1. Click **"+ Add product"**
2. **Product name**: `Lifetime Access`
3. **Description**: `One-time payment for lifetime access to TPP Splendide`
4. **Statement descriptor**: `TPP Lifetime`
5. **Pricing model**: `Standard pricing`
6. **Price**: `$249.99`
7. **Billing period**: `One time` ⚠️ **Important: Choose "One time", not recurring**
8. **Currency**: `USD`
9. Click **"Save product"**
10. **📝 Copy the Price ID**

### 2. **Configure Your Environment Variables**

Update your `.env` file with the Price IDs you copied:

```env
# Stripe Keys (you already have these)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Add these Price IDs from step 1
VITE_STRIPE_MONTHLY_PRICE_ID=price_1234567890monthly
VITE_STRIPE_ANNUAL_PRICE_ID=price_1234567890annual
VITE_STRIPE_LIFETIME_PRICE_ID=price_1234567890lifetime
```

### 3. **Verify Your Products**

In Stripe Dashboard, go to **Products** and confirm:

✅ **3 products created**
✅ **Monthly shows "Recurring monthly"**
✅ **Annual shows "Recurring yearly"**  
✅ **Lifetime shows "One time"**
✅ **All prices match your app ($9.99, $79.99, $249.99)**

### 4. **Test Mode vs Live Mode**

#### 🧪 **Test Mode** (Current)
- Use **test keys** (pk_test_... and sk_test_...)
- Use **test price IDs** (price_test_...)
- Use [test credit cards](https://stripe.com/docs/testing#cards)
- **No real money** is charged

#### 🚀 **Live Mode** (Production)
- Use **live keys** (pk_live_... and sk_live_...)
- Use **live price IDs** (price_live_...)
- **Real credit cards** and **real money**
- Switch only when ready for production

## 🔍 Verification Checklist

### ✅ **In Stripe Dashboard**
- [ ] 3 products created with correct names
- [ ] Monthly product is recurring monthly
- [ ] Annual product is recurring yearly
- [ ] Lifetime product is one-time payment
- [ ] All prices match your app
- [ ] You're in the correct mode (test/live)

### ✅ **In Your App**
- [ ] Environment variables set with correct Price IDs
- [ ] Subscription modal loads without errors
- [ ] All three plan options display
- [ ] Prices match Stripe Dashboard
- [ ] "Stripe Integration Ready" notice shows (green)

### ✅ **Test the Flow**
1. Enable subscription modal: Change `{false &&` to `{true &&` in Account.jsx line 375
2. Navigate to `/account`
3. Click "Manage" → Select a plan
4. Should show demo mode processing
5. Subscription should activate in your app

## 🚨 Common Issues & Fixes

### **Issue**: "Invalid price ID" error
**Fix**: Double-check your Price IDs in `.env` match exactly from Stripe Dashboard

### **Issue**: Lifetime plan shows as recurring
**Fix**: In Stripe, edit the Lifetime product and change billing to "One time"

### **Issue**: Wrong currency or amounts
**Fix**: Edit products in Stripe Dashboard to match your desired pricing

### **Issue**: Test cards not working
**Fix**: Ensure you're using test Price IDs with test Stripe keys

## 📱 **Quick Test Commands**

To verify your setup is working:

```javascript
// In browser console on your app
console.log('Stripe Config:', {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  monthlyPrice: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID,
  annualPrice: import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID,
  lifetimePrice: import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID
});
```

All values should show your actual keys/IDs, not `undefined`.

## 🎯 **Next Steps After Setup**

1. **Test thoroughly** in test mode
2. **Deploy backend endpoints** (see STRIPE_SETUP_GUIDE.md)
3. **Set up webhooks** for real-time updates
4. **Switch to live mode** when ready
5. **Hide subscription modal** from beta users until launch

---

**💡 Pro Tip**: Keep test and live products separate. Create the same products in both test and live modes with different Price IDs.
