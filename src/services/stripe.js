import { stripePromise, STRIPE_CONFIG } from '../config/stripe.js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

/**
 * Create a Stripe Checkout session for subscription
 * @param {string} priceId - Stripe price ID
 * @param {string} userEmail - User's email
 * @param {string} userId - User's ID for metadata
 * @returns {Promise<void>}
 */
export async function createCheckoutSession(priceId, userEmail, userId) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('🎭 User not authenticated - running in demo mode');
      return simulateSuccessfulCheckout(priceId);
    }

    const functions = getFunctions();
    const createCheckoutSessionFn = httpsCallable(functions, 'createCheckoutSession');
    
    const result = await createCheckoutSessionFn({
      priceId,
      userEmail,
      userId,
      successUrl: `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/account`,
    });

    const stripe = await stripePromise;
    
    // Redirect to Stripe Checkout
    const checkoutResult = await stripe.redirectToCheckout({
      sessionId: result.data.id,
    });

    if (checkoutResult.error) {
      throw new Error(checkoutResult.error.message);
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
 * Update payment method
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<void>}
 */
export async function updatePaymentMethod(customerId) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('🎭 User not authenticated - running in demo mode');
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: '🎭 Demo: Payment method update would open here', 
          type: 'info' 
        }
      }));
      return;
    }

    const functions = getFunctions();
    const updatePaymentMethodFn = httpsCallable(functions, 'updatePaymentMethod');
    
    const result = await updatePaymentMethodFn({
      customerId,
      returnUrl: `${window.location.origin}/account`,
    });

    // Redirect to Stripe Checkout for payment method update
    window.location.href = result.data.url;
  } catch (error) {
    console.error('Update payment method error:', error);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: '🎭 Demo: Payment method update would open here', 
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
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('🎭 User not authenticated - running in demo mode');
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

    const functions = getFunctions();
    const cancelSubscriptionFn = httpsCallable(functions, 'cancelSubscription');
    
    const result = await cancelSubscriptionFn({
      subscriptionId,
    });

    return result.data;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return false;
  }
}
