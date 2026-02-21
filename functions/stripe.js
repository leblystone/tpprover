const { onCall } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { buildFounderOfferResponse } = require('./founderOffer');
const giftAccess = require('./giftAccess');

// Load environment variables from .env file (Firebase Functions v2)
require('dotenv').config();

// Lazy init so deploy succeeds without STRIPE_SECRET_KEY; key is required at runtime when Stripe is used.
let _stripeClient = null;
function getStripe() {
  if (_stripeClient) return _stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_fallback_key') {
    return null; // No throw at load so deploy succeeds without .env; runtime calls will fail if Stripe is used.
  }
  _stripeClient = require('stripe')(key);
  return _stripeClient;
}
// Initialize at load only when key is present (e.g. production with secret set), so deploy without .env doesn't throw.
const keyAtLoad = process.env.STRIPE_SECRET_KEY;
if (keyAtLoad && keyAtLoad !== 'sk_test_fallback_key') {
  _stripeClient = require('stripe')(keyAtLoad);
}
Object.defineProperty(exports, 'stripe', { get: getStripe, enumerable: true });

const DEFAULT_LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || "price_1SUALt50b3cktl9X7nAOQdQR";
const FOUNDER_LIFETIME_PRICE_ID = process.env.STRIPE_FOUNDER_LIFETIME_PRICE_ID || null;
const FOUNDER_COUPON_ID = process.env.STRIPE_FOUNDER_COUPON_ID || null;
const FOUNDER_DISCOUNT_PERCENT = parseInt(process.env.FOUNDER_DISCOUNT_PERCENT || '50', 10);

