// Demo Stripe API endpoints for development
// In production, these would be actual backend endpoints

/**
 * Mock Stripe Checkout Session creation
 * @param {Object} data - Checkout session data
 * @returns {Promise<Object>} - Mock session response
 */
export async function createCheckoutSession(data) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock successful session creation
  return {
    id: 'cs_demo_' + Date.now(),
    url: 'https://checkout.stripe.com/demo',
    success: true
  };
}

/**
 * Mock Customer Portal Session creation
 * @param {Object} data - Portal session data
 * @returns {Promise<Object>} - Mock portal response
 */
export async function createPortalSession(data) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    url: 'https://billing.stripe.com/demo',
    success: true
  };
}

/**
 * Mock subscription cancellation
 * @param {Object} data - Cancellation data
 * @returns {Promise<Object>} - Mock cancellation response
 */
export async function cancelSubscription(data) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return {
    success: true,
    status: 'canceled'
  };
}

/**
 * Mock webhook event handling
 * @param {Object} event - Stripe webhook event
 * @returns {Promise<Object>} - Processing result
 */
export async function handleWebhook(event) {
  console.log('📧 Mock webhook received:', event.type);
  
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('✅ Payment successful:', event.data.object);
      break;
    case 'customer.subscription.updated':
      console.log('🔄 Subscription updated:', event.data.object);
      break;
    case 'customer.subscription.deleted':
      console.log('❌ Subscription cancelled:', event.data.object);
      break;
    default:
      console.log('📋 Unhandled event type:', event.type);
  }
  
  return { received: true };
}
