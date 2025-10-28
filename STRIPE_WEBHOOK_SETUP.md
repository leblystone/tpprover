# Stripe Webhook Setup Guide

## Setup Steps

### 1. Create Webhook Endpoint in Stripe Dashboard
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://us-central1-tpp-splendide.cloudfunctions.net/stripeWebhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `invoice.upcoming`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.succeeded`
   - `charge.failed`

### 2. Get Webhook Signing Secret
1. In Stripe Dashboard → Webhooks, click on your webhook
2. Find "Signing secret" and copy it
3. Run this command:

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```
When prompted, paste your webhook signing secret

### 3. Deploy the Webhook Handler
```bash
firebase deploy --only functions:stripeWebhook
```

## What This Connects

✅ **Subscription Confirmed** → Sends welcome email when user subscribes
✅ **Payment Successful** → Sends payment confirmation email
✅ **Payment Failed** → Sends payment failed notification email
✅ **Subscription Cancelled** → Sends cancellation confirmation email
✅ **Renewal Reminder** → Sends renewal reminder email 3 days before renewal

All emails will use your custom templates from the admin panel!

## Testing

1. Create a test subscription in Stripe Dashboard
2. The webhook will automatically trigger and send the appropriate email
3. Check your email inbox for the beautifully designed email using your custom template

