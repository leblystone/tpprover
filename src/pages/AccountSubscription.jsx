import React, { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Crown, Gift, ExternalLink, RefreshCw, X, Settings, Sparkles, Lock, Calendar, Siren, Microscope, Check, BookOpenCheck } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
// ... (imports remain same)
import { createCheckoutSession, createPortalSession, cancelSubscription as stripeCancel } from '../services/stripe'
import { handleCheckoutReturn } from '../utils/checkoutNavigation'
import { STRIPE_CONFIG } from '../config/stripe'
import { verifyStripeConfig } from '../utils/stripe-verify'
import GiftPurchaseModal from '../components/common/GiftPurchaseModal'
import { useFounderOffer } from '../context/FounderOfferContext'
import { formatCurrency } from '../utils/currencyUtils'
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../utils/subscriptionPlans'
import { subscribe } from '../services/payment/paymentService'
import { isAndroid } from '../utils/platform'
import { 
  getBillingManagementInstructions, 
  getSubscriptionPlatform, 
  getPlatformDisplayName,
  detectCurrentPlatform 
} from '../utils/subscriptionPlatform'
import { 
  formatRenewalDisplay, 
  getRenewalDate,
  getRenewalDateColor 
} from '../utils/renewalDate'
// Note: Google Play Billing is now implemented, so payment buttons are shown on all platforms

