const {onCall} = require("firebase-functions/v2/https");

// Load environment variables from .env file (Firebase Functions v2)
require('dotenv').config();

// Use environment variable for Stripe secret key (v2 functions)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === 'sk_test_fallback_key') {
  console.error("❌ STRIPE_SECRET_KEY not found in environment variables!");
  console.error("Please create functions/.env file with STRIPE_SECRET_KEY");
} else {
  console.log("✅ Stripe key loaded:", STRIPE_SECRET_KEY.substring(0, 20) + "...");
}

const stripe = require("stripe")(STRIPE_SECRET_KEY || "sk_test_fallback_key");

// Create Stripe Checkout Session
exports.createCheckoutSession = onCall(
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      
      // Debug logging
      console.log("🔍 Stripe configuration check:");
      console.log("Environment STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY ? "✅ Found" : "❌ Missing");
      console.log("Using fallback key:", STRIPE_SECRET_KEY.substring(0, 20) + "...");
      console.log("Request data keys:", Object.keys(request.data || {}));
      console.log("Price ID:", request.data?.priceId);
      console.log("User Email:", request.data?.userEmail);
      
      try {
        // Validate request data
        if (!request.data) {
          throw new Error("No request data provided");
        }
        
        const {priceId, userEmail, userId, successUrl, cancelUrl} = request.data;
        
        // Validate required fields
        if (!priceId) {
          throw new Error("priceId is required");
        }
        if (!userEmail) {
          throw new Error("userEmail is required");
        }
        
        console.log("✅ All required fields present, creating Stripe session...");
        
        // Log the exact price ID being used
        console.log("🔍 Using price ID:", priceId);
        console.log("🔍 Using secret key (first 20 chars):", STRIPE_SECRET_KEY.substring(0, 20));
        
        // Lifetime price ID (one-time payment, not recurring)
        const LIFETIME_PRICE_ID = "price_1SJNIw50b3cktl9X7tr7Efox";
        
        // Determine if this is a one-time payment (lifetime) or subscription
        const isLifetime = priceId === LIFETIME_PRICE_ID;
        const sessionMode = isLifetime ? "payment" : "subscription";
        
        console.log("🔍 Session mode:", sessionMode, isLifetime ? "(Lifetime - one-time payment)" : "(Recurring subscription)");
        
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{
            price: priceId,
            quantity: 1,
          }],
          mode: sessionMode,
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: userEmail,
          metadata: {
            userId: userId,
          },
        });
        return {id: session.id};
      } catch (error) {
        console.error("Checkout session error:", error);
        console.error("Error details:", {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          raw: error.raw
        });
        // Return more detailed error for debugging
        throw new Error(`Stripe Error: ${error.type || 'unknown'} - ${error.message || 'No message'}`);
      }
    });

// Create Stripe Customer Portal Session
exports.createPortalSession = onCall(
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {customerId, returnUrl} = request.data;
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });
        return {url: session.url};
      } catch (error) {
        console.error("Portal session error:", error);
        throw new Error("Unable to create portal session.");
      }
    });

// Cancel Stripe Subscription
exports.cancelSubscription = onCall(
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {subscriptionId} = request.data;
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        return {
          id: subscription.id,
          status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error("Cancel subscription error:", error);
        throw new Error("Unable to cancel subscription.");
      }
    });

// Update Payment Method
exports.updatePaymentMethod = onCall(
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {customerId, returnUrl} = request.data;
        
        // Create a Stripe Checkout session for payment method update
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "setup",
          customer: customerId,
          success_url: returnUrl + "?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: returnUrl,
          metadata: {
            userId: request.auth.uid,
          },
        });
        
        return {url: session.url};
      } catch (error) {
        console.error("Update payment method error:", error);
        throw new Error("Unable to create payment method update session.");
      }
    });

// Generate and download invoice receipt
exports.generateInvoiceReceipt = onCall(
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {invoiceId, customerId} = request.data;
        
        // Get invoice from Stripe
        const invoice = await stripe.invoices.retrieve(invoiceId);
        
        // Create a cute digital receipt
        const receiptData = {
          invoiceId: invoice.id,
          customerEmail: invoice.customer_email,
          amount: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          date: new Date(invoice.created * 1000).toLocaleDateString(),
          status: invoice.status,
          description: (invoice.lines.data[0] && invoice.lines.data[0].description) || 'The Pep Planner Subscription',
          receiptNumber: `TPP-${invoice.number || invoice.id.slice(-8).toUpperCase()}`,
          message: "Thank you for being a valued researcher! 🧬"
        };
        
        return receiptData;
      } catch (error) {
        console.error("Generate invoice receipt error:", error);
        throw new Error("Unable to generate invoice receipt.");
      }
    });

// Test function to verify Stripe configuration
exports.testStripeConfig = onCall(async (request) => {
  console.log("🧪 Testing Stripe configuration...");
  
  try {
    // Test basic Stripe API call
    const account = await stripe.accounts.retrieve();
    console.log("✅ Stripe API working, account:", account.id);
    
    return {
      success: true,
      message: "Stripe configuration is working",
      accountId: account.id,
      keyUsed: STRIPE_SECRET_KEY.substring(0, 20) + "..."
    };
  } catch (error) {
    console.error("❌ Stripe test failed:", error);
    return {
      success: false,
      error: error.message,
      keyUsed: STRIPE_SECRET_KEY.substring(0, 20) + "..."
    };
  }
});

exports.getStripeSubscriptions = onCall(async (request) => {
  // Check if the user is an authenticated admin
  if (!request.auth) {
    throw new Error("The function must be called while authenticated.");
  }
  
  // TODO: Add a check to ensure the user is an admin
  // For example, check a custom claim:
  // if (request.auth.token.admin !== true) {
  //   throw new Error("The function must be called by an admin.");
  // }

  try {
    const subscriptions = await stripe.subscriptions.list({
      limit: request.data.limit || 25,
      // You can add more parameters here, like 'status' or 'customer'
    });
    return subscriptions;
  } catch (error) {
    console.error("Stripe API Error:", error);
    throw new Error("Unable to fetch subscriptions from Stripe.");
  }
});
