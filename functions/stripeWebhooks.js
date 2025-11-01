// 🔗 Stripe Webhook Handler for The Pep Planner
// Receives Stripe webhook events and triggers appropriate email automation

const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const emailService = require('./emailService');

// Load environment variables
require('dotenv').config();

// Initialize Stripe instance (will be set in the handler after secrets are loaded)
let stripe = null;

/**
 * Stripe Webhook Handler
 * Receives and processes Stripe webhook events
 * Endpoint: https://us-central1-tpp-splendide.cloudfunctions.net/stripeWebhook
 */
exports.stripeWebhook = onRequest(
  {
    cors: true,
    invoker: 'public', // Allow unauthenticated access for Stripe webhooks
    secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
  },
  async (request, response) => {
    const sig = request.headers['stripe-signature'];

    // Initialize Stripe with secret key from environment/secrets
    if (!stripe) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        logger.error('❌ STRIPE_SECRET_KEY not configured');
        // Return 200 to acknowledge receipt, but log the error
        return response.status(200).json({ 
          received: false, 
          error: 'Stripe not configured' 
        });
      }
      stripe = require('stripe')(stripeSecretKey);
    }

    let event;

    try {
      // Use webhook secret from environment/secrets
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        logger.error('❌ STRIPE_WEBHOOK_SECRET not configured');
        // Return 200 to acknowledge receipt, but log the error
        return response.status(200).json({ 
          received: false, 
          error: 'Webhook secret not configured' 
        });
      }

      // Verify webhook signature
      event = stripe.webhooks.constructEvent(request.rawBody, sig, webhookSecret);
    } catch (err) {
      logger.error(`❌ Webhook signature verification failed: ${err.message}`);
      // Return 200 to acknowledge receipt to Stripe, but log the error
      // Stripe requires 200-299 status codes, so we acknowledge even on errors
      return response.status(200).json({ 
        received: false, 
        error: `Webhook Error: ${err.message}` 
      });
    }

    logger.info(`📥 Received Stripe webhook event: ${event.type}`);

    try {
      switch (event.type) {
        // Payment Intent Events
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event, stripe);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event, stripe);
          break;

        // Subscription Events
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event, stripe);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event, stripe);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event, stripe);
          break;

        // Invoice Events
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event, stripe);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event, stripe);
          break;

        case 'invoice.upcoming':
          await handleInvoiceUpcoming(event, stripe);
          break;

        // Charge Events
        case 'charge.succeeded':
          await handleChargeSucceeded(event, stripe);
          break;

        case 'charge.failed':
          await handleChargeFailed(event, stripe);
          break;

        // Dispute Events (for chargebacks, not refunds)
        case 'charge.dispute.created':
          await handleDisputeCreated(event, stripe);
          break;

        case 'charge.dispute.updated':
          await handleDisputeUpdated(event, stripe);
          break;

        case 'charge.dispute.closed':
          await handleDisputeClosed(event, stripe);
          break;

        default:
          logger.info(`🤷 Unhandled event type: ${event.type}`);
      }

      // Always return 200 to acknowledge receipt to Stripe
      response.status(200).json({ received: true, eventType: event.type });
    } catch (error) {
      logger.error(`❌ Error processing webhook: ${error.message}`, error);
      // Return 200 to acknowledge receipt to Stripe even on processing errors
      // This prevents Stripe from retrying indefinitely
      response.status(200).json({ 
        received: true, 
        processed: false,
        error: error.message 
      });
    }
  }
);

/**
 * Handle successful payment intent
 */
