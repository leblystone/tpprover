const functions = require("firebase-functions");
// For Firebase Functions v2, use environment variables
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

// Create Stripe Checkout Session
exports.createCheckoutSession = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
      }
      try {
        const {priceId, userEmail, userId, successUrl, cancelUrl} = data;
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
        throw new functions.https.HttpsError(
            "internal",
            "Unable to create checkout session.",
        );
      }
    });

// Create Stripe Customer Portal Session
exports.createPortalSession = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
      }
      try {
        const {customerId, returnUrl} = data;
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: returnUrl,
        });
        return {url: session.url};
      } catch (error) {
        console.error("Portal session error:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Unable to create portal session.",
        );
      }
    });

// Cancel Stripe Subscription
exports.cancelSubscription = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
      }
      try {
        const {subscriptionId} = data;
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
        throw new functions.https.HttpsError(
            "internal",
            "Unable to cancel subscription.",
        );
      }
    });

// Update Payment Method
exports.updatePaymentMethod = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
      }
      try {
        const {customerId, returnUrl} = data;
        
        // Create a Stripe Checkout session for payment method update
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "setup",
          customer: customerId,
          success_url: returnUrl + "?session_id={CHECKOUT_SESSION_ID}",
          cancel_url: returnUrl,
          metadata: {
            userId: context.auth.uid,
          },
        });
        
        return {url: session.url};
      } catch (error) {
        console.error("Update payment method error:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Unable to create payment method update session.",
        );
      }
    });

// Generate and download invoice receipt
exports.generateInvoiceReceipt = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated.",
        );
      }
      try {
        const {invoiceId, customerId} = data;
        
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
        throw new functions.https.HttpsError(
            "internal",
            "Unable to generate invoice receipt.",
        );
      }
    });

exports.getStripeSubscriptions = functions.https.onCall(async (data, context) => {
  // Check if the user is an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  
  // TODO: Add a check to ensure the user is an admin
  // For example, check a custom claim:
  // if (context.auth.token.admin !== true) {
  //   throw new functions.https.HttpsError(
  //     "permission-denied",
  //     "The function must be called by an admin."
  //   );
  // }

  try {
    const subscriptions = await stripe.subscriptions.list({
      limit: data.limit || 25,
      // You can add more parameters here, like 'status' or 'customer'
    });
    return subscriptions;
  } catch (error) {
    console.error("Stripe API Error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to fetch subscriptions from Stripe."
    );
  }
});
