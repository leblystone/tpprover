// Manual Subscription Sync - Use this to fix users whose webhook failed
// Run in Firebase Functions shell or deploy as a callable function

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Manually sync a user's subscription from Stripe to Firestore
 * Usage: Call this with userId and we'll fetch from Stripe and update Firestore
 * Note: This is an admin function - should only be accessible from admin panel
 */
exports.manualSyncSubscription = functions.https.onCall(async (data, context) => {
  const { userId, stripeCustomerId } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const db = admin.firestore();

  try {
    console.log(`🔄 Manual sync requested for user: ${userId}`);

    // Get user from Firestore to find their Stripe customer ID
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    let customerId = stripeCustomerId || userData?.stripeCustomerId;
    
    // If no customer ID, try to find by email
    if (!customerId && userData?.email) {
      console.log(`📧 No Stripe customer ID found, searching by email: ${userData.email}`);
      const customers = await stripe.customers.list({
        email: userData.email,
        limit: 1
      });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`✅ Found Stripe customer: ${customerId}`);
      }
    }

    if (!customerId) {
      throw new functions.https.HttpsError('not-found', 'No Stripe customer found for this user');
    }

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10
    });

    console.log(`📊 Found ${subscriptions.data.length} subscriptions for customer ${customerId}`);

    if (subscriptions.data.length === 0) {
      return {
        success: false,
        message: 'No subscriptions found in Stripe for this customer',
        customerId
      };
    }

    // Get the most recent active or trialing subscription
    const activeSubscription = subscriptions.data.find(sub => 
      sub.status === 'active' || sub.status === 'trialing'
    ) || subscriptions.data[0];

    console.log(`🎯 Using subscription: ${activeSubscription.id} (status: ${activeSubscription.status})`);

    // Build subscription object
    const subscriptionData = {
      status: activeSubscription.status,
      stripeSubscriptionId: activeSubscription.id,
      stripeCustomerId: customerId,
      currentPeriodStart: new Date(activeSubscription.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
      cancelAt: activeSubscription.cancel_at ? new Date(activeSubscription.cancel_at * 1000).toISOString() : null,
      created: new Date(activeSubscription.created * 1000).toISOString(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    // Get plan details
    if (activeSubscription.items && activeSubscription.items.data.length > 0) {
      const item = activeSubscription.items.data[0];
      const price = item.price;
      
      subscriptionData.plan = price.nickname || price.product || 'Monthly Subscription';
      subscriptionData.interval = price.recurring?.interval || 'month';
      subscriptionData.amount = price.unit_amount;
      subscriptionData.currency = price.currency;
    }

    // Get latest invoice
    if (activeSubscription.latest_invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(activeSubscription.latest_invoice);
        subscriptionData.latestInvoiceId = invoice.id;
        subscriptionData.latestInvoiceStatus = invoice.status;
        subscriptionData.latestInvoiceAmountDue = invoice.amount_due;
      } catch (err) {
        console.warn('Could not fetch latest invoice:', err);
      }
    }

    console.log('📝 Subscription data to write:', JSON.stringify(subscriptionData, null, 2));

    // Update both collections
    await db.collection('userSubscriptions').doc(userId).set({
      subscription: subscriptionData,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('users').doc(userId).set({
      stripeCustomerId: customerId,
      subscription: subscriptionData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ Subscription synced successfully!');

    return {
      success: true,
      message: 'Subscription synced successfully',
      subscriptionId: activeSubscription.id,
      status: activeSubscription.status,
      interval: subscriptionData.interval,
      plan: subscriptionData.plan
    };

  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

