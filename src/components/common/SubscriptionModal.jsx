import React from 'react';
import Modal from './Modal';
import { createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';
import { useAppContext } from '../../context/AppContext';
import { Crown } from '../../icons/lucide-safe';

export default function SubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleSelectPlan = async (plan) => {
    console.log('🚀 SubscriptionModal: Selected plan:', plan);
    setIsProcessing(true);
    
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

      // Close modal and redirect to Stripe checkout immediately
      onClose();
      await createCheckoutSession(priceId, user?.email || 'demo@example.com', user?.uid || 'demo_user');
      
      // Reset processing state
      setIsProcessing(false);
      
    } catch (error) {
      console.error('❌ SubscriptionModal: Stripe checkout error:', error);
      
      // Reset processing state on error
      setIsProcessing(false);
      
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
      variant="modern"
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
      <div className="p-2">
        <div className="space-y-4">
          {/* Monthly and Annual in 2-column layout */}
          <div className="grid grid-cols-2 gap-3">
            {/* Monthly Plan */}
            <div 
              className={`relative bg-white rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
              style={{ borderColor: '#D4D7CD' }}
              onClick={() => !isProcessing && handleSelectPlan({ name: 'Monthly', price: 8.99, interval: 'month' })}
            >
              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Monthly</h3>
                <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$8.99</div>
                <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per month</div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#344E41' }}
              >
                Start Monthly
              </button>
            </div>

            {/* Annual Plan */}
            <div 
              className={`relative bg-white rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
              style={{ borderColor: '#D4D7CD' }}
              onClick={() => !isProcessing && handleSelectPlan({ name: 'Annual', price: 89.99, interval: 'year' })}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
                  Popular
                </div>
              </div>

              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Annual</h3>
                <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$89.99</div>
                <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per year</div>
                
                {/* Subtitle Badge */}
                <div className="text-center mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                    Save $17.89
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#3A5A40' }}
              >
                Start Annual
              </button>
            </div>
          </div>
          
          {/* Lifetime plan in compact single column */}
          <div 
            className={`relative bg-white rounded-lg border-2 p-5 transition-all duration-200 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
            style={{ borderColor: '#D4D7CD' }}
            onClick={() => !isProcessing && handleSelectPlan({ name: 'Lifetime', price: 249.99, interval: 'lifetime' })}
          >
            {/* Limited Time Badge */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#344E41' }}>
                Limited Time Only
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344E41' }}>
                  <Crown size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-base" style={{ color: '#344E41' }}>Lifetime Access</div>
                  <div className="text-sm" style={{ color: '#5C7659' }}>$249.99 • Never pay again</div>
                </div>
              </div>
              <button 
                className="px-3 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: '#344E41' }}
              >
                Join Forever
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}