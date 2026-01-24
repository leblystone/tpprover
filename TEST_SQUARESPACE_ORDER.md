# 🧪 Test Squarespace Order Processing

## Order ID to Test
```
6965d3c8c4bf0860f73d9e3e
```

---

## Method 1: Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **tpp-splendide**
3. Go to **Functions** → **manualProcessSquarespaceOrder**
4. Click **"Test function"** or **"Trigger"**
5. Enter this JSON in the test data:
```json
{
  "data": {
    "orderId": "6965d3c8c4bf0860f73d9e3e"
  }
}
```
6. Click **"Test"** or **"Run"**
7. Check the logs for results

---

## Method 2: Firebase CLI

Run this command in your terminal:

```bash
cd C:\Users\lebro\Desktop\TPPSpendide
firebase functions:shell
```

Then in the shell:
```javascript
manualProcessSquarespaceOrder({data: {orderId: "6965d3c8c4bf0860f73d9e3e"}})
```

---

## Method 3: Quick Test Script

I can create a simple Node.js script to test it. Would you like me to create that?

---

## What to Expect

When you run the function, it will:
1. ✅ Fetch order details from Squarespace API
2. ✅ Extract customer email and subscription plan
3. ✅ Create pending subscription grant
4. ✅ Send activation email to customer
5. ✅ Return success message with plan details

---

## Check Results

After running:
- ✅ Check Firebase Functions logs for success/errors
- ✅ Check customer's email inbox for activation email
- ✅ Check Firestore `pendingSubscriptions` collection for new document
- ✅ Verify order was processed correctly

---

## Troubleshooting

If you get errors:
- **"Order ID is required"** → Make sure JSON format is correct
- **"SQUARESPACE_API_KEY not configured"** → Check Firebase Secrets
- **"Order does not have a customer email"** → Order might be incomplete
- **"Order does not contain a recognized subscription product"** → Check SKU matches
