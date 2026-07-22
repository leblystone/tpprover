import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import {
  IconContext,
  ArrowLeft,
  TrendUp,
  GearSix,
  Sparkle,
  CreditCard,
  ArrowSquareOut,
  Shield,
  Clock,
  SealQuestion,
  CheckCircle,
  DownloadSimple,
  Trash,
  Lock,
  CaretRight,
} from '@phosphor-icons/react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import FounderBadge from '../components/common/FounderBadge'
import { createCheckoutSession, createPortalSession } from '../services/stripe'
import { subscribe as paymentSubscribe } from '../services/payment/paymentService'
import { isNative, isIOS, isAndroid } from '../utils/platform'
import { STRIPE_CONFIG } from '../config/stripe'
import { isFoundingMember } from '../utils/subscriptionPlans'
import Modal from '../components/common/Modal'
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal'
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal'
import { useFounderOffer } from '../context/FounderOfferContext'
import { formatCurrency } from '../utils/currencyUtils'
import { getPlanPricing } from '../utils/subscriptionPlans'
import { useSubscriptionAccess, useTierAccess } from '../utils/useSubscriptionAccess'

function SyncSubscriptionButton({ theme, user }) {
  const [status, setStatus] = React.useState('idle')
  const [message, setMessage] = React.useState('')

  const handleSync = async () => {
    setStatus('loading')
    setMessage('')
    try {
      if (isIOS()) {
        const { restorePurchases } = await import('../services/payment/appStoreIAPService')
        const result = await restorePurchases({
          userId: user?.uid || user?.id || '',
          userEmail: user?.email || '',
        })
        if (result.purchasesVerified > 0) {
          setStatus('success')
          setMessage(`Subscription synced. Refreshing…`)
          setTimeout(() => window.location.reload(), 2000)
        } else if (result.purchasesFound === 0) {
          setStatus('error')
          setMessage('No previous purchases found on this Apple ID.')
        } else {
          setStatus('error')
          setMessage('Purchases found but could not be verified. Please contact support.')
        }
      } else if (isAndroid()) {
        const { restorePurchases } = await import('../services/payment/googlePlayBillingService')
        const result = await restorePurchases({
          userId: user?.uid || user?.id || '',
          userEmail: user?.email || '',
        })
        if (result.purchasesVerified > 0) {
          setStatus('success')
          setMessage(`Subscription synced. Refreshing…`)
          setTimeout(() => window.location.reload(), 2000)
        } else if (result.purchasesFound === 0) {
          setStatus('error')
          setMessage('No previous purchases found on this Google account.')
        } else {
          setStatus('error')
          setMessage('Purchases found but could not be verified. Please contact support.')
        }
      } else {
        const { getFunctions, httpsCallable } = await import('firebase/functions')
        const syncFn = httpsCallable(getFunctions(), 'syncMyStripeSubscription')
        const result = await syncFn()
        setStatus('success')
        setMessage(`Subscription synced: ${result.data.plan}. Refreshing…`)
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (err) {
      setStatus('error')
      setMessage(err?.message || 'Sync failed. Please try again or contact support.')
    }
  }

  return (
    <div className="pt-4 pb-2 flex flex-col items-center gap-2">
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="text-xs font-medium underline underline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ color: theme.primary }}
      >
        {status === 'loading' ? 'Syncing subscription…' : 'Sync Subscription'}
      </button>
      {message && (
        <p
          className="text-[11px] text-center px-4"
          style={{ color: status === 'success' ? theme.success || theme.primary : theme.error || '#ef4444' }}
        >
          {message}
        </p>
      )}
    </div>
  )
}

export default function AccountSubscription() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  const userForFounder = {
    ...user,
    createdAt: user?.createdAt || firebaseUser?.metadata?.creationTime || null,
  }
  
  const { subscriptionStatus: accessStatus } = useSubscriptionAccess()
  const { isFounder: tierIsFounder } = useTierAccess()
  const [sub, setSub] = useState(null)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [showTrialInfo, setShowTrialInfo] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const founderOffer = useFounderOffer()
  
  // Load subscription
  useEffect(() => {
    const loadSub = async () => {
      try {
        const { loadUserSubscription } = await import('../services/cloudStorage')
        if (firebaseUser) {
          const cloudSub = await loadUserSubscription(firebaseUser.uid)
          if (cloudSub) {
            setSub(cloudSub)
          } else {
            // Cloud returned nothing (new signup, offline, or cloud save timed out)
            // Fall back to localStorage so the trial card renders immediately
            try {
              const localRaw = localStorage.getItem('tpprover_subscription')
              if (localRaw) setSub(JSON.parse(localRaw))
            } catch (localErr) {
              console.warn('Could not read subscription from localStorage:', localErr)
            }
          }
        }
      } catch (error) {
        console.error('Failed to load subscription:', error)
        // Always try localStorage on any cloud error
        try {
          const localRaw = localStorage.getItem('tpprover_subscription')
          if (localRaw) setSub(JSON.parse(localRaw))
        } catch {}
      } finally {
        setIsLoading(false)
      }
    }
    loadSub()
  }, [firebaseUser])

  // Require both the date-based eligibility AND the subscription tier to confirm founder
  // This ensures a manually adjusted test account (isFounder:false on sub) shows R+ prices
  const isFounder = isFoundingMember(userForFounder) && tierIsFounder

  // Founders see grandfathered rates; everyone else sees Research+ prices
  const pricing = isFounder ? {
    monthly: getPlanPricing('founderMonthly', founderOffer.founderActive ? founderOffer.discountPercent : 0),
    annual: getPlanPricing('founderAnnual', founderOffer.founderActive ? founderOffer.discountPercent : 0),
    lifetime: getPlanPricing('founderLifetime', founderOffer.founderActive ? founderOffer.discountPercent : 0),
  } : {
    monthly: getPlanPricing('researchPlusMonthly', 0),
    annual: getPlanPricing('researchPlusAnnual', 0),
    lifetime: getPlanPricing('researchPlusLifetime', 0),
  }

  const stripePlanKey = (interval) => {
    if (isFounder) {
      return interval // 'monthly' | 'annual' | 'lifetime' — legacy founder IDs
    }
    const map = { monthly: 'researchPlusMonthly', annual: 'researchPlusAnnual', lifetime: 'researchPlusLifetime' }
    return map[interval] || interval
  }

  const handleSelectPlan = async (planKey) => {
    try {
      const resolvedKey = stripePlanKey(planKey)
      if (isNative()) {
        await paymentSubscribe(resolvedKey, {
          userEmail: firebaseUser?.email || '',
          userId: firebaseUser?.uid || '',
        })
        try {
          const { loadUserSubscription } = await import('../services/cloudStorage')
          const updatedSub = await loadUserSubscription(firebaseUser.uid)
          setSub(updatedSub)
        } catch (reloadErr) {
          console.warn('Could not reload subscription after purchase:', reloadErr)
        }
      } else {
        let priceId = STRIPE_CONFIG.prices[resolvedKey]
        if (planKey === 'lifetime' && isFounder && founderOffer.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
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
    // If the subscription record explicitly says trialing with a future end date,
    // trust it directly — the async access hook can lag behind Firestore on slow
    // networks and would otherwise flash "Free Plan" while still processing.
    if (sub?.status === 'trialing') {
      const endDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
      const now = new Date()
      if (endDate && endDate > now) {
        const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
        return { label: `Active Trial · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, type: 'trial' }
      }
      // Trial ended → move to free plan, no "expired" language
      return { label: 'Free Research Plan', type: 'free' }
    }
    // If the access layer says free/expired, always show Free Plan — this
    // respects the dev override AND real expired state regardless of sub object.
    if (accessStatus === 'expired' || accessStatus === 'error') {
      return { label: 'Free Research Plan', type: 'free' }
    }
    // No subscription record at all → free plan
    if (!sub) return { label: 'Free Research Plan', type: 'free' }
    if (sub.interval === 'lifetime' || sub.hasLifetimeAccess) return { label: 'Lifetime Access', type: 'lifetime' }
    if (sub.status === 'canceled') {
      const endDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
      const now = new Date()
      if (endDate && endDate > now) {
        const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
        const planLabel = sub.interval === 'year' ? 'Annual' : 'Monthly'
        return { label: `${planLabel} · Cancels in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`, type: sub.interval === 'year' ? 'annual' : 'monthly' }
      }
      // Cancelled and period over → free plan
      return { label: 'Free Research Plan', type: 'free' }
    }
    if (sub.status === 'past_due') return { label: 'Payment Issue', type: 'past_due' }
    if (sub.status === 'on_hold') return { label: 'Free Research Plan', type: 'free' }
    if (sub.status === 'paused') return { label: 'Free Research Plan', type: 'free' }
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
    <IconContext.Provider value={{ weight: 'duotone' }}>
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>
                Research<style>{`
                  @keyframes plusShine {
                    0%   { background-position: -250% center, center center; }
                    35%  { background-position: 250% center, center center; }
                    100% { background-position: 250% center, center center; }
                  }
                `}</style><span
                  style={{
                    fontWeight: 700,
                    fontSize: '1.35em',
                    lineHeight: 1,
                    verticalAlign: 'middle',
                    display: 'inline-block',
                    background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.9) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.9) 55%, transparent 80%) no-repeat, linear-gradient(135deg, #C8912A 0%, #E8C55A 35%, #F5D97A 50%, #E8C55A 65%, #B8822A 100%)',
                    backgroundSize: '60% 100%, 100% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'plusShine 3.2s ease-in-out infinite',
                  }}
                >+</span>
              </h1>
              <FounderBadge user={userForFounder} theme={theme} size="sm" />
            </div>
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
        <div className="flex items-center gap-2 px-1 w-full min-w-0">
          <TrendUp size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
            Subscription Status
          </h2>
          <div
            className="flex-1 h-px min-w-0"
            style={{
              background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
            }}
          />
        </div>

        {/* Status Card */}
        <div 
          className="content-section p-5 rounded-2xl"
          style={{ 
            border: status.type === 'trial'
              ? '1px solid rgba(212,160,48,0.30)'
              : `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            ...(status.type === 'trial' ? {
              background: theme.isDark
                ? 'linear-gradient(135deg, rgba(212,160,48,0.06) 0%, transparent 100%)'
                : 'linear-gradient(135deg, rgba(212,160,48,0.08) 0%, transparent 100%)',
            } : {})
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div 
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: status.type === 'trial'
                  ? 'rgba(212,160,48,0.12)'
                  : (theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)')
                }}
              >
                {status.type === 'trial'
                  ? <Clock size={22} style={{ color: '#D4A030', opacity: 0.85 }} />
                  : <CreditCard size={22} style={{ color: theme.text, opacity: 0.6 }} />
                }
              </div>
              <div>
                <h3 className="text-base font-semibold" style={{ color: theme.text }}>
                  {status.type === 'trial' ? 'Free Trial Active' : status.label}
                </h3>
                {status.type === 'trial' ? (
                  <p className="text-xs mt-0.5" style={{ color: theme.text, opacity: 0.55 }}>
                    {(() => {
                      const endDate = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null
                      const daysLeft = endDate ? Math.max(0, Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24))) : null
                      return daysLeft !== null
                        ? <>{`Ends in `}<span style={{ color: '#D4A030', fontWeight: 600, opacity: 1 }}>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>{` — subscribe to keep full access`}</>
                        : <>Subscribe to keep full access</>
                    })()}
                  </p>
                ) : status.type === 'free' ? (
                  <p className="text-xs mt-0.5" style={{ color: theme.text, opacity: 0.55 }}>
                    Core research, no time limit — upgrade anytime for the full research experience
                  </p>
                ) : getSource() ? (
                  <p className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: theme.textLight, opacity: 0.6 }}>
                    {getSource()}
                  </p>
                ) : null}
              </div>
            </div>
            <div 
              className="px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide shrink-0"
              style={{ 
                backgroundColor: status.type === 'loading' ? 'transparent'
                  : status.type === 'past_due'
                    ? (theme.isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)')
                  : status.type === 'trial'
                    ? 'rgba(212,160,48,0.15)'
                    : (theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                color: status.type === 'past_due' ? '#ef4444'
                  : status.type === 'trial' ? '#D4A030'
                  : theme.text,
                opacity: status.type === 'loading' ? 0 : (status.type === 'trial' ? 1 : 0.6)
              }}
            >
              {status.type === 'loading' ? ''
                : status.type === 'past_due' ? 'ACTION NEEDED'
                : status.type === 'trial' ? 'TRIAL'
                : status.type === 'free' ? 'FREE'
                : 'ACTIVE'}
            </div>
          </div>
        </div>

        {/* Trial info link — only while trial is still active */}
        {status.type === 'trial' && (
          <button
            onClick={() => setShowTrialInfo(true)}
            className="flex items-center gap-1.5 mx-auto mt-2 text-xs hover:opacity-80 transition-opacity"
            style={{ color: theme.primary }}
          >
            <SealQuestion size={13} />
            <span className="underline underline-offset-2">What happens when my trial ends?</span>
          </button>
        )}
      </div>

      {/* UPGRADE OPTIONS */}
      {status.type !== 'lifetime' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1 w-full min-w-0">
            <Sparkle size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              {status.type === 'trial' ? 'Upgrade Your Research' : status.type === 'free' ? 'Upgrade to Research+' : 'Upgrade Options'}
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>

          {/* Legal consent line */}
          <p className="text-xs text-center opacity-50" style={{ color: theme.text }}>
            By subscribing, you agree to our{' '}
            <button
              onClick={() => setShowTerms(true)}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              onClick={() => setShowPrivacy(true)}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Privacy Policy
            </button>
            .
          </p>

          {/* Pricing Cards — Clean modern style */}
          <div className="flex flex-col gap-3">

            {/* Monthly Plan */}
            {status.type !== 'monthly' && pricing.monthly && (
              <button
                onClick={() => handleSelectPlan('monthly')}
                className="plan-card w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{
                  border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                  background: theme.isDark
                    ? `repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, transparent 1px, transparent 3px, rgba(255,255,255,0.015) 4px), linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 60%), ${theme.cardBackground}`
                    : `repeating-linear-gradient(135deg, rgba(0,0,0,0.018) 0px, transparent 1px, transparent 3px, rgba(0,0,0,0.018) 4px), linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(245,247,245,0.6) 100%), ${theme.cardBackground}`,
                  boxShadow: theme.isDark
                    ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.2)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: theme.primary }}>Monthly</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" style={{ color: theme.text }}>{formatCurrency(pricing.monthly.founderPrice)}</span>
                      <span className="text-sm" style={{ color: theme.text, opacity: 0.4 }}>/mo</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: theme.text, opacity: 0.4 }}>Cancel anytime</p>
                  </div>
                  <CaretRight size={18} style={{ color: theme.primary, opacity: 0.6 }} />
                </div>
              </button>
            )}

            {/* Annual Plan — recommended */}
            {status.type !== 'annual' && pricing.annual && (
              <button
                onClick={() => handleSelectPlan('annual')}
                className="plan-card w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{
                  color: theme.textOnPrimary || '#fff',
                  background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, transparent 1px, transparent 3px, rgba(255,255,255,0.04) 4px), linear-gradient(160deg, rgba(255,255,255,0.15) 0%, transparent 50%), ${theme.primary}`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.1), 0 4px 20px ${theme.primary}50`,
                }}
              >
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ opacity: 0.85 }}>Annual</p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        {isFounder ? 'Founder Rate' : 'Best Value'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{formatCurrency(pricing.annual.founderPrice)}</span>
                      <span className="text-sm" style={{ opacity: 0.6 }}>/yr</span>
                    </div>
                    {pricing.annual.savings > 0 && (
                      <p className="text-[11px] font-semibold mt-0.5" style={{ opacity: 0.75 }}>Save {formatCurrency(pricing.annual.savings)}</p>
                    )}
                  </div>
                  <CaretRight size={18} style={{ opacity: 0.7 }} />
                </div>
              </button>
            )}

            {/* Lifetime Plan */}
            {pricing.lifetime && (
              <button
                onClick={() => handleSelectPlan('lifetime')}
                className="plan-card w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
                style={{
                  border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}`,
                  background: theme.isDark
                    ? `repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, transparent 1px, transparent 3px, rgba(255,255,255,0.015) 4px), linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 60%), ${theme.cardBackground}`
                    : `repeating-linear-gradient(135deg, rgba(0,0,0,0.018) 0px, transparent 1px, transparent 3px, rgba(0,0,0,0.018) 4px), linear-gradient(160deg, rgba(255,255,255,0.9) 0%, rgba(245,247,245,0.6) 100%), ${theme.cardBackground}`,
                  boxShadow: theme.isDark
                    ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.2)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.primary }}>Lifetime</p>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: theme.text, opacity: 0.6 }}>
                        Limited Time
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" style={{ color: theme.text }}>{formatCurrency(pricing.lifetime.founderPrice)}</span>
                      <span className="text-sm" style={{ color: theme.text, opacity: 0.4 }}>/once</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: theme.text, opacity: 0.4 }}>One-time payment</p>
                  </div>
                  <CaretRight size={18} style={{ color: theme.primary, opacity: 0.6 }} />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="pt-6">
        <button
          onClick={handleManageBilling}
          disabled={['free', 'expired', 'trial'].includes(status.type)}
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
              <GearSix size={20} className="opacity-60" style={{ color: theme.text }} />
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
            <ArrowSquareOut size={16} className="opacity-40" style={{ color: theme.text }} />
          )}
        </button>
      </div>

      <SyncSubscriptionButton theme={theme} user={user} />

      {/* Trust - Secure payment disclaimer */}
      <div className="pt-8 pb-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2 w-full max-w-md px-1 min-w-0">
            <Shield size={16} className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Secure Payment Processing
            </span>
            <div
              className="flex-1 h-px min-w-0"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>

          <p className="text-xs text-center opacity-50 max-w-md" style={{ color: theme.text }}>
            The Pep Planner does not store or process any private payment information. 
            All payments are securely handled exclusively through your platform provider.
          </p>

          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => setShowTerms(true)}
              className="text-xs opacity-40 hover:opacity-70 transition-opacity underline underline-offset-2"
              style={{ color: theme.text }}
            >
              Terms of Service
            </button>
            <span className="text-xs opacity-20" style={{ color: theme.text }}>•</span>
            <button
              onClick={() => setShowPrivacy(true)}
              className="text-xs opacity-40 hover:opacity-70 transition-opacity underline underline-offset-2"
              style={{ color: theme.text }}
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      <TermsOfServiceModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAgree={null}
        theme={theme}
      />
      <LandingPrivacyModal
        open={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        onAgree={null}
        theme={theme}
      />

      {/* Trial Info Modal */}
      <Modal
        open={showTrialInfo}
        onClose={() => setShowTrialInfo(false)}
        title="When Your Trial Ends"
        theme={theme}
      >
        <div className="space-y-2.5 py-0.5">
          <p className="text-xs leading-snug" style={{ color: theme.text, opacity: 0.6 }}>
            Here\u2019s exactly what changes \u2014 and what stays the same \u2014 when your trial wraps up.
          </p>

          {[
            {
              icon: Lock,
              title: 'Premium features pause',
              desc: 'AI Research, Buddy System, cloud sync, and premium themes pause. You keep 1 active protocol and up to 10 stockpile items.',
            },
            {
              icon: CheckCircle,
              title: 'Nothing gets deleted',
              desc: 'All protocols, logs, notes, and history stay right where you left them.',
            },
            {
              icon: DownloadSimple,
              title: 'Export anytime',
              desc: 'Download a full copy of your data at any time via Settings \u2192 Data.',
            },
            {
              icon: Trash,
              title: 'Delete on request',
              desc: 'Request full account deletion anytime through Settings or by contacting us.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-2.5">
              <div
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
              >
                <Icon size={14} style={{ color: theme.primary }} />
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-px" style={{ color: theme.text }}>{title}</h4>
                <p className="text-[11px] leading-snug" style={{ color: theme.text, opacity: 0.5 }}>{desc}</p>
              </div>
            </div>
          ))}

          <div
            className="rounded-lg p-2 mt-1"
            style={{
              backgroundColor: theme.isDark ? 'rgba(127,158,149,0.10)' : 'rgba(127,158,149,0.08)',
              border: `1px solid ${theme.isDark ? 'rgba(127,158,149,0.15)' : 'rgba(127,158,149,0.18)'}`,
            }}
          >
            <p className="text-[11px] leading-snug text-center" style={{ color: theme.text, opacity: 0.55 }}>
              Your research belongs to you \u2014 it\u2019s here whenever you need it.
            </p>
          </div>
        </div>
      </Modal>
    </section>
    </IconContext.Provider>
  )
}