// Create Stripe Checkout Session
exports.createCheckoutSession = onCall(
    {
      cors: true
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      
      // Debug logging
      
      try {
        if (!request.data) {
          throw new Error("No request data provided");
        }
        
        const {priceId, userEmail, userId, successUrl, cancelUrl, isGift, giftData} = request.data;
        
        // Prevent duplicate subscriptions -- if user already has an active Stripe subscription,
        // update it instead of creating a new one (unless this is a gift or lifetime)
        if (userId && !isGift) {
          const subDoc = await admin.firestore().collection('userSubscriptions').doc(userId).get();
          const existingSub = subDoc.exists ? subDoc.data()?.subscription : null;
          if (existingSub?.stripeSubscriptionId && 
              ['active', 'trialing'].includes(existingSub?.status) &&
              existingSub?.paymentProvider === 'stripe') {
            console.log(`⚠️ User ${userId} already has active Stripe subscription ${existingSub.stripeSubscriptionId}`);
            // For non-lifetime: Let Stripe handle plan changes via customer portal
            // For lifetime: Allow -- they're buying a different product
          }
        }
        
        // Validate required fields
        if (!priceId) {
          throw new Error("priceId is required");
        }
        if (!userEmail) {
          throw new Error("userEmail is required");
        }
        
        
        // Log the exact price ID being used
        
        const safePriceId = String(priceId);
        
        // Validate the price ID exists and is active in Stripe (non-blocking - log warnings but continue)
        try {
          const price = await getStripe().prices.retrieve(safePriceId);
          
          if (!price.active) {
            console.error(`⚠️ WARNING: Price ID ${safePriceId} is not active. This may cause checkout to fail.`);
            // Don't throw - let Stripe handle it and provide the actual error
          }
          
          // Check if product is archived (optional check - don't fail if this fails)
          try {
            const product = await getStripe().products.retrieve(price.product);
            if (product.active === false) {
              console.warn("⚠️ Product associated with price is archived:", product.id);
              // This might still work, but log a warning
            }
          } catch (productError) {
            console.warn("⚠️ Could not retrieve product info (non-fatal):", productError.message);
            // Don't fail the whole request if product check fails
          }
        } catch (priceError) {
          console.error("❌ Price validation failed (non-blocking):", priceError);
          console.error("Price error details:", {
            type: priceError.type,
            code: priceError.code,
            message: priceError.message,
            statusCode: priceError.statusCode
          });
          // Don't throw here - let the actual Stripe checkout session creation fail with a clearer error
          console.warn("⚠️ Continuing with checkout session creation - Stripe will validate the price ID");
        }
        
        const isLifetimeRequest = [DEFAULT_LIFETIME_PRICE_ID, FOUNDER_LIFETIME_PRICE_ID]
          .filter(Boolean)
          .includes(safePriceId);
        const sessionMode = (isGift || isLifetimeRequest) ? "payment" : "subscription";
        

        let founderState = null;
        let founderApplied = false;
        let founderType = isGift ? 'gift' : 'none';
        let founderRemaining = 0;
        let founderCap = 0;
        let founderDiscountPercent = FOUNDER_DISCOUNT_PERCENT;
        let effectivePriceId = safePriceId;
        const discounts = [];

        if (!isGift) {
          try {
            founderState = await buildFounderOfferResponse(userId);
            founderRemaining = founderState.remaining;
            founderCap = founderState.cap;
            founderDiscountPercent = founderState.founderDiscountPercent || founderState.discountPercent || FOUNDER_DISCOUNT_PERCENT;

            const founderEligible = founderState.enabled && (founderState.isFounder || founderRemaining > 0);
            if (founderEligible) {
              founderApplied = true;
              founderType = founderState.isFounder ? 'existing' : 'new';
            } else {
              founderType = founderState.enabled ? 'exhausted' : 'disabled';
            }
          } catch (founderError) {
            console.error('❌ Failed to load founder offer state:', founderError);
            founderType = 'error';
          }
        }

        // Temporarily disable founder pricing - founder coupon not configured
        if (founderApplied) {
          console.warn('⚠️ Founder pricing disabled - coupon not configured in Stripe');
          founderApplied = false;
          founderType = 'disabled';
        }

        if (!founderApplied && FOUNDER_LIFETIME_PRICE_ID && safePriceId === FOUNDER_LIFETIME_PRICE_ID) {
          console.warn('⚠️ Founder lifetime price requested but founder discount not applied. Reverting to standard lifetime price.');
          effectivePriceId = DEFAULT_LIFETIME_PRICE_ID;
        }

        const planName = request.data?.planName || (isLifetimeRequest ? 'Lifetime' : sessionMode === 'subscription' ? 'Research Subscription' : 'Checkout');

        const metadata = {
          userId: userId || '',
          userEmail,
          isGift: isGift ? 'true' : 'false',
          founderApplied: founderApplied ? 'true' : 'false',
          founderType,
          planName,
          isLifetime: isLifetimeRequest ? 'true' : 'false',
          priceId: effectivePriceId,
        };

        if (founderApplied) {
          metadata.founderCap = String(founderCap || 0);
          metadata.founderRemainingAtCheckout = String(founderRemaining || 0);
          metadata.founderDiscountPercent = String(founderDiscountPercent || FOUNDER_DISCOUNT_PERCENT);
          if (FOUNDER_COUPON_ID) {
            metadata.founderCouponId = FOUNDER_COUPON_ID;
          }
        }

        if (isGift && giftData) {
          if (giftData.recipientEmail) metadata.recipientEmail = giftData.recipientEmail;
          if (giftData.recipientName) metadata.recipientName = giftData.recipientName;
          if (giftData.giftGiverName) metadata.giftGiverName = giftData.giftGiverName;
          if (giftData.giftMessage) metadata.giftMessage = giftData.giftMessage;
          if (giftData.subscriptionType) metadata.subscriptionType = giftData.subscriptionType;
          if (giftData.pricePaid != null) metadata.priceAtPurchase = String(giftData.pricePaid);
        }

        const sessionPayload = {
          payment_method_types: ["card"],
          line_items: [{
            price: effectivePriceId,
            quantity: 1,
          }],
          mode: sessionMode,
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: userEmail,
          metadata,
        };

        if (sessionMode === 'payment') {
          sessionPayload.payment_intent_data = {
            metadata,
          };
        }

        if (discounts.length > 0) {
          sessionPayload.discounts = discounts;
        }
        
        const session = await getStripe().checkout.sessions.create(sessionPayload);
        return {id: session.id};
      } catch (error) {
        console.error("❌ Checkout session error:", error);
        console.error("Error details:", {
          message: error.message,
          type: error.type,
          code: error.code,
          statusCode: error.statusCode,
          param: error.param,
          raw: error.raw
        });
        
        // Provide more helpful error messages based on error type
        let errorMessage = error.message || 'Unknown error';
        
        if (error.type === 'StripeInvalidRequestError') {
          if (error.param === 'line_items[0][price]') {
            errorMessage = `Invalid price ID: ${request.data?.priceId}. The price may be archived, inactive, or not exist. Please verify the price ID in Stripe Dashboard.`;
          } else if (error.message?.includes('No such price')) {
            errorMessage = `Price ID ${request.data?.priceId} not found. Please verify the price ID is correct and active in Stripe Dashboard.`;
          }
        }
        
        // Return more detailed error for debugging
        throw new Error(`Stripe Error (${error.type || 'unknown'}): ${errorMessage}`);
      }
    });

