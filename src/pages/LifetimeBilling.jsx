import React, { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Receipt } from 'lucide-react'
import { useFirebase } from '../context/FirebaseContext'
import { Capacitor } from '@capacitor/core'
import billyGooseImage from '../assets/billy-goose.png'

export default function LifetimeBilling() {
  const navigate = useNavigate()
  const { theme } = useOutletContext()
  const { firebaseUser } = useFirebase()
  const [sub, setSub] = useState(null)

  useEffect(() => {
    const loadSub = async () => {
      try {
        const { loadUserSubscription } = await import('../services/cloudStorage')
        if (firebaseUser) {
          const subscription = await loadUserSubscription(firebaseUser.uid)
          setSub(subscription)
        }
      } catch (e) {
        console.warn('Could not load subscription:', e)
      }
    }
    loadSub()
  }, [firebaseUser])

  const getPurchasePlatform = () => {
    if (!sub) return null
    // Redemption codes (physical cards)
    if (sub.source === 'lifetime-kit' || sub.source === 'annual-kit') return 'redemption'
    if (sub.lifetimeReason?.toLowerCase().includes('kit redemption')) return 'redemption'
    // Gift access
    if (sub.type === 'gift' || sub.giftId) return 'gift'
    // Squarespace
    if (sub.source === 'squarespace' || sub.squarespaceOrderId) return 'squarespace'
    // Standard platforms
    if (sub.paymentProvider === 'googleplay' || sub.googlePlayProductId) return 'googleplay'
    if (sub.paymentProvider === 'apple' || sub.appleTransactionId) return 'apple'
    if (sub.paymentProvider === 'stripe' || sub.stripeCustomerId) return 'stripe'
    if (sub.lifetimeReason?.includes('admin') || sub.lifetimeReason?.includes('beta') || sub.lifetimeReason?.includes('founder')) return 'admin'
    return null
  }

  const platform = getPurchasePlatform()

  const handleViewReceipt = async () => {
    const url = platform === 'googleplay'
      ? 'https://play.google.com/store/account/orderhistory'
      : platform === 'apple'
        ? 'https://reportaproblem.apple.com/'
        : null

    if (!url) return

    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url })
      } catch {
        window.open(url, '_blank')
      }
    } else {
      window.open(url, '_blank')
    }
  }

  const platformLabel = platform === 'googleplay' ? 'Google Play'
    : platform === 'apple' ? 'App Store'
    : platform === 'stripe' ? 'Stripe'
    : platform === 'squarespace' ? 'Squarespace'
    : platform === 'redemption' ? 'Redemption Code'
    : platform === 'gift' ? 'Gift'
    : platform === 'admin' ? 'Admin Grant'
    : null

  return (
    <div className="page-bg fixed top-16 bottom-0 left-0 lg:left-24 right-0 flex items-center justify-center px-4 overflow-hidden z-40">
      <div className="text-center max-w-2xl w-full">
        <button
          onClick={() => navigate('/app/account/subscription')}
          className="absolute top-4 left-4 p-2 rounded-full hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <h1 className="text-3xl font-bold mb-3" style={{ color: theme.text }}>
          There's no billing you silly goose.
        </h1>
        <p className="text-xl font-semibold mb-1.5" style={{ color: theme.text, opacity: 0.8 }}>
          Your account has lifetime access.
        </p>
        <p className="text-sm mb-4" style={{ color: theme.text, opacity: 0.6 }}>
          {platform === 'redemption'
            ? 'Activated via redemption code. This was a one-time purchase with no recurring billing. Refer to your redemption card for details.'
            : platform === 'gift'
              ? 'This access was gifted to you. There is no billing to manage — enjoy your gift!'
              : platformLabel
                ? `Purchased via ${platformLabel}. Your receipt has been sent to your email.`
                : 'Your receipt has been sent to your email.'}
        </p>

        {(platform === 'googleplay' || platform === 'apple') && (
          <button
            onClick={handleViewReceipt}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 mb-6"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              color: theme.text,
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
          >
            <Receipt size={16} />
            View Order History
            <ExternalLink size={14} style={{ opacity: 0.5 }} />
          </button>
        )}

        {platform === 'squarespace' && (
          <button
            onClick={() => window.open('https://www.thepepplanner.com/account', '_blank')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 mb-6"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              color: theme.text,
              border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`
            }}
          >
            <Receipt size={16} />
            View Squarespace Account
            <ExternalLink size={14} style={{ opacity: 0.5 }} />
          </button>
        )}

        <img 
          src={billyGooseImage} 
          alt="Billy Goose" 
          className="w-full max-w-md mx-auto"
          style={{ maxHeight: '35vh', objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}
