import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, RefreshCw, Settings, Gift, Lock, Sparkles, CreditCard, Crown, ExternalLink } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { createCheckoutSession, createPortalSession } from '../services/stripe'
import { STRIPE_CONFIG } from '../config/stripe'
import GiftPurchaseModal from '../components/common/GiftPurchaseModal'
import { useFounderOffer } from '../context/FounderOfferContext'
import { formatCurrency } from '../utils/currencyUtils'
import { getPlanPricing } from '../utils/subscriptionPlans'

export default function AccountSubscription() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  const [sub, setSub] = useState(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const founderOffer = useFounderOffer()
  
  // Load subscription
  useEffect(() => {
    const loadSub = async () => {
      try {
        const { loadUserSubscription } = await import('../services/cloudStorage')
        if (firebaseUser) {
          const subscription = await loadUserSubscription(firebaseUser.uid)
          setSub(subscription)
        }
      } catch (error) {
        console.error('Failed to load subscription:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSub()
  }, [firebaseUser])

  // Get pricing with founder discount
  const pricing = {
    monthly: getPlanPricing('monthly', founderOffer.founderActive ? founderOffer.discountPercent : 0),
    annual: getPlanPricing('annual', founderOffer.founderActive ? founderOffer.discountPercent : 0),
    lifetime: getPlanPricing('lifetime', founderOffer.founderActive ? founderOffer.discountPercent : 0)
  }

  const handleSelectPlan = async (planKey) => {
    try {
      let priceId = STRIPE_CONFIG.prices[planKey]
      if (planKey === 'lifetime' && founderOffer.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
        priceId = STRIPE_CONFIG.founder.lifetimePrice
      }
      await createCheckoutSession(priceId, firebaseUser?.email, firebaseUser?.uid)
    } catch (error) {
      console.error('Checkout error:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
      }))
    }
  }

  const handleManageBilling = async () => {
    try {
      // Check if subscription is from Google Play
      if (sub?.paymentProvider === 'googleplay' || sub?.source === 'google_play') {
        // Redirect to Google Play subscription management
        const googlePlayUrl = 'https://play.google.com/store/account/subscriptions'
        window.open(googlePlayUrl, '_blank')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Opening Google Play subscription management...', type: 'info' } 
        }))
        return
      }

      // Check if subscription is from Apple
      if (sub?.paymentProvider === 'apple' || sub?.source === 'apple') {
        // Redirect to Apple subscription management
        const appleUrl = 'https://apps.apple.com/account/subscriptions'
        window.open(appleUrl, '_blank')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Opening Apple subscription management...', type: 'info' } 
        }))
        return
      }

      // For Stripe subscriptions, open the portal
      if (sub?.stripeCustomerId) {
        await createPortalSession(sub.stripeCustomerId)
        return
      }

      // No subscription or unknown provider
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'No active subscription found.', type: 'error' } 
      }))
    } catch (error) {
      console.error('Portal error:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to open billing portal.', type: 'error' } 
      }))
    }
  }

  // Determine subscription status
  const getStatus = () => {
    if (!sub) return { label: 'Trial Expired', type: 'expired' }
    if (sub.interval === 'lifetime' || sub.hasLifetimeAccess) return { label: 'Lifetime Access', type: 'lifetime' }
    if (sub.status === 'trialing') return { label: 'Active Trial', type: 'trial' }
    if (sub.interval === 'month') return { label: 'Monthly Plan', type: 'monthly' }
    if (sub.interval === 'year') return { label: 'Annual Plan', type: 'annual' }
    return { label: 'Active', type: 'active' }
  }

  const status = getStatus()

  const getSource = () => {
    if (!sub) return ''
    console.log('Subscription data:', sub) // Debug log
    // Check paymentProvider field (used by backend)
    if (sub.paymentProvider === 'googleplay') return 'VIA GOOGLE PLAY'
    if (sub.paymentProvider === 'apple') return 'VIA APPLE'
    if (sub.paymentProvider === 'stripe') return 'VIA STRIPE'
    // Fallback checks for older data
    if (sub.source === 'google_play') return 'VIA GOOGLE PLAY'
    if (sub.source === 'apple') return 'VIA APPLE'
    if (sub.source === 'stripe' || sub.paymentMethodId) return 'VIA STRIPE'
    if (sub.interval === 'lifetime' && !sub.paymentMethodId && !sub.paymentProvider) return 'LIFETIME KIT REDEMPTION'
    return ''
  }

  return (
    <section className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header - Same style as Appearance page */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/account')}
            className="p-2 rounded-full hover:opacity-80 transition-all"
            style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
          >
            <ArrowLeft size={20} style={{ color: theme.text }} />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Research Subscription</h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Manage Subscription & Billing
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      {/* SUBSCRIPTION STATUS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="opacity-40" style={{ color: theme.text }} />
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Subscription Status
            </h2>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:opacity-80 transition-all"
            style={{ backgroundColor: 'transparent', border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}
          >
            <RefreshCw size={12} className="opacity-60" style={{ color: theme.text }} />
            <span className="text-xs font-medium opacity-60" style={{ color: theme.text }}>SYNC</span>
          </button>
        </div>

        {/* Status Card */}
        <div 
          className="p-5 rounded-2xl"
          style={{ 
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div 
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}
              >
                <CreditCard size={22} style={{ color: theme.text, opacity: 0.6 }} />
              </div>
              <div>
                <h3 className="text-lg font-black mb-1" style={{ color: theme.text }}>{status.label}</h3>
                {getSource() && (
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight, opacity: 0.6 }}>
                    {getSource()}
                  </p>
                )}
              </div>
            </div>
            <div 
              className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                color: theme.text,
                opacity: 0.6
              }}
            >
              ACTIVE
            </div>
          </div>
        </div>
      </div>

      {/* UPGRADE OPTIONS */}
      {status.type !== 'lifetime' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="opacity-40" style={{ color: theme.text }} />
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Upgrade Options
            </h2>
          </div>

          {/* Beta Pricing Banner - Always show for beta users */}
          <div 
            className="p-4 rounded-2xl text-center"
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
            }}
          >
            <div className="flex items-center justify-center gap-2.5 mb-1.5">
              <Lock size={20} style={{ color: theme.isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)' }} />
              <h3 className="text-base font-bold tracking-wide" style={{ color: theme.isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
                BETA PRICING LOCKED
              </h3>
            </div>
            <p className="text-sm" style={{ color: theme.isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)' }}>
              Early adopters are grandfathered in at these rates forever.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Annual Plan */}
            {status.type !== 'annual' && pricing.annual && (
              <div 
                className="p-4 rounded-2xl border relative"
                style={{ 
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              >
                <div 
                  className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight"
                  style={{ 
                    backgroundColor: theme.primary,
                    color: '#ffffff'
                  }}
                >
                  {founderOffer.isFounder ? 'Founder Locked' : 'Best Value'}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold" style={{ color: theme.text }}>Annual Plan</h3>
                  <Crown size={16} className="opacity-40" style={{ color: theme.text }} />
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-2xl font-bold" style={{ color: theme.text }}>
                      {formatCurrency(pricing.annual.founderPrice)}
                    </span>
                    <span className="text-xs opacity-40" style={{ color: theme.text }}>/year</span>
                  </div>
                  {pricing.annual.savings > 0 && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                      SAVE {formatCurrency(pricing.annual.savings)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSelectPlan('annual')}
                  className="w-full py-2 rounded-lg font-medium transition-all hover:opacity-90 text-xs"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'}`
                  }}
                >
                  Select Annual
                </button>
              </div>
            )}

            {/* Lifetime Plan */}
            {pricing.lifetime && (
              <div 
                className="p-4 rounded-2xl border relative"
                style={{ 
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              >
                <div 
                  className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight"
                  style={{ 
                    backgroundColor: theme.primary,
                    color: '#ffffff'
                  }}
                >
                  LIMITED TIME
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold" style={{ color: theme.text }}>Lifetime Plan</h3>
                  <Sparkles size={16} className="opacity-40" style={{ color: theme.text }} />
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-2xl font-bold" style={{ color: theme.text }}>
                      {formatCurrency(pricing.lifetime.founderPrice)}
                    </span>
                    <span className="text-xs opacity-40" style={{ color: theme.text }}>/once</span>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                    ONE-TIME COST
                  </p>
                </div>
                <button
                  onClick={() => handleSelectPlan('lifetime')}
                  className="w-full py-2 rounded-lg font-medium transition-all hover:opacity-90 text-xs"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'}`
                  }}
                >
                  Select Lifetime
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        <button
          onClick={handleManageBilling}
          className="flex items-center justify-between p-5 rounded-2xl transition-all hover:opacity-80 text-left"
          style={{ 
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}
            >
              <Settings size={20} className="opacity-60" style={{ color: theme.text }} />
            </div>
            <div>
              <div className="font-bold text-base" style={{ color: theme.text }}>Manage Billing</div>
              {getSource() && (
                <div className="text-xs opacity-60" style={{ color: theme.text }}>{getSource()}</div>
              )}
            </div>
          </div>
          <ExternalLink size={16} className="opacity-40" style={{ color: theme.text }} />
        </button>
        
        <button
          onClick={() => setShowGiftModal(true)}
          className="flex items-center justify-between p-5 rounded-2xl transition-all hover:opacity-80 text-left"
          style={{ 
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}
            >
              <Gift size={20} className="opacity-60" style={{ color: theme.text }} />
            </div>
            <div>
              <div className="font-bold text-base" style={{ color: theme.text }}>Give a Gift</div>
              <div className="text-xs opacity-60" style={{ color: theme.text }}>Share research tools</div>
            </div>
          </div>
          <ArrowLeft size={16} className="opacity-40 rotate-180" style={{ color: theme.text }} />
        </button>
      </div>

      {/* Gift Modal */}
      {showGiftModal && (
        <GiftPurchaseModal
          isOpen={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          theme={theme}
        />
      )}
    </section>
  )
}
