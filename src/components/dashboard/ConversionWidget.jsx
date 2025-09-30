import React, { useState, useEffect } from 'react';
import { Crown, X, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';
import { useAppContext } from '../../context/AppContext';

export default function ConversionWidget({ theme, subscription, onDismiss }) {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem('tpprover_conversion_widget_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [selectedPlan, setSelectedPlan] = useState('annual'); // Default to annual (most chosen)
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('tpprover_conversion_widget_dismissed', 'true');
    } catch {}
    if (onDismiss) onDismiss();
  };

  const handleSelectPlan = async (planType) => {
    setIsProcessing(true);
    
    try {
      // Map plan types to Stripe price IDs
      const priceIds = {
        monthly: STRIPE_CONFIG.prices.monthly,
        annual: STRIPE_CONFIG.prices.annual,
        lifetime: STRIPE_CONFIG.prices.lifetime
      };
      
      const priceId = priceIds[planType];
      
      if (!priceId) {
        throw new Error('Invalid plan type');
      }
      
      // Create Stripe checkout session
      await createCheckoutSession(priceId, user?.email, user?.uid);
    } catch (error) {
      console.error('Error creating checkout:', error);
      setIsProcessing(false);
    }
  };

  // Real-time countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!subscription?.currentPeriodEnd) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const now = new Date();
      const end = new Date(subscription.currentPeriodEnd);
      const diffTime = end.getTime() - now.getTime();

      if (diffTime <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [subscription?.currentPeriodEnd]);

  // Don't show if user has active PAID subscription
  // Show for: trial users, expired trials, canceled subscriptions, or no subscription
  const isActivePaidSubscription = subscription?.status === 'active' && subscription?.plan !== '7-Day Free Trial';
  
  console.log('🎯 ConversionWidget Debug:', {
    subscription,
    subscriptionStatus: subscription?.status,
    subscriptionPlan: subscription?.plan,
    isActivePaidSubscription,
    isDismissed,
    willShow: !isActivePaidSubscription && !isDismissed
  });
  
  if (isActivePaidSubscription || isDismissed) {
    console.log('❌ ConversionWidget: HIDING because', { isActivePaidSubscription, isDismissed });
    return null;
  }
  
  console.log('✅ ConversionWidget: SHOWING!');

  // Calculate trial days left
  const getTrialDaysLeft = () => {
    if (!subscription?.currentPeriodEnd) return 0;
    const now = new Date();
    const end = new Date(subscription.currentPeriodEnd);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysLeft = getTrialDaysLeft();
  const isTrial = subscription?.status === 'trialing';

  return (
    <div className="rounded border p-4 content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Crown size={20} style={{ color: theme.primary }} />
                <span className="font-semibold text-lg" style={{ color: theme.primaryDark }}>
                  7-Day Researcher Access
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Trialing
                </div>
                <button 
                  onClick={handleDismiss}
                  className="p-1 hover:opacity-70 transition-opacity"
                  style={{ color: '#5C7659' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Real-time Countdown */}
            <div className="text-center mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff', border: '2px solid #bae6fd' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock size={16} style={{ color: '#3b82f6' }} />
                <span className="font-semibold text-sm" style={{ color: '#344E41' }}>
                  Time Remaining
                </span>
              </div>
              
              {timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0 ? (
                <div className="flex justify-center gap-3 text-lg font-bold" style={{ color: '#1d4ed8' }}>
                  {timeLeft.days > 0 && (
                    <div className="flex flex-col items-center">
                      <span>{timeLeft.days}</span>
                      <span className="text-xs font-normal" style={{ color: '#6b7280' }}>days</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <span>{timeLeft.hours.toString().padStart(2, '0')}</span>
                    <span className="text-xs font-normal" style={{ color: '#6b7280' }}>hrs</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>{timeLeft.minutes.toString().padStart(2, '0')}</span>
                    <span className="text-xs font-normal" style={{ color: '#6b7280' }}>min</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>{timeLeft.seconds.toString().padStart(2, '0')}</span>
                    <span className="text-xs font-normal" style={{ color: '#6b7280' }}>sec</span>
                  </div>
                </div>
              ) : (
                <div className="text-lg font-bold" style={{ color: '#dc2626' }}>
                  Trial Expired
                </div>
              )}
            </div>
            

            {/* Pricing Plans */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm" style={{ color: theme.primaryDark }}>Continue Your Research</h4>
              
              {/* Annual Plan - Most Chosen (Full Width) */}
              <button
                onClick={() => !isProcessing && handleSelectPlan('annual')}
                disabled={isProcessing}
                className="w-full p-4 border-2 rounded-lg cursor-pointer hover:shadow-md transition-all text-left relative disabled:opacity-50"
                style={{ 
                  borderColor: theme.primary,
                  backgroundColor: theme.cardBackground 
                }}
              >
                <div className="absolute -top-2 right-2">
                  <div className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: theme.primary }}>
                    Most Chosen
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-base" style={{ color: theme.primaryDark }}>Annual</div>
                    <div className="text-sm" style={{ color: theme.success }}>Best value • Save 17%</div>
                  </div>
                  <div className="text-base font-semibold" style={{ color: theme.primary }}>
                    {isProcessing ? 'Processing...' : 'Select →'}
                  </div>
                </div>
              </button>

              {/* Monthly & Lifetime Plans (Two Columns) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Monthly Plan */}
                <button
                  onClick={() => !isProcessing && handleSelectPlan('monthly')}
                  disabled={isProcessing}
                  className="p-3 border-2 rounded-lg cursor-pointer hover:shadow-md transition-all text-left disabled:opacity-50"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground 
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="font-bold text-sm" style={{ color: theme.primaryDark }}>Monthly</div>
                    <div className="text-xs mt-1" style={{ color: theme.textLight }}>Flexible</div>
                    <div className="text-xs font-semibold mt-2" style={{ color: theme.primary }}>
                      {isProcessing ? '...' : 'Select →'}
                    </div>
                  </div>
                </button>

                {/* Lifetime Plan */}
                <button
                  onClick={() => !isProcessing && handleSelectPlan('lifetime')}
                  disabled={isProcessing}
                  className="p-3 border-2 rounded-lg cursor-pointer hover:shadow-md transition-all text-left relative disabled:opacity-50"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground 
                  }}
                >
                  <div className="absolute -top-1 -right-1">
                    <div className="px-1.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: theme.primaryDark }}>
                      Limited
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="font-bold text-sm" style={{ color: theme.primaryDark }}>Lifetime</div>
                    <div className="text-xs mt-1" style={{ color: theme.textLight }}>One-time</div>
                    <div className="text-xs font-semibold mt-2" style={{ color: theme.primary }}>
                      {isProcessing ? '...' : 'Select →'}
                    </div>
                  </div>
                </button>
              </div>
            </div>
    </div>
  );
}
