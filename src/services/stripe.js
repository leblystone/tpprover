import { stripePromise, STRIPE_CONFIG } from '../config/stripe.js';

/**
 * Create a Stripe Checkout session for subscription
 * @param {string} priceId - Stripe price ID
 * @param {string} userEmail - User's email
 * @param {string} userId - User's ID for metadata
 * @returns {Promise<void>}
 */
export async function createCheckoutSession(priceId, userEmail, userId) {
  try {
    const stripe = await stripePromise;
    
    // In a real app, this would call your backend API
    // For demo purposes, we'll simulate the checkout flow
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        userEmail,
        userId,
        successUrl: `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/account`,
      }),
    });

    if (!response.ok) {
      // If backend not available, fall back to demo mode
      console.log('🎭 Backend not available - running in demo mode');
      return simulateSuccessfulCheckout(priceId);
    }

    const session = await response.json();
    
    // Redirect to Stripe Checkout
    const result = await stripe.redirectToCheckout({
      sessionId: session.id,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Stripe checkout error:', error);
    // If there's an error (like no backend), fall back to demo mode
    return simulateSuccessfulCheckout(priceId);
  }
}

/**
 * Simulate successful checkout for demo purposes
 * @param {string} priceId - Stripe price ID
 */
function simulateSuccessfulCheckout(priceId) {
  // Determine plan details based on price ID
  let planDetails = {};
  
  if (priceId === STRIPE_CONFIG.prices.monthly) {
    planDetails = { name: 'Pro Monthly', price: 9.99, interval: 'month' };
  } else if (priceId === STRIPE_CONFIG.prices.annual) {
    planDetails = { name: 'Pro Annual', price: 79.99, interval: 'year' };
  } else if (priceId === STRIPE_CONFIG.prices.lifetime) {
    planDetails = { name: 'Lifetime', price: 149.00, interval: 'lifetime' };
  }

  // Simulate processing delay
  setTimeout(() => {
    // Dispatch custom event to update subscription
    window.dispatchEvent(new CustomEvent('stripe:checkout:success', {
      detail: {
        priceId,
        planDetails,
        customerId: 'cus_demo_' + Date.now(),
        subscriptionId: 'sub_demo_' + Date.now()
      }
    }));
    
    // Show success message
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: `✅ Demo: ${planDetails.name} subscription activated!`, 
        type: 'success' 
      }
    }));
  }, 1500);

  // Show processing message
  window.dispatchEvent(new CustomEvent('tpp:toast', {
    detail: { 
      message: '🎭 Demo Mode: Processing Stripe checkout...', 
      type: 'info' 
    }
  }));
}

/**
 * Create a customer portal session
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<void>}
 */
export async function createPortalSession(customerId) {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        returnUrl: `${window.location.origin}/account`,
      }),
    });

    if (!response.ok) {
      // For demo - just show message
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: '🎭 Demo: Customer portal would open here', 
          type: 'info' 
        }
      }));
      return;
    }

    const session = await response.json();
    window.location.href = session.url;
  } catch (error) {
    console.error('Portal session error:', error);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: '🎭 Demo: Customer portal would open here', 
        type: 'info' 
      }
    }));
  }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<boolean>}
 */
export async function cancelSubscription(subscriptionId) {
  try {
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) {
      // For demo - simulate cancellation
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('stripe:subscription:cancelled', {
          detail: { subscriptionId }
        }));
        
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            message: '🎭 Demo: Subscription cancelled successfully', 
            type: 'success' 
          }
        }));
      }, 1000);
      
      return true;
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return false;
  }
}
