import { useState, useEffect } from 'react';

/**
 * Hook to check subscription access and trial status
 * @returns {Object} Subscription access information
 */
export function useSubscriptionAccess() {
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
        const subscriptionData = localStorage.getItem('tpprover_subscription');
        
        // No subscription = expired trial (after initial trial period)
        if (!subscriptionData) {
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

        const subscription = JSON.parse(subscriptionData);
        const now = new Date();
        const endDate = new Date(subscription.currentPeriodEnd);
        const timeLeft = endDate - now;
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

        // Active paid subscription (monthly, annual, lifetime)
        if (subscription.status === 'active' && subscription.interval !== 'trial') {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: subscription.interval === 'lifetime' ? Infinity : daysLeft,
            subscriptionStatus: 'active',
            subscriptionInterval: subscription.interval,
          });
          return;
        }

        // Lifetime subscription
        if (subscription.interval === 'lifetime') {
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
        if (subscription.status === 'trialing' && daysLeft > 0) {
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
          subscriptionStatus: subscription.status === 'canceled' ? 'canceled' : 'expired',
          subscriptionInterval: subscription.interval,
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
  }, []);

  return accessInfo;
}