// Load subscription from cloud storage ONLY (no localStorage)
async function loadSubscription(firebaseUser, forceRefresh = false) { 
  try { 
    if (forceRefresh) {
      console.log('🔄 Force refreshing subscription from Firestore...');
    }
    const { loadUserSubscription } = await import('../services/cloudStorage');
    if (firebaseUser) {
      const subscription = await loadUserSubscription(firebaseUser.uid);
      if (subscription && !subscription.id?.includes('lab_access') && !subscription.id?.includes('demo') && !subscription.id?.includes('test') && subscription.status !== 'lab_access') {
        return subscription;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to load subscription from cloud:', error);
    return null; 
  } 
}

export default function AccountSubscription() {
  // Research Subscription Page - Updated Layout
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  const [sub, setSub] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [pricingError, setPricingError] = useState(false)
  
  // Prevent crashes if firebaseUser is not available yet
  useEffect(() => {
    console.log('🔷 AccountSubscription mounted, firebaseUser:', firebaseUser ? 'present' : 'null');
    if (!firebaseUser && !isLoading) {
      console.warn('⚠️ AccountSubscription: No firebaseUser available, but continuing to render')
    }
  }, [firebaseUser, isLoading])

  const founderOffer = useFounderOffer()
  const planPricing = useMemo(() => {
    try {
      const discount = founderOffer.founderActive ? founderOffer.discountPercent : 0
      const buildPlan = (key) => {
        const info = getPlanPricing(key, discount)
        // Guard against null return from getPlanPricing
        if (!info) {
          console.warn(`⚠️ Failed to get pricing for plan: ${key}`)
          setPricingError(true)
          return {
            key,
            price: 0,
            founderPrice: 0,
            base: formatCurrency(0),
            founder: formatCurrency(0),
            savings: formatCurrency(0)
          }
        }
        return {
          ...info,
          base: formatCurrency(info.price),
          founder: formatCurrency(info.founderPrice),
          savings: formatCurrency(Math.max(info.savings, 0))
        }
      }
      return {
        discount,
        monthly: buildPlan('monthly'),
        annual: buildPlan('annual'),
        lifetime: buildPlan('lifetime')
      }
    } catch (error) {
      console.error('❌ Error building pricing:', error)
      setPricingError(true)
      return {
        discount: 0,
        monthly: { key: 'monthly', price: 0, founderPrice: 0, base: formatCurrency(0), founder: formatCurrency(0), savings: formatCurrency(0) },
        annual: { key: 'annual', price: 0, founderPrice: 0, base: formatCurrency(0), founder: formatCurrency(0), savings: formatCurrency(0) },
        lifetime: { key: 'lifetime', price: 0, founderPrice: 0, base: formatCurrency(0), founder: formatCurrency(0), savings: formatCurrency(0) }
      }
    }
  }, [founderOffer.founderActive, founderOffer.discountPercent])

  const founderStatusMessage = useMemo(() => {
    if (founderOffer.loading) {
      return 'Checking Founder spot availability…'
    }
    if (founderOffer.isFounder) {
      return `You’re locked in${founderOffer.founderNumber ? ` as Founder #${founderOffer.founderNumber}` : ''}. Your research rate never increases.`
    }
    if (founderOffer.founderActive && (founderOffer.remaining ?? 0) > 0) {
      const spots = Math.max(0, founderOffer.remaining)
      return `${spots} Founder spot${spots === 1 ? '' : 's'} left • ${founderOffer.discountPercent}% off forever.`
    }
    return 'Founder pricing is currently closed. Standard research pricing applies.'
  }, [founderOffer])

  const founderBadgeLabel = founderOffer.isFounder
    ? 'Founder pricing locked'
    : founderOffer.founderActive
      ? `Founder ${planPricing.discount}% off`
      : 'Standard pricing'

  const discountActive = planPricing.discount > 0

  // Load subscription data
  useEffect(() => {
    const loadSubData = async () => {
      try {
        setError(null);
        // Don't attempt to load if firebaseUser is null - just show "no subscription" state
        if (!firebaseUser) {
          console.log('ℹ️ AccountSubscription: No firebaseUser, showing subscription plans');
          setSub(null);
          setIsLoading(false);
          return;
        }
        
        const subscription = await loadSubscription(firebaseUser);
        console.log('📊 Loaded subscription:', subscription);
        setSub(subscription);
      } catch (error) {
        console.error('❌ Error loading subscription:', error);
        setError(error.message || 'Failed to load subscription data');
        // Don't block rendering on error - allow user to see plans
        setSub(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSubData();
    
    // Listen for subscription updates from admin panel or other sources
    const handleSubscriptionUpdate = async (e) => {
      console.log('🔄 AccountSubscription: Received subscription:updated event');
      if (e.detail?.subscription) {
        setSub(e.detail.subscription);
      } else if (firebaseUser) {
        // Refetch if no subscription in event
        const subscription = await loadSubscription(firebaseUser, true);
        console.log('🔄 Re-fetched subscription after update event:', subscription);
        setSub(subscription);
      }
    };
    
    window.addEventListener('subscription:updated', handleSubscriptionUpdate);
    
    return () => {
      window.removeEventListener('subscription:updated', handleSubscriptionUpdate);
    };
  }, [firebaseUser]);

  // Calculate time left for trial
  useEffect(() => {
    if (sub?.status === 'trialing' && sub?.trial_end) {
      const updateTimeLeft = () => {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = sub.trial_end - now;
        
        if (timeLeft <= 0) {
          setTimeLeft(null);
          return;
        }
        
        const days = Math.floor(timeLeft / 86400);
        const hours = Math.floor((timeLeft % 86400) / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        
        setTimeLeft({ days, hours, minutes });
      };
      
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 60000);
      return () => clearInterval(interval);
    }
  }, [sub]);

  const handleSelectPlan = async (planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey]
    if (!plan) {
      console.warn('Unknown plan selected:', planKey)
      return
    }

    if (isCheckoutProcessing) {
      return
    }

    console.log('🚀 AccountSubscription: Selected plan:', plan)
    setIsCheckoutProcessing(true)

    try {
      // Use platform-aware payment service (routes to Stripe on web, Google Play on Android, etc.)
      await subscribe(planKey, {
        userEmail: firebaseUser?.email || 'demo@example.com',
        userId: firebaseUser?.uid || 'demo_user',
        plan: plan,
        founderOffer: founderOffer
      })
    } catch (error) {
      console.error('❌ AccountSubscription: Subscription error:', error)

      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: error.message || 'Failed to start checkout. Please try again.', type: 'error' } 
      }))
    } finally {
      setIsCheckoutProcessing(false)
    }
  }

  const handleManageBilling = async () => {
    // Get platform-specific billing management instructions
    const billingInfo = getBillingManagementInstructions(sub);
    
    // If user can't manage on current platform, show helpful message
    if (!billingInfo.canManage) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: billingInfo.reason, 
          type: 'info' 
        } 
      }));
      
      // If there's a redirect URL, show option to open it
      if (billingInfo.redirectUrl) {
        // Show a longer toast with instructions
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { 
              message: `Subscription purchased via ${billingInfo.platformDisplay}. Visit the original platform to manage.`, 
              type: 'info' 
            } 
          }));
        }, 2000);
      }
      return;
    }

    // Platform-specific management
    const platform = getSubscriptionPlatform(sub);
    
    if (platform === 'googleplay') {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Opening Google Play Store subscriptions...', type: 'info' } 
      }));
      window.open('https://play.google.com/store/account/subscriptions', '_blank');
      return;
    }

    if (platform === 'apple') {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Opening App Store subscriptions...', type: 'info' } 
      }));
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
      return;
    }

    // Stripe (web) - original implementation
    if (platform === 'stripe') {
      try {
        // Check if Stripe is properly configured
        await verifyStripeConfig();
        const session = await createPortalSession(firebaseUser?.uid);
        
        if (session?.url) {
          window.open(session.url, '_blank');
        } else {
          throw new Error('No portal URL returned');
        }
      } catch (error) {
        console.error('Error creating portal session:', error);
        
        // Show a more helpful error message
        const errorMessage = error.message?.includes('INTERNAL') 
          ? 'Billing portal is temporarily unavailable. Please try again later or contact support.'
          : 'Failed to open billing portal. Please check your subscription status.';
          
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: errorMessage, type: 'error' } 
        }));
      }
      return;
    }

    // Unknown platform
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { 
        message: 'Unable to determine subscription platform. Please contact support.', 
        type: 'error' 
      } 
    }));
  };

  const handleCancelSubscription = async () => {
    if (!sub?.id) return;
    
    try {
      await stripeCancel(sub.id);
      setSub(null);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Subscription cancelled', type: 'success' } 
      }));
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to cancel subscription', type: 'error' } 
      }));
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return theme.primary;
      case 'trialing': return theme.primary;
      case 'past_due': return '#c87a5c';
      case 'cancelled': return '#c87a5c';
      case 'expired': return '#c87a5c';
      case 'inactive': return '#c87a5c';
      default: return theme.mutedText;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'trialing': return 'Trial';
      case 'past_due': return 'Past Due';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const accentColor = theme.accent || '#2F3B3A'

  const PlanGrid = ({ showMonthly = true, showAnnual = true, showLifetime = true }) => {
    return (
      <div className="space-y-6">
        {/* Beta Pricing Notice */}
        <div 
          className="relative rounded-[2rem] p-6 border-2 border-dashed transition-all"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground + '50' }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} style={{ color: theme.primary }} />
              <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: theme.text }}>
                Beta Pricing Locked
              </h4>
            </div>
            <p className="text-xs leading-relaxed opacity-70 max-w-sm" style={{ color: theme.text }}>
              Early adopters are grandfathered in at these rates forever.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {showMonthly && (
            <button
              onClick={() => !isCheckoutProcessing && handleSelectPlan('monthly')}
              className={`group relative flex flex-col p-5 rounded-[2rem] transition-all border-2 text-left overflow-hidden w-full ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:shadow-md hover:translate-y-[-1px]'}`}
              style={{
                backgroundColor: theme.cardBackground,
                borderColor: 'transparent',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme.secondary }}>
                    <Calendar size={18} style={{ color: theme.primary }} />
                  </div>
                  <div>
                    <span className="font-bold text-lg block" style={{ color: theme.text }}>Monthly Protocol</span>
                    <span className="text-xs opacity-50 block" style={{ color: theme.text }}>Flexible research access</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-2xl font-black" style={{ color: theme.text }}>
                      {discountActive ? planPricing.monthly.founder : planPricing.monthly.base}
                    </span>
                    <span className="text-xs opacity-50" style={{ color: theme.text }}>/mo</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                    {isCheckoutProcessing ? '...' : 'Select Plan'}
                  </span>
                </div>
              </div>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {showAnnual && (
              <button
                onClick={() => !isCheckoutProcessing && handleSelectPlan('annual')}
                className={`group relative flex flex-col p-6 rounded-[2rem] transition-all border-2 text-left overflow-hidden h-full ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:shadow-lg hover:translate-y-[-2px]'}`}
                style={{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.primary,
                  boxShadow: `0 20px 40px ${theme.primary}10, 0 8px 16px ${theme.primary}05`
                }}
              >
                <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: theme.primary }}>
                  Best Value
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg" style={{ color: theme.text }}>Annual Access</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
                      <Crown size={14} style={{ color: theme.primary }} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-black" style={{ color: theme.text }}>
                      {discountActive ? planPricing.annual.founder : planPricing.annual.base}
                    </span>
                    <span className="text-xs opacity-50" style={{ color: theme.text }}>/year</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                    {discountActive ? `Save ${planPricing.annual.savings}` : 'Save $17.89'}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t w-full" style={{ borderColor: theme.border }}>
                  <span className="text-sm font-bold" style={{ color: theme.primary }}>
                    {isCheckoutProcessing ? '...' : 'Select Annual'}
                  </span>
                </div>
              </button>
            )}

            {showLifetime && (
              <button
                onClick={() => !isCheckoutProcessing && handleSelectPlan('lifetime')}
                className={`group relative flex flex-col p-6 rounded-[2rem] transition-all border-2 text-left overflow-hidden h-full ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:shadow-lg hover:translate-y-[-2px]'}`}
                style={{
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.primary,
                  boxShadow: `0 20px 40px ${theme.primary}10, 0 8px 16px ${theme.primary}05`
                }}
              >
                <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: theme.primary }}>
                  Limited Time
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg" style={{ color: theme.text }}>Lifetime Access</span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: theme.primary + '20' }}>
                      <TrendingUp size={14} style={{ color: theme.primary }} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl font-black" style={{ color: theme.text }}>
                      {discountActive ? planPricing.lifetime.founder : planPricing.lifetime.base}
                    </span>
                    <span className="text-xs opacity-50" style={{ color: theme.text }}>once</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.primary }}>
                    {discountActive ? `Save ${planPricing.lifetime.savings}` : 'One-time cost'}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t w-full" style={{ borderColor: theme.border }}>
                  <span className="text-sm font-bold" style={{ color: theme.primary }}>
                    {isCheckoutProcessing ? '...' : 'Select Lifetime'}
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/app/account')}
            className="group p-2 rounded-xl transition-all active:scale-95 border shadow-sm shrink-0"
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
          >
            <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-wide" style={{ color: theme.text }}>Subscription</h1>
            <p className="text-sm opacity-50" style={{ color: theme.text }}>Loading subscription details...</p>
          </div>
        </div>
        <div 
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <RefreshCw size={48} className="mx-auto mb-4 animate-spin" style={{ color: theme.mutedText }} />
          <p className="text-sm" style={{ color: theme.mutedText }}>Loading...</p>
        </div>
      </section>
    );
  }

  // Determine subscription state with real-time checking
  const getSubscriptionState = () => {
    // Check if no subscription data
    if (!sub) {
      return {
        type: 'expired_trial',
        label: 'Trial Expired',
        showUpgrade: true
      };
    }

    // Check for lifetime access
    if (sub.interval === 'lifetime' || sub.hasLifetimeAccess) {
      return {
        type: 'lifetime',
        label: 'Lifetime Access',
        showUpgrade: false
      };
    }

    // Check for active trial - verify in real-time if it's actually active
    if (sub.status === 'trialing') {
      // Real-time check: is trial actually still active?
      if (sub.currentPeriodEnd) {
        const now = new Date();
        const endDate = new Date(sub.currentPeriodEnd);
        const timeLeft = endDate.getTime() - now.getTime();
        
        if (timeLeft > 0) {
          return {
            type: 'trialing',
            label: 'Active Trial',
            showUpgrade: true
          };
        } else {
          // Trial period has passed but status hasn't updated yet
          return {
            type: 'expired_trial',
            label: 'Trial Expired',
            showUpgrade: true
          };
        }
      }
      
      return {
        type: 'trialing',
        label: 'Active Trial',
        showUpgrade: true
      };
    }

    // Check for active paid subscriptions
    if (sub.status === 'active') {
      if (sub.interval === 'month') {
        return {
          type: 'monthly',
          label: 'Monthly Plan',
          showUpgrade: true,
          upgradeTarget: 'annual'
        };
      }
      if (sub.interval === 'year') {
        return {
          type: 'annual',
          label: 'Annual Plan',
          showUpgrade: true,
          upgradeTarget: 'lifetime'
        };
      }
    }

    // Cancelled or expired
    return {
      type: 'expired',
      label: 'Subscription Expired',
      showUpgrade: true
    };
  };

  const subscriptionState = getSubscriptionState();
  
  // Manual refresh function
  const handleRefreshSubscription = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Manually refreshing subscription...');
      const subscription = await loadSubscription(firebaseUser, true);
      console.log('✅ Subscription refreshed:', subscription);
      setSub(subscription);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '✅ Subscription status refreshed', type: 'success' }
      }));
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '❌ Failed to refresh subscription', type: 'error' }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="max-w-xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/app/account')}
          className="group p-2 rounded-xl transition-all active:scale-95 border shadow-sm shrink-0"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-wide" style={{ color: theme.text }}>Subscription</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Research Access & Billing
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      <div className="space-y-6">
        {/* Current Status Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Microscope size={14} style={{ color: theme.primary }} />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
                Subscription Status
              </h4>
            </div>
            {sub && (
              <button
                onClick={handleRefreshSubscription}
                className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity"
              >
                <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Sync</span>
              </button>
            )}
          </div>

          <div 
            className="p-4 rounded-[2rem] border-2 transition-all overflow-hidden"
            style={{ 
              backgroundColor: theme.cardBackground,
              borderColor: 'transparent',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: theme.primary + '10' }}
                >
                  <BookOpenCheck size={24} style={{ color: theme.primary }} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>
                    {subscriptionState.label}
                  </h3>
                  <p className="text-[13px] font-medium opacity-50" style={{ color: theme.text }}>
                    {sub?.interval === 'lifetime' ? 'Unlimited Lab Access' : 'Current Research Plan'}
                  </p>
                  {/* Platform indicator */}
                  {sub && (
                    <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: theme.mutedText, opacity: 0.6 }}>
                      via {getPlatformDisplayName(getSubscriptionPlatform(sub))}
                    </p>
                  )}
                  {/* Renewal date preview - DEBUG */}
                  {sub && (() => {
                    console.log('🔍 Subscription object:', sub);
                    console.log('🔍 currentPeriodEnd:', sub.currentPeriodEnd);
                    console.log('🔍 interval:', sub.interval);
                    console.log('🔍 hasLifetimeAccess:', sub.hasLifetimeAccess);
                    
                    const renewalInfo = getRenewalDate(sub);
                    console.log('🔍 Renewal info:', renewalInfo);
                    
                    // Don't show for lifetime
                    if (sub.interval === 'lifetime' || sub.hasLifetimeAccess) {
                      return null;
                    }
                    
                    if (renewalInfo.formattedDate && renewalInfo.daysUntil !== null) {
                      if (sub.cancelAtPeriodEnd) {
                        return (
                          <p className="text-[10px] font-bold mt-1.5" style={{ color: '#F59E0B' }}>
                            Access ends {renewalInfo.formattedDate}
                          </p>
                        );
                      }
                      if (renewalInfo.daysUntil < 0) {
                        return (
                          <p className="text-[10px] font-bold mt-1.5" style={{ color: '#EF4444' }}>
                            Expired {renewalInfo.formattedDate}
                          </p>
                        );
                      }
                      return (
                        <p className="text-[10px] font-bold mt-1.5" style={{ color: getRenewalDateColor(sub, theme) }}>
                          Renews {renewalInfo.formattedDate}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
              
              <div 
                className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm"
                style={{ 
                  backgroundColor: getStatusColor(sub?.status || 'expired') + '15',
                  color: getStatusColor(sub?.status || 'expired'),
                  border: `1px solid ${getStatusColor(sub?.status || 'expired')}30`
                }}
              >
                {getStatusText(sub?.status || 'inactive')}
              </div>
            </div>

            {/* Status-specific details */}
            <div className="space-y-3">
              {sub?.status === 'trialing' && sub.startedAt && sub.currentPeriodEnd && (
                <TrialProgressBar 
                  theme={theme} 
                  startDate={sub.startedAt} 
                  endDate={sub.currentPeriodEnd} 
                />
              )}

              <div className="pt-3 border-t" style={{ borderColor: theme.border }}>
                {subscriptionState.type === 'expired_trial' && (
                  <p className="text-xs leading-relaxed opacity-70" style={{ color: theme.text }}>
                    Your evaluation period has concluded. Select a plan below to continue.
                  </p>
                )}
                {subscriptionState.type === 'trialing' && (
                  <p className="text-xs leading-relaxed opacity-70" style={{ color: theme.text }}>
                    Currently in the evaluation phase. Lock in your access now.
                  </p>
                )}
                {subscriptionState.type === 'monthly' && (
                  <div className="space-y-1">
                    {(() => {
                      const renewalInfo = getRenewalDate(sub);
                      if (renewalInfo.formattedDate && renewalInfo.daysUntil !== null) {
                        // Show cancellation warning if subscription is cancelled
                        if (sub.cancelAtPeriodEnd) {
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                                <span className="text-base">⚠️</span>
                                <p className="text-[10px] font-bold text-amber-800">
                                  Subscription cancelled - Access ends {renewalInfo.formattedDate}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-0.5">
                            <p className="text-[13px] font-bold" style={{ color: getRenewalDateColor(sub, theme) }}>
                              Next renewal: {renewalInfo.formattedDate}
                            </p>
                            {renewalInfo.daysUntil >= 0 && renewalInfo.daysUntil <= 30 && (
                              <p className="text-[9px] opacity-60" style={{ color: theme.text }}>
                                {renewalInfo.daysUntil} day{renewalInfo.daysUntil === 1 ? '' : 's'} remaining
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                {subscriptionState.type === 'annual' && (
                  <div className="space-y-1">
                    {(() => {
                      const renewalInfo = getRenewalDate(sub);
                      if (renewalInfo.formattedDate && renewalInfo.daysUntil !== null) {
                        // Show cancellation warning if subscription is cancelled
                        if (sub.cancelAtPeriodEnd) {
                          return (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                                <span className="text-base">⚠️</span>
                                <p className="text-[10px] font-bold text-amber-800">
                                  Subscription cancelled - Access ends {renewalInfo.formattedDate}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-0.5">
                            <p className="text-[13px] font-bold" style={{ color: getRenewalDateColor(sub, theme) }}>
                              Next renewal: {renewalInfo.formattedDate}
                            </p>
                            {renewalInfo.daysUntil >= 0 && renewalInfo.daysUntil <= 60 && (
                              <p className="text-[9px] opacity-60" style={{ color: theme.text }}>
                                {renewalInfo.daysUntil} day{renewalInfo.daysUntil === 1 ? '' : 's'} remaining
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
                {subscriptionState.type === 'lifetime' && (
                  <div className="flex items-center gap-2 py-0.5">
                    <Check size={14} className="text-green-500" />
                    <p className="text-xs font-bold text-green-600">
                      Lifetime research access is fully unlocked.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Options Section */}
        {subscriptionState.showUpgrade && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 px-1">
              <TrendingUp size={14} style={{ color: theme.primary }} />
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
                Upgrade Options
              </h4>
            </div>

            <PlanGrid 
              showMonthly={subscriptionState.type === 'trialing' || subscriptionState.type === 'expired_trial'}
              showAnnual={subscriptionState.type === 'trialing' || subscriptionState.type === 'monthly' || subscriptionState.type === 'expired_trial'}
              showLifetime={subscriptionState.type !== 'lifetime'}
            />
          </div>
        )}

        {/* Management & Gifts Section */}
        <div className="pt-4 border-t border-dashed space-y-3" style={{ borderColor: theme.border }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Subscription Management - Only show if user can manage */}
            {sub && (() => {
              const platform = getSubscriptionPlatform(sub);
              const canShow = platform !== 'admin' && !(sub?.interval === 'lifetime' && platform === 'admin');
              return canShow ? (
                <button
                  onClick={handleManageBilling}
                  className="flex items-center justify-between p-4 rounded-[1.5rem] transition-all hover:translate-y-[-1px] shadow-sm"
                  style={{ backgroundColor: theme.cardBackground }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme.secondary }}>
                      <Settings size={18} style={{ color: theme.primary }} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-[13px] block" style={{ color: theme.text }}>Manage Billing</span>
                      <span className="text-[9px] opacity-50" style={{ color: theme.text }}>
                        {platform === 'stripe' ? 'Portal via Stripe' : 
                         platform === 'googleplay' ? 'Via Google Play' : 
                         platform === 'apple' ? 'Via App Store' : 'Manage subscription'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={14} style={{ color: theme.mutedText }} />
                </button>
              ) : null;
            })()}

            {/* Gift Access */}
            {!isAndroid() && (
              <button
                onClick={() => setShowGiftModal(true)}
                className="flex items-center justify-between p-4 rounded-[1.5rem] transition-all hover:translate-y-[-1px] shadow-sm"
                style={{ backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50" style={{ backgroundColor: theme.secondary }}>
                    <Gift size={18} style={{ color: theme.primary }} />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-[13px] block" style={{ color: theme.text }}>Give a Gift</span>
                    <span className="text-[9px] opacity-50" style={{ color: theme.text }}>Share research tools</span>
                  </div>
                </div>
                <ArrowLeft size={14} className="rotate-180" style={{ color: theme.mutedText }} />
              </button>
            )}
          </div>

          {/* Cancel Option (Secondary) - Only for Stripe subscriptions */}
          {sub?.status === 'active' && getSubscriptionPlatform(sub) === 'stripe' && (
            <div className="pt-1 flex justify-center">
              <button
                onClick={handleCancelSubscription}
                className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity p-1.5"
                style={{ color: '#991B1B' }}
              >
                cancel subscription
              </button>
            </div>
          )}
        </div>
      </div>

      <GiftPurchaseModal 
        isOpen={showGiftModal} 
        onClose={() => setShowGiftModal(false)} 
        theme={theme}
      />
    </section>
  )
}


const TrialProgressBar = ({ theme, startDate, endDate }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateProgress = () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      const totalDuration = end.getTime() - start.getTime();
      const elapsedTime = now.getTime() - start.getTime();
      const percentage = Math.max(0, 100 - (elapsedTime / totalDuration * 100));
      setProgress(percentage);

      const remaining = end.getTime() - now.getTime();
      if (remaining <= 0) {
        setTimeLeft('Trial Expired');
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${days}d ${hours}h remaining`);
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40" style={{ color: theme.text }}>
          Trial Progress
        </h4>
        <span className="text-[10px] font-black" style={{ color: theme.primary }}>
          {timeLeft}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/5" style={{ backgroundColor: theme.primary + '10' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: theme.primary,
          }}
        />
      </div>
    </div>
  );
};
