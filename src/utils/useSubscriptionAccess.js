import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Hook to check subscription access and trial status
 * CLOUD-ONLY: Uses subscription from AppContext (loaded from cloud)
 * @returns {Object} Subscription access information
 */
export function useSubscriptionAccess() {
  const { subscription } = useAppContext();
  const [isLoading, setIsLoading] = useState(true); // Track if we're still loading subscription data
  const [accessInfo, setAccessInfo] = useState({
    hasAccess: true,
    isTrialExpired: false,
    isReadOnly: false,
    showUpgradePrompt: false,
    daysRemaining: null,
    subscriptionStatus: 'loading',
    subscriptionInterval: null,
  });

  useEffect(() => {
    const checkSubscriptionAccess = () => {
      try {
        // CRITICAL: Don't show trial expired during signup flow
        const signupInProgress = sessionStorage.getItem('tpp_signup_in_progress');
        if (signupInProgress === 'true') {
          if (import.meta.env.DEV) {
            console.log('🔄 Signup in progress - skipping subscription check');
          }
          setIsLoading(true);
          return;
        }

        // Use subscription from cloud storage (via AppContext), with localStorage fallback
        let effectiveSubscription = subscription;
        
        // CRITICAL: If no cloud subscription, fall back to localStorage (offline support)
        if (!effectiveSubscription) {
          try {
            const localSub = localStorage.getItem('tpprover_subscription');
            if (localSub) {
              effectiveSubscription = JSON.parse(localSub);
              if (import.meta.env.DEV) {
                console.log('📦 Using localStorage subscription fallback:', effectiveSubscription);
              }
            }
          } catch (e) {
            console.error('Failed to parse localStorage subscription:', e);
          }
        }
        
        // If still loading (no subscription yet), don't mark as expired
        if (!effectiveSubscription && isLoading) {
          // Only log in development mode to reduce console spam
          if (import.meta.env.DEV) {
            console.log('⏳ Still loading subscription data - not marking as expired yet');
          }
          return;
        }
        
        // Mark loading as complete once we've checked
        setIsLoading(false);
        
        if (!effectiveSubscription) {
          if (import.meta.env.DEV) {
            console.log('❌ No subscription found after loading - marking as expired');
          }
          setAccessInfo({
            hasAccess: false,
            isTrialExpired: true,
            isReadOnly: true,
            showUpgradePrompt: true,
            daysRemaining: 0,
            subscriptionStatus: 'expired',
            subscriptionInterval: null,
          });
          return;
        }

        // Mark loading as complete - we have subscription data
        setIsLoading(false);

        const now = new Date();
        const endDate = new Date(effectiveSubscription.currentPeriodEnd);
        const timeLeft = endDate.getTime() - now.getTime();
        // Display-friendly days remaining: ceil so the last partial day counts as 1
        // This avoids prematurely marking trials as expired while hours remain
        const daysLeftDisplay = Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24)));

        // Active paid subscription (monthly, annual, lifetime)
        if (effectiveSubscription.status === 'active' && effectiveSubscription.interval !== 'trial') {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: effectiveSubscription.interval === 'lifetime' ? Infinity : daysLeftDisplay,
            subscriptionStatus: 'active',
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // Lifetime subscription
        if (effectiveSubscription.interval === 'lifetime') {
          // Check if this is a granted lifetime access (not purchased)
          const isLifetimeGranted = effectiveSubscription.lifetimeReason && 
            !effectiveSubscription.paymentMethodId && 
            !effectiveSubscription.stripeSubscriptionId;
          
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: Infinity,
            subscriptionStatus: 'active',
            subscriptionInterval: 'lifetime',
            isLifetimeGranted: isLifetimeGranted,
            lifetimeReason: effectiveSubscription.lifetimeReason || 'Purchased'
          });
          return;
        }

        // Active trial
        // Consider trial active as long as actual timeLeft > 0
        if (effectiveSubscription.status === 'trialing' && timeLeft > 0) {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: daysLeftDisplay <= 2, // Show prompt in last 2 days
            daysRemaining: daysLeftDisplay,
            subscriptionStatus: 'trialing',
            subscriptionInterval: 'trial',
          });
          return;
        }

        // Trial expired or canceled subscription
        setAccessInfo({
          hasAccess: false,
          isTrialExpired: true,
          isReadOnly: true,
          showUpgradePrompt: true,
          daysRemaining: 0,
          subscriptionStatus: effectiveSubscription.status === 'canceled' ? 'canceled' : 'expired',
          subscriptionInterval: effectiveSubscription.interval,
        });

      } catch (error) {
        console.error('Error checking subscription access:', error);
        // Default to read-only on error
        setAccessInfo({
          hasAccess: false,
          isTrialExpired: true,
          isReadOnly: true,
          showUpgradePrompt: true,
          daysRemaining: 0,
          subscriptionStatus: 'error',
          subscriptionInterval: null,
        });
      }
    };

    // Check on mount, but give cloud data time to load first
    const initialTimeout = setTimeout(() => {
      setIsLoading(false); // After 2 seconds, stop loading state
    }, 2000);

    checkSubscriptionAccess();

    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      checkSubscriptionAccess();
    };

    window.addEventListener('subscription:updated', handleSubscriptionUpdate);

    // Check every minute for trial expiration
    const interval = setInterval(checkSubscriptionAccess, 60000);

    return () => {
      clearTimeout(initialTimeout);
      window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
      clearInterval(interval);
    };
  }, [subscription]); // Re-check when subscription changes from cloud

  return { ...accessInfo, isLoading };
}

