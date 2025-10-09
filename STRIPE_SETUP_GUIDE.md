# 🚀 Stripe Integration Setup Guide

## 📋 Overview
This guide will help you set up a fully functional Stripe subscription system for your TPP Splendide app.

## 🔧 Prerequisites
- Stripe account (free to create)
- Node.js backend server (for webhooks)
- SSL certificate for production

## 📝 Step 1: Stripe Dashboard Setup

### 1.1 Create Products and Prices
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Create three products:

**Monthly Plan:**
- Name: "Pro Monthly"
- Price: $9.99 USD
- Billing: Recurring monthly
- Copy the Price ID (starts with `price_`)

**Annual Plan:**
- Name: "Pro Annual" 
- Price: $79.99 USD
- Billing: Recurring yearly
- Copy the Price ID

**Lifetime Plan:**
- Name: "Lifetime Access"
- Price: $249.99 USD
- Billing: One-time payment
- Copy the Price ID

### 1.2 Get API Keys
1. Go to [API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable Key** (starts with `pk_`)
3. Copy your **Secret Key** (starts with `sk_`)

## 🔐 Step 2: Environment Configuration

Create a `.env` file in your project root:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
VITE_STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
VITE_STRIPE_ANNUAL_PRICE_ID=price_your_annual_price_id
VITE_STRIPE_LIFETIME_PRICE_ID=price_your_lifetime_price_id

# Server-side (for backend)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## 🖥️ Step 3: Backend API Setup

Create these endpoints in your backend:

### 3.1 Create Checkout Session
```javascript
// POST /api/create-checkout-session
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userEmail, userId, successUrl, cancelUrl } = req.body;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription', // or 'payment' for one-time
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
    });
    
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3.2 Create Customer Portal Session
```javascript
// POST /api/create-portal-session
app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { customerId, returnUrl } = req.body;
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3.3 Cancel Subscription
```javascript
// POST /api/cancel-subscription
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 🔗 Step 4: Webhook Setup

### 4.1 Create Webhook Endpoint
```javascript
// POST /api/webhooks/stripe
app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Update user subscription in your database
      console.log('Payment successful:', session);
      break;
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      // Update subscription status
      console.log('Subscription updated:', subscription);
      break;
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      // Handle subscription cancellation
      console.log('Subscription cancelled:', deletedSub);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({received: true});
});
```

### 4.2 Configure Webhook in Stripe Dashboard
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
4. Copy the webhook signing secret

## 🧪 Step 5: Testing

### 5.1 Test Cards
Use these test card numbers:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0000 0000 3220

### 5.2 Test Flow
1. Navigate to `/account` in your app
2. Click "Manage" in subscription section
3. Select a plan and click "Select Plan"
4. Complete checkout with test card
5. Verify subscription appears in account

## 🚀 Step 6: Production Deployment

### 6.1 Switch to Live Keys
1. Get live API keys from Stripe Dashboard
2. Update environment variables
3. Test with real cards (small amounts)

### 6.2 Security Checklist
- ✅ Use HTTPS everywhere
- ✅ Validate webhook signatures
- ✅ Store sensitive data securely
- ✅ Implement proper error handling
- ✅ Log important events

## 🎯 Current Demo Features

The current implementation includes:
- ✅ **Stripe Checkout Integration**
- ✅ **Customer Portal Access**
- ✅ **Subscription Management**
- ✅ **Trial Period Handling**
- ✅ **Billing History Display**
- ✅ **Event-driven Updates**
- ✅ **Demo Mode for Testing**

## 📞 Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Stripe Discord Community](https://stripe.com/go/developer-chat)

---

**🎭 Demo Mode**: The current implementation runs in demo mode and simulates successful payments. Follow this guide to connect real Stripe processing!
