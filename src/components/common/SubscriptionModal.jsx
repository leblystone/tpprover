import React from 'react';
import Modal from './Modal';
import { createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';
import { useAppContext } from '../../context/AppContext';
import { useFounderOffer } from '../../context/FounderOfferContext';
import { formatCurrency } from '../../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../../utils/subscriptionPlans';
import { Crown } from '../../icons/lucide-safe';
import GiftPurchaseModal from './GiftPurchaseModal';

export default function SubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();
  const founderOffer = useFounderOffer();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showGiftModal, setShowGiftModal] = React.useState(false);

  const effectiveDiscount = founderOffer.founderActive ? founderOffer.discountPercent : 0;
  const monthlyPlan = getPlanPricing('monthly', effectiveDiscount) || { price: 0, founderPrice: 0, savings: 0 };
  const annualPlan = getPlanPricing('annual', effectiveDiscount) || { price: 0, founderPrice: 0, savings: 0 };
  const lifetimePlan = getPlanPricing('lifetime', effectiveDiscount) || { price: 0, founderPrice: 0, savings: 0 };

  const founderStatusMessage = React.useMemo(() => {
    if (founderOffer.loading) {
      return 'Checking Founder spot availability…';
    }
    if (founderOffer.isFounder) {
      return `You're locked in${founderOffer.founderNumber ? ` as Founder #${founderOffer.founderNumber}` : ''}. Your research rate never increases.`;
    }
    if (founderOffer.founderActive && (founderOffer.remaining ?? 0) > 0) {
      const spots = Math.max(0, founderOffer.remaining);
      return `${spots} Founder spot${spots === 1 ? '' : 's'} left • ${founderOffer.discountPercent}% off forever.`;
    }
    return 'Founder pricing is currently closed. Standard research pricing applies.';
  }, [founderOffer]);

  const founderBadgeLabel = founderOffer.isFounder
    ? 'Founder pricing locked'
    : founderOffer.founderActive
      ? `Founder ${effectiveDiscount}% off`
      : 'Standard pricing';

  const monthlyBase = formatCurrency(monthlyPlan.price);
  const monthlyFounder = formatCurrency(monthlyPlan.founderPrice);
  const monthlySavings = formatCurrency(Math.max(monthlyPlan.savings, 0));

  const annualBase = formatCurrency(annualPlan.price);
  const annualFounder = formatCurrency(annualPlan.founderPrice);
  const annualSavings = formatCurrency(Math.max(annualPlan.savings, 0));

  const lifetimeBase = formatCurrency(lifetimePlan.price);
  const lifetimeFounder = formatCurrency(lifetimePlan.founderPrice);
  const lifetimeSavings = formatCurrency(Math.max(lifetimePlan.savings, 0));

  const handleSelectPlan = async (planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
      console.warn('Unknown plan selected:', planKey);
      return;
    }

    console.log('🚀 SubscriptionModal: Selected plan:', plan);
    setIsProcessing(true);
    
    try {
      let priceId = STRIPE_CONFIG.prices[plan.key] || '';

      if (plan.key === 'lifetime' && founderOffer.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
        priceId = STRIPE_CONFIG.founder.lifetimePrice;
      }

      if (!priceId) {
        throw new Error(`Stripe price ID missing for plan ${plan.key}`);
      }

      // Close modal and redirect to Stripe checkout immediately - return to dashboard
      onClose();
      await createCheckoutSession(
        priceId,
        user?.email || 'demo@example.com',
        user?.uid || 'demo_user',
        null,
        false,
        { planName: plan.label }
      );
      
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
            className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
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
              <div className="text-2xl">🧪</div>
              <div className="text-lg font-bold" style={{ color: '#1E40AF' }}>
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
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              onClick={() => !isProcessing && handleSelectPlan('monthly')}
            >
              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: theme.text }}>Monthly</h3>
                <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>
                  {monthlyBase}
                </div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>per month</div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing…' : SUBSCRIPTION_PLANS.monthly.cta}
              </button>
            </div>

            {/* Annual Plan */}
            <div 
              className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              onClick={() => !isProcessing && handleSelectPlan('annual')}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: theme.primaryDark }}>
                  {founderOffer.isFounder ? 'Founder Locked' : 'Most Popular'}
                </div>
              </div>

              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: theme.text }}>Annual</h3>
                <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>
                  {annualBase}
                </div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>per year</div>
                
                <div className="text-center mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
                    📓 Same price as our planner!
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: theme.primaryDark, color: theme.textOnPrimary }}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing…' : SUBSCRIPTION_PLANS.annual.cta}
              </button>
            </div>
          </div>
          
          {/* Lifetime plan in expanded single column */}
          <div 
            className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
            onClick={() => !isProcessing && handleSelectPlan('lifetime')}
          >
            {/* Limited Time Badge */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                Limited Offer
              </div>
            </div>
            
            {/* Content with more vertical space */}
            <div className="flex items-center justify-between min-h-[80px]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
                  <Crown size={20} style={{ color: theme.textOnPrimary }} />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-lg" style={{ color: theme.text }}>Lifetime Access</div>
                  <div className="text-base font-semibold" style={{ color: theme.text }}>
                    {lifetimeBase}
                  </div>
                  <div className="text-sm" style={{ color: theme.textLight }}>Never pay again • All features included</div>
                </div>
              </div>
              <button 
                className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing…' : SUBSCRIPTION_PLANS.lifetime.cta}
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
              🎁 Give as a Gift
            </button>
            <div className="mt-3">
              <button
                onClick={() => window.location.assign('/gift-success?preview=1')}
                className="px-4 py-2 text-sm rounded-lg font-medium transition-all border"
                style={{ borderColor: theme.border, color: theme.textLight, backgroundColor: theme.cardBackground }}
              >
                Preview Success Modal
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
    
    {/* Gift Purchase Modal */}
    <GiftPurchaseModal
      isOpen={showGiftModal}
      onClose={() => setShowGiftModal(false)}
      theme={theme}
    />
  </>
  );
}