  import React, { useTransition } from 'react'
  import { useOutletContext, useNavigate } from 'react-router-dom'
  import { themes, defaultThemeName } from '../theme/themes'
  import { CreditCard, Calendar, Check, X, RefreshCw, Shield, Pencil, Trash2, ExternalLink, Settings, Crown } from 'lucide-react'
  import Modal from '../components/common/Modal'
  import { useAppContext } from '../context/AppContext'
  import { useBadgeStats } from '../utils/badges'
  import BadgeImage from '../components/badges/BadgeImage'
  import { createCheckoutSession, createPortalSession, cancelSubscription as stripeCancel, updatePaymentMethod, downloadInvoiceReceipt } from '../services/stripe'
  import { STRIPE_CONFIG } from '../config/stripe'
  import { getAuth } from 'firebase/auth'
  import { verifyStripeConfig } from '../utils/stripe-verify'
  // Beta imports removed - beta phase concluded

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
        // Auto-start 7-day trial for new users (beta phase concluded)
        if (user && !sub) {
            createSubscription({ name: 'Pro Monthly (7-Day Trial)', price: 6.00, interval: 'month' }, true);
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
    }, [sub])

    const [manageOpen, setManageOpen] = React.useState(false)
    const [selectedPlan, setSelectedPlan] = React.useState('month')
    const [confirmModalOpen, setConfirmModalOpen] = React.useState(false)
    const [confirmAction, setConfirmAction] = React.useState(null)
    const [confirmData, setConfirmData] = React.useState(null)

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
    const createSubscription = async (plan = { name: 'Pro Monthly', price: 6.00, interval: 'month' }, trial = false) => {
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

      // Show custom confirmation modal
      const isSwitching = sub && sub.status === 'active';
      const currentPlan = sub?.interval === 'month' ? 'Monthly' : sub?.interval === 'year' ? 'Annual' : sub?.interval === 'lifetime' ? 'Lifetime' : null;
      
      setConfirmAction('switchPlan');
      setConfirmData({
        plan,
        isSwitching,
        currentPlan
      });
      setConfirmModalOpen(true);
    }

    const cancelSubscription = async () => {
      if (!sub) return
      
      // Show custom confirmation modal
      setConfirmAction('cancelSubscription');
      setConfirmData({
        subscription: sub
      });
      setConfirmModalOpen(true);
    }

    // Handle confirmation modal actions
    const handleConfirmAction = async () => {
      setConfirmModalOpen(false);
      
      if (confirmAction === 'switchPlan') {
        const { plan } = confirmData;
        
        // Show processing message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: '🔄 Processing your subscription...', type: 'info' } 
        }));

        // Check if in demo mode first
        const auth = getAuth();
        if (!auth.currentUser) {
          console.log('🎭 Demo: Simulating successful plan change');
          
          // Create new subscription with the selected plan
          const now = new Date();
          const endDate = new Date(now);
          
          if (plan.interval === 'lifetime') {
            // Lifetime plan - set far future date
            endDate.setFullYear(endDate.getFullYear() + 100);
          } else if (plan.interval === 'year') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          } else {
            endDate.setMonth(endDate.getMonth() + 1);
          }
          
          const newSubscription = {
            id: String(Date.now()),
            plan: plan.name,
            price: plan.price,
            interval: plan.interval,
            currency: 'USD',
            status: 'active',
            startedAt: now.toISOString(),
            currentPeriodEnd: endDate.toISOString(),
            paymentMethod: {
              brand: 'Visa',
              last4: '4242'
            },
            subscriptionId: `demo_${Date.now()}`
          };
          
          saveSubscription(newSubscription);
          setSub(newSubscription);
          
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: `🎭 Demo: Successfully switched to ${plan.name}!`, type: 'success' } 
          }));
          
          return;
        }

        // Handle paid subscription with Stripe (authenticated users only)
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
      } else if (confirmAction === 'cancelSubscription') {
        const { subscription } = confirmData;
        
        // Show processing message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: '🔄 Cancelling your subscription...', type: 'info' } 
        }));
        
        try {
          // If it's a Stripe subscription, cancel through Stripe
          if (subscription.subscriptionId) {
            await stripeCancel(subscription.subscriptionId);
          } else {
            // Local cancellation for trials/demo
            const next = { ...subscription, status: 'canceled', endedAt: new Date().toISOString() }
            saveSubscription(next)
            setSub(next)
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Subscription canceled successfully. You will retain access until the end of your billing period.', type: 'success' } }))
          }
        } catch (error) {
          console.error('Cancellation error:', error);
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: 'Failed to cancel subscription. Please try again.', type: 'error' } 
          }));
        }
      }
      
      // Reset confirmation state
      setConfirmAction(null);
      setConfirmData(null);
    };

    const handleCancelAction = () => {
      setConfirmModalOpen(false);
      setConfirmAction(null);
      setConfirmData(null);
    };

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

        {/* Subscription */}
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-xl font-semibold mb-4" style={{ color: theme.primaryDark }}>Subscription</h2>
              {sub ? (
                // Regular user with subscription
                <div className="space-y-4">
                  {sub.status === 'trialing' && (
                    <TrialProgressBar 
                      theme={theme} 
                      startDate={sub.startedAt} 
                      endDate={sub.currentPeriodEnd} 
                    />
                  )}
                  {/* Current Plan Card */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)', border: '1px solid #A3B18A' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown size={20} style={{ color: '#5C7659' }} />
                        <span className="font-semibold text-lg" style={{ color: '#344E41' }}>Current Plan</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800' : 
                        sub.status === 'trialing' ? 'bg-blue-100 text-blue-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {sub.status === 'trialing' ? 'Trial' : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </div>
                    </div>
                    
                    <div className="text-2xl font-bold mb-1" style={{ color: '#344E41' }}>
                      {sub.plan} - ${sub.price}
                    </div>
                    
                    <div className="text-sm mb-3" style={{ color: '#5C7659' }}>
                      {sub.interval === 'lifetime' ? 'Lifetime Access' : 
                       sub.interval === 'year' ? 'Billed Annually' : 'Billed Monthly'}
                    </div>
                    
                    {sub.status !== 'canceled' && (
                      <div className="space-y-1 text-sm" style={{ color: '#6B7280' }}>
                        <div>{sub.status === 'trialing' ? 'Trial ends' : 'Next billing'}: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</div>
                        {sub.paymentMethod && (
                          <div>Payment: {sub.paymentMethod.brand} •••• {sub.paymentMethod.last4}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Upgrade Options */}
                  {sub.interval !== 'lifetime' && (
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: '#344E41' }}>Upgrade Your Plan</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sub.interval === 'month' && (
                          <button
                            className="p-3 rounded-lg border-2 text-left hover:opacity-90 transition-all"
                            style={{ 
                              borderColor: '#A3B18A', 
                              backgroundColor: 'rgba(163, 177, 138, 0.1)' 
                            }}
                            onClick={() => {
                              setConfirmAction('switchPlan');
                              setConfirmData({
                                plan: { name: 'Pro Annual', price: 89.99, interval: 'year' },
                                isSwitching: true,
                                currentPlan: 'Monthly'
                              });
                              setConfirmModalOpen(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold" style={{ color: '#344E41' }}>Annual Plan</div>
                                <div className="text-sm" style={{ color: '#5C7659' }}>$89.99/year</div>
                                <div className="text-xs" style={{ color: '#6B7280' }}>Save $17.89</div>
                              </div>
                              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#5C7659', color: 'white' }}>
                                Popular
                              </span>
                            </div>
                          </button>
                        )}
                        
                        <button
                          className="p-3 rounded-lg border-2 text-left hover:opacity-90 transition-all"
                          style={{ 
                            borderColor: '#A3B18A', 
                            backgroundColor: 'rgba(163, 177, 138, 0.1)' 
                          }}
                          onClick={() => {
                            setConfirmAction('switchPlan');
                            setConfirmData({
                              plan: { name: 'Pro Lifetime', price: 249.99, interval: 'lifetime' },
                              isSwitching: true,
                              currentPlan: sub.interval === 'month' ? 'Monthly' : 'Annual'
                            });
                            setConfirmModalOpen(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold" style={{ color: '#344E41' }}>Lifetime Plan</div>
                              <div className="text-sm" style={{ color: '#5C7659' }}>$249.99 one-time</div>
                              <div className="text-xs" style={{ color: '#6B7280' }}>Never pay again</div>
                            </div>
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#344E41', color: 'white' }}>
                              Limited Time
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Billing Management */}
                  <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                    <button 
                      className="px-3 py-2 rounded-md text-sm font-medium hover:opacity-90" 
                      style={{ backgroundColor: theme.border, color: theme.text }} 
                      onClick={() => setManageOpen(true)}
                    >
                      Manage Billing & Payment Methods
                    </button>
                  </div>
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
        <Modal 
          open={manageOpen} 
          onClose={() => setManageOpen(false)} 
          title="Billing & Payment Management" 
          theme={theme} 
          maxWidth="max-w-2xl" 
          footer={(
            <div className="w-full flex justify-between items-center">
              <div className="flex items-center gap-2">
                {sub?.status === 'active' && (
                  <button className="px-3 py-2 rounded-md text-sm" style={{ color: '#344E41' }} onClick={cancelSubscription}>Cancel Subscription</button>
                )}
              </div>
              <button className="px-3 py-2 rounded-md" onClick={() => setManageOpen(false)} style={{ backgroundColor: theme.border, color: theme.text }}>Close</button>
            </div>
          )}
        >
          <div className="space-y-6">
            {/* Founder's Pricing Alert */}
            <div className="rounded-xl p-6 text-center shadow-sm" style={{ background: 'linear-gradient(to right, #D4D7CD, #A3B18A)', border: '2px solid #A3B18A' }}>
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
                  <Crown size={16} className="text-white" />
                </div>
                <div className="text-xl font-bold" style={{ color: '#344E41' }}>
                  Founder's Pricing
                </div>
              </div>
              
              <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#3A5A40' }}>
              As an early supporter, you get grandfathered pricing that <strong>never increases</strong> - 
              even as we add new features and increase value as we grow!
            </p>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#5C7659' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#5C7659' }}></span>
                <span className="font-medium">Limited time founder benefits</span>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#5C7659' }}></span>
              </div>
            </div>
            
            {/* Current Plan Display */}
            {sub && (
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)', border: '1px solid #A3B18A' }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Crown size={20} style={{ color: '#5C7659' }} />
                  <span className="font-semibold text-lg" style={{ color: '#344E41' }}>Current Plan</span>
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: '#344E41' }}>
                  {sub.plan} - ${sub.price}
                </div>
                <div className="text-sm" style={{ color: '#5C7659' }}>
                  {sub.interval === 'lifetime' ? 'Lifetime Access' : 
                   sub.interval === 'year' ? 'Billed Annually' : 'Billed Monthly'}
                </div>
                {sub.status === 'active' && sub.currentPeriodEnd && (
                  <div className="text-xs mt-2" style={{ color: '#6B7280' }}>
                    Next billing: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Plan Change Notice */}
            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(163, 177, 138, 0.1)', border: '1px solid #A3B18A' }}>
              <p className="text-sm" style={{ color: '#5C7659' }}>
                💡 <strong>Want to change your plan?</strong> Use the upgrade options on the account page above for quick access.
              </p>
            </div>

            {/* Billing Management Section */}
            <div className="rounded-xl border-2 p-6 shadow-sm" style={{ backgroundColor: '#D4D7CD', borderColor: '#A3B18A' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
                  <CreditCard size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: '#344E41' }}>Billing Management</h3>
                  <p className="text-xs" style={{ color: '#5C7659' }}>Manage your payment and billing information</p>
                </div>
              </div>
              
              {/* Current Payment Method */}
              <div className="rounded-lg border p-4 mb-4 shadow-md bg-white" style={{ borderColor: '#A3B18A' }}>
                <h4 className="text-sm font-medium mb-3" style={{ color: '#344E41' }}>Current Payment Method</h4>
                <div className="flex items-center justify-between p-3 rounded-lg border shadow-sm bg-white" style={{ borderColor: '#D4D7CD' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-6 rounded flex items-center justify-center" style={{ backgroundColor: '#5C7659' }}>
                      <CreditCard size={12} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#344E41' }}>
                        {sub?.paymentMethod?.brand || 'Visa'} •••• {sub?.paymentMethod?.last4 || '1234'}
                      </div>
                      <div className="text-xs" style={{ color: '#5C7659' }}>Expires 12/25</div>
                    </div>
                  </div>
                  <button 
                    className="px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90 transition-all text-white shadow-sm" 
                    style={{ backgroundColor: '#5C7659' }}
                    onClick={() => updatePaymentMethod(sub?.customerId || 'demo_customer')}
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Billing History */}
              <div className="rounded-lg border p-4 mb-4 shadow-md bg-white" style={{ borderColor: '#A3B18A' }}>
                <h4 className="text-sm font-medium mb-3" style={{ color: '#344E41' }}>Billing History</h4>
                <div className="space-y-2">
                  {[
                    { date: 'Dec 1, 2024', amount: '$8.99', status: 'Paid', invoice: 'INV-001' },
                    { date: 'Nov 1, 2024', amount: '$8.99', status: 'Paid', invoice: 'INV-002' },
                    { date: 'Oct 1, 2024', amount: '$8.99', status: 'Paid', invoice: 'INV-003' }
                  ].map((invoice, index) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:opacity-80 rounded-lg transition-all border shadow-sm bg-white" style={{ borderColor: '#D4D7CD' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5C7659' }}>
                          <Check size={12} className="text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: '#344E41' }}>{invoice.date}</div>
                          <div className="text-xs" style={{ color: '#5C7659' }}>Invoice {invoice.invoice}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: '#344E41' }}>{invoice.amount}</span>
                        <button 
                          className="px-2 py-1 rounded text-xs hover:opacity-90 transition-all" 
                          style={{ backgroundColor: '#A3B18A', color: '#344E41' }}
                          onClick={() => downloadInvoiceReceipt(invoice.invoice, sub?.customerId)}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Billing */}
              {sub?.interval !== 'lifetime' && (
                <div className="rounded-lg border p-4 shadow-md bg-white" style={{ borderColor: '#A3B18A' }}>
                  <h4 className="text-sm font-medium mb-3" style={{ color: '#344E41' }}>Next Billing</h4>
                  <div className="flex items-center justify-between p-3 rounded-lg border shadow-sm bg-white" style={{ borderColor: '#D4D7CD' }}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#344E41' }}>
                        {sub?.interval === 'month' ? 'Monthly' : 'Annual'} Subscription
                      </div>
                      <div className="text-xs" style={{ color: '#5C7659' }}>
                        Next billing: {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: '#344E41' }}>
                        ${sub?.interval === 'month' ? '8.99' : '89.99'}
                      </div>
                      <div className="text-xs" style={{ color: '#5C7659' }}>per {sub?.interval === 'month' ? 'month' : 'year'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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

        {/* Confirmation Modal */}
        <Modal 
          open={confirmModalOpen} 
          onClose={handleCancelAction} 
          title={confirmAction === 'switchPlan' ? 'Confirm Plan Change' : 'Confirm Cancellation'} 
          theme={theme} 
          maxWidth="max-w-md" 
          footer={(
            <div className="w-full flex justify-end gap-3">
              <button 
                className="px-4 py-2 rounded-md text-sm font-medium transition-all" 
                onClick={handleCancelAction}
                style={{ backgroundColor: theme.border, color: theme.text }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-md text-sm font-medium text-white transition-all" 
                onClick={handleConfirmAction}
                style={{ 
                  backgroundColor: confirmAction === 'cancelSubscription' ? '#344E41' : '#5C7659'
                }}
              >
                {confirmAction === 'switchPlan' ? 'Confirm Change' : 'Confirm Cancellation'}
              </button>
            </div>
          )}
        >
          <div className="space-y-4">
            {confirmAction === 'switchPlan' && confirmData && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D4D7CD' }}>
                    <Crown size={24} style={{ color: '#5C7659' }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#344E41' }}>
                    Switch to {confirmData.plan.name}?
                  </h3>
                </div>
                
                {confirmData.isSwitching && confirmData.currentPlan && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(212, 215, 205, 0.5)', border: '1px solid #A3B18A' }}>
                    <p className="text-sm" style={{ color: '#344E41' }}>
                      <strong>Current Plan:</strong> {confirmData.currentPlan}
                    </p>
                    <p className="text-sm" style={{ color: '#344E41' }}>
                      <strong>New Plan:</strong> {confirmData.plan.name} - ${confirmData.plan.price}
                    </p>
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-sm mb-3" style={{ color: '#5C7659' }}>
                    {confirmData.plan.interval === 'lifetime' 
                      ? 'This is a one-time payment for lifetime access to The Pep Planner.'
                      : `This will change your billing to $${confirmData.plan.price}/${confirmData.plan.interval === 'month' ? 'month' : 'year'}.`
                    }
                  </p>
                  
                  {/* Proration notice for upgrades */}
                  {confirmData.isSwitching && confirmData.currentPlan && 
                   confirmData.currentPlan === 'Monthly' && confirmData.plan.interval === 'year' && (
                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center mt-1" style={{ backgroundColor: '#9CA3AF' }}>
                          <span className="text-white text-xs">$</span>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Fair billing
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                            We'll credit your unused time and apply it to your new plan.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Special Annual to Lifetime terms */}
                  {confirmData.isSwitching && confirmData.currentPlan && 
                   confirmData.currentPlan === 'Annual' && confirmData.plan.interval === 'lifetime' && (
                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center mt-1" style={{ backgroundColor: '#9CA3AF' }}>
                          <span className="text-white text-xs">∞</span>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Going lifetime
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                            We'll credit your unused time and you'll never be charged again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Monthly to Lifetime terms */}
                  {confirmData.isSwitching && confirmData.currentPlan && 
                   confirmData.currentPlan === 'Monthly' && confirmData.plan.interval === 'lifetime' && (
                    <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'rgba(156, 163, 175, 0.1)', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center mt-1" style={{ backgroundColor: '#9CA3AF' }}>
                          <span className="text-white text-xs">∞</span>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>
                            Going lifetime
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                            We'll credit your unused time and you'll never be charged again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {confirmAction === 'cancelSubscription' && confirmData && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(163, 177, 138, 0.2)' }}>
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#344E41' }}>
                    Cancel Subscription?
                  </h3>
                </div>
                
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(212, 215, 205, 0.5)', border: '1px solid #A3B18A' }}>
                  <p className="text-sm mb-2" style={{ color: '#344E41' }}>
                    <strong>Your access will continue until:</strong><br />
                    {confirmData.subscription?.currentPeriodEnd 
                      ? new Date(confirmData.subscription.currentPeriodEnd).toLocaleDateString()
                      : 'End of billing period'
                    }
                  </p>
                  <p className="text-sm" style={{ color: '#5C7659' }}>
                    You will not be charged again, and you can resubscribe at any time.
                  </p>
                </div>
              </>
            )}
          </div>
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
    <div className="relative group transition-all duration-300 hover:scale-105">
      
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="text-white text-xs font-semibold px-6 py-2 rounded-full shadow-md whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
            Most Popular
          </div>
        </div>
      )}
      
      {/* Card Container */}
      <div className={`relative bg-white rounded-2xl border-2 p-6 h-full transition-all duration-300 flex flex-col ${
        isCurrent || popular ? 'shadow-lg' : 'hover:shadow-xl'
      }`} style={{
        borderColor: isCurrent || popular ? '#A3B18A' : '#D4D7CD'
      }}>
        
        {/* Plan Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <h3 className="text-xl font-bold" style={{ color: '#344E41' }}>
              {title}
            </h3>
            {isCurrent && (
              <div className="ml-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#5C7659' }}>
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {subtitle && (
            <div className="inline-block px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#A3B18A', color: '#FFFFFF' }}>
              {subtitle}
            </div>
          )}
        </div>
        
        {/* Price Section */}
        <div className="text-center mb-8">
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold" style={{ color: '#344E41' }}>
              {price || ''}
            </span>
          </div>
          
          {/* Limited Time Notice for Lifetime */}
          {title === 'Lifetime' && (
            <div className="bg-stone-100 border border-stone-300 rounded-lg p-2 mt-3">
              <p className="text-xs text-stone-700">
                <strong>Forever a Researcher?</strong><br/>Purchase lifetime - only available for a short time
              </p>
            </div>
          )}
        </div>
        
        {/* Features List */}
        <div className="flex-1 space-y-3 mb-8">
          {title === 'Monthly' && (
            <>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>7-day free trial</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>Full access to all features</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>Cancel anytime</span>
              </div>
            </>
          )}
          {title === 'Annual' && (
            <>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>7-day free trial</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>Save $13 vs monthly</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>Full access to all features</span>
              </div>
            </>
          )}
          {title === 'Lifetime' && (
            <>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>One-time payment</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>Lifetime access</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: '#5C7659' }}></div>
                <span style={{ color: '#3A5A40' }}>All future updates</span>
              </div>
            </>
          )}
        </div>
        
        {/* Action Button */}
        <button
          className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
            isCurrent 
              ? 'cursor-default' 
              : 'hover:shadow-lg transform hover:scale-105'
          }`}
          style={{
            backgroundColor: isCurrent ? '#5C7659' : (popular ? '#3A5A40' : '#344E41'),
            color: '#FFFFFF'
          }}
          onClick={onSelect}
          disabled={isCurrent}
        >
          {isCurrent ? '✓ Current Plan' : 'Select Plan'}
        </button>
      </div>
    </div>
  )
}



