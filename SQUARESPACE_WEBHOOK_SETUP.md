# Squarespace Webhook Setup Guide

## ✅ Your Webhook URL
```
https://us-central1-tpp-splendide.cloudfunctions.net/squarespaceWebhook
```

## Step 1: Get Your Squarespace API Key

1. In your Squarespace Dashboard (where you are now):
   - Click on **"Developer API Keys"** (the `< />` icon option)
   - Click **"Create Key"** button
   - Name it: `The Pep Planner Webhook`
   - Grant these permissions:
     - ✅ **Orders** (order and fulfillment data)
     - ✅ **Products** (product information/SKUs)
     - ✅ **Transactions** (transactional order and subscription data)
     - ✅ **Profiles** (customer email/name - optional but recommended)
   - Click **"Save"** or **"Generate"**
   - **Copy the API key** (you'll only see it once!)

## Step 2: Create Webhook Subscriptions

You have two options:

### Option A: Use the Setup Script (Recommended)

1. **Run the setup script:**
   ```bash
   node setup-squarespace-webhook.js YOUR_API_KEY_HERE
   ```

   This will automatically create webhook subscriptions for all needed events:
   - Order Created
   - Order Updated
   - Subscription Created
   - Subscription Updated
   - Subscription Cancelled
   - Subscription Expired

### Option B: Use Squarespace API Directly

If you prefer to use the API directly, here's a curl command:

```bash
curl -X POST https://api.squarespace.com/1.0/webhook_subscriptions \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "endpointUrl": "https://us-central1-tpp-splendide.cloudfunctions.net/squarespaceWebhook",
    "topics": ["order.create", "order.update", "subscription.create", "subscription.update", "subscription.cancel", "subscription.expire"]
  }'
```

## Step 3: Verify Webhook Setup

1. **List your webhook subscriptions:**
   ```bash
   curl -X GET https://api.squarespace.com/1.0/webhook_subscriptions \
     -H "Authorization: Bearer YOUR_API_KEY_HERE"
   ```

2. **Test with a purchase:**
   - Make a test purchase on your Squarespace site
   - Check Firebase logs:
     ```bash
     firebase functions:log --only squarespaceWebhook
     ```

## Important Notes

- **API Key Security:** Never commit your API key to Git. Keep it secure.
- **Webhook Verification:** Your webhook function verifies the signature from Squarespace
- **Event Types:** The script sets up subscriptions for all subscription-related events
- **Retry Logic:** Squarespace will retry failed webhook deliveries

## Troubleshooting

### Webhook Not Receiving Events
1. Check API key has "Commerce" permissions
2. Verify webhook URL is correct and accessible
3. Check Firebase Functions logs for errors
4. Make sure your subscription products have the correct SKUs:
   - `app-monthly`
   - `app-annual`
   - `app-lifetime`

### View Webhook Logs
```bash
# Firebase logs
firebase functions:log --only squarespaceWebhook

# Or in Firebase Console:
# Functions → squarespaceWebhook → Logs
```

### Test Webhook Manually
You can test the webhook endpoint directly:
```bash
curl -X POST https://us-central1-tpp-splendide.cloudfunctions.net/squarespaceWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order.create",
    "order": {
      "id": "test-123",
      "customerEmail": "test@example.com",
      "lineItems": [{"sku": "app-monthly"}]
    }
  }'
```

## Next Steps

After webhooks are set up:
1. ✅ Test with a real purchase
2. ✅ Verify activation email is sent
3. ✅ Test activation link works
4. ✅ Verify subscription is granted in app

## Reference

- [Squarespace Webhook API Documentation](https://developers.squarespace.com/commerce-apis/create-webhook-subscription)
- [Verifying Webhook Signatures](https://developers.squarespace.com/webhooks/verifying-notifications)
