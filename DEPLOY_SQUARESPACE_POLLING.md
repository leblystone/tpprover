# Deploy Squarespace Polling Function

## Quick Setup

Since Code Injection isn't available, we're using a polling solution that checks Squarespace every 5 minutes for new orders.

## Step 1: Set Environment Variable in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/project/tpp-splendide)
2. Click **Functions** in the left sidebar
3. Click **Config** tab (or go to: https://console.firebase.google.com/project/tpp-splendide/functions/config)
4. Under **Environment Variables**, click **Add Variable**
5. Add:
   - **Key**: `SQUARESPACE_API_KEY`
   - **Value**: `eeaf9b72-0bc9-4af5-8548-4c44d0a08251`
6. Click **Save**

## Step 2: Deploy the Function

```bash
cd functions
firebase deploy --only functions:pollSquarespaceOrders
```

## That's It!

The function will:
- Run automatically every 5 minutes
- Check for new orders with subscription products
- Process orders and grant subscriptions
- Send activation emails for new users

## Testing

1. Make a test purchase on your Squarespace site
2. Wait up to 5 minutes (or check immediately in logs)
3. Check Firebase logs:
   ```bash
   firebase functions:log --only pollSquarespaceOrders
   ```

## Monitoring

Check polling status in Firestore:
- Collection: `squarespaceConfig`
- Document: `polling`
- Shows: last poll time, orders found, orders processed

## Troubleshooting

If orders aren't processing:
1. Check logs for API errors
2. Verify API key has Orders, Products, Transactions permissions
3. Verify SKUs match: `app-monthly`, `app-annual`, `app-lifetime`
4. Check Firestore `squarespaceProcessedOrders` collection

