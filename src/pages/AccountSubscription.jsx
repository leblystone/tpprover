import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Settings, Sparkles, CreditCard, Crown, ExternalLink, Shield } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { createCheckoutSession, createPortalSession } from '../services/stripe'
import { subscribe as paymentSubscribe } from '../services/payment/paymentService'
import { isNative } from '../utils/platform'
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
      if (isNative()) {
        await paymentSubscribe(planKey, {
          userEmail: firebaseUser?.email || '',
          userId: firebaseUser?.uid || '',
        })
        // Reload subscription after successful native purchase
        try {
          const { loadUserSubscription } = await import('../services/cloudStorage')
          const updatedSub = await loadUserSubscription(firebaseUser.uid)
          setSub(updatedSub)
        } catch (reloadErr) {
          console.warn('Could not reload subscription after purchase:', reloadErr)
        }
      } else {
        let priceId = STRIPE_CONFIG.prices[planKey]
        if (planKey === 'lifetime' && founderOffer.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
          priceId = STRIPE_CONFIG.founder.lifetimePrice
        }
        await createCheckoutSession(priceId, firebaseUser?.email, firebaseUser?.uid)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
      }))
    }
  }

  const handleManageBilling = async () => {
    try {
      console.log('💳 [BILLING] ===== STARTING BILLING MANAGEMENT =====')
      console.log('💳 [BILLING] Subscription object:', sub)

      if (!sub) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'No active subscription found. Please select a plan first.', 
            type: 'info' 
          } 
        }))
        return
      }
      
      if (sub?.hasLifetimeAccess || sub?.interval === 'lifetime' || sub?.plan === 'lifetime') {
        console.log('💳 [BILLING] Detected lifetime access - routing to lifetime billing')
        navigate('/app/account/subscription/lifetime-billing')
        return
      }

      // Redemption code purchases (physical cards) — no recurring billing
      if (sub?.source === 'annual-kit' || sub?.source === 'lifetime-kit' || 
          sub?.lifetimeReason?.toLowerCase().includes('kit redemption')) {
        console.log('💳 [BILLING] Detected redemption code purchase')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Your access was activated with a redemption code. This is a one-time purchase with no recurring billing. Refer to your redemption card for details.', 
            type: 'info',
            duration: 6000
          } 
        }))
        return
      }

      // Gift access — no billing to manage
      if (sub?.type === 'gift' || sub?.giftId) {
        console.log('💳 [BILLING] Detected gift access')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'This access was gifted to you! There is no billing to manage — enjoy your gift!', 
            type: 'info',
            duration: 5000
          } 
        }))
        return
      }
      
      const hasGooglePlayProductId = sub?.googlePlayProductId
      const hasGooglePlayOrderId = sub?.googlePlayOrderId
      const hasGooglePlayPurchaseToken = sub?.googlePlayPurchaseToken
      
      if (hasGooglePlayProductId || hasGooglePlayOrderId || hasGooglePlayPurchaseToken) {
        console.log('💳 [BILLING] Detected Google Play subscription')
        const playStoreUrl = 'https://play.google.com/store/account/subscriptions'
        
        if (window.Capacitor && window.Capacitor.Plugins?.App) {
          try {
            await window.Capacitor.Plugins.App.openUrl({ url: playStoreUrl })
            return
          } catch (error) {
            console.warn('Failed to open Play Store app, falling back to web:', error)
          }
        }
        
        window.open(playStoreUrl, '_blank')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Opening Google Play Store to manage your subscription...', 
            type: 'info' 
          } 
        }))
        return
      }
      
      // Determine payment provider from subscription
      // Check paymentProvider field first (most reliable)
      let paymentProvider = sub?.paymentProvider
      
      // Normalize provider name if it exists
      if (paymentProvider === 'google_play') paymentProvider = 'googleplay'
      if (paymentProvider === 'appstore') paymentProvider = 'apple'
      
      // Fallback: Detect from subscription data
      // IMPORTANT: Check Google Play BEFORE Stripe, since Stripe fields might be null/undefined
      if (!paymentProvider) {
        // Google Play indicators (check these first)
        if (sub?.googlePlayPurchaseToken || 
            sub?.googlePlayProductId || 
            sub?.googlePlayOrderId ||
            sub?.source === 'google_play' ||
            sub?.source === 'googleplay') {
          paymentProvider = 'googleplay'
        }
        // Apple indicators
        else if (sub?.appStoreTransactionId || 
                 sub?.appStoreProductId ||
                 sub?.source === 'apple' ||
                 sub?.source === 'appstore') {
          paymentProvider = 'apple'
        }
        // Squarespace indicators
        else if (sub?.squarespaceSubscriptionId || 
                 sub?.squarespaceOrderId ||
                 sub?.source === 'squarespace') {
          paymentProvider = 'squarespace'
        }
        // Stripe indicators (check last, as these might be null for other providers)
        else if (sub?.stripeCustomerId || sub?.customerId || sub?.stripeSubscriptionId) {
          paymentProvider = 'stripe'
        }
        // Final fallback: Check source using same logic as getSource() function
        else if (sub) {
          // Check paymentProvider field (used by backend)
          if (sub.paymentProvider === 'googleplay') {
            paymentProvider = 'googleplay'
          } else if (sub.paymentProvider === 'apple') {
            paymentProvider = 'apple'
          } else if (sub.paymentProvider === 'squarespace') {
            paymentProvider = 'squarespace'
          } else if (sub.paymentProvider === 'stripe') {
            paymentProvider = 'stripe'
          }
          // Fallback checks for older data
          else if (sub.source === 'google_play') {
            paymentProvider = 'googleplay'
          } else if (sub.source === 'apple') {
            paymentProvider = 'apple'
          } else if (sub.source === 'squarespace') {
            paymentProvider = 'squarespace'
          } else if (sub.source === 'stripe' || sub.paymentMethodId) {
            paymentProvider = 'stripe'
          }
        }
      }
      
      // Final normalization
      if (paymentProvider === 'google_play') paymentProvider = 'googleplay'
      if (paymentProvider === 'appstore') paymentProvider = 'apple'

      console.log('💳 [BILLING] Payment provider detected:', paymentProvider)

      // Route to appropriate billing management based on provider
      if (paymentProvider === 'googleplay' || paymentProvider === 'google_play') {
        // Google Play subscriptions must be managed through Google Play Store
        // Use the general subscriptions page - users can find their subscription there
        const playStoreUrl = 'https://play.google.com/store/account/subscriptions'
        
        // On Android, try to open the Play Store app first
        if (window.Capacitor && window.Capacitor.Plugins?.App) {
          try {
            // Try to open in Play Store app
            await window.Capacitor.Plugins.App.openUrl({ url: playStoreUrl })
            return
          } catch (error) {
            console.warn('Failed to open Play Store app, falling back to web:', error)
          }
        }
        
        // Fallback to web URL
        window.open(playStoreUrl, '_blank')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Opening Google Play Store to manage your subscription...', 
            type: 'info' 
          } 
        }))
        return
      }

      if (paymentProvider === 'apple' || paymentProvider === 'appstore') {
        // iOS subscriptions must be managed through App Store settings
        // On iOS, we can't directly open App Store subscriptions, so show instructions
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'To manage your subscription, go to Settings → Apple ID → Subscriptions on your iOS device.', 
            type: 'info',
            duration: 6000
          } 
        }))
        return
      }

      if (paymentProvider === 'squarespace') {
        // Squarespace subscriptions must be managed through Squarespace customer portal
        // Get Squarespace site URL from config
        const { getEnvVar } = await import('../config/appConfig')
        const squarespaceSiteUrl = getEnvVar('VITE_SQUARESPACE_SITE_URL') || 'https://www.thepepplanner.com'
        const portalUrl = `${squarespaceSiteUrl}/account`
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Opening Squarespace customer portal to manage your subscription...', 
            type: 'info' 
          } 
        }))
        
        // Open Squarespace customer portal in new tab
        window.open(portalUrl, '_blank')
        return
      }

      // If we still don't have a provider, show error
      if (!paymentProvider) {
        console.error('❌ Could not determine payment provider. Subscription data:', sub)
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Unable to determine subscription provider. Please contact support with your subscription details.', 
            type: 'error' 
          } 
        }))
        return
      }

      // Default to Stripe for web/PWA subscriptions or if provider is 'stripe'
      if (paymentProvider === 'stripe') {
        // Get customerId from subscription data first
        let customerId = sub?.stripeCustomerId || sub?.customerId
        
        // Fallback: If not in subscription, check user document
        if (!customerId && firebaseUser) {
          try {
            const { db } = await import('../config/firebase')
            const { doc, getDoc } = await import('firebase/firestore')
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (userDoc.exists()) {
              customerId = userDoc.data()?.stripeCustomerId
            }
          } catch (error) {
            console.warn('Failed to fetch customerId from user document:', error)
          }
        }
        
        if (!customerId) {
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { 
              message: 'Unable to find billing information. Please try refreshing the page or contact support if the issue persists.', 
              type: 'error' 
            } 
          }))
          return
        }

        // Open Stripe Customer Portal
        const result = await createPortalSession(customerId)
        
        if (result?.url) {
          // Redirect to Stripe Customer Portal
          window.location.href = result.url
        } else {
          throw new Error('No portal URL returned')
        }
        return
      }

      // If we can't determine the provider, show an error
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Unable to determine subscription provider. Please contact support.', 
          type: 'error' 
        } 
      }))
    } catch (error) {
      console.error('Billing management error:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: error.message || 'Failed to open billing management. Please try again or contact support.', 
          type: 'error' 
        } 
      }))
    }
  }

  // Determine subscription status
  const getStatus = () => {
    if (isLoading) return { label: 'Loading...', type: 'loading' }
    if (!sub) return { label: 'No Active Subscription', type: 'expired' }
    if (sub.interval === 'lifetime' || sub.hasLifetimeAccess) return { label: 'Lifetime Access', type: 'lifetime' }
    if (sub.status === 'trialing') {
      const endDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
      const now = new Date()
      if (endDate && endDate > now) {
        const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
        return { label: `Active Trial · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, type: 'trial' }
      }
      return { label: 'Trial Expired', type: 'expired' }
    }
    if (sub.status === 'canceled') {
      const endDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
      const now = new Date()
      if (endDate && endDate > now) {
        const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
        const planLabel = sub.interval === 'year' ? 'Annual' : 'Monthly'
        return { label: `${planLabel} · Cancels in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, type: sub.interval === 'year' ? 'annual' : 'monthly' }
      }
      return { label: 'Subscription Ended', type: 'expired' }
    }
    if (sub.status === 'past_due') return { label: 'Payment Issue', type: 'past_due' }
    if (sub.status === 'on_hold') return { label: 'On Hold', type: 'expired' }
    if (sub.status === 'paused') return { label: 'Paused', type: 'expired' }
    if (sub.interval === 'month') return { label: 'Monthly Plan', type: 'monthly' }
    if (sub.interval === 'year') return { label: 'Annual Plan', type: 'annual' }
    return { label: 'Active', type: 'active' }
  }

  const status = getStatus()

  const getSource = () => {
    if (!sub) return ''
    // Redemption codes (physical cards)
    if (sub.source === 'annual-kit') return 'VIA REDEMPTION CODE'
    if (sub.source === 'lifetime-kit') return 'VIA REDEMPTION CODE'
    if (sub.lifetimeReason?.toLowerCase().includes('kit redemption')) return 'VIA REDEMPTION CODE'
    // Gift access
    if (sub.type === 'gift' || sub.giftId) return 'VIA GIFT'
    // Check paymentProvider field (used by backend)
    if (sub.paymentProvider === 'googleplay') return 'VIA GOOGLE PLAY'
    if (sub.paymentProvider === 'apple') return 'VIA APPLE'
    if (sub.paymentProvider === 'squarespace') return 'VIA SQUARESPACE'
    if (sub.paymentProvider === 'stripe') return 'VIA STRIPE'
    // Fallback checks for older data
    if (sub.source === 'google_play') return 'VIA GOOGLE PLAY'
    if (sub.source === 'apple') return 'VIA APPLE'
    if (sub.source === 'squarespace') return 'VIA SQUARESPACE'
    if (sub.source === 'stripe' || sub.paymentMethodId) return 'VIA STRIPE'
    return ''
  }

  return (
    <section className="page-bg max-w-4xl mx-auto space-y-6 pb-10">
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
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Research Subscription</h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Manage Subscription & Billing
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      {/* SUBSCRIPTION STATUS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="opacity-40" style={{ color: theme.text }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
            Subscription Status
          </h2>
        </div>

        {/* Status Card */}
        <div 
          className="content-section p-5 rounded-2xl"
          style={{ 
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
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
                <h3 className="text-lg font-semibold mb-1" style={{ color: theme.text }}>{status.label}</h3>
                {getSource() && (
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight, opacity: 0.6 }}>
                    {getSource()}
                  </p>
                )}
              </div>
            </div>
            <div 
              className="px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide"
              style={{ 
                backgroundColor: status.type === 'loading' ? 'transparent'
                  : ['expired', 'past_due'].includes(status.type) 
                    ? (theme.isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)')
                    : (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                color: ['expired', 'past_due'].includes(status.type) ? '#ef4444' : theme.text,
                opacity: status.type === 'loading' ? 0 : 0.6
              }}
            >
              {status.type === 'loading' ? '' 
                : status.type === 'expired' ? 'EXPIRED'
                : status.type === 'past_due' ? 'ACTION NEEDED'
                : 'ACTIVE'}
            </div>
          </div>
        </div>
      </div>

      {/* UPGRADE OPTIONS */}
      {status.type !== 'lifetime' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="opacity-40" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Upgrade Options
            </h2>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monthly Plan */}
            {status.type !== 'monthly' && pricing.monthly && (
              <div 
                className="content-section p-6 rounded-3xl border relative btn-primary-inset"
                style={{ 
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Monthly Plan</h3>
                  <CreditCard size={20} className="opacity-40" style={{ color: theme.text }} />
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold" style={{ color: theme.text }}>
                      {formatCurrency(pricing.monthly.founderPrice)}
                    </span>
                    <span className="text-sm opacity-40" style={{ color: theme.text }}>/month</span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                    CANCEL ANYTIME
                  </p>
                </div>
                <button
                  onClick={() => handleSelectPlan('monthly')}
                  className="w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 text-sm"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `2px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                  }}
                >
                  Select Monthly
                </button>
              </div>
            )}

            {/* Annual Plan */}
            {status.type !== 'annual' && pricing.annual && (
              <div 
                className="content-section p-6 rounded-3xl border relative btn-primary-inset"
                style={{ 
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-tighter"
                  style={{ 
                    backgroundColor: theme.primary,
                    color: '#ffffff'
                  }}
                >
                  {founderOffer.isFounder ? 'Founder Locked' : 'Best Value'}
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Annual Plan</h3>
                  <Crown size={20} className="opacity-40" style={{ color: theme.text }} />
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold" style={{ color: theme.text }}>
                      {formatCurrency(pricing.annual.founderPrice)}
                    </span>
                    <span className="text-sm opacity-40" style={{ color: theme.text }}>/year</span>
                  </div>
                  {pricing.annual.savings > 0 && (
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>
                      SAVE {formatCurrency(pricing.annual.savings)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleSelectPlan('annual')}
                  className="w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 text-sm"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `2px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                  }}
                >
                  Select Annual
                </button>
              </div>
            )}

            {/* Lifetime Plan */}
            {pricing.lifetime && (
              <div 
                className="content-section p-6 rounded-3xl border relative btn-primary-inset"
                style={{ 
                  borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{ 
                    backgroundColor: theme.primary,
                    color: '#ffffff'
                  }}
                >
                  LIMITED TIME
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Lifetime Plan</h3>
                  <Sparkles size={20} className="opacity-40" style={{ color: theme.text }} />
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold" style={{ color: theme.text }}>
                      {formatCurrency(pricing.lifetime.founderPrice)}
                    </span>
                    <span className="text-sm opacity-40" style={{ color: theme.text }}>/once</span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                    ONE-TIME COST
                  </p>
                </div>
                <button
                  onClick={() => handleSelectPlan('lifetime')}
                  className="w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 text-sm"
                  style={{ 
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `2px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
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
      <div className="pt-6">
        <button
          onClick={handleManageBilling}
          disabled={!sub || status.type === 'expired' || status.type === 'trial'}
          className="content-section w-full flex items-center justify-between p-5 rounded-2xl transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ 
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            >
              <Settings size={20} className="opacity-60" style={{ color: theme.text }} />
            </div>
            <div>
              <div className="font-semibold text-base" style={{ color: theme.text }}>
                {getSource() === 'VIA REDEMPTION CODE' ? 'Purchase Details' 
                  : getSource() === 'VIA GIFT' ? 'Gift Details'
                  : 'Manage Billing'}
              </div>
              {getSource() ? (
                <div className="text-xs opacity-60" style={{ color: theme.text }}>{getSource()}</div>
              ) : (
                <div className="text-xs opacity-40" style={{ color: theme.text }}>Subscribe to a plan first</div>
              )}
            </div>
          </div>
          {getSource() !== 'VIA REDEMPTION CODE' && getSource() !== 'VIA GIFT' && (
            <ExternalLink size={16} className="opacity-40" style={{ color: theme.text }} />
          )}
        </button>
      </div>

      {/* Trust - Secure payment disclaimer */}
      <div className="pt-8 pb-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="opacity-40" style={{ color: theme.text }} />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Secure Payment Processing
            </span>
          </div>

          <p className="text-xs text-center opacity-50 max-w-md" style={{ color: theme.text }}>
            The Pep Planner does not store or process any private payment information. 
            All payments are securely handled exclusively through your platform provider.
          </p>
        </div>
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
