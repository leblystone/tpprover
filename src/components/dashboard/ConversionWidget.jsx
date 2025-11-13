import React, { useState, useEffect } from 'react';
import { Crown, X, Check, Clock } from 'lucide-react';
import { Zap } from '../../icons/lucide-safe';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';
import { useAppContext } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';

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
  const { firebaseUser } = useFirebase();
  const [selectedPlan, setSelectedPlan] = useState('annual'); // Default to annual (most chosen)
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [actualSubscription, setActualSubscription] = useState(null);
  const [checkoutTimeoutId, setCheckoutTimeoutId] = useState(null);

  // Load subscription data the same way as Account page
  useEffect(() => {
    const loadSubscription = async (firebaseUser) => { 
      try { 
        const { loadUserSubscription } = await import('../../services/cloudStorage');
        if (firebaseUser) {
          const cloudSub = await loadUserSubscription(firebaseUser.uid);
          if (cloudSub) {
            return cloudSub;
          }
        }
        
        // Fallback to localStorage for offline support
        try {
          const localSub = localStorage.getItem('tpprover_subscription');
          return localSub ? JSON.parse(localSub) : null;
        } catch {
          return null;
        }
      } catch (error) {
        console.error('❌ Error loading subscription:', error);
        return null;
      }
    };

    if (firebaseUser && !actualSubscription) {
      loadSubscription(firebaseUser).then(sub => {
        if (sub) {
          setActualSubscription(sub);
        }
      });
    }
  }, [firebaseUser, actualSubscription]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('tpprover_conversion_widget_dismissed', 'true');
    } catch {}
    if (onDismiss) onDismiss();
  };

  const handleSelectPlan = async (planType) => {
    console.log('🎯 ConversionWidget: Plan selected:', planType);
    setIsProcessing(true);
    
    // Set a timeout to reset processing state if something goes wrong
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ ConversionWidget: Checkout timeout, resetting processing state');
      setIsProcessing(false);
      setCheckoutTimeoutId(null);
    }, 10000); // 10 second timeout
    
    setCheckoutTimeoutId(timeoutId);
    
    try {
      // Map plan types to Stripe price IDs
      const priceIds = {
        monthly: STRIPE_CONFIG.prices.monthly,
        annual: STRIPE_CONFIG.prices.annual,
        lifetime: STRIPE_CONFIG.prices.lifetime
      };
      
      console.log('🎯 ConversionWidget: Price IDs:', priceIds);
      
      const priceId = priceIds[planType];
      
      if (!priceId) {
        console.warn('⚠️ ConversionWidget: No price ID found for plan:', planType);
        console.log('🎯 ConversionWidget: Falling back to demo mode for plan:', planType);
        
        // Show demo message but still attempt Stripe checkout with fallback
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: `🎭 Demo: ${planType.toUpperCase()} plan selected. Attempting Stripe checkout...`, type: 'info' } 
        }));
        
        // Still try to create checkout session even without price ID
        try {
          await createCheckoutSession('demo_price', user?.email || 'demo@example.com', user?.uid || 'demo_user');
        } catch (error) {
          console.error('❌ ConversionWidget: Demo checkout failed:', error);
          setIsProcessing(false);
        }
        return;
      }
      
      console.log('🎯 ConversionWidget: Creating checkout for price ID:', priceId);
      
      // Create Stripe checkout session - return to dashboard after cancel/success
      await createCheckoutSession(priceId, user?.email, user?.uid);
      
      // Reset processing state after successful checkout creation
      clearTimeout(timeoutId);
      setCheckoutTimeoutId(null);
      setIsProcessing(false);
    } catch (error) {
      // Always reset processing state on error
      clearTimeout(timeoutId);
      setCheckoutTimeoutId(null);
      setIsProcessing(false);
      
      // Check if this is a user navigation error (abandoned cart)
      const isUserNavigation = error?.message?.includes('Failed to redirect') || 
                               error?.message?.includes('redirect');
      
      if (isUserNavigation) {
        // User abandoned the cart - this is normal, don't log as error
        console.log('ℹ️ ConversionWidget: User returned from checkout (normal behavior)');
        return; // Silent return, no error needed
      }
      
      // Only log and show errors for actual problems
      console.error('❌ ConversionWidget: Error creating checkout:', error);
      
      // Only show toast if stripe service didn't already handle it
      // (stripe service shows toasts for auth errors, config errors, etc.)
      if (!error?.code && !error?.message?.includes('authenticated') && !error?.message?.includes('not configured')) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Checkout failed. Please try again.', type: 'error' } 
        }));
      }
    }
  };

  // Listen for app visibility changes to clear timeout when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && checkoutTimeoutId) {
        // User returned from checkout - clear timeout since they're back
        console.log('ℹ️ User returned to app, clearing checkout timeout');
        clearTimeout(checkoutTimeoutId);
        setCheckoutTimeoutId(null);
        setIsProcessing(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkoutTimeoutId]);

  // Real-time countdown timer
  useEffect(() => {
    // Use actualSubscription first, fallback to subscription prop
    const subData = actualSubscription || subscription;
    const endDateValue = subData?.currentPeriodEnd;
    
    if (!endDateValue) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(endDateValue);
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
  }, [actualSubscription?.currentPeriodEnd, subscription?.currentPeriodEnd, actualSubscription, subscription]);

  // Use actualSubscription first, fallback to subscription prop
  const subData = actualSubscription || subscription;
  
  // CRITICAL: Check for lifetime access - should hide widget completely
  const hasLifetimeAccess = subData?.hasLifetimeAccess || 
                            subData?.interval === 'lifetime' || 
                            subData?.plan === 'lifetime';
  const trialPlanNames = ['10-Day Research Trial', '7-Day Free Trial'];
  
  // Don't show if user has active PAID subscription (including lifetime)
  // Show for: trial users, expired trials, canceled subscriptions, or no subscription
  const isActivePaidSubscription = (subData?.status === 'active' && !trialPlanNames.includes(subData?.plan)) || hasLifetimeAccess;
  
  if (isActivePaidSubscription || isDismissed) {
    return null;
  }
  

  // Calculate trial days left
  const getTrialDaysLeft = () => {
    if (!subData?.currentPeriodEnd) return 0;
    const now = new Date();
    const end = new Date(subData.currentPeriodEnd);
    const diffTime = end - now;
    // Use Math.floor() so the trial shows an accurate whole-day countdown
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysLeft = getTrialDaysLeft();
  const isTrial = subData?.status === 'trialing';

  return (
    <div className="rounded p-3 content-card shadow-lg" style={{ border: theme.isDark ? '1px solid #374151' : '2px solid #5C7659', backgroundColor: theme.isDark ? '#111827' : '#f8f9fa' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown size={18} style={{ color: theme.isDark ? '#d97706' : theme.primary }} />
                <span className="font-semibold text-base" style={{ color: theme.isDark ? '#f9fafb' : theme.primaryDark }}>
                  10-Day Research Trial
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.isDark ? '#065f4630' : '#e6f7f0', color: theme.isDark ? '#10b981' : '#2d7d5a', border: theme.isDark ? '1px solid #10b981' : '1px solid #a8d5c1' }}>
                  Trialing
                </div>
                <button 
                  onClick={handleDismiss}
                  className="p-1 hover:opacity-70 transition-opacity action-button-hover"
                  style={{ color: theme.isDark ? '#9ca3af' : '#5C7659' }}
                >
                  <X size={16} className="icon-hover" />
                </button>
              </div>
            </div>
            
            {/* Real-time Countdown */}
            <div className="text-center mb-3 p-3 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : '#e6f7f0', border: theme.isDark ? '1px solid #4b5563' : '2px solid #a8d5c1' }}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock size={14} style={{ color: theme.isDark ? '#d1d5db' : '#344E41' }} />
                <span className="font-semibold text-xs" style={{ color: theme.isDark ? '#f9fafb' : '#344E41' }}>
                  Time Remaining
                </span>
              </div>
              
              {timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0 ? (
                <div className="flex justify-center gap-3 text-lg font-bold" style={{ color: theme.isDark ? '#d97706' : '#2d7d5a' }}>
                  {timeLeft.days > 0 && (
                    <div className="flex flex-col items-center">
                      <span>{timeLeft.days}</span>
                      <span className="text-xs font-normal" style={{ color: theme.isDark ? '#9ca3af' : '#6B7280' }}>days</span>
                    </div>
                  )}
                  <div className="flex flex-col items-center">
                    <span>{timeLeft.hours.toString().padStart(2, '0')}</span>
                    <span className="text-xs font-normal" style={{ color: theme.isDark ? '#9ca3af' : '#6B7280' }}>hrs</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>{timeLeft.minutes.toString().padStart(2, '0')}</span>
                    <span className="text-xs font-normal" style={{ color: theme.isDark ? '#9ca3af' : '#6B7280' }}>min</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>{timeLeft.seconds.toString().padStart(2, '0')}</span>
                    <span className="text-xs font-normal" style={{ color: theme.isDark ? '#9ca3af' : '#6B7280' }}>sec</span>
                  </div>
                </div>
              ) : (
                <div className="text-lg font-bold" style={{ color: theme.isDark ? '#d97706' : '#344E41' }}>
                  Trial Expired
                </div>
              )}
            </div>
            

            {/* Pricing Plans */}
            <div className="space-y-2 pt-2">
              <h4 className="font-semibold text-xs" style={{ color: theme.isDark ? '#f9fafb' : theme.primaryDark }}>Continue Your Research</h4>
              
              {/* All Plans in 3 Columns */}
              <div className="grid grid-cols-3 gap-2 relative">
                {/* Monthly Plan */}
                <button
                  onClick={() => !isProcessing && handleSelectPlan('monthly')}
                  disabled={isProcessing}
                  className="p-3 rounded-lg cursor-pointer plan-button-hover text-center disabled:opacity-50"
                  style={{ 
                    border: theme.isDark ? '1px solid #4b5563' : `2px solid ${theme.border}`,
                    backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground 
                  }}
                >
                  <div className="font-bold text-sm plan-text" style={{ color: theme.isDark ? '#f9fafb' : theme.primaryDark }}>MONTHLY</div>
                  <div className="text-xs mt-1 plan-text" style={{ color: theme.isDark ? '#9ca3af' : theme.textLight }}>Flexible</div>
                  <div className="text-xs font-semibold mt-2 plan-text" style={{ color: theme.isDark ? '#d97706' : theme.primary }}>
                    {isProcessing ? '...' : 'Select →'}
                  </div>
                </button>

                {/* Annual Plan */}
                <div className="relative">
                  <button
                    onClick={() => !isProcessing && handleSelectPlan('annual')}
                    disabled={isProcessing}
                    className="p-3 rounded-lg cursor-pointer plan-button-hover text-center disabled:opacity-50 w-full"
                    style={{ 
                      border: theme.isDark ? `2px solid #d97706` : `2px solid ${theme.primary}`,
                      backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground 
                    }}
                  >
                    <div className="pt-2">
                      <div className="font-bold text-sm plan-text" style={{ color: theme.isDark ? '#f9fafb' : theme.primaryDark }}>ANNUAL</div>
                      <div className="text-xs mt-1 plan-text" style={{ color: theme.isDark ? '#d97706' : theme.success }}>Best value</div>
                      <div className="text-xs font-semibold mt-2 plan-text" style={{ color: theme.isDark ? '#d97706' : theme.primary }}>
                        {isProcessing ? '...' : 'Select →'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Lifetime Plan */}
                <div className="relative">
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="px-3 py-0.5 rounded-full text-xs font-semibold shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)', fontSize: '10px' }}>
                      Limited
                    </div>
                  </div>
                  <button
                    onClick={() => !isProcessing && handleSelectPlan('lifetime')}
                    disabled={isProcessing}
                    className="p-3 rounded-lg cursor-pointer plan-button-hover text-center disabled:opacity-50 w-full"
                    style={{ 
                      border: theme.isDark ? '1px solid #4b5563' : `2px solid ${theme.border}`,
                      backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground 
                    }}
                  >
                    <div className="pt-2">
                      <div className="font-bold text-sm plan-text" style={{ color: theme.isDark ? '#f9fafb' : theme.primaryDark }}>LIFETIME</div>
                      <div className="text-xs mt-1 plan-text" style={{ color: theme.isDark ? '#9ca3af' : theme.textLight }}>One-time</div>
                      <div className="text-xs font-semibold mt-2 plan-text" style={{ color: theme.isDark ? '#d97706' : theme.primary }}>
                        {isProcessing ? '...' : 'Select →'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
    </div>
  );
}
