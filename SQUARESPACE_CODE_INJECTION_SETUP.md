# Squarespace Code Injection Setup (Alternative to Webhooks)

Since Squarespace webhook subscriptions require OAuth (not available with API keys), we'll use **Code Injection** to send order data to your Firebase Function.

## ✅ Your Webhook URL (Already Deployed)
```
https://us-central1-tpp-splendide.cloudfunctions.net/squarespaceWebhook
```

## Step 1: Add Code to Order Confirmation Page

1. **In Squarespace Dashboard:**
   - Go to **Settings** → **Website** → **Code Injection**
   - Scroll down to **"Order Confirmation Page"** section
   - Paste the code from `squarespace-order-webhook-injection.js`
   - Click **"Save"**

2. **What the code does:**
   - Automatically runs when a customer completes a purchase
   - Extracts order details (email, SKUs, order ID)
   - Sends data to your Firebase Function
   - Triggers subscription grant automatically

## Step 2: Test It

1. Make a test purchase on your Squarespace site
2. Complete checkout
3. Check Firebase logs:
   ```bash
   firebase functions:log --only squarespaceWebhook
   ```
4. Verify the webhook receives the order data

## How It Works

- When customer completes checkout → Lands on Order Confirmation Page
- Code Injection script runs → Extracts order data
- Sends POST request to your Firebase Function
- Your function processes order → Grants subscription
- Sends activation email (if new user)

## Troubleshooting

### Code Not Running
- Make sure code is in "Order Confirmation Page" section (not Footer/Header)
- Check browser console for errors
- Verify SKUs match: `app-monthly`, `app-annual`, `app-lifetime`

### Webhook Not Receiving Data
- Check Firebase Functions logs
- Verify webhook URL is correct
- Check browser network tab to see if POST request is sent

### Order Data Not Extracting
The code tries multiple methods to extract order data:
1. Squarespace global object (`window.Squarespace.orderData`)
2. Page elements (data attributes, CSS classes)
3. URL parameters
4. LocalStorage (fallback)

If none work, we may need to customize based on your Squarespace theme.

## Alternative: Polling Solution

If Code Injection doesn't work reliably, we can create a Firebase scheduled function that polls the Squarespace API every 5 minutes to check for new orders. This is less real-time but more reliable.

Let me know if you want to set up the polling solution instead!

