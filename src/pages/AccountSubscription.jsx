import React, { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Crown, Gift, ExternalLink, RefreshCw, X, Settings, Sparkles, Lock, CreditCard, Calendar, Siren } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { createCheckoutSession, createPortalSession, cancelSubscription as stripeCancel } from '../services/stripe'
import { handleCheckoutReturn } from '../utils/checkoutNavigation'
import { STRIPE_CONFIG } from '../config/stripe'
import { verifyStripeConfig } from '../utils/stripe-verify'
import GiftPurchaseModal from '../components/common/GiftPurchaseModal'
import { useFounderOffer } from '../context/FounderOfferContext'
import { formatCurrency } from '../utils/currencyUtils'
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../utils/subscriptionPlans'

// Load subscription from cloud storage ONLY (no localStorage)
async function loadSubscription(firebaseUser) { 
  try { 
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
      let priceId = STRIPE_CONFIG.prices[planKey] || ''

      if (planKey === 'lifetime' && founderOffer.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
        priceId = STRIPE_CONFIG.founder.lifetimePrice
      }

      if (!priceId) {
        throw new Error(`Stripe price ID missing for plan ${planKey}`)
      }

      await createCheckoutSession(
        priceId,
        firebaseUser?.email || 'demo@example.com',
        firebaseUser?.uid || 'demo_user',
        null,
        false,
        { planName: plan.label }
      )
    } catch (error) {
      console.error('❌ AccountSubscription: Stripe checkout error:', error)

      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: error.message || 'Failed to start checkout. Please try again.', type: 'error' } 
      }))
    } finally {
      setIsCheckoutProcessing(false)
    }
  }

  const handleManageBilling = async () => {
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
      case 'active': return '#10B981';
      case 'trialing': return '#3B82F6';
      case 'past_due': return '#F59E0B';
      case 'cancelled': return '#EF4444';
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

  const PlanGrid = ({ showMonthly = true, showAnnual = true, showLifetime = true }) => (
    <div className="space-y-4">
      {/* Beta Pricing Notice */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
            <Crown size={12} className="text-white" />
          </div>
          <div className="text-lg font-bold" style={{ color: '#344E41' }}>
            Beta Pricing
          </div>
        </div>
        <p className="text-xs leading-relaxed italic" style={{ color: '#3A5A40' }}>
          You'll be grandfathered in at this price forever (unless your lifetime commited🙏🏻), even as we grow and increase in value, your costs will not.
        </p>
      </div>

      {(showMonthly || showAnnual) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {showMonthly && (
            <div
              className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:shadow-lg'}`}
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              onClick={() => !isCheckoutProcessing && handleSelectPlan('monthly')}
            >
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: theme.text }}>Monthly</h3>
                <div className="text-xl font-bold mt-1 flex items-center justify-center gap-2" style={{ color: theme.text }}>
                  {discountActive ? (
                    <>
                      <span className="line-through text-sm" style={{ color: theme.textLight }}>{planPricing.monthly.base}</span>
                      <span>{planPricing.monthly.founder}</span>
                    </>
                  ) : (
                    planPricing.monthly.base
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>per month</div>
                {discountActive && (
                  <div className="text-xs mt-2 font-medium" style={{ color: accentColor }}>
                    Save {planPricing.monthly.savings} / mo
                  </div>
                )}
              </div>
              <button
                className="py-1.5 px-6 rounded-lg font-medium text-sm transition-all hover:opacity-90 w-auto mx-auto block"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                disabled={isCheckoutProcessing}
              >
                {isCheckoutProcessing ? 'Processing…' : SUBSCRIPTION_PLANS.monthly.cta}
              </button>
            </div>
          )}

          {showAnnual && (
            <div
              className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:shadow-lg'}`}
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              onClick={() => !isCheckoutProcessing && handleSelectPlan('annual')}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: theme.primaryDark }}>
                  {founderOffer.isFounder ? 'Founder Locked' : 'Same Price as Our Physical Planners'}
                </div>
              </div>
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: theme.text }}>Annual</h3>
                <div className="text-xl font-bold mt-1 flex items-center justify-center gap-2" style={{ color: theme.text }}>
                  {discountActive ? (
                    <>
                      <span className="line-through text-sm" style={{ color: theme.textLight }}>{planPricing.annual.base}</span>
                      <span>{planPricing.annual.founder}</span>
                    </>
                  ) : (
                    planPricing.annual.base
                  )}
                </div>
                <div className="text-xs mt-1" style={{ color: theme.textLight }}>per year</div>
                <div className="text-center mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: theme.primary }}>
                    {discountActive ? `Save ${planPricing.annual.savings} / yr` : 'Save $17.89'}
                  </span>
                </div>
              </div>
              <button
                className="py-1.5 px-6 rounded-lg font-medium text-sm transition-all hover:opacity-90 w-auto mx-auto block"
                style={{ backgroundColor: theme.primaryDark, color: theme.textOnPrimary }}
                disabled={isCheckoutProcessing}
              >
                {isCheckoutProcessing ? 'Processing…' : SUBSCRIPTION_PLANS.annual.cta}
              </button>
            </div>
          )}
        </div>
      )}

      {showLifetime && (
        <div
          className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:shadow-lg'}`}
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
          onClick={() => !isCheckoutProcessing && handleSelectPlan('lifetime')}
        >
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
              Limited Offer
            </div>
          </div>
          <div className="flex items-center justify-between min-h-[80px]">
            <div className="flex items-center gap-5">
              <div className="space-y-1">
                <div className="font-bold text-lg" style={{ color: theme.text }}>Lifetime Access</div>
                <div className="text-base font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                  {discountActive ? (
                    <>
                      <span className="line-through text-sm" style={{ color: theme.textLight }}>{planPricing.lifetime.base}</span>
                      <span>{planPricing.lifetime.founder}</span>
                    </>
                  ) : (
                    planPricing.lifetime.base
                  )}
                </div>
                {discountActive && (
                  <div className="text-xs font-semibold" style={{ color: accentColor }}>
                    Save {planPricing.lifetime.savings} one-time
                  </div>
                )}
              </div>
            </div>
            <div>
              <button
                className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                disabled={isCheckoutProcessing}
              >
                {isCheckoutProcessing ? 'Processing…' : SUBSCRIPTION_PLANS.lifetime.cta}
              </button>
              <div className="text-sm text-center mt-2" style={{ color: theme.textLight }}>Never pay again</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/app/account')}
            className="p-2 rounded-lg hover:opacity-80 transition-all"
            style={{ backgroundColor: theme.secondary }}
          >
            <ArrowLeft size={20} style={{ color: theme.text }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Research Subscription</h1>
            <p className="text-sm" style={{ color: theme.mutedText }}>Loading subscription details...</p>
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

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/account')}
          className="p-2 rounded-lg hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.secondary }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Research Subscription</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Manage subscription and billing</p>
        </div>
      </div>

      {/* Subscription Status Card - Always Show */}
      <div className="flex justify-center">
        <div 
          className="relative rounded-xl border-2 max-w-md w-full overflow-hidden shadow-sm"
          style={{ 
            backgroundColor: theme.cardBackground,
            borderColor: '#c87a5c'
          }}
        >
          {/* Decorative top bar */}
          <div 
            className="h-1.5"
            style={{ 
              background: 'linear-gradient(90deg, #c87a5c 0%, #b5684a 50%, #c87a5c 100%)',
              opacity: 0.8
            }}
          />
          
          <div className="p-5">
            {/* Header with status badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>
                Current Status
              </div>
              <div 
                className="px-3 py-1 rounded-lg"
                style={{ 
                  background: 'linear-gradient(135deg, #c87a5c15 0%, #b5684a15 100%)',
                  border: '1px solid #c87a5c30'
                }}
              >
                <div 
                  className="text-sm font-bold tracking-tight"
                  style={{ color: '#c87a5c' }}
                >
                  {subscriptionState.label}
                </div>
              </div>
            </div>

            {/* Trial timer badge (if active) */}
            {sub?.status === 'trialing' && subscriptionState.type === 'trialing' && timeLeft && (
              <div className="flex justify-end mb-2">
                <div 
                  className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{ 
                    backgroundColor: '#c87a5c20',
                    color: '#c87a5c',
                    border: '1px solid #c87a5c40'
                  }}
                >
                  {timeLeft.days}d {timeLeft.hours}h left
                </div>
              </div>
            )}

            {/* Status Details with divider */}
            <div 
              className="pt-3 border-t"
              style={{ borderColor: theme.border }}
            >
              {subscriptionState.type === 'expired_trial' && (
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                  Your trial period has ended. <span className="font-semibold" style={{ color: theme.text }}>Choose a plan below</span> to continue using The Pep Planner.
                </p>
              )}
              {subscriptionState.type === 'trialing' && (
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                  You're in your trial period. <span className="font-semibold" style={{ color: theme.text }}>Lock in your access</span> with a plan below.
                </p>
              )}
              {subscriptionState.type === 'monthly' && (
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                  Currently on <span className="font-semibold" style={{ color: theme.text }}>Monthly Plan</span>. <span className="font-semibold" style={{ color: '#c87a5c' }}>Upgrade to Annual</span> and save!
                </p>
              )}
              {subscriptionState.type === 'annual' && (
                <p className="text-xs leading-relaxed" style={{ color: theme.textLight }}>
                  Currently on <span className="font-semibold" style={{ color: theme.text }}>Annual Plan</span>. <span className="font-semibold" style={{ color: '#c87a5c' }}>Upgrade to Lifetime</span> and never pay again!
                </p>
              )}
              {subscriptionState.type === 'lifetime' && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#c87a5c' }} />
                  <p className="text-xs font-semibold" style={{ color: '#c87a5c' }}>
                    Lifetime Access Unlocked
                  </p>
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#c87a5c' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Subscription Details - For Active Subs */}
      {sub && (
        <div className="space-y-6">
          {/* Subscription Status */}
          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.cardBackground }}
          >
            {sub.status === 'trialing' && sub.startedAt && sub.currentPeriodEnd && (
              <TrialProgressBar 
                theme={theme} 
                startDate={sub.startedAt} 
                endDate={sub.currentPeriodEnd} 
              />
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accent + '20' }}
                >
                  <Crown size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.text }}>
                    {sub.plan?.name || 'Research Subscription'}
                    {/* Special display for lifetime granted accounts */}
                    {sub.interval === 'lifetime' && sub.lifetimeReason && !sub.paymentMethodId && (
                      <Gift size={18} style={{ color: '#A3B18A' }} />
                    )}
                  </h3>
                  <div 
                    className="text-sm font-medium flex items-center gap-1"
                    style={{ color: getStatusColor(sub.status) }}
                  >
                    {sub.interval === 'lifetime' && sub.lifetimeReason && !sub.paymentMethodId ? (
                      <>
                        <Gift size={14} style={{ color: '#A3B18A' }} />
                        <span>Lifetime Granted ({sub.lifetimeReason})</span>
                      </>
                    ) : (
                      getStatusText(sub.status)
                    )}
                  </div>
                </div>
              </div>
              {sub.status === 'trialing' && timeLeft && (
                <div className="text-right">
                  <div className="text-sm" style={{ color: theme.mutedText }}>Trial ends in</div>
                  <div className="text-lg font-bold" style={{ color: theme.text }}>
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Special section for Lifetime Granted accounts */}
          {sub.interval === 'lifetime' && sub.lifetimeReason && !sub.paymentMethodId && (
            <div 
              className="p-6 rounded-lg border-2"
              style={{ 
                backgroundColor: theme.cardBackground,
                borderColor: '#A3B18A',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #D4D7CD 100%)'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A3B18A30' }}>
                  <Gift size={24} style={{ color: '#344E41' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: '#344E41' }}>
                    Lifetime Granted Account
                  </h3>
                  <p className="text-sm" style={{ color: '#3A5A40' }}>
                    You have special lifetime access - no payment required!
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} style={{ color: '#3A5A40' }} />
                  <span className="text-sm" style={{ color: '#3A5A40' }}>
                    <strong>Reason:</strong> {sub.lifetimeReason}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={16} style={{ color: '#3A5A40' }} />
                  <span className="text-sm" style={{ color: '#3A5A40' }}>
                    <strong>Access Level:</strong> Full platform access - forever
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} style={{ color: '#3A5A40' }} />
                  <span className="text-sm" style={{ color: '#3A5A40' }}>
                    <strong>Payment Method:</strong> None required - completely free!
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} style={{ color: '#3A5A40' }} />
                  <span className="text-sm" style={{ color: '#3A5A40' }}>
                    <strong>Expires:</strong> Never!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Plans - Show based on subscription status */}
          {subscriptionState.showUpgrade && sub && (
            <div 
              className="p-6 rounded-lg"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>
                {subscriptionState.type === 'trialing' ? 'Available Plans' : 'Upgrade Options'}
              </h3>
              <PlanGrid 
                showMonthly={subscriptionState.type === 'trialing' || subscriptionState.type === 'expired_trial'}
                showAnnual={subscriptionState.type === 'trialing' || subscriptionState.type === 'monthly' || subscriptionState.type === 'expired_trial'}
                showLifetime={subscriptionState.type !== 'lifetime'}
              />

              {/* Gift Access Button */}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                <div className="text-center">
                  <p className="text-sm mb-4" style={{ color: theme.textLight }}>Want to share The Pep Planner with someone?</p>
                  <button
                    onClick={() => setShowGiftModal(true)}
                    className="px-6 py-3 rounded-xl font-medium transition-all shadow-lg text-white hover:opacity-90 flex items-center gap-2 mx-auto"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                    }}
                  >
                    <Gift size={18} />
                    Give a Gift
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions - Only show for paid subscriptions, not for lifetime granted accounts */}
          {!(sub.interval === 'lifetime' && sub.lifetimeReason && !sub.paymentMethodId) && (
            <div 
              className="p-4 rounded-lg space-y-3"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Subscription Management</h4>
              <div className="space-y-2">
                <button
                  onClick={handleManageBilling}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.secondary }}
                >
                  <div className="flex items-center gap-3">
                    <Settings size={20} style={{ color: theme.accent }} />
                    <span className="font-medium" style={{ color: theme.text }}>Manage Billing</span>
                  </div>
                  <ExternalLink size={16} style={{ color: theme.mutedText }} />
                </button>
                
                {sub.status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    className="w-full flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-90"
                    style={{ backgroundColor: theme.secondary }}
                  >
                    <div className="flex items-center gap-3">
                      <X size={20} style={{ color: '#EF4444' }} />
                      <span className="font-medium" style={{ color: '#EF4444' }}>Cancel Subscription</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pricing Error Message */}
      {pricingError && (
        <div 
          className="p-4 rounded-lg border-2"
          style={{ 
            backgroundColor: '#FEF2F2', 
            borderColor: '#FCA5A5',
            marginBottom: '1rem'
          }}
        >
          <p className="text-sm font-medium flex items-center gap-1" style={{ color: '#991B1B' }}>
            <Siren size={16} style={{ color: '#991B1B' }} />
            Pricing information temporarily unavailable. Please refresh the page or try again in a moment.
          </p>
        </div>
      )}

      {/* Subscription Plans - Show for users without active subscription */}
      {!sub && (
        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>
            Choose Your Plan
          </h3>
          <PlanGrid 
            showMonthly={true}
            showAnnual={true}
            showLifetime={true}
          />
          
          {/* Gift Access Button */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>Want to share The Pep Planner with someone?</p>
              <button
                onClick={() => setShowGiftModal(true)}
                className="px-6 py-3 rounded-xl font-medium transition-all shadow-lg text-white hover:opacity-90 flex items-center gap-2 mx-auto"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                }}
              >
                <Gift size={18} />
                Give a Gift
              </button>
            </div>
          </div>
        </div>
      )}


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
        setTimeLeft('Trial ended');
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${days}d ${hours}h left`);
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-semibold" style={{ color: theme.text }}>Trial Status</span>
        <span className="text-xs font-medium" style={{ color: theme.mutedText }}>{timeLeft}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: theme.primary,
            transition: 'width 0.5s ease-in-out'
          }}
        ></div>
      </div>
    </div>
  );
};