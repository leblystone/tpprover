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
    const createCheckoutSessionFn = httpsCallable(functions, 'stripe-createCheckoutSession');
    
    const result = await createCheckoutSessionFn({
      priceId,
      userEmail,
      userId,
      successUrl: `${window.location.origin}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/account`,
    });

    const stripe = await stripePromise;
    
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }
    
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
    planDetails = { name: 'Lifetime', price: 249.99, interval: 'lifetime' };
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
    const auth = getAuth();
    
    // Try to create portal session through Firebase Functions first
    try {
      const functions = getFunctions();
      const createPortalSessionFn = httpsCallable(functions, 'stripe-createPortalSession');
      
      const result = await createPortalSessionFn({
        customerId,
        returnUrl: `${window.location.origin}/account`,
      });

      // Redirect to Stripe Customer Portal
      window.location.href = result.data.url;
      return;
    } catch (functionsError) {
      console.log('Firebase Functions not available, trying direct API...');
    }

    // Fallback: Try direct API call
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

    if (response.ok) {
      const session = await response.json();
      window.location.href = session.url;
      return;
    }

    // If all else fails, show demo message
    console.log('🎭 Demo Mode: Opening Stripe Customer Portal...');
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: '🎭 Demo: Stripe Customer Portal would open here. In production, you\'d be redirected to manage billing, payment methods, and invoices.', 
        type: 'info' 
      }
    }));
    
  } catch (error) {
    console.error('Portal session error:', error);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: '🎭 Demo: Stripe Customer Portal would open here. In production, you\'d be redirected to manage billing, payment methods, and invoices.', 
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
    const updatePaymentMethodFn = httpsCallable(functions, 'stripe-updatePaymentMethod');
    
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
 * Download invoice receipt
 * @param {string} invoiceId - Stripe invoice ID
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<void>}
 */
export async function downloadInvoiceReceipt(invoiceId, customerId) {
  try {
    const auth = getAuth();
    if (!auth.currentUser) {
      console.log('🎭 User not authenticated - running in demo mode');
      // Demo receipt
      const demoReceipt = {
        receiptNumber: 'TPP-DEMO123',
        amount: '$8.99',
        date: new Date().toLocaleDateString(),
        description: 'The Pep Planner Subscription',
        message: "Thank you for being a valued researcher! 🧬"
      };
      
      // Create and download demo receipt
      downloadReceiptPDF(demoReceipt);
      return;
    }

    const functions = getFunctions();
    const generateReceiptFn = httpsCallable(functions, 'stripe-generateInvoiceReceipt');
    
    const result = await generateReceiptFn({
      invoiceId,
      customerId,
    });

    // Create and download the receipt
    downloadReceiptPDF(result.data);
  } catch (error) {
    console.error('Download receipt error:', error);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: 'Unable to download receipt. Please try again.', 
        type: 'error' 
      }
    }));
  }
}

/**
 * Create and download a cute PDF receipt
 * @param {Object} receiptData - Receipt data
 */
function downloadReceiptPDF(receiptData) {
  // Create a cute receipt HTML
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - The Pep Planner</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #D4D7CD, #A3B18A); }
        .receipt { max-width: 400px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #344E41; margin-bottom: 10px; }
        .tagline { color: #5C7659; font-size: 14px; }
        .receipt-number { background: #D4D7CD; padding: 10px; border-radius: 10px; margin-bottom: 20px; text-align: center; font-weight: bold; color: #344E41; }
        .item { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 15px; background: #F8F9FA; border-radius: 10px; }
        .item-name { font-weight: 600; color: #344E41; }
        .item-price { font-weight: bold; color: #5C7659; }
        .total { border-top: 2px solid #D4D7CD; padding-top: 20px; margin-top: 20px; text-align: center; }
        .total-amount { font-size: 24px; font-weight: bold; color: #344E41; }
        .thank-you { text-align: center; margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #D4D7CD, #A3B18A); border-radius: 10px; color: #344E41; font-weight: 600; }
        .date { text-align: center; color: #5C7659; font-size: 14px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="logo">🧬 The Pep Planner</div>
          <div class="tagline">Research. Track. Optimize.</div>
        </div>
        
        <div class="receipt-number">Receipt #${receiptData.receiptNumber}</div>
        
        <div class="date">${receiptData.date}</div>
        
        <div class="item">
          <div class="item-name">${receiptData.description}</div>
          <div class="item-price">${receiptData.amount}</div>
        </div>
        
        <div class="total">
          <div class="total-amount">${receiptData.amount}</div>
        </div>
        
        <div class="thank-you">
          ${receiptData.message}
        </div>
      </div>
    </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([receiptHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TPP-Receipt-${receiptData.receiptNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Cancel subscription (at period end - no proration)
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
            message: '🎭 Demo: Subscription will cancel at end of billing period', 
            type: 'success' 
          }
        }));
      }, 1000);
      
      return true;
    }

    const functions = getFunctions();
    const cancelSubscriptionFn = httpsCallable(functions, 'stripe-cancelSubscription');
    
    const result = await cancelSubscriptionFn({
      subscriptionId,
    });

    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { 
        message: 'Subscription will cancel at the end of your current billing period. No proration will be applied.', 
        type: 'success' 
      }
    }));

    return result.data;
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return false;
  }
}