// Securely finalize a gift purchase using the Stripe session id
exports.completeGiftFromSession = onCall(
  { cors: true },
  async (request) => {
    // Must be authenticated — gift completion requires a logged-in user
    if (!request.auth) {
      throw new Error('Authentication required to complete gift purchase');
    }
    if (!request.data?.sessionId) {
      throw new Error('sessionId is required');
    }
    const { sessionId } = request.data;
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (!session) {
        throw new Error('Checkout session not found');
      }
      if (session.payment_status !== 'paid') {
        return { success: false, status: session.payment_status };
      }
      const meta = session.metadata || {};
      if (meta.isGift !== 'true') {
        return { success: false, status: 'not_gift' };
      }
      // Create the gift record now that payment is confirmed
      const created = await giftAccess.createGiftAccess(
        session.customer_details?.email || session.customer_email,
        meta.giftGiverName || '',
        meta.recipientEmail || '',
        meta.recipientName || null,
        meta.giftMessage || '',
        meta.subscriptionType || 'monthly',
        session.payment_intent,
        Number(meta.priceAtPurchase || 0)
      );
      return {
        success: true,
        gift: {
          recipientEmail: created.recipientEmail,
          recipientName: created.recipientName || null,
          giftMessage: created.giftMessage || '',
          subscriptionType: created.subscriptionType,
          giftId: created.giftId,
        }
      };
    } catch (err) {
      console.error('completeGiftFromSession error:', err);
      throw new Error(err.message || 'Failed to complete gift');
    }
  }
);

// Create Stripe Customer Portal Session
exports.createPortalSession = onCall(
    {
      cors: true
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {customerId, returnUrl} = request.data;
        const session = await getStripe().billingPortal.sessions.create({
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
    {
      cors: true
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {subscriptionId} = request.data;
        const subscription = await getStripe().subscriptions.update(subscriptionId, {
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
    {
      cors: true
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {customerId, returnUrl} = request.data;
        
        // Create a Stripe Checkout session for payment method update
        const session = await getStripe().checkout.sessions.create({
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
    {
      cors: true
    },
    async (request) => {
      if (!request.auth) {
        throw new Error("The function must be called while authenticated.");
      }
      try {
        const {invoiceId, customerId} = request.data;
        
        // Get invoice from Stripe
        const invoice = await getStripe().invoices.retrieve(invoiceId);
        
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
exports.testStripeConfig = onCall(
    {
      cors: true
    },
    async (request) => {
  console.log("🧪 Testing Stripe configuration...");
  
  try {
    // Test basic Stripe API call
    const account = await getStripe().accounts.retrieve();
    console.log("✅ Stripe API working, account:", account.id);
    
    return {
      success: true,
      message: "Stripe configuration is working",
      accountId: account.id,
      keyUsed: (process.env.STRIPE_SECRET_KEY || '').substring(0, 20) + "..."
    };
  } catch (error) {
    console.error("❌ Stripe test failed:", error);
    return {
      success: false,
      error: error.message,
      keyUsed: (process.env.STRIPE_SECRET_KEY || '').substring(0, 20) + "..."
    };
  }
});

exports.getStripeSubscriptions = onCall(
    {
      cors: true
    },
    async (request) => {
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
    const subscriptions = await getStripe().subscriptions.list({
      limit: request.data.limit || 25,
      // You can add more parameters here, like 'status' or 'customer'
    });
    return subscriptions;
  } catch (error) {
    console.error("Stripe API Error:", error);
    throw new Error("Unable to fetch subscriptions from Stripe.");
  }
});
