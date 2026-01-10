# Squarespace Polling Setup Guide

Since webhooks require OAuth and Code Injection isn't available, we're using a **polling solution** that checks Squarespace for new orders every 5 minutes.

## ✅ Setup Steps

### Step 1: Set Environment Variables

You need to set your Squarespace API key in Firebase Functions environment:

```bash
cd functions
firebase functions:config:set squarespace.api_key="YOUR_API_KEY_HERE"
```

Or using the newer method (Firebase Functions v2):

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `tpp-splendide`
3. Go to **Functions** → **Config** → **Environment Variables**
4. Add:
   - Name: `SQUARESPACE_API_KEY`
   - Value: `eeaf9b72-0bc9-4af5-8548-4c44d0a08251` (your API key)

### Step 2: Set Site ID (Optional)

Your site ID is usually in your Squarespace URL. From your URL `magenta-strawberry-ecr7.squarespace.com`, your site ID is: `magenta-strawberry-ecr7`

If needed, you can set it explicitly:
- Name: `SQUARESPACE_SITE_ID`
- Value: `magenta-strawberry-ecr7`

(Note: The code defaults to this value, so you might not need to set it)

### Step 3: Deploy the Polling Function

```bash
cd functions
firebase deploy --only functions:pollSquarespaceOrders
```

## How It Works

1. **Runs Every 5 Minutes**: The function automatically checks for new orders
2. **Fetches Recent Orders**: Gets orders modified in the last hour (or since last poll)
3. **Checks for Subscription Products**: Only processes orders with SKUs starting with `app-`
4. **Processes New Orders**: Grants subscriptions or creates pending grants
5. **Tracks Processed Orders**: Stores processed order IDs to avoid duplicates

## What Gets Processed

- ✅ Orders with SKU `app-monthly` → Monthly subscription
- ✅ Orders with SKU `app-annual` → Annual subscription  
- ✅ Orders with SKU `app-lifetime` → Lifetime access

## Monitoring

### Check Logs
```bash
firebase functions:log --only pollSquarespaceOrders
```

### Check Polling Status
In Firestore, check: `squarespaceConfig/polling`
- `lastPollTime`: Last successful poll timestamp
- `lastPollRun`: Last run time
- `ordersFound`: Number of orders found
- `ordersProcessed`: Number of new orders processed

### Check Processed Orders
Collection: `squarespaceProcessedOrders`
- Each processed order is stored with its ID
- Prevents duplicate processing

## Testing

1. Make a test purchase on your Squarespace site
2. Wait up to 5 minutes (or manually trigger the function)
3. Check Firebase logs to see if order was processed
4. Verify subscription was granted in `userSubscriptions` collection

## Manual Trigger (For Testing)

You can manually trigger the polling function from Firebase Console:
1. Go to **Functions** → **pollSquarespaceOrders**
2. Click **"Test"** or use the test tab

Or using Firebase CLI:
```bash
firebase functions:shell
pollSquarespaceOrders()
```

## Troubleshooting

### Function Not Running
- Check that function is deployed: `firebase functions:list`
- Check scheduled functions in Firebase Console
- Verify Cloud Scheduler is enabled for your project

### API Key Errors
- Verify `SQUARESPACE_API_KEY` is set correctly
- Check API key has required permissions: Orders, Products, Transactions
- Test API key manually with a curl request

### No Orders Found
- Check that orders actually exist in Squarespace
- Verify `modifiedAfter` timestamp is correct
- Check Firestore `squarespaceConfig/polling` document

### Orders Not Processing
- Check logs for specific errors
- Verify SKUs match: `app-monthly`, `app-annual`, `app-lifetime`
- Check if order was already processed (in `squarespaceProcessedOrders`)

## Rate Limiting

The function:
- Polls every 5 minutes (not real-time)
- Adds 500ms delay between order processing
- Respects Squarespace API rate limits

## Cost Considerations

- Function runs 12 times per hour = 288 times per day
- Each poll makes 1-2 API calls to Squarespace
- Very low cost (within Firebase free tier for most usage)

