import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, RefreshCw, Settings, Gift, Lock, Sparkles, CreditCard, Crown, ExternalLink, Shield, CheckCircle2 } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStripe, faGooglePlay, faApple, faSquarespace } from '@fortawesome/free-brands-svg-icons'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { createCheckoutSession, createPortalSession } from '../services/stripe'
import { isIOS } from '../utils/platform'
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
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false)
  const [restoreCooldown, setRestoreCooldown] = useState(0)

  const founderOffer = useFounderOffer()
  
  // Cooldown timer for restore purchases
  useEffect(() => {
    if (restoreCooldown > 0) {
      const timer = setTimeout(() => {
        setRestoreCooldown(restoreCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [restoreCooldown])
  
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

  const handleRestorePurchases = async () => {
    if (isRestoringPurchases || restoreCooldown > 0) return
    
    setIsRestoringPurchases(true)
    
    try {
      // Dynamically import the restore function
      const { restorePurchases } = await import('../services/payment/googlePlayBillingService')
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: '🔍 Checking Google Play for purchases...',
          type: 'info'
        }
      }))
      
      const result = await restorePurchases({
        userId: firebaseUser?.uid,
        userEmail: firebaseUser?.email
      })
      
      if (result.success) {
        if (result.purchasesVerified > 0) {
          // Subscription found and restored
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: {
              message: `✅ Subscription restored successfully! Found ${result.purchasesVerified} purchase(s).`,
              type: 'success',
              duration: 5000
            }
          }))
          
          // Reload subscription data
          const { loadUserSubscription } = await import('../services/cloudStorage')
          const subscription = await loadUserSubscription(firebaseUser.uid)
          setSub(subscription)
          
          // Set cooldown to prevent spam
          setRestoreCooldown(60) // 60 second cooldown
        } else if (result.purchasesFound === 0) {
          // No purchases found - not an error
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: {
              message: 'ℹ️ No active subscriptions found in Google Play. If you recently purchased, please wait a few minutes and try again.',
              type: 'info',
              duration: 6000
            }
          }))
          setRestoreCooldown(30) // 30 second cooldown
        } else {
          // Purchases found but verification failed
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: {
              message: '⚠️ Found purchases but verification failed. Please check your internet connection and try again.',
              type: 'error',
              duration: 5000
            }
          }))
          setRestoreCooldown(30)
        }
      }
    } catch (error) {
      console.error('Restore purchases error:', error)
      
      let errorMessage = 'Failed to restore purchases. '
      if (error.message.includes('not available')) {
        errorMessage += 'Google Play Billing is not available on this device.'
      } else if (error.message.includes('network') || error.message.includes('internet')) {
        errorMessage += 'Please check your internet connection.'
      } else {
        errorMessage += error.message || 'Please try again later.'
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: errorMessage,
          type: 'error',
          duration: 5000
        }
      }))
      
      setRestoreCooldown(30)
    } finally {
      setIsRestoringPurchases(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      // Log subscription data for debugging - ALWAYS log first
      console.log('💳💳💳 [BILLING] ===== STARTING BILLING MANAGEMENT =====')
      console.log('💳 [BILLING] Subscription object:', sub)
      console.log('💳 [BILLING] Subscription type:', typeof sub)
      console.log('💳 [BILLING] Subscription keys:', sub ? Object.keys(sub) : 'NULL')
      
      // CRITICAL: Check for lifetime access FIRST - regardless of where it was purchased
      // If user has lifetime access, show the lifetime billing page instead
      if (sub?.hasLifetimeAccess || sub?.interval === 'lifetime' || sub?.plan === 'lifetime') {
        console.log('💳 [BILLING] ✅✅✅ DETECTED LIFETIME ACCESS - ROUTING TO LIFETIME BILLING PAGE ✅✅✅')
        navigate('/app/account/subscription/lifetime-billing')
        return
      }
      
      // Check for Google Play indicators - check ALL possible fields
      const hasGooglePlayProductId = sub?.googlePlayProductId
      const hasGooglePlayOrderId = sub?.googlePlayOrderId
      const hasGooglePlayPurchaseToken = sub?.googlePlayPurchaseToken
      
      console.log('💳 [BILLING] googlePlayProductId:', hasGooglePlayProductId)
      console.log('💳 [BILLING] googlePlayOrderId:', hasGooglePlayOrderId)
      console.log('💳 [BILLING] googlePlayPurchaseToken:', hasGooglePlayPurchaseToken)
      
      // CRITICAL: Check for Google Play FIRST before anything else
      // This prevents accidentally trying to open Stripe portal for Google Play subscriptions
      if (hasGooglePlayProductId || hasGooglePlayOrderId || hasGooglePlayPurchaseToken) {
        console.log('💳 [BILLING] ✅✅✅ DETECTED GOOGLE PLAY - ROUTING TO PLAY STORE ✅✅✅')
        const playStoreUrl = 'https://play.google.com/store/account/subscriptions'
        
        // On Android, try to open the Play Store app first
        if (window.Capacitor && window.Capacitor.Plugins?.App) {
          try {
            console.log('💳 [BILLING] Opening Play Store app...')
            await window.Capacitor.Plugins.App.openUrl({ url: playStoreUrl })
            console.log('💳 [BILLING] Play Store app opened successfully')
            return
          } catch (error) {
            console.warn('💳 [BILLING] Failed to open Play Store app, falling back to web:', error)
          }
        }
        
        // Fallback to web URL
        console.log('💳 [BILLING] Opening Play Store in browser...')
        window.open(playStoreUrl, '_blank')
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'Opening Google Play Store to manage your subscription...', 
            type: 'info' 
          } 
        }))
        console.log('💳 [BILLING] Returning early - Google Play handled')
        return
      }
      
      console.log('💳 [BILLING] ⚠️ NOT a Google Play subscription - continuing to other providers...')
      
      console.log('💳 [BILLING] Not a Google Play subscription, continuing detection...')
      
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
        const portalUrl = `${squarespaceSiteUrl}/account/subscriptions`
        
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
    if (sub.paymentProvider === 'squarespace') return 'VIA SQUARESPACE'
    if (sub.paymentProvider === 'stripe') return 'VIA STRIPE'
    // Fallback checks for older data
    if (sub.source === 'google_play') return 'VIA GOOGLE PLAY'
    if (sub.source === 'apple') return 'VIA APPLE'
    if (sub.source === 'squarespace') return 'VIA SQUARESPACE'
    if (sub.source === 'stripe' || sub.paymentMethodId) return 'VIA STRIPE'
    if (sub.interval === 'lifetime' && !sub.paymentMethodId && !sub.paymentProvider) return 'LIFETIME KIT REDEMPTION'
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="opacity-40" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
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

      {/* RESTORE PURCHASES (Android Google Play only) */}
      {typeof window !== 'undefined' && window.Capacitor && (
        <div 
          className="p-4 rounded-2xl"
          style={{ 
            backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
          }}
        >
          <div className="flex items-start gap-3 mb-3">
            <FontAwesomeIcon 
              icon={faGooglePlay} 
              size="lg" 
              style={{ color: theme.text, opacity: 0.4 }} 
            />
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
                Subscription Not Showing?
              </h3>
              <p className="text-xs leading-relaxed mb-3" style={{ color: theme.text, opacity: 0.6 }}>
                If you purchased through Google Play but your subscription isn't recognized, use this button to restore your purchase.
              </p>
              <button
                onClick={handleRestorePurchases}
                disabled={isRestoringPurchases || restoreCooldown > 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 btn-primary-inset"
                style={{ 
                  backgroundColor: theme.primary,
                  color: theme.primaryText || '#ffffff'
                }}
              >
                <RefreshCw 
                  size={16} 
                  className={isRestoringPurchases ? 'animate-spin' : ''}
                />
                <span>
                  {isRestoringPurchases 
                    ? 'Restoring...' 
                    : restoreCooldown > 0 
                      ? `Restore in ${restoreCooldown}s` 
                      : 'Restore Purchases'
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE OPTIONS - hidden on iOS until Apple IAP is implemented */}
      {status.type !== 'lifetime' && !isIOS() && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="opacity-40" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
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
              <h3 className="text-base font-semibold tracking-wide" style={{ color: theme.isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)' }}>
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
                className="content-section p-6 rounded-3xl border relative"
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
                className="content-section p-6 rounded-3xl border relative"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
        <button
          onClick={handleManageBilling}
          className="content-section flex items-center justify-between p-5 rounded-2xl transition-all hover:opacity-80 text-left"
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
              <div className="font-semibold text-base" style={{ color: theme.text }}>Manage Billing</div>
              {getSource() && (
                <div className="text-xs opacity-60" style={{ color: theme.text }}>{getSource()}</div>
              )}
            </div>
          </div>
          <ExternalLink size={16} className="opacity-40" style={{ color: theme.text }} />
        </button>
        
        <button
          onClick={() => setShowGiftModal(true)}
          className="content-section flex items-center justify-between p-5 rounded-2xl transition-all hover:opacity-80 text-left"
          style={{ 
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
          }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            >
              <Gift size={20} className="opacity-60" style={{ color: theme.text }} />
            </div>
            <div>
              <div className="font-semibold text-base" style={{ color: theme.text }}>Give a Gift</div>
              <div className="text-xs opacity-60" style={{ color: theme.text }}>Share research tools</div>
            </div>
          </div>
          <ArrowLeft size={16} className="opacity-40 rotate-180" style={{ color: theme.text }} />
        </button>
      </div>

      {/* Trust Badges - Payment Providers */}
      <div className="pt-8 pb-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="opacity-40" style={{ color: theme.text }} />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Secure Payment Processing
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Stripe Logo */}
            <div 
              className="flex items-center justify-center px-5 py-3 rounded-xl transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              }}
            >
              <FontAwesomeIcon 
                icon={faStripe} 
                style={{ fontSize: '32px', color: theme.isDark ? '#ffffff' : '#635BFF' }}
              />
            </div>

            {/* Google Play Logo */}
            <div 
              className="flex items-center justify-center px-5 py-3 rounded-xl transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              }}
            >
              <FontAwesomeIcon 
                icon={faGooglePlay} 
                style={{ fontSize: '32px', color: theme.isDark ? '#ffffff' : '#01875F' }}
              />
            </div>

            {/* Apple App Store Logo */}
            <div 
              className="flex items-center justify-center px-5 py-3 rounded-xl transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              }}
            >
              <FontAwesomeIcon 
                icon={faApple} 
                style={{ fontSize: '32px', color: theme.isDark ? '#ffffff' : '#000000' }}
              />
            </div>

            {/* Squarespace Logo */}
            <div 
              className="flex items-center justify-center px-5 py-3 rounded-xl transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`
              }}
            >
              <FontAwesomeIcon 
                icon={faSquarespace} 
                style={{ fontSize: '32px', color: theme.isDark ? '#ffffff' : '#222222' }}
              />
            </div>
          </div>

          <p className="text-xs text-center opacity-50 max-w-md" style={{ color: theme.text }}>
            The Pep Planner does not store or process any private payment information. 
            All payments are securely handled exclusively through Stripe, Google Play, Apple App Store, and Squarespace.
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