async function handlePaymentSucceeded(event, stripe) {
  const paymentIntent = event.data.object;
  logger.info(`💰 Payment succeeded: ${paymentIntent.id}`);

  // Get user email from customer
  const customer = await stripe.customers.retrieve(paymentIntent.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', paymentIntent.customer);
    return;
  }

  // Send payment successful email
  await emailService.sendPaymentSuccessfulEmail(
    userEmail,
    paymentIntent.amount / 100, // Convert from cents
    paymentIntent.currency.toUpperCase(),
    paymentIntent.receipt_email ? `Receipt sent to ${paymentIntent.receipt_email}` : null
  );

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'payment_intent.succeeded',
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    userEmail,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle failed payment intent
 */
async function handlePaymentFailed(event, stripe) {
  const paymentIntent = event.data.object;
  logger.info(`💸 Payment failed: ${paymentIntent.id}`);

  // Get user email from customer
  const customer = await stripe.customers.retrieve(paymentIntent.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', paymentIntent.customer);
    return;
  }

  // Send payment failed email
  await emailService.sendPaymentFailedEmail(
    userEmail,
    paymentIntent.amount / 100,
    paymentIntent.currency.toUpperCase(),
    null // No invoice URL available in payment intent
  );

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'payment_intent.payment_failed',
    paymentIntentId: paymentIntent.id,
    customerId: paymentIntent.customer,
    userEmail,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event, stripe) {
  const subscription = event.data.object;
  logger.info(`🎉 Subscription created: ${subscription.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', subscription.customer);
    return;
  }

  // Get plan details
  const plan = subscription.items.data[0]?.price;
  const planName = plan?.nickname || plan?.id || 'Pro Plan';

  // Send subscription confirmed email
  await emailService.sendSubscriptionConfirmedEmail(userEmail, planName);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.created',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    userEmail,
    planId: plan?.id,
    planName,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event, stripe) {
  const subscription = event.data.object;
  logger.info(`📝 Subscription updated: ${subscription.id}`);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.updated',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(event, stripe) {
  const subscription = event.data.object;
  logger.info(`❌ Subscription cancelled: ${subscription.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', subscription.customer);
    return;
  }

  // Get plan details
  const plan = subscription.items.data[0]?.price;
  const planName = plan?.nickname || plan?.id || 'Pro Plan';

  // Calculate end date
  const endDate = new Date(subscription.cancel_at * 1000).toISOString().split('T')[0];

  // Send subscription cancelled email
  await emailService.sendSubscriptionCancelledEmail(userEmail, planName, endDate);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'customer.subscription.deleted',
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    userEmail,
    planName,
    endDate,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(event, stripe) {
  const invoice = event.data.object;
  logger.info(`✅ Invoice paid: ${invoice.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', invoice.customer);
    return;
  }

  // Send payment successful email with invoice link
  await emailService.sendPaymentSuccessfulEmail(
    userEmail,
    invoice.amount_paid / 100,
    invoice.currency.toUpperCase(),
    invoice.hosted_invoice_url
  );

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'invoice.payment_succeeded',
    invoiceId: invoice.id,
    customerId: invoice.customer,
    userEmail,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(event, stripe) {
  const invoice = event.data.object;
  logger.info(`💸 Invoice payment failed: ${invoice.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', invoice.customer);
    return;
  }

  // Send payment failed email
  await emailService.sendPaymentFailedEmail(
    userEmail,
    invoice.amount_due / 100,
    invoice.currency.toUpperCase(),
    invoice.hosted_invoice_url
  );

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'invoice.payment_failed',
    invoiceId: invoice.id,
    customerId: invoice.customer,
    userEmail,
    amount: invoice.amount_due,
    currency: invoice.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle upcoming invoice (renewal reminder)
 */
async function handleInvoiceUpcoming(event, stripe) {
  const invoice = event.data.object;
  logger.info(`📅 Invoice upcoming: ${invoice.id}`);

  // Get user email
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for customer:', invoice.customer);
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const planName = subscription.items.data[0]?.price?.nickname || 'Pro Plan';

  // Send renewal reminder email
  await emailService.sendRenewalReminderEmail(userEmail, planName);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'invoice.upcoming',
    invoiceId: invoice.id,
    customerId: invoice.customer,
    userEmail,
    planName,
    amount: invoice.amount_due,
    currency: invoice.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle successful charge
 */
async function handleChargeSucceeded(event, stripe) {
  const charge = event.data.object;
  logger.info(`✅ Charge succeeded: ${charge.id}`);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'charge.succeeded',
    chargeId: charge.id,
    customerId: charge.customer,
    amount: charge.amount,
    currency: charge.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(event, stripe) {
  const charge = event.data.object;
  logger.info(`💸 Charge failed: ${charge.id}`);

  // Log the event
  await admin.firestore().collection('stripeEvents').add({
    type: 'charge.failed',
    chargeId: charge.id,
    customerId: charge.customer,
    amount: charge.amount,
    currency: charge.currency,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Handle dispute created (chargeback)
 */
async function handleDisputeCreated(event, stripe) {
  const dispute = event.data.object;
  logger.info(`🚨 Dispute created: ${dispute.id} for charge: ${dispute.charge}`);

  // Get customer email
  const charge = await stripe.charges.retrieve(dispute.charge);
  const customer = await stripe.customers.retrieve(charge.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Send dispute notification email
  await emailService.sendDisputeNotificationEmail(userEmail, dispute.reason, dispute.amount);

  logger.info(`✅ Dispute notification sent to: ${userEmail}`);
}

/**
 * Handle dispute updated
 */
async function handleDisputeUpdated(event, stripe) {
  const dispute = event.data.object;
  logger.info(`📝 Dispute updated: ${dispute.id} - Status: ${dispute.status}`);

  // Get customer email
  const charge = await stripe.charges.retrieve(dispute.charge);
  const customer = await stripe.customers.retrieve(charge.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Send dispute status update email
  await emailService.sendDisputeStatusUpdateEmail(userEmail, dispute.status, dispute.reason);

  logger.info(`✅ Dispute status update sent to: ${userEmail}`);
}

/**
 * Handle dispute closed
 */
async function handleDisputeClosed(event, stripe) {
  const dispute = event.data.object;
  logger.info(`✅ Dispute closed: ${dispute.id} - Status: ${dispute.status}`);

  // Get customer email
  const charge = await stripe.charges.retrieve(dispute.charge);
  const customer = await stripe.customers.retrieve(charge.customer);
  const userEmail = customer.email;

  if (!userEmail) {
    logger.warn('⚠️ No email found for disputed charge');
    return;
  }

  // Send dispute resolution email
  await emailService.sendDisputeResolutionEmail(userEmail, dispute.status, dispute.reason);

  logger.info(`✅ Dispute resolution sent to: ${userEmail}`);
}
