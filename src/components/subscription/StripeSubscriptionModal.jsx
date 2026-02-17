/**
 * Stripe Subscription Modal
 * Custom subscription UI for Web/PWA platform using Stripe
 * This is the existing SubscriptionModal logic, now platform-specific
 */

import React from 'react';
import Modal from '../common/Modal';
import { subscribe } from '../../services/payment/paymentService';
import { useAppContext } from '../../context/AppContext';
import { useFounderOffer } from '../../context/FounderOfferContext';
import { formatCurrency } from '../../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../../utils/subscriptionPlans';
import { Crown, FlaskConical, BookOpen, Gift } from '../../icons/lucide-safe';
import GiftPurchaseModal from '../common/GiftPurchaseModal';

export default function StripeSubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();
  const founderOffer = useFounderOffer();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  const [showGiftModal, setShowGiftModal] = React.useState(false);

  const effectiveDiscount = founderOffer.founderActive ? founderOffer.discountPercent : 0;
  const monthlyPlan = getPlanPricing('monthly', effectiveDiscount) || { price: 0, founderPrice: 0, savings: 0 };
  const annualPlan = getPlanPricing('annual', effectiveDiscount) || { price: 0, founderPrice: 0, savings: 0 };
  const lifetimePlan = getPlanPricing('lifetime', effectiveDiscount) || { price: 0, founderPrice: 0, savings: 0 };

  const monthlyBase = formatCurrency(monthlyPlan.price);
  const annualBase = formatCurrency(annualPlan.price);
  const lifetimeBase = formatCurrency(lifetimePlan.price);

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(127, 158, 149, ${alpha})`; // fallback sage
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleSelectPlan = async (planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
      console.warn('Unknown plan selected:', planKey);
      return;
    }

    console.log('🚀 StripeSubscriptionModal: Selected plan:', plan);
    setSelectedPlan(planKey);
    setIsProcessing(true);
    
    // Brief delay to show visual feedback before redirect
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      // Close modal before redirecting to Stripe checkout
      onClose();
      
      // Use payment service router (will route to Stripe for web)
      await subscribe(planKey, {
        userEmail: user?.email || 'demo@example.com',
        userId: user?.uid || 'demo_user',
        plan: plan,
        founderOffer: founderOffer
      });
      
      // Reset processing state
      setIsProcessing(false);
      
    } catch (error) {
      console.error('❌ StripeSubscriptionModal: Subscription error:', error);
      
      // Reset processing state on error
      setIsProcessing(false);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
      }));
    }
  };

  return (
    <>
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
              className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme.isDark ? '#e5e7eb' : '#374151' }}
            >
              Maybe Later
            </button>
          </div>
        }
      >
        <div className="p-2">
          <div className="space-y-4">
            {/* Beta Pricing Banner */}
            <div className="rounded-lg p-4 text-center shadow-sm" style={{ background: 'linear-gradient(to right, #DBEAFE, #93C5FD)', border: '2px solid #3B82F6' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <FlaskConical size={22} style={{ color: '#1E40AF' }} />
                <div className="text-lg font-semibold" style={{ color: '#1E40AF' }}>
                  Beta Pricing
                </div>
              </div>
              
              <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'rgba(219, 234, 254, 0.8)' }}>
                <p className="text-xs leading-relaxed font-semibold" style={{ color: '#1E40AF' }}>
                  Building with you, not for you
                </p>
                <p className="text-xs leading-relaxed italic" style={{ color: '#1E40AF' }}>
                  You'll be grandfathered in at this price forever (unless your lifetime commited🙏🏻), even as we grow and increase in value, your costs will not.
                </p>
              </div>
            </div>
            
            {/* Monthly and Annual in 2-column layout */}
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly Plan */}
              <div 
                className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
                style={{ 
                  borderColor: selectedPlan === 'monthly' ? theme.primary : theme.border, 
                  backgroundColor: selectedPlan === 'monthly' ? hexToRgba(theme.primary, 0.1) : theme.cardBackground,
                  boxShadow: selectedPlan === 'monthly' ? `0 0 0 3px ${hexToRgba(theme.primary, 0.2)}` : 'none'
                }}
                onClick={() => !isProcessing && handleSelectPlan('monthly')}
              >
                <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                  <h3 className="text-base font-semibold" style={{ color: theme.text }}>Monthly</h3>
                  <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>
                    {monthlyBase}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>per month</div>
                </div>

                <button 
                  className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  disabled={isProcessing}
                >
                  {selectedPlan === 'monthly' ? '● Processing…' : SUBSCRIPTION_PLANS.monthly.cta}
                </button>
              </div>

              {/* Annual Plan */}
              <div 
                className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
                style={{ 
                  borderColor: selectedPlan === 'annual' ? theme.primary : theme.border, 
                  backgroundColor: selectedPlan === 'annual' ? hexToRgba(theme.primary, 0.15) : theme.cardBackground,
                  boxShadow: selectedPlan === 'annual' ? `0 0 0 3px ${hexToRgba(theme.primary, 0.3)}` : 'none'
                }}
                onClick={() => !isProcessing && handleSelectPlan('annual')}
              >
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: theme.primaryDark }}>
                    {founderOffer.isFounder ? 'Founder Locked' : 'Most Popular'}
                  </div>
                </div>

                <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                  <h3 className="text-base font-semibold" style={{ color: theme.text }}>Annual</h3>
                  <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>
                    {annualBase}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>per year</div>
                  
                  <div className="text-center mt-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1" style={{ backgroundColor: theme.isDark ? 'rgba(59,130,246,0.15)' : '#DBEAFE', color: '#1E40AF' }}>
                      <BookOpen size={12} /> Same price as our planner!
                    </span>
                  </div>
                </div>

                <button 
                  className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.primaryDark, color: theme.textOnPrimary }}
                  disabled={isProcessing}
                >
                  {selectedPlan === 'annual' ? '● Processing…' : SUBSCRIPTION_PLANS.annual.cta}
                </button>
              </div>
            </div>
            
            {/* Lifetime plan */}
            <div 
              className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
              style={{ 
                borderColor: selectedPlan === 'lifetime' ? theme.primary : theme.border, 
                backgroundColor: selectedPlan === 'lifetime' ? hexToRgba(theme.primary, 0.1) : theme.cardBackground,
                boxShadow: selectedPlan === 'lifetime' ? `0 0 0 3px ${hexToRgba(theme.primary, 0.2)}` : 'none'
              }}
              onClick={() => !isProcessing && handleSelectPlan('lifetime')}
            >
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  Limited Offer
                </div>
              </div>
              
              <div className="flex items-center justify-between min-h-[80px]">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
                    <Crown size={20} style={{ color: theme.textOnPrimary }} />
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg" style={{ color: theme.text }}>Lifetime Access</div>
                    <div className="text-base font-semibold" style={{ color: theme.text }}>
                      {lifetimeBase}
                    </div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Never pay again • Every research tool included</div>
                  </div>
                </div>
                <button 
                  className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  disabled={isProcessing}
                >
                  {selectedPlan === 'lifetime' ? '● Processing…' : SUBSCRIPTION_PLANS.lifetime.cta}
                </button>
              </div>
            </div>
          </div>
          
          {/* Gift Access Button */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>Want to share The Pep Planner with someone?</p>
              <button
                onClick={() => setShowGiftModal(true)}
                className="px-6 py-3 rounded-xl font-medium transition-all shadow-lg text-white hover:opacity-90"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                }}
              >
                <span className="inline-flex items-center gap-1.5"><Gift size={16} /> Give as a Gift</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
      
      <GiftPurchaseModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        theme={theme}
      />
    </>
  );
}

