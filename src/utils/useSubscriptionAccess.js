import { useState, useEffect, useRef } from 'react';
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
  const lifetimeCheckStarted = useRef(false); // Track if check has started
  const lastProcessedSubscriptionRef = useRef(null); // Track last processed subscription to prevent re-processing
  const isProcessingRef = useRef(false); // Prevent concurrent processing
  const [accessInfo, setAccessInfo] = useState({
    hasAccess: true,
    isTrialExpired: false,
    isSubscriptionEnded: false,
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
      console.log('🔄 checkSubscriptionDirectly called', {
        subscription: !!subscription,
        firebaseUser: !!firebaseUser,
        lifetimeCheckStarted: lifetimeCheckStarted.current,
        hasCheckedLifetime
      });
      
      // Only check if we don't have subscription yet and haven't started checking
      if (subscription || !firebaseUser || lifetimeCheckStarted.current) {
        console.log('  -> Skipping check (already done or conditions not met)');
        return;
      }

      // Mark that we've started the check (prevents duplicate checks)
      lifetimeCheckStarted.current = true;
      console.log('🔍 Starting lifetime check...');

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
              isSubscriptionEnded: false,
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
              isSubscriptionEnded: false,
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
                isSubscriptionEnded: false,
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
          console.log('❌ No subscription found in direct check');
          setHasCheckedLifetime(true);
          console.log('  -> Set hasCheckedLifetime to true');
        }
      } catch (error) {
        console.warn('⚠️ Error checking subscription directly:', error);
        setHasCheckedLifetime(true);
        console.log('  -> Set hasCheckedLifetime to true (after error)');
      }
    };

    checkSubscriptionDirectly();
    
    // Fallback timeout: if check doesn't complete in 2 seconds, force it complete
    // This prevents infinite waiting if Firestore is slow
    const timeout = setTimeout(() => {
      if (!hasCheckedLifetime && lifetimeCheckStarted.current) {
        console.log('⏱️ Lifetime check timeout (2s) - marking as complete');
        setHasCheckedLifetime(true);
      } else if (lifetimeCheckStarted.current) {
        console.log('  ✓ Lifetime check already completed before timeout');
      }
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [subscription, firebaseUser, hasCheckedLifetime]);

  useEffect(() => {
    const checkSubscriptionAccess = async () => {
      // Prevent concurrent processing
      if (isProcessingRef.current) {
        console.log('⏸️ Already processing subscription - skipping duplicate check');
        return;
      }
      
      try {
        isProcessingRef.current = true;
        
        // CRITICAL: Don't show trial expired during signup flow
        const signupInProgress = sessionStorage.getItem('tpp_signup_in_progress');
        if (signupInProgress === 'true') {
          console.log('🔄 Signup in progress - skipping subscription check');
          setIsLoading(true);
          return;
        }

        // Use subscription from cloud storage (via AppContext), with localStorage fallback
        let effectiveSubscription = subscription;
        
        // STABILITY: Skip re-processing if subscription hasn't changed
        const subKey = effectiveSubscription ? JSON.stringify({
          status: effectiveSubscription.status,
          interval: effectiveSubscription.interval,
          plan: effectiveSubscription.plan,
          currentPeriodEnd: effectiveSubscription.currentPeriodEnd,
          hasLifetimeAccess: effectiveSubscription.hasLifetimeAccess
        }) : 'null';
        
        if (lastProcessedSubscriptionRef.current === subKey) {
          console.log('✓ Subscription unchanged - skipping re-process');
          isProcessingRef.current = false;
          return;
        }
        
        console.log('🔍 Checking subscription access...');
        console.log('  - Cloud subscription:', subscription);
        
        // Fallback to localStorage with a 24-hour expiry to prevent stale data abuse
        if (!effectiveSubscription) {
          try {
            const localRaw = localStorage.getItem('tpprover_subscription');
            if (localRaw) {
              const localData = JSON.parse(localRaw);
              // Use _cachedAt if present, otherwise estimate from lastUpdated or startedAt
              const savedAt = localData?._cachedAt || 
                              (localData?.lastUpdated ? new Date(localData.lastUpdated).getTime() : 0) ||
                              (localData?.startedAt ? new Date(localData.startedAt).getTime() : 0);
              const maxAge = 24 * 60 * 60 * 1000; // 24 hours
              if (savedAt > 0 && Date.now() - savedAt < maxAge) {
                effectiveSubscription = localData;
                console.log('  - Using localStorage subscription cache');
              } else {
                console.log('  - localStorage subscription cache too old, ignoring');
                localStorage.removeItem('tpprover_subscription');
              }
            }
          } catch (e) {
            console.error('Failed to parse localStorage subscription:', e);
          }
        }
        
        // Mark loading as complete - we have data to work with (or confirmed there is none)
        setIsLoading(false);
        console.log('  - Loading complete, processing subscription...');
        
        // Store that we've processed this subscription
        lastProcessedSubscriptionRef.current = subKey;
        
        // If no subscription found after checking all sources
        if (!effectiveSubscription) {
          // Wait for direct lifetime check to complete first
          if (!hasCheckedLifetime) {
            if (import.meta.env.DEV) {
              console.log('  - Waiting for lifetime check to complete (hasCheckedLifetime:', hasCheckedLifetime, ')');
            }
            return;
          }
          
          // No subscription found anywhere - mark as expired
          if (import.meta.env.DEV) {
            console.log('❌ No subscription found - marking as EXPIRED (hasCheckedLifetime:', hasCheckedLifetime, ')');
          }
          setAccessInfo({
            hasAccess: false,
            isTrialExpired: true,
            isSubscriptionEnded: false,
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
            isSubscriptionEnded: false,
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
        // Also handle canceled subscriptions with cancelAtPeriodEnd (access continues until period end)
        const isCanceledButActive = effectiveSubscription.status === 'canceled' && 
                                    effectiveSubscription.cancelAtPeriodEnd && 
                                    timeLeft > 0;
        
        if ((effectiveSubscription.status === 'active' || isCanceledButActive) && 
            effectiveSubscription.interval !== 'trial') {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isSubscriptionEnded: false,
            isReadOnly: false,
            showUpgradePrompt: false,
            daysRemaining: daysLeftDisplay,
            subscriptionStatus: isCanceledButActive ? 'canceled' : 'active',
            subscriptionInterval: effectiveSubscription.interval,
            cancelAtPeriodEnd: effectiveSubscription.cancelAtPeriodEnd || false,
          });
          return;
        }

        // Handle past_due status (usually has grace period)
        if (effectiveSubscription.status === 'past_due' && timeLeft > 0) {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isSubscriptionEnded: false,
            isReadOnly: false,
            showUpgradePrompt: true,
            daysRemaining: daysLeftDisplay,
            subscriptionStatus: 'past_due',
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // Grace period -- payment failed but provider gives a short window to fix it
        if (effectiveSubscription.status === 'grace_period') {
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isSubscriptionEnded: false,
            isReadOnly: false,
            showUpgradePrompt: true,
            daysRemaining: daysLeftDisplay,
            subscriptionStatus: 'grace_period',
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // On hold -- payment failed, grace period expired, access suspended
        if (effectiveSubscription.status === 'on_hold') {
          setAccessInfo({
            hasAccess: false,
            isTrialExpired: false,
            isSubscriptionEnded: true,
            isReadOnly: true,
            showUpgradePrompt: true,
            daysRemaining: 0,
            subscriptionStatus: 'on_hold',
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // Paused -- user voluntarily paused
        if (effectiveSubscription.status === 'paused') {
          setAccessInfo({
            hasAccess: false,
            isTrialExpired: false,
            isSubscriptionEnded: true,
            isReadOnly: true,
            showUpgradePrompt: true,
            daysRemaining: 0,
            subscriptionStatus: 'paused',
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // Disputed / refunded / revoked -- access revoked
        if (['disputed', 'refunded', 'revoked'].includes(effectiveSubscription.status)) {
          setAccessInfo({
            hasAccess: false,
            isTrialExpired: false,
            isSubscriptionEnded: true,
            isReadOnly: true,
            showUpgradePrompt: true,
            daysRemaining: 0,
            subscriptionStatus: effectiveSubscription.status,
            subscriptionInterval: effectiveSubscription.interval,
          });
          return;
        }

        // Active trial
        // Consider trial active as long as actual timeLeft > 0
        if (effectiveSubscription.status === 'trialing' && timeLeft > 0) {
          console.log('✅ Active trial detected - FULL ACCESS');
          setAccessInfo({
            hasAccess: true,
            isTrialExpired: false,
            isSubscriptionEnded: false,
            isReadOnly: false,
            showUpgradePrompt: daysLeftDisplay <= 2, // Show prompt in last 2 days
            daysRemaining: daysLeftDisplay,
            subscriptionStatus: 'trialing',
            subscriptionInterval: 'trial',
          });
          return;
        }

        // Distinguish between trial expired vs paid subscription ended
        const paidIntervals = ['month', 'monthly', 'year', 'annual'];
        const hadPaidSubscription = paidIntervals.includes(effectiveSubscription.interval) ||
                                     (effectiveSubscription.status === 'canceled' && effectiveSubscription.interval !== 'trial');
        
        const wasTrial = effectiveSubscription.status === 'trialing' || effectiveSubscription.interval === 'trial';
        const isSubscriptionEnded = hadPaidSubscription && !wasTrial && timeLeft <= 0;
        const isTrialExpired = wasTrial || (!hadPaidSubscription && timeLeft <= 0);
        
        console.log(`❌ ${isSubscriptionEnded ? 'Subscription ENDED' : 'Trial EXPIRED'} - READ-ONLY MODE`);
        setAccessInfo({
          hasAccess: false,
          isTrialExpired: isTrialExpired && !isSubscriptionEnded,
          isSubscriptionEnded: isSubscriptionEnded,
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
          isSubscriptionEnded: false,
          isReadOnly: true,
          showUpgradePrompt: true,
          daysRemaining: 0,
          subscriptionStatus: 'error',
          subscriptionInterval: null,
        });
      } finally {
        isProcessingRef.current = false;
      }
    };

    // Check immediately
    checkSubscriptionAccess();
    
    // Also check after a longer delay to catch subscriptions that load after initial render
    // Increased from 500ms to 2000ms to reduce excessive checking
    const delayedCheck = setTimeout(() => {
      checkSubscriptionAccess();
    }, 2000);

    // Listen for subscription updates
    const handleSubscriptionUpdate = () => {
      // Reset the last processed key so it will re-process
      lastProcessedSubscriptionRef.current = null;
      checkSubscriptionAccess();
    };

    window.addEventListener('subscription:updated', handleSubscriptionUpdate);

    // Check every 5 minutes for trial expiration (reduced from 1 minute)
    // Less frequent checks reduce console spam and unnecessary processing
    const interval = setInterval(checkSubscriptionAccess, 300000);

    return () => {
      clearTimeout(delayedCheck);
      window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
      clearInterval(interval);
    };
  }, [subscription, firebaseUser, hasCheckedLifetime]); // Removed isLoading from deps to prevent re-triggering

  return { ...accessInfo, isLoading };
}

