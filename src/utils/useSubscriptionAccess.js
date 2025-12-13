import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';

/**
 * Hook to check subscription access and trial status
 * CLOUD-ONLY: Uses subscription from AppContext (loaded from cloud)
 * @returns {Object} Subscription access information
 */
export function useSubscriptionAccess() {
  const { subscription } = useAppContext();
  const { firebaseUser } = useFirebase();
  const [isLoading, setIsLoading] = useState(true); // Track if we're still loading subscription data
  const [hasCheckedLifetime, setHasCheckedLifetime] = useState(false); // Track if we've checked lifetime access
  const [accessInfo, setAccessInfo] = useState({
    hasAccess: true,
    isTrialExpired: false,
    isReadOnly: false,
    showUpgradePrompt: false,
    daysRemaining: null,
    subscriptionStatus: 'loading',
    subscriptionInterval: null,
  });

  // Check subscription directly from Firestore if subscription hasn't loaded yet
  // This prevents showing expired chip for ANY subscription type while loading
  useEffect(() => {
    const checkSubscriptionDirectly = async () => {
      // Only check if we don't have subscription yet and haven't checked
      if (subscription || !firebaseUser || hasCheckedLifetime) {
        return;
      }

      try {
        // Import loadUserSubscription which checks all sources including lifetimeAccess
        const { loadUserSubscription } = await import('../services/cloudStorage');
        const directSubscription = await loadUserSubscription(firebaseUser.uid);
        
        if (directSubscription) {
          console.log('✅ Found subscription via direct check:', directSubscription.interval || directSubscription.plan);
          setHasCheckedLifetime(true);
          
          // Set access info directly to prevent showing expired chip
          const hasLifetime = directSubscription.hasLifetimeAccess || 
                            directSubscription.interval === 'lifetime' || 
                            directSubscription.plan === 'lifetime';
          
          if (hasLifetime) {
            setAccessInfo({
              hasAccess: true,
              isTrialExpired: false,
              isReadOnly: false,
              showUpgradePrompt: false,
              daysRemaining: Infinity,
              subscriptionStatus: 'active',
              subscriptionInterval: 'lifetime',
              isLifetimeGranted: !!directSubscription.lifetimeReason,
              lifetimeReason: directSubscription.lifetimeReason || 'Admin grant'
            });
          } else if (directSubscription.status === 'active') {
            // Active paid subscription (monthly/annual)
            const now = new Date();
            const endDate = directSubscription.currentPeriodEnd ? new Date(directSubscription.currentPeriodEnd) : null;
            const timeLeft = endDate ? (endDate.getTime() - now.getTime()) : 0;
            const daysLeftDisplay = endDate ? Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24))) : 0;
            
            setAccessInfo({
              hasAccess: true,
              isTrialExpired: false,
              isReadOnly: false,
              showUpgradePrompt: false,
              daysRemaining: daysLeftDisplay,
              subscriptionStatus: 'active',
              subscriptionInterval: directSubscription.interval,
            });
          } else if (directSubscription.status === 'trialing') {
            // Active trial
            const now = new Date();
            const endDate = directSubscription.currentPeriodEnd ? new Date(directSubscription.currentPeriodEnd) : null;
            const timeLeft = endDate ? (endDate.getTime() - now.getTime()) : 0;
            const daysLeftDisplay = endDate ? Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24))) : 0;
            
            if (timeLeft > 0) {
              setAccessInfo({
                hasAccess: true,
                isTrialExpired: false,
                isReadOnly: false,
                showUpgradePrompt: daysLeftDisplay <= 2,
                daysRemaining: daysLeftDisplay,
                subscriptionStatus: 'trialing',
                subscriptionInterval: 'trial',
              });
            }
          }
          
          setIsLoading(false);
        } else {
          setHasCheckedLifetime(true);
        }
      } catch (error) {
        console.warn('⚠️ Error checking subscription directly:', error);
        setHasCheckedLifetime(true);
      }
    };

    checkSubscriptionDirectly();
  }, [subscription, firebaseUser, hasCheckedLifetime]);

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
        
        // CRITICAL: If still loading (no subscription yet), don't mark as expired
        // This prevents showing expired chip for ANY subscription type while loading
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
          // CRITICAL: Don't mark as expired if we already found any active subscription
          // This prevents overriding subscription status while subscription is still loading
          if (accessInfo.hasAccess && accessInfo.subscriptionStatus !== 'expired' && accessInfo.subscriptionStatus !== 'error') {
            if (import.meta.env.DEV) {
              console.log('⏳ Subscription not loaded yet, but access already confirmed - keeping access');
            }
            return;
          }
          
          // Only mark as expired if we've confirmed there's no subscription
          // AND we've already checked (hasCheckedLifetime means we've done a direct check)
          if (!hasCheckedLifetime) {
            // Still waiting for direct check to complete
            if (import.meta.env.DEV) {
              console.log('⏳ Waiting for direct subscription check to complete');
            }
            return;
          }
          
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

        // CRITICAL FIX: Check for lifetime access FIRST, before any trial checks
        // This prevents lifetime users from being locked out even if they have trial status
        // Also check lifetimeAccess collection directly if subscription doesn't have lifetime flags
        let hasLifetimeAccess = effectiveSubscription.hasLifetimeAccess || 
                                  effectiveSubscription.interval === 'lifetime' || 
                                  effectiveSubscription.plan === 'lifetime';
        
        // If subscription doesn't show lifetime but user might have it, check directly
        if (!hasLifetimeAccess && firebaseUser) {
          try {
            const { checkLifetimeAccessFirestore } = await import('../services/firebase');
            const lifetimeCheck = await checkLifetimeAccessFirestore(firebaseUser.uid);
            if (lifetimeCheck?.hasAccess) {
              console.log('✅ Found lifetime access via direct check:', lifetimeCheck);
              hasLifetimeAccess = true;
              // Update effectiveSubscription with lifetime data
              effectiveSubscription = {
                ...effectiveSubscription,
                hasLifetimeAccess: true,
                interval: 'lifetime',
                plan: 'lifetime',
                status: 'active',
                lifetimeReason: lifetimeCheck.reason || 'Admin grant',
                currentPeriodEnd: null
              };
            }
          } catch (lifetimeError) {
            console.warn('⚠️ Error checking lifetime access directly:', lifetimeError);
          }
        }
        
        if (hasLifetimeAccess) {
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

        const now = new Date();
        // Handle null/undefined currentPeriodEnd for subscriptions without end dates
        const endDate = effectiveSubscription.currentPeriodEnd ? new Date(effectiveSubscription.currentPeriodEnd) : null;
        const timeLeft = endDate ? (endDate.getTime() - now.getTime()) : 0;
        // Display-friendly days remaining: ceil so the last partial day counts as 1
        // This avoids prematurely marking trials as expired while hours remain
        const daysLeftDisplay = endDate ? Math.max(0, Math.ceil(timeLeft / (1000 * 60 * 60 * 24))) : 0;

        // Active paid subscription (monthly, annual)
        if (effectiveSubscription.status === 'active' && effectiveSubscription.interval !== 'trial') {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: daysLeftDisplay,
            subscriptionStatus: 'active',
            subscriptionInterval: effectiveSubscription.interval,
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

    // Check immediately
    checkSubscriptionAccess();
    
    // Also check after a short delay to catch subscriptions that load after initial render
    const delayedCheck = setTimeout(() => {
      checkSubscriptionAccess();
    }, 500);

    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      checkSubscriptionAccess();
    };

    window.addEventListener('subscription:updated', handleSubscriptionUpdate);

    // Check every minute for trial expiration
    const interval = setInterval(checkSubscriptionAccess, 60000);

    return () => {
      clearTimeout(delayedCheck);
      window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
      clearInterval(interval);
    };
  }, [subscription, isLoading, firebaseUser]); // Re-check when subscription changes from cloud or firebaseUser changes

  return { ...accessInfo, isLoading };
}

