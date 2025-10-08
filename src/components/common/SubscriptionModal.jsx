import React from 'react';
import Modal from './Modal';
import { createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';
import { useAppContext } from '../../context/AppContext';

export default function SubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();

  const handleSelectPlan = async (plan) => {
    console.log('🚀 SubscriptionModal: Selected plan:', plan);
    
    // Show processing message
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: '🔄 Redirecting to Stripe checkout...', type: 'info' } 
    }));
    
    try {
      // Determine the correct Stripe price ID based on plan
      let priceId = '';
      if (plan.name.toLowerCase() === 'monthly') {
        priceId = STRIPE_CONFIG.prices.monthly;
      } else if (plan.name.toLowerCase() === 'annual') {
        priceId = STRIPE_CONFIG.prices.annual;
      } else if (plan.name.toLowerCase() === 'lifetime') {
        priceId = STRIPE_CONFIG.prices.lifetime;
      }

      console.log('🔍 SubscriptionModal: Attempting Stripe checkout with priceId:', priceId, 'for user:', user?.uid);

      // Close modal and redirect to Stripe checkout immediately
      onClose();
      await createCheckoutSession(priceId, user?.email || 'demo@example.com', user?.uid || 'demo_user');
      console.log('✅ SubscriptionModal: createCheckoutSession called successfully.');
      
    } catch (error) {
      console.error('❌ SubscriptionModal: Stripe checkout error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
      }));
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Choose Your Plan"
      theme={theme}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex justify-center w-full">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
          >
            Maybe Later
          </button>
        </div>
      }
    >
      <div className="p-4">
        <p className="text-center text-gray-600 mb-8">
          Your trial has ended. Select a plan to continue with full access to The Pep Planner.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly Plan */}
          <div 
            className="relative bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col min-h-[200px]"
            style={{ borderColor: '#D4D7CD' }}
            onClick={() => handleSelectPlan({ name: 'Monthly', price: 8.99, interval: 'month' })}
          >
            {/* Plan Title */}
            <div className="text-center mb-6 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold" style={{ color: '#344E41' }}>Monthly</h3>
              <div className="text-3xl font-bold mt-2" style={{ color: '#344E41' }}>$8.99</div>
              <div className="text-sm mt-1" style={{ color: '#5C7659' }}>per month</div>
            </div>

            {/* Action Button */}
            <button 
              className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#344E41' }}
            >
              Start Monthly
            </button>
          </div>

          {/* Annual Plan */}
          <div 
            className="relative bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col min-h-[200px]"
            style={{ borderColor: '#D4D7CD' }}
            onClick={() => handleSelectPlan({ name: 'Annual', price: 89.99, interval: 'year' })}
          >
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
                Popular
              </div>
            </div>

            {/* Plan Title */}
            <div className="text-center mb-3 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold" style={{ color: '#344E41' }}>Annual</h3>
              <div className="text-3xl font-bold mt-2" style={{ color: '#344E41' }}>$89.99</div>
              <div className="text-sm mt-1" style={{ color: '#5C7659' }}>per year</div>
              
              {/* Subtitle Badge */}
              <div className="text-center mt-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                  Save $17.89
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#3A5A40' }}
            >
              Start Annual
            </button>
          </div>

          {/* Lifetime Plan */}
          <div 
            className="relative bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col min-h-[200px]"
            style={{ borderColor: '#D4D7CD' }}
            onClick={() => handleSelectPlan({ name: 'Lifetime', price: 249.99, interval: 'lifetime' })}
          >
            {/* Limited Time Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#344E41' }}>
                Limited Time Only
              </div>
            </div>

            {/* Plan Title */}
            <div className="text-center mb-3 flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold" style={{ color: '#344E41' }}>Lifetime</h3>
              <div className="text-3xl font-bold mt-2" style={{ color: '#344E41' }}>$249.99</div>
              <div className="text-sm mt-1" style={{ color: '#5C7659' }}>one-time payment</div>
              
              {/* Subtitle Badge */}
              <div className="text-center mt-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                  Never pay again
                </span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              className="w-full py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#344E41' }}
            >
              Never pay again
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}