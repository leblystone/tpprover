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
          console.log('🔄 Signup in progress - skipping subscription check');
          setIsLoading(true);
          return;
        }

        // Use subscription from cloud storage (via AppContext), with localStorage fallback
        let effectiveSubscription = subscription;
        
        // CRITICAL: If no cloud subscription, fall back to localStorage (offline support)
        if (!effectiveSubscription) {
          console.log('🔍 [TRIAL DEBUG] No subscription from AppContext, checking localStorage fallback');
          try {
            const localSub = localStorage.getItem('tpprover_subscription');
            console.log('🔍 [TRIAL DEBUG] localStorage subscription raw:', localSub);
            if (localSub) {
              effectiveSubscription = JSON.parse(localSub);
              console.log('📦 [TRIAL DEBUG] Using localStorage subscription fallback:', effectiveSubscription);
            } else {
              console.log('⚠️ [TRIAL DEBUG] No subscription found in localStorage either');
            }
          } catch (e) {
            console.error('❌ [TRIAL DEBUG] Failed to parse localStorage subscription:', e);
          }
        } else {
          console.log('✅ [TRIAL DEBUG] Using subscription from AppContext (cloud)');
        }
        
        // If still loading (no subscription yet), don't mark as expired
        if (!effectiveSubscription && isLoading) {
          console.log('⏳ [TRIAL DEBUG] Still loading subscription data - not marking as expired yet');
          return;
        }
        
        // Mark loading as complete once we've checked
        setIsLoading(false);
        
        if (!effectiveSubscription) {
          console.log('❌ [TRIAL DEBUG] No subscription found after loading - marking as expired');
          console.log('🚨 [TRIAL DEBUG] This will show trial expired screen!');
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

        console.log('✅ [TRIAL DEBUG] Found effective subscription:', {
          id: effectiveSubscription.id,
          status: effectiveSubscription.status,
          interval: effectiveSubscription.interval,
          startedAt: effectiveSubscription.startedAt,
          currentPeriodEnd: effectiveSubscription.currentPeriodEnd
        });
        
        const now = new Date();
        const endDate = new Date(effectiveSubscription.currentPeriodEnd);
        const timeLeft = endDate - now;
        // Use Math.floor() so 7-day trial shows as 7 days initially, not 8
        const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        
        console.log('🔍 [TRIAL DEBUG] Time calculations:', {
          now: now.toISOString(),
          endDate: endDate.toISOString(),
          timeLeft: timeLeft,
          daysLeft: daysLeft
        });

        // Active paid subscription (monthly, annual, lifetime)
        if (effectiveSubscription.status === 'active' && effectiveSubscription.interval !== 'trial') {
          console.log('✅ [TRIAL DEBUG] Active paid subscription detected');
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: effectiveSubscription.interval === 'lifetime' ? Infinity : daysLeft,
            subscriptionStatus: 'active',
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // Lifetime subscription
        if (effectiveSubscription.interval === 'lifetime') {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: Infinity,
            subscriptionStatus: 'active',
            subscriptionInterval: 'lifetime',
          });
          return;
        }

        // Active trial
        if (effectiveSubscription.status === 'trialing' && daysLeft > 0) {
          console.log('🔥 [TRIAL DEBUG] Active trial detected:', {
            daysLeft,
            showUpgradePrompt: daysLeft <= 2,
            status: 'trialing'
          });
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: daysLeft <= 2, // Show prompt in last 2 days
            daysRemaining: daysLeft,
            subscriptionStatus: 'trialing',
            subscriptionInterval: 'trial',
          });
          return;
        }

        // Trial expired or canceled subscription
        console.log('⛔ [TRIAL DEBUG] Trial expired or canceled subscription:', {
          status: effectiveSubscription.status,
          daysLeft,
          currentPeriodEnd: effectiveSubscription.currentPeriodEnd
        });
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

