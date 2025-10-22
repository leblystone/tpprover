import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Hook to check subscription access and trial status
 * CLOUD-ONLY: Uses subscription from AppContext (loaded from cloud)
 * @returns {Object} Subscription access information
 */
export function useSubscriptionAccess() {
  const { subscription } = useAppContext();
  const [accessInfo, setAccessInfo] = useState({
    hasAccess: true,
    isTrialExpired: false,
    isReadOnly: false,
    showUpgradePrompt: false,
    daysRemaining: null,
    subscriptionStatus: 'active',
    subscriptionInterval: null,
  });

  useEffect(() => {
    const checkSubscriptionAccess = () => {
      try {
        // Use subscription from cloud storage (via AppContext), with localStorage fallback
        let effectiveSubscription = subscription;
        
        // CRITICAL: If no cloud subscription, fall back to localStorage (offline support)
        if (!effectiveSubscription) {
          try {
            const localSub = localStorage.getItem('tpprover_subscription');
            if (localSub) {
              effectiveSubscription = JSON.parse(localSub);
              console.log('📦 Using localStorage subscription fallback:', effectiveSubscription);
            }
          } catch (e) {
            console.error('Failed to parse localStorage subscription:', e);
          }
        }
        
        if (!effectiveSubscription) {
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

        const now = new Date();
        const endDate = new Date(effectiveSubscription.currentPeriodEnd);
        const timeLeft = endDate - now;
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

        // Active paid subscription (monthly, annual, lifetime)
        if (effectiveSubscription.status === 'active' && effectiveSubscription.interval !== 'trial') {
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

    // Check on mount
    checkSubscriptionAccess();

    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      checkSubscriptionAccess();
    };

    window.addEventListener('subscription:updated', handleSubscriptionUpdate);

    // Check every minute for trial expiration
    const interval = setInterval(checkSubscriptionAccess, 60000);

    return () => {
      window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
      clearInterval(interval);
    };
  }, [subscription]); // Re-check when subscription changes from cloud

  return accessInfo;
}

