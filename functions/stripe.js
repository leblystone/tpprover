const {onCall} = require("firebase-functions/v2/https");
// For Firebase Functions v2, use environment variables
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

// Create Stripe Checkout Session
exports.createCheckoutSession = onCall(
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {priceId, userEmail, userId, successUrl, cancelUrl} = request.data;
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [{
            price: priceId,
            quantity: 1,
          }],
          mode: priceId.includes("lifetime") ? "payment" : "subscription",
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
        throw new Error("Unable to create checkout session.");
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
