import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import { useFounderOffer } from '../../context/FounderOfferContext';
import { formatCurrency } from '../../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../../utils/subscriptionPlans';
import { isAndroid, isIOS } from '../../utils/platform';
import { getAndroidSubscriptionMessage, getNativeSubscriptionMessage } from '../../utils/paymentCompliance';

/**
 * Modal displayed when user tries to perform an action in read-only mode
 * Prompts them to upgrade their subscription
 */
export default function UpgradeModal({ isOpen, onClose, actionAttempted = 'perform this action', theme }) {
  const navigate = useNavigate();
  const founderOffer = useFounderOffer();

  const discount = founderOffer.founderActive ? founderOffer.discountPercent : 0;
  const monthlyPlan = getPlanPricing('monthly', discount) || { price: 0, founderPrice: 0, savings: 0 };
  const annualPlan = getPlanPricing('annual', discount) || { price: 0, founderPrice: 0, savings: 0 };
  const lifetimePlan = getPlanPricing('lifetime', discount) || { price: 0, founderPrice: 0, savings: 0 };

  const discountActive = discount > 0;
  const monthlyBase = formatCurrency(monthlyPlan.price);
  const monthlyFounder = formatCurrency(monthlyPlan.founderPrice);
  const monthlySavings = formatCurrency(Math.max(monthlyPlan.savings, 0));

  const annualBase = formatCurrency(annualPlan.price);
  const annualFounder = formatCurrency(annualPlan.founderPrice);
  const annualSavings = formatCurrency(Math.max(annualPlan.savings, 0));

  const lifetimeBase = formatCurrency(lifetimePlan.price);
  const lifetimeFounder = formatCurrency(lifetimePlan.founderPrice);
  const lifetimeSavings = formatCurrency(Math.max(lifetimePlan.savings, 0));

  const founderBadgeLabel = founderOffer.isFounder
    ? 'Founder pricing locked'
    : founderOffer.founderActive
      ? `Founder ${discount}% off`
      : 'Standard pricing';

  const handleUpgradeClick = () => {
    navigate('/account');
    onClose();
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
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme.isDark ? '#e5e7eb' : '#374151' }}
          >
            Maybe Later
          </button>
        </div>
      }
    >
      <div className="p-2">
        {/* Info about data access */}
        <div className="text-left rounded-lg p-3 mb-4 border" style={{ backgroundColor: theme.isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff', borderColor: theme.isDark ? 'rgba(59,130,246,0.2)' : '#bfdbfe' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#1E40AF' }}>
            You can still:
          </p>
          <p className="text-xs" style={{ color: '#3B82F6' }}>
            • View all your data<br/>
            • Delete items from your account<br/>
            • Export your information
          </p>
        </div>

        <div className="rounded-lg p-4 text-center shadow-sm" style={{ background: 'linear-gradient(to right, #D4D7CD, #A3B18A)', border: '2px solid #A3B18A' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15 9L22 10L17 15L18.5 22L12 18.5L5.5 22L7 15L2 10L9 9L12 2Z"/>
              </svg>
            </div>
            <div className="text-lg font-semibold" style={{ color: '#344E41' }}>
              Founders Offer
            </div>
          </div>
          <div className="rounded-lg p-3 space-y-2" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)' }}>
            <p className="text-xs leading-relaxed font-semibold" style={{ color: '#3A5A40' }}>
              Be apart of the first 100 founder researchers!
            </p>
            <p className="text-xs leading-relaxed italic" style={{ color: '#3A5A40' }}>
              You'll be grandfathered in at this price forever (unless your lifetime commited🙏🏻), even as we grow and increase in value, your costs will not.
            </p>
          </div>
        </div>


        {/* Plan Selection */}
        <div className="mt-6 space-y-4">
          {/* Native app compliance: Show text message instead of payment buttons on iOS/Android */}
          {(isAndroid() || isIOS()) ? (
            <div className="p-4 rounded-lg text-center text-sm" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6', color: theme.isDark ? '#9ca3af' : '#6b7280' }}>
              {getNativeSubscriptionMessage()}
            </div>
          ) : (
            <>
              {/* Monthly and Annual in 2-column layout */}
              <div className="grid grid-cols-2 gap-3">
                {/* Monthly Plan */}
                <div 
                  className="relative rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
                  style={{ borderColor: '#D4D7CD', backgroundColor: theme.isDark ? '#1f2937' : '#ffffff' }}
                  onClick={handleUpgradeClick}
                >
              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-semibold" style={{ color: '#344E41' }}>Monthly</h3>
                <div className="text-xl font-bold mt-1 flex items-center justify-center gap-2" style={{ color: '#344E41' }}>
                  {discountActive ? (
                    <>
                      <span className="line-through text-sm" style={{ color: '#5C7659' }}>{monthlyBase}</span>
                      <span>{monthlyFounder}</span>
                    </>
                  ) : (
                    monthlyBase
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per month</div>
                {discountActive && (
                  <div className="text-xs mt-2 font-medium" style={{ color: '#3A5A40' }}>
                    Save {monthlySavings} / mo
                  </div>
                )}
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
              className="relative rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
              style={{ borderColor: '#D4D7CD', backgroundColor: theme.isDark ? '#1f2937' : '#ffffff' }}
              onClick={handleUpgradeClick}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
                  Popular
                </div>
              </div>

              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-semibold" style={{ color: '#344E41' }}>Annual</h3>
                <div className="text-xl font-bold mt-1 flex items-center justify-center gap-2" style={{ color: '#344E41' }}>
                  {discountActive ? (
                    <>
                      <span className="line-through text-sm" style={{ color: '#5C7659' }}>{annualBase}</span>
                      <span>{annualFounder}</span>
                    </>
                  ) : (
                    annualBase
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per year</div>
                <div className="text-center mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                    {discountActive ? `Save ${annualSavings} / yr` : 'Save $17.89'}
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
            className="relative rounded-lg border-2 p-5 cursor-pointer hover:shadow-lg transition-all duration-200"
            style={{ borderColor: '#D4D7CD', backgroundColor: theme.isDark ? '#1f2937' : '#ffffff' }}
            onClick={handleUpgradeClick}
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
                  <div className="font-semibold text-base" style={{ color: '#344E41' }}>Lifetime Access</div>
                  <div className="text-sm flex items-center gap-2" style={{ color: '#5C7659' }}>
                    {discountActive ? (
                      <>
                        <span className="line-through text-xs" style={{ color: '#A3B18A' }}>{lifetimeBase}</span>
                        <span>{lifetimeFounder}</span>
                      </>
                    ) : (
                      lifetimeBase
                    )}
                    <span>• Never pay again</span>
                  </div>
                  {discountActive && (
                    <div className="text-xs font-medium" style={{ color: '#3A5A40' }}>
                      Save {lifetimeSavings} one-time
                    </div>
                  )}
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
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

