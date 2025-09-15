  import React, { useTransition } from 'react'
  import { useOutletContext, useNavigate } from 'react-router-dom'
  import { themes, defaultThemeName } from '../theme/themes'
  import { CreditCard, Calendar, Check, X, RefreshCw, Shield, Pencil, Trash2, ExternalLink } from 'lucide-react'
  import Modal from '../components/common/Modal'
  import { useAppContext } from '../context/AppContext'
  import { useBadgeStats } from '../utils/badges'
  import BadgeImage from '../components/badges/BadgeImage'
  import { createCheckoutSession, createPortalSession, cancelSubscription as stripeCancel } from '../services/stripe'
  import { STRIPE_CONFIG } from '../config/stripe'
  import { verifyStripeConfig } from '../utils/stripe-verify'
  import { hasBetaLifetimeAccess, createBetaLifetimeSubscription, getBetaAccessStatus, isBetaTester, shouldShowBetaEndedUIForUser, getBetaStatusForUser, isBetaPeriodEnded } from '../utils/betaAccess'

  // Local helpers for auth + subscription data (local testing)
  function getAuthDb() { try { return JSON.parse(localStorage.getItem('tpprover_auth_users') || '{}') } catch { return {} } }
  function setAuthDb(db) { try { localStorage.setItem('tpprover_auth_users', JSON.stringify(db || {})) } catch {} }
  const enc = (s) => { try { return btoa(unescape(encodeURIComponent(String(s)))) } catch { return String(s) } }

  function loadSubscription() { try { return JSON.parse(localStorage.getItem('tpprover_subscription') || 'null') } catch { return null } }
  function saveSubscription(sub) { try { localStorage.setItem('tpprover_subscription', JSON.stringify(sub)) } catch {} }
  function loadSecurity() { try { return JSON.parse(localStorage.getItem('tpprover_security') || 'null') } catch { return null } }
  function saveSecurity(sec) { try { localStorage.setItem('tpprover_security', JSON.stringify(sec)) } catch {} }
  function genAuthSecret(len = 16) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let out = ''
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
    return out
  }

  export default function Account() {
    const { theme } = useOutletContext()
    const navigate = useNavigate()
    const { user, logout } = useAppContext();
    const { earnedBadges } = useBadgeStats();
    const [isPending, startTransition] = useTransition()
    // const [user, setUser] = React.useState(() => {
    //   try { return JSON.parse(localStorage.getItem('tpprover_user') || 'null') } catch { return null }
    // })
    const [sub, setSub] = React.useState(() => loadSubscription())
    const [security, setSecurity] = React.useState(() => loadSecurity() || { twoFactorEnabled: false, twoFactorMethod: 'email', authSecret: '', emailVisible: true })
    const [timeLeft, setTimeLeft] = React.useState(null);

    React.useEffect(() => {
        const calculateTimeLeft = () => {
            const betaEndDate = new Date('2025-09-21T00:00:00'); // Sept 21st midnight
            const now = new Date();
            const difference = betaEndDate.getTime() - now.getTime();

            let timeLeftData = {};

            if (difference > 0) {
                timeLeftData = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                };
            } else {
                timeLeftData = { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }

            return timeLeftData;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        
        setTimeLeft(calculateTimeLeft()); // initial call

        return () => clearInterval(timer);
    }, []);

    React.useEffect(() => {
        // Handle beta users with lifetime access
        if (user && !sub) {
            if (hasBetaLifetimeAccess(user)) {
                // Grant beta users lifetime subscription automatically
                const betaSubscription = createBetaLifetimeSubscription(user);
                saveSubscription(betaSubscription);
                setSub(betaSubscription);
                console.log('✅ Beta lifetime access activated for:', user.email);
            } else {
                // Auto-start trial for non-beta users
                createSubscription({ name: 'Pro Monthly (Trial)', price: 0, interval: 'month' }, true);
            }
        }
    }, [user, sub])

    // Listen for Stripe events
    React.useEffect(() => {
        const handleStripeSuccess = (event) => {
            const { planDetails, customerId, subscriptionId } = event.detail;
            
            const now = new Date()
            const end = new Date(now)
            if (planDetails.interval === 'month') end.setMonth(end.getMonth() + 1)
            else if (planDetails.interval === 'year') end.setFullYear(end.getFullYear() + 1)
            else if (planDetails.interval === 'lifetime') end.setFullYear(end.getFullYear() + 100)
            
            const next = {
                id: subscriptionId || String(Date.now()),
                plan: planDetails.name,
                price: planDetails.price,
                interval: planDetails.interval,
                currency: 'USD',
                status: 'active',
                startedAt: now.toISOString(),
                currentPeriodEnd: end.toISOString(),
                paymentMethod: { brand: 'Visa', last4: '4242' },
                customerId,
                subscriptionId
            }
            
            saveSubscription(next)
            setSub(next)
            
            setManageOpen(false) // Close modal
        }

        const handleStripeCancelled = (event) => {
            if (!sub) return
            const next = { ...sub, status: 'canceled', endedAt: new Date().toISOString() }
            saveSubscription(next)
            setSub(next)
        }

        window.addEventListener('stripe:checkout:success', handleStripeSuccess)
        window.addEventListener('stripe:subscription:cancelled', handleStripeCancelled)

        return () => {
            window.removeEventListener('stripe:checkout:success', handleStripeSuccess)
            window.removeEventListener('stripe:subscription:cancelled', handleStripeCancelled)
        }
    }, [sub, billing])

    const [manageOpen, setManageOpen] = React.useState(false)
    const [selectedPlan, setSelectedPlan] = React.useState('month')

    // Get creation date from Firebase user data (stored in localStorage after login)
    const createdAt = React.useMemo(() => {
      if (user?.createdAt) {
        return new Date(user.createdAt);
      }
      // Fallback to legacy localStorage auth system for old users
      const authDb = getAuthDb();
      const key = (user?.email || '').toLowerCase();
      const rec = authDb[key];
      return rec?.createdAt ? new Date(rec.createdAt) : null;
    }, [user])

    const [editingEmail, setEditingEmail] = React.useState(false)
    const [emailDraft, setEmailDraft] = React.useState(user?.email || '')

    const saveEmail = () => {
      const oldKey = (user?.email || '').toLowerCase()
      const newKey = (emailDraft || '').toLowerCase()
      if (!newKey || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newKey)) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Enter a valid email', type: 'error' } }))
        return
      }
      const db = getAuthDb()
      if (newKey !== oldKey && db[newKey]) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Email already in use', type: 'error' } }))
        return
      }
      if (newKey !== oldKey) {
        db[newKey] = { ...(db[oldKey] || {}), createdAt: (db[oldKey]?.createdAt || Date.now()) }
        delete db[oldKey]
        setAuthDb(db)
      }
      const nextUser = { ...(user || {}), email: emailDraft }
      try { localStorage.setItem('tpprover_user', JSON.stringify(nextUser)) } catch {}
      // setUser(nextUser) // This should be handled by AppContext now
      setEditingEmail(false)
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Email updated', type: 'success' } }))
    }

    // Security: change password
    const [pwForm, setPwForm] = React.useState({ current: '', next: '', confirm: '' })
    const changePassword = () => {
      if (!user?.email) { return }
      const key = (user.email || '').toLowerCase()
      const db = getAuthDb()
      const rec = db[key]
      if (!rec || rec.p !== enc(pwForm.current)) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Current password is incorrect', type: 'error' } }))
        return
      }
      if (pwForm.next.length < 8 || !/[A-Z]/.test(pwForm.next) || !/[a-z]/.test(pwForm.next) || !/\d/.test(pwForm.next)) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'New password does not meet requirements', type: 'error' } }))
        return
      }
      if (pwForm.next !== pwForm.confirm) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Passwords do not match', type: 'error' } }))
        return
      }
      db[key] = { ...(rec || {}), p: enc(pwForm.next) }
      setAuthDb(db)
      setPwForm({ current: '', next: '', confirm: '' })
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Password updated', type: 'success' } }))
    }

    // Subscription actions with Stripe integration
    const createSubscription = async (plan = { name: 'Pro Monthly', price: 9.99, interval: 'month' }, trial = false) => {
      if (trial) {
        // Handle trial creation locally
        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + 7)
        
        const next = {
          id: String(Date.now()),
          plan: plan.name,
          price: plan.price,
          interval: plan.interval,
          currency: 'USD',
          status: 'trialing',
          startedAt: now.toISOString(),
          currentPeriodEnd: end.toISOString(),
          paymentMethod: null,
        }
        saveSubscription(next)
        setSub(next)
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Trial started', type: 'success' } }))
        return
      }

      // Handle paid subscription with Stripe
      try {
        let priceId = '';
        if (plan.interval === 'month') {
          priceId = STRIPE_CONFIG.prices.monthly;
        } else if (plan.interval === 'year') {
          priceId = STRIPE_CONFIG.prices.annual;
        } else if (plan.interval === 'lifetime') {
          priceId = STRIPE_CONFIG.prices.lifetime;
        }

        await createCheckoutSession(priceId, user?.email, user?.uid);
        
      } catch (error) {
        console.error('Subscription creation error:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
        }));
      }
    }

    const cancelSubscription = async () => {
      if (!sub) return
      
      try {
        // If it's a Stripe subscription, cancel through Stripe
        if (sub.subscriptionId) {
          await stripeCancel(sub.subscriptionId);
        } else {
          // Local cancellation for trials/demo
          const next = { ...sub, status: 'canceled', endedAt: new Date().toISOString() }
          saveSubscription(next)
          setSub(next)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Subscription canceled', type: 'success' } }))
        }
      } catch (error) {
        console.error('Cancellation error:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to cancel subscription. Please try again.', type: 'error' } 
        }));
      }
    }

    const openCustomerPortal = async () => {
      if (!sub?.customerId) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Customer portal not available for this subscription', type: 'info' } 
        }));
        return;
      }
      
      try {
        await createPortalSession(sub.customerId);
      } catch (error) {
        console.error('Portal error:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to open customer portal', type: 'error' } 
        }));
      }
    }


    const [pmDraft, setPmDraft] = React.useState({ brand: sub?.paymentMethod?.brand || 'Visa', last4: sub?.paymentMethod?.last4 || '' })
    const updatePaymentMethod = () => { /* integrated into Manage modal */ }
    const savePaymentMethod = () => {
      if (!sub) return
      const sanitized = { brand: pmDraft.brand || 'Visa', last4: String(pmDraft.last4 || '').replace(/\D/g,'').slice(-4) }
      const next = { ...sub, paymentMethod: sanitized }
      saveSubscription(next)
      setSub(next)
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Payment method updated', type: 'success' } }))
    }

    // 2FA setup
    const [twoFAOpen, setTwoFAOpen] = React.useState(false)
    const [twoFAMethod, setTwoFAMethod] = React.useState(security.twoFactorMethod || 'email')
    const [twoFASecret, setTwoFASecret] = React.useState(security.authSecret || genAuthSecret())
    const openTwoFA = () => { setTwoFAMethod(security.twoFactorMethod || 'email'); setTwoFASecret(security.authSecret || genAuthSecret()); setTwoFAOpen(true) }
    const enableTwoFA = () => {
      const next = { ...security, twoFactorEnabled: true, twoFactorMethod: twoFAMethod, authSecret: twoFAMethod === 'authenticator' ? (security.authSecret || twoFASecret) : '' }
      saveSecurity(next); setSecurity(next); setTwoFAOpen(false)
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Two-factor enabled', type: 'success' } }))
    }
    const disableTwoFA = () => { const next = { ...security, twoFactorEnabled: false, authSecret: '' }; saveSecurity(next); setSecurity(next); window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Two-factor disabled', type: 'success' } })) }
    const savePrivacy = (key, value) => { const next = { ...security, [key]: value }; saveSecurity(next); setSecurity(next); window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Privacy updated', type: 'success' } })) }

    return (
      <section className="space-y-6">
        {/* Profile */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ color: theme.primaryDark }}>Profile</h2>
            {user && (
              <button className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={logout}>Log out</button>
            )}
          </div>
          {user ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm" style={{ color: theme.textLight }}>Email</div>
                  <div className="font-medium">{user.email}</div>
                </div>
                <button className="text-sm font-medium hover:underline" style={{ color: theme.primary }} onClick={() => { setEditingEmail(true); setEmailDraft(user.email || '') }}>Edit</button>
              </div>
              <hr style={{ borderColor: theme.border }}/>
              <div>
                <div className="text-sm" style={{ color: theme.textLight }}>Member since</div>
                <div className="font-medium">{createdAt ? createdAt.toLocaleDateString() : '—'}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: theme.textLight }}>You are not signed in. Go to Login.</div>
          )}
        </div>

        {/* Badges */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>Badges Earned</h2>
          {earnedBadges.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {earnedBadges.map(badge => (
                <div key={badge.name} className="flex flex-col items-center text-center">
                  <BadgeImage badgeName={badge.name} size="large" />
                  <span className="text-xs mt-2 font-semibold">{badge.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm" style={{ color: theme.textLight }}>No badges earned yet. Keep exploring!</div>
          )}
        </div>

        {/* Subscription - Beta users see lifetime access, others see pricing */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>Subscription</h2>
              {hasBetaLifetimeAccess(user) ? (
                // Beta user with completed feedback - show lifetime access message
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">β</span>
                      </div>
                      <div>
                        <div className="font-semibold text-purple-800">Beta Tester Lifetime Access</div>
                        <div className="text-xs text-purple-600">Thank you for completing our feedback survey!</div>
                      </div>
                    </div>
                    <div className="text-sm text-purple-700">
                      🎉 <strong>You have lifetime access</strong> to all current and future features as a thank you for helping us improve the app.
                      No payments required - ever!
                    </div>
                  </div>
                  
                  {/* Show technical subscription details for beta users */}
                  {sub && (
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      <div>Plan: {sub.plan}</div>
                      <div>Status: <span className="text-green-600 font-semibold">Active (Lifetime)</span></div>
                      <div>Granted: {new Date(sub.grantedAt || sub.startedAt).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              ) : isBetaTester(user) ? (
                // Beta user who hasn't completed feedback yet
                (() => {
                  const betaStatus = getBetaStatusForUser(user);
                  const isEnded = isBetaPeriodEnded();
                  
                  return (
                    <div className="space-y-4">
                      <div className={`bg-gradient-to-r rounded-lg p-4 border ${
                        isEnded ? 'from-red-50 to-orange-50 border-red-200' :
                        'from-blue-50 to-purple-50 border-blue-200'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isEnded ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                            'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}>
                            <span className="text-white font-bold text-sm">
                              {isEnded ? '⏰' : 'β'}
                            </span>
                          </div>
                          <div>
                            <div className={`font-semibold ${
                              isEnded ? 'text-red-800' : 'text-blue-800'
                            }`}>
                              {isEnded ? '⏰ Beta Has Ended - Survey Available!' : '🚀 Beta Testing Active'}
                            </div>
                            <div className={`text-xs ${
                              isEnded ? 'text-red-600' : 'text-blue-600'
                            }`}>
                              {isEnded ? 'Complete survey to activate lifetime access' : 'Enjoy testing - survey available after beta ends'}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm space-y-2 ${
                          isEnded ? 'text-red-700' : 'text-blue-700'
                        }`}>
                          {isEnded ? (
                            <>
                              <p>🎯 <strong>Beta has ended!</strong> Thank you for being part of our testing journey.</p>
                              <p>📝 <strong>Complete our feedback survey</strong> to activate your guaranteed lifetime access.</p>
                              <p>✨ <strong>What you'll get:</strong> Permanent access to all features, priority support, and all future updates - completely free!</p>
                            </>
                          ) : (
                            <>
                              <p>🎉 <strong>You're a beta tester!</strong> Continue using all features during the beta period.</p>
                              <p>⏰ <strong>After beta ends (Sept 21st)</strong>, you'll be able to complete a feedback survey to secure lifetime access.</p>
                              <p>✨ <strong>What you'll get:</strong> Permanent access to all current and future features - no monthly payments ever!</p>
                            </>
                          )}
                        </div>
                        
                        {/* Only show survey button AFTER beta ends */}
                        {isEnded && (
                          <div className="mt-3">
                            <button 
                              className="px-4 py-2 rounded-md font-medium hover:opacity-90 text-sm animate-pulse"
                              style={{ backgroundColor: '#dc2626', color: 'white' }}
                              onClick={() => {
                                window.location.href = '/beta-survey';
                              }}
                            >
                              🚨 Complete Survey Now → Activate Lifetime Access
                            </button>
                          </div>
                        )}
                      </div>
                  
                      {/* Show current trial/subscription status */}
                      {sub && (
                        <div className="text-xs" style={{ color: theme.textLight }}>
                          <div>Current Status: {sub.plan} ({sub.status})</div>
                          {sub.status === 'trialing' && (
                            <div>Trial ends: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : sub ? (
                // Regular user with subscription
                <div className="space-y-4">
                  {sub.status === 'trialing' && (
                    <TrialProgressBar 
                      theme={theme} 
                      startDate={sub.startedAt} 
                      endDate={sub.currentPeriodEnd} 
                    />
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm" style={{ color: theme.textLight }}>Current Plan</div>
                      <div className="font-medium">{sub.plan}</div>
                      <div className="text-sm" style={{ color: theme.textLight }}>
                        Status: <span className={`font-semibold ${sub.status === 'active' ? 'text-green-600' : sub.status === 'trialing' ? 'text-blue-600' : 'text-red-600'}`}>
                          {sub.status === 'trialing' ? 'Trial' : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <button 
                      className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90" 
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} 
                      onClick={() => setManageOpen(true)}
                    >
                      Manage
                    </button>
                  </div>
                  {sub.status !== 'canceled' && (
                    <div>
                      <div className="text-sm" style={{ color: theme.textLight }}>
                        {sub.status === 'trialing' ? 'Trial ends' : 'Next billing'}: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </div>
                      {sub.paymentMethod && (
                        <div className="text-sm" style={{ color: theme.textLight }}>
                          Payment: {sub.paymentMethod.brand} •••• {sub.paymentMethod.last4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Regular user without subscription
                <div className="space-y-4">
                  <div className="text-sm" style={{ color: theme.textLight }}>No active subscription</div>
                  <button 
                    className="px-3 py-2 rounded-md text-sm font-semibold hover:opacity-90" 
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} 
                    onClick={() => setManageOpen(true)}
                  >
                    Choose Plan
                  </button>
                </div>
              )}
        </div>


        {/* Security */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>Security</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Password</div>
              <div className="text-xs mb-2" style={{ color: theme.textLight }}>For security, you will be logged out after changing your password.</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="password" className="p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} placeholder="Current" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
                <input type="password" className="p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} placeholder="New" value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} />
                <input type="password" className="p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} placeholder="Confirm" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
              </div>
              <div className="mt-2 text-right">
                <button className="px-3 py-2 rounded-md text-sm hover:opacity-90" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={changePassword}>Update Password</button>
              </div>
            </div>
            <hr style={{ borderColor: theme.border }}/>
            <div>
              <div className="text-sm font-medium">Two-Factor Authentication</div>
              <div className="text-xs mb-2" style={{ color: theme.textLight }}>Add an extra layer of security to your account.</div>
              {security.twoFactorEnabled ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm">Enabled ({security.twoFactorMethod === 'authenticator' ? 'Authenticator App' : 'Email OTP'})</div>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }} onClick={openTwoFA}>Manage</button>
                    <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.error, color: theme.textOnPrimary }} onClick={disableTwoFA}>Disable</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-sm">Disabled</div>
                  <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={openTwoFA}>Enable 2FA</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manage subscription modal */}
        <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={hasBetaLifetimeAccess(user) ? "Beta Lifetime Access" : "Manage Subscription"} theme={theme} maxWidth="max-w-2xl" footer={(
          <div className="w-full flex justify-between items-center">
            {!hasBetaLifetimeAccess(user) && (
              <div className="flex items-center gap-2">
                {sub?.customerId && (
                  <button 
                    className="px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 flex items-center gap-2" 
                    style={{ backgroundColor: theme.secondary, color: theme.text }}
                    onClick={openCustomerPortal}
                  >
                    <ExternalLink size={14} />
                    Customer Portal
                  </button>
                )}
                <button className="px-3 py-2 rounded-md text-sm" style={{ color: theme.error }} onClick={cancelSubscription}>Cancel Subscription</button>
              </div>
            )}
            <button className="px-3 py-2 rounded-md" onClick={() => setManageOpen(false)} style={{ backgroundColor: theme.border, color: theme.text }}>Close</button>
          </div>
        )}>
          <div className="space-y-6">
            {hasBetaLifetimeAccess(user) ? (
              /* Beta user modal content */
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">β</span>
                  </div>
                  <div>
                    <div className="font-bold text-xl text-purple-800">You Have Lifetime Access!</div>
                    <div className="text-sm text-purple-600">Thank you for being a beta tester</div>
                  </div>
                </div>
                <div className="space-y-3 text-purple-700">
                  <p>🎉 <strong>Congratulations!</strong> As a beta tester, you have lifetime access to all current and future features.</p>
                  <p>✨ <strong>What this means:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
                    <li>No monthly or annual payments required</li>
                    <li>Access to all premium features</li>
                    <li>All future updates and new features included</li>
                    <li>Priority support as a founding user</li>
                  </ul>
                  <p className="text-sm font-medium">This is our way of saying thank you for helping us build the perfect peptide planning app!</p>
                </div>
              </div>
            ) : (
              /* Regular user modal content */
              <>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="font-semibold text-purple-800">🎉 Founder's Pricing</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    <strong>Lock in these prices forever!</strong> Early supporters get grandfather pricing - your rate never increases, even as we add new features and raise prices for new users.
                  </p>
                  <button 
                    className="mt-2 px-3 py-1 rounded text-xs font-medium hover:opacity-90" 
                    style={{ backgroundColor: 'rgba(147, 51, 234, 0.1)', color: '#7c2d12', border: '1px solid rgba(147, 51, 234, 0.3)' }}
                    onClick={() => verifyStripeConfig()}
                  >
                    🔍 Verify Setup (Check Console)
                  </button>
                </div>
              </>
            )}
            
            {/* Only show pricing plans to non-beta users */}
            {!hasBetaLifetimeAccess(user) && (
              <div>
                <div className="text-center font-semibold text-lg mb-4" style={{ color: theme.primaryDark }}>
                  {sub?.status === 'trialing' ? `Your trial ends on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : 'Switch your plan'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Monthly Plan */}
                  <PlanCard
                    theme={theme}
                    title="Monthly"
                    price="$6"
                    interval="/mo"
                    current={sub?.interval === 'month'}
                    onSelect={() => createSubscription({ name: 'Pro Monthly', price: 6.00, interval: 'month' })}
                  />
                  {/* Annual Plan */}
                  <PlanCard
                    theme={theme}
                    title="Annual"
                    price="$79"
                    interval="/yr"
                    current={sub?.interval === 'year'}
                    onSelect={() => createSubscription({ name: 'Pro Annual', price: 79.00, interval: 'year' })}
                    popular
                    subtitle="Save $13"
                  />
                  {/* Lifetime Plan */}
                  <PlanCard
                    theme={theme}
                    title="Lifetime"
                    price="$149"
                    interval="one-time"
                    current={sub?.interval === 'lifetime'}
                    onSelect={() => createSubscription({ name: 'Lifetime', price: 149.00, interval: 'lifetime' })}
                  />
                </div>
              </div>
            )}

            {sub?.interval !== 'lifetime' && (
              <div className="rounded-lg border p-4" style={{ borderColor: theme.border }}>
                <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Payment Method</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <div className="text-xs mb-1">Brand</div>
                    <select className="w-full p-2 rounded border" value={pmDraft.brand} onChange={e => setPmDraft(d => ({ ...d, brand: e.target.value }))} style={{ borderColor: theme.border }}>
                      {['Visa','Mastercard','Amex','Discover'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs mb-1">Last 4 Digits</div>
                    <input className="w-full p-2 rounded border" maxLength={4} value={pmDraft.last4} onChange={e => setPmDraft(d => ({ ...d, last4: (e.target.value || '').replace(/\D/g,'').slice(0,4) }))} placeholder="1234" style={{ borderColor: theme.border }} />
                  </div>
                </div>
                <div className="text-right mt-3"><button className="px-3 py-2 rounded-md text-sm hover:opacity-90" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={savePaymentMethod}>Update Payment Method</button></div>
              </div>
            )}
          </div>
        </Modal>

        {/* Two-Factor modal */}
        <Modal open={twoFAOpen} onClose={() => setTwoFAOpen(false)} title="Two-Factor Authentication" theme={theme} maxWidth="max-w-md" footer={(
          <>
            <button className="px-3 py-2 rounded-md" onClick={() => setTwoFAOpen(false)} style={{ backgroundColor: theme.border, color: theme.text }}>Close</button>
            <button className="px-3 py-2 rounded-md font-semibold" onClick={enableTwoFA} style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
          </>
        )}>
          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Method</div>
              <select className="w-full p-2 rounded border" value={twoFAMethod} onChange={e => setTwoFAMethod(e.target.value)} style={{ borderColor: theme.border }}>
                <option value="email">Email OTP</option>
                <option value="authenticator">Authenticator App</option>
              </select>
            </div>
            {twoFAMethod === 'authenticator' && (
              <div className="rounded border p-3" style={{ borderColor: theme.border }}>
                <div className="text-sm font-medium" style={{ color: theme.text }}>Authenticator Secret</div>
                <div className="font-mono text-sm select-all mt-1">{twoFASecret}</div>
                <div className="text-xs text-gray-500 mt-1">Scan this secret in your authenticator app. Store recovery codes safely.</div>
                <div className="text-right mt-2"><button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }} onClick={() => setTwoFASecret(genAuthSecret())}>Regenerate</button></div>
              </div>
            )}
          </div>
        </Modal>

        {/* Edit Email Modal */}
        <Modal open={editingEmail} onClose={() => setEditingEmail(false)} title="Edit Email" theme={theme} footer={
          <>
            <button className="px-3 py-2 rounded-md" onClick={() => setEditingEmail(false)} style={{ backgroundColor: theme.border, color: theme.text }}>Cancel</button>
            <button className="px-3 py-2 rounded-md font-semibold" onClick={saveEmail} style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save</button>
          </>
        }>
          <input value={emailDraft} onChange={e => setEmailDraft(e.target.value)} className="w-full p-2 rounded border text-sm" style={{ borderColor: theme.border }} placeholder="you@example.com" />
        </Modal>

      </section>
    )
  }

const TrialProgressBar = ({ theme, startDate, endDate }) => {
    const [progress, setProgress] = React.useState(0);
    const [timeLeft, setTimeLeft] = React.useState('');

    React.useEffect(() => {
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
                <span className="font-semibold" style={{ color: theme.primaryDark }}>Trial Status</span>
                <span className="text-xs font-medium" style={{ color: theme.textLight }}>{timeLeft}</span>
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

const PlanCard = ({ theme, title, price, interval, onSelect, current, popular, subtitle }) => {
  const isCurrent = !!current;
  return (
    <div className={`relative rounded-lg border p-4 text-center transition-shadow hover:shadow-lg ${isCurrent ? 'border-2' : ''} ${popular ? 'border-2' : ''}`} style={{ borderColor: isCurrent || popular ? theme.primary : theme.border }}>
      {popular && <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Most Popular</div>}
      <div className="font-bold text-lg">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      <div className="text-3xl font-bold my-3">
        {price || ''}<span className="text-base font-normal text-gray-500">{interval || ''}</span>
      </div>
      <button
        className="w-full px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        onClick={onSelect}
        disabled={isCurrent}
      >
        {isCurrent ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  )
}


