  import React from 'react'
  import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom'
  import { themes, defaultThemeName } from '../theme/themes'
  import { CreditCard, Calendar, Check, X, RefreshCw, Shield, Pencil, Trash2, ExternalLink, Settings, Crown, User, Lock, TrendingUp, Gift, FileText } from 'lucide-react'
import { Zap } from '../icons/lucide-safe'
  import Modal from '../components/common/Modal'
import CollapsibleSection from '../components/common/CollapsibleSection'
  import { useAppContext } from '../context/AppContext'
  import { useBadgeStats } from '../utils/badges'
  import BadgeImage from '../components/badges/BadgeImage'
  import { createCheckoutSession, createPortalSession, cancelSubscription as stripeCancel } from '../services/stripe'
  import { handleCheckoutReturn } from '../utils/checkoutNavigation'
  import { STRIPE_CONFIG } from '../config/stripe'
  import { getAuth, updatePassword as firebaseUpdatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail, updateEmail, verifyBeforeUpdateEmail } from 'firebase/auth'
  import { useFirebase } from '../context/FirebaseContext'
  import { verifyStripeConfig } from '../utils/stripe-verify'
  import { getLatestAgreement, AGREEMENT_TYPES } from '../services/agreementTracking'
  // Beta imports removed - beta phase concluded

  // Local helpers for auth + subscription data (local testing)
  function getAuthDb() { try { return JSON.parse(localStorage.getItem('tpprover_auth_users') || '{}') } catch { return {} } }
  function setAuthDb(db) { try { localStorage.setItem('tpprover_auth_users', JSON.stringify(db || {})) } catch {} }
  const enc = (s) => { try { return btoa(unescape(encodeURIComponent(String(s)))) } catch { return String(s) } }

  // Load subscription from cloud storage ONLY (no localStorage)
  async function loadSubscription(firebaseUser) { 
    try { 
      const { loadUserSubscription } = await import('../services/cloudStorage');
      if (firebaseUser) {
        const subscription = await loadUserSubscription(firebaseUser.uid);

        // Only return subscription if it's a real subscription (not demo/debug data)
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
  // Save subscription to cloud storage
  async function saveSubscription(sub, firebaseUser) { 
    try { 
      const { saveUserSubscription } = await import('../services/cloudStorage');
      if (firebaseUser) {
        await saveUserSubscription(firebaseUser.uid, sub);

      }
      // Dispatch custom event to notify AppContext of subscription change
      window.dispatchEvent(new CustomEvent('subscription:updated', { detail: { subscription: sub } }));
    } catch (error) {
      console.error('❌ Failed to save subscription to cloud:', error);
    }
  }
  function loadSecurity() { try { return JSON.parse(localStorage.getItem('tpprover_security') || 'null') } catch { return null } }
  function saveSecurity(sec) { try { localStorage.setItem('tpprover_security', JSON.stringify(sec)) } catch {} }
  function genAuthSecret(len = 16) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let out = ''
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
    return out
  }

  // Helper function to generate user initials
  function getUserInitials(email) {
    if (!email) return 'U'
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  export default function Account() {
    const { theme } = useOutletContext()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, logout } = useAppContext();
    const { firebaseUser } = useFirebase(); // CRITICAL: Must be at component level, before any useEffect
    const { earnedBadges } = useBadgeStats();
    // const [user, setUser] = React.useState(() => {
    //   try { return JSON.parse(localStorage.getItem('tpprover_user') || 'null') } catch { return null }
    // })
    const [sub, setSub] = React.useState(null)
    const [security, setSecurity] = React.useState(() => loadSecurity() || { twoFactorEnabled: false, twoFactorMethod: 'email', authSecret: '', emailVisible: true })
    const [timeLeft, setTimeLeft] = React.useState(null);

    // Load subscription data on component mount with localStorage fallback
    React.useEffect(() => {
        const loadSubData = async () => {
            try {
                const subscription = await loadSubscription(firebaseUser);
                
                // CRITICAL: If no cloud subscription, fall back to localStorage (offline support)
                if (!subscription) {
                    try {
                        const localSub = localStorage.getItem('tpprover_subscription');
                        if (localSub) {
                            const parsedSub = JSON.parse(localSub);

                            setSub(parsedSub);
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to parse localStorage subscription:', e);
                    }
                }
                
                setSub(subscription);
            } catch (error) {
                console.error('Failed to load subscription:', error);
                
                // Try localStorage fallback on error
                try {
                    const localSub = localStorage.getItem('tpprover_subscription');
                    if (localSub) {
                        const parsedSub = JSON.parse(localSub);

                        setSub(parsedSub);
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse localStorage subscription:', e);
                }
                
                setSub(null);
            }
        };
        
        loadSubData();
    }, []);

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
        // Load existing subscription from cloud ONLY
        if (user && !sub && firebaseUser) {

            loadSubscription(firebaseUser).then(cloudSub => {
                if (cloudSub) {
                    setSub(cloudSub);
                }
            });
        }
    }, [user, sub, firebaseUser])

    // Handle checkout return navigation
    React.useEffect(() => {
        handleCheckoutReturn(navigate, searchParams);
    }, [navigate, searchParams]);

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
            
            saveSubscription(next, firebaseUser)
            setSub(next)
            
            setManageOpen(false) // Close modal
        }

        const handleStripeCancelled = (event) => {
            if (!sub) return
            const next = { ...sub, status: 'canceled', endedAt: new Date().toISOString() }
            saveSubscription(next, firebaseUser)
            setSub(next)
        }

        window.addEventListener('stripe:checkout:success', handleStripeSuccess)
        window.addEventListener('stripe:subscription:cancelled', handleStripeCancelled)

        return () => {
            window.removeEventListener('stripe:checkout:success', handleStripeSuccess)
            window.removeEventListener('stripe:subscription:cancelled', handleStripeCancelled)
        }
    }, [sub])

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

    // Security: change password and email verification
    const [pwForm, setPwForm] = React.useState({ current: '', next: '', confirm: '' })
    const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false)
    const [isSendingVerification, setIsSendingVerification] = React.useState(false)
    
    // Email verification status
    const isEmailVerified = React.useMemo(() => {
      const auth = getAuth();
      return auth.currentUser?.emailVerified || false;
    }, [firebaseUser])
    
    // Send email verification using custom SendGrid service
    const sendVerificationEmail = async () => {
      const auth = getAuth();
      if (!auth.currentUser) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'You must be logged in to verify your email', type: 'error' } 
        }));
        return;
      }
      
      if (auth.currentUser.emailVerified) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Your email is already verified!', type: 'success' } 
        }));
        return;
      }
      
      setIsSendingVerification(true);
      try {
        console.log('📧 Sending custom verification email...');
        
        // Call the custom verification email function
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const sendCustomVerificationEmail = httpsCallable(functions, 'sendCustomVerificationEmail');
        
        const result = await sendCustomVerificationEmail();
        
        console.log('✅ Custom verification email result:', result.data);
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: '📧 Verification email sent! Check your inbox and spam folder.', type: 'success' } 
        }));
      } catch (error) {
        console.error('❌ Email verification error:', error);
        
        let errorMessage = 'Failed to send verification email. ';
        if (error.code === 'functions/too-many-requests') {
          errorMessage += 'Too many requests. Please try again later.';
        } else if (error.message?.includes('SendGrid')) {
          errorMessage += 'Email service temporarily unavailable. Please try again later.';
        } else {
          errorMessage += error.message || 'Please try again.';
        }
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: errorMessage, type: 'error' } 
        }));
      } finally {
        setIsSendingVerification(false);
      }
    }
    
    // Send password reset email
    const sendPasswordReset = async () => {
      if (!user?.email) return;
      
      try {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, user.email, {
          url: window.location.origin + '/login',
          handleCodeInApp: false
        });
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: '📧 Password reset email sent! Check your inbox.', type: 'success' } 
        }));
      } catch (error) {
        console.error('❌ Password reset error:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to send password reset email. Please try again.', type: 'error' } 
        }));
      }
    }
    
    const changePassword = async () => {
      if (!user?.email) { return }
      
      // Validate new password
      if (pwForm.next.length < 8 || !/[A-Z]/.test(pwForm.next) || !/[a-z]/.test(pwForm.next) || !/\d/.test(pwForm.next)) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'New password must be at least 8 characters with uppercase, lowercase, and number', type: 'error' } }))
        return
      }
      if (pwForm.next !== pwForm.confirm) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Passwords do not match', type: 'error' } }))
        return
      }
      
      setIsUpdatingPassword(true);
      
      try {
        // Check if Firebase user
        const auth = getAuth();
        if (firebaseUser || auth.currentUser) {

          // Reauthenticate first (required by Firebase)
          const credential = EmailAuthProvider.credential(
            user.email,
            pwForm.current
          );
          
          await reauthenticateWithCredential(auth.currentUser, credential);
          
          // Update password
          await firebaseUpdatePassword(auth.currentUser, pwForm.next);
          
          setPwForm({ current: '', next: '', confirm: '' });
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: '✅ Password updated successfully!', type: 'success' } 
          }));
        } else {
          // Legacy localStorage auth

          const key = user.email.toLowerCase();
          const db = getAuthDb();
          const rec = db[key];
          
          if (!rec || rec.p !== enc(pwForm.current)) {
            window.dispatchEvent(new CustomEvent('tpp:toast', { 
              detail: { message: 'Current password is incorrect', type: 'error' } 
            }));
            return;
          }
          
          db[key] = { ...(rec || {}), p: enc(pwForm.next) };
          setAuthDb(db);
          setPwForm({ current: '', next: '', confirm: '' });
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: '✅ Password updated successfully!', type: 'success' } 
          }));
        }
      } catch (error) {
        console.error('❌ Password update error:', error);
        
        let errorMessage = 'Failed to update password. ';
        if (error.code === 'auth/wrong-password') {
          errorMessage += 'Current password is incorrect.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage += 'New password is too weak.';
        } else if (error.code === 'auth/requires-recent-login') {
          errorMessage += 'Please log out and log back in, then try again.';
        } else {
          errorMessage += error.message || 'Please try again.';
        }
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: errorMessage, type: 'error' } 
        }));
      } finally {
        setIsUpdatingPassword(false);
      }
    }

    // Subscription actions with Stripe integration
    const createSubscription = async (plan = { name: 'Pro Monthly', price: 6.00, interval: 'month' }, labAccess = false) => {
      if (labAccess) {
        // Handle lab access creation locally
        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + 7)
        
        const next = {
          id: String(Date.now()),
          plan: plan.name,
          price: plan.price,
          interval: plan.interval,
          currency: 'USD',
          status: 'lab_access',
          startedAt: now.toISOString(),
          currentPeriodEnd: end.toISOString(),
          paymentMethod: null,
        }
        saveSubscription(next, firebaseUser)
        setSub(next)
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Lab access started', type: 'success' } }))
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

        // ALL users must go through Stripe checkout for ANY paid plan
        try {
          let priceId = '';
          if (plan.interval === 'month') {
            priceId = STRIPE_CONFIG.prices.monthly;
          } else if (plan.interval === 'year') {
            priceId = STRIPE_CONFIG.prices.annual;
          } else if (plan.interval === 'lifetime') {
            priceId = STRIPE_CONFIG.prices.lifetime;
          }

          // Always redirect to Stripe checkout, even for demo users - return to account page
          await createCheckoutSession(priceId, user?.email || 'demo@example.com', user?.uid || 'demo_user');
          
        } catch (error) {
          console.error('Subscription creation error:', error);
          window.dispatchEvent(new CustomEvent('tpp:toast', { 
            detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
          }));
        }
      } else if (confirmAction === 'cancelSubscription') {
        const { subscription } = confirmData;
        
        // Show processing message
        
        try {
          // If it's a Stripe subscription, cancel through Stripe
          if (subscription.subscriptionId) {
            await stripeCancel(subscription.subscriptionId);
          } else {
            // Local cancellation for lab access/demo
            const next = { ...subscription, status: 'canceled', endedAt: new Date().toISOString() }
            saveSubscription(next, firebaseUser)
            setSub(next)
            window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Lab access will end after your current research period.', type: 'success' } }))
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
        <CollapsibleSection
          title="Profile"
          description="Manage your account information and settings"
          icon={User}
          theme={theme}
        >
          {user ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {/* User Avatar */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ 
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)` 
                }}>
                  {getUserInitials(user.email)}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm" style={{ color: theme.textLight }}>Email</div>
                      <div className="font-medium text-lg">{user.email}</div>
                    </div>
                    <button className="text-sm font-medium hover:underline px-2 py-1 rounded hover:bg-gray-100" style={{ color: theme.primary }} onClick={() => { setEditingEmail(true); setEmailDraft(user.email || '') }}>Edit</button>
                  </div>
                </div>
              </div>
              <hr style={{ borderColor: theme.border }}/>
              
              {/* Modern Account Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Member Since Card */}
                <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.secondary }}>
                      <svg className="w-5 h-5" style={{ color: theme.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>Member Since</div>
                      <div className="text-sm font-semibold" style={{ color: theme.text }}>
                        {createdAt ? createdAt.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        }) : '—'}
                      </div>
                      {createdAt && (
                        <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                          {Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))} days ago
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Status Card */}
                <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0fdf4' }}>
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>Account Status</div>
                      <div className="text-sm font-semibold text-green-600">Active</div>
                      <div className="text-xs mt-1" style={{ color: theme.textLight }}>Full access enabled</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Verification Status - Only show for Firebase users */}
              {firebaseUser && (
                <div className="p-4 rounded-lg border" style={{ 
                  borderColor: isEmailVerified ? '#10b981' : '#f59e0b', 
                  backgroundColor: isEmailVerified ? '#f0fdf4' : '#fffbeb' 
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ 
                        backgroundColor: isEmailVerified ? '#d1fae5' : '#fef3c7' 
                      }}>
                        <svg className="w-5 h-5" style={{ color: isEmailVerified ? '#10b981' : '#f59e0b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: isEmailVerified ? '#059669' : '#d97706' }}>
                          Email Status
                        </div>
                        <div className="text-sm font-semibold" style={{ color: isEmailVerified ? '#10b981' : '#f59e0b' }}>
                          {isEmailVerified ? '✓ Verified' : '⚠ Not Verified'}
                        </div>
                        <div className="text-xs mt-1" style={{ color: isEmailVerified ? '#059669' : '#d97706' }}>
                          {isEmailVerified ? 'Your email is confirmed' : 'Please verify your email'}
                        </div>
                      </div>
                    </div>
                    {!isEmailVerified && (
                      <button 
                        onClick={sendVerificationEmail}
                        disabled={isSendingVerification}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#f59e0b', color: 'white' }}
                      >
                        {isSendingVerification ? 'Sending...' : 'Send Email'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Logout button at bottom */}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                <button 
                  className="w-full px-4 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-all" 
                  style={{ backgroundColor: theme.error || '#DC2626', color: '#ffffff' }} 
                  onClick={logout}
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: theme.textLight }}>You are not signed in. Go to Login.</div>
          )}
        </CollapsibleSection>

        {/* Subscription */}
        <CollapsibleSection
          title="Research Subscription"
          description="Manage your subscription and billing"
          icon={TrendingUp}
          theme={theme}
          defaultExpanded={true}
        >
              {sub ? (
                // Regular user with subscription
                <div className="space-y-4">
                  {/* Current Plan / Trial Card with Integrated Countdown */}
                  <div className="p-4 rounded-lg shadow-sm" style={{ backgroundColor: theme.accent, border: `2px solid ${theme.primary}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Crown size={18} style={{ color: theme.primary }} />
                        <span className="font-semibold text-base" style={{ color: theme.primaryDark }}>
                          {sub?.status === 'trialing' ? '7-Day Researcher Access' : 'Your Research Status'}
                        </span>
                      </div>
                       <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                         sub?.status === 'active' ? 'bg-green-100 text-green-800' : 
                         sub?.status === 'trialing' ? 'bg-blue-100 text-blue-800' : 
                         'bg-red-100 text-red-800'
                       }`}>
                         {sub?.status === 'trialing' ? 'Trialing' : sub?.interval === 'lifetime' ? 'Lifetime' : sub?.status?.charAt(0).toUpperCase() + sub?.status?.slice(1)}
                       </div>
                    </div>
                    
                     {sub?.status === 'trialing' ? (
                       <>
                         {/* Trial Countdown Progress Bar */}
                         {sub.currentPeriodEnd && (
                           <div className="p-3 rounded-lg" style={{ backgroundColor: theme.infoBg, border: `2px solid ${theme.info}` }}>
                             <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-2">
                                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.info }}></div>
                                 <span className="font-medium text-sm" style={{ color: theme.primaryDark }}>
                                   Time Remaining
                                 </span>
                               </div>
                               <span className="text-sm font-bold text-blue-600">
                                 {(() => {
                                   const now = new Date();
                                   const end = new Date(sub.currentPeriodEnd);
                                   const start = new Date(sub.startedAt);
                                   const diffTime = end - now;
                                   
                                   if (diffTime <= 0) {
                                     return 'Lab access expired';
                                   }
                                   
                                   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                   const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                   const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                                   
                                   let countdownText = '';
                                   if (diffDays > 0) {
                                     countdownText = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                     if (diffHours > 0) {
                                       countdownText += `, ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
                                     }
                                     countdownText += ' remaining';
                                   } else if (diffHours > 0) {
                                     countdownText = `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
                                     if (diffMinutes > 0) {
                                       countdownText += `, ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
                                     }
                                     countdownText += ' remaining';
                                   } else {
                                     countdownText = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} remaining`;
                                   }
                                   
                                   return countdownText;
                                 })()}
                               </span>
                             </div>
                             
                             <div className="space-y-1">
                               <div className="w-full bg-gray-200 rounded-full h-2">
                                 <div
                                   className="h-2 rounded-full transition-all duration-500 ease-out"
                                   style={{
                                     width: `${(() => {
                                       const start = new Date(sub.startedAt);
                                       const end = new Date(sub.currentPeriodEnd);
                                       const now = new Date();
                                       const totalDuration = end.getTime() - start.getTime();
                                       const elapsedTime = now.getTime() - start.getTime();
                                       return Math.max(0, 100 - (elapsedTime / totalDuration * 100));
                                     })()}%`,
                                     background: `linear-gradient(90deg, ${theme.info} 0%, ${theme.primaryDark} 100%)`,
                                     boxShadow: `0 1px 2px ${theme.info}30`
                                   }}
                                 ></div>
                               </div>
                               <div className="flex justify-between text-xs" style={{ color: theme.textLight }}>
                                 <span>Started: {new Date(sub.startedAt).toLocaleDateString()}</span>
                                 <span>Ends: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                               </div>
                               <div className="text-center text-xs mt-2 p-2 rounded" style={{ backgroundColor: theme.infoBg, color: theme.primaryDark }}>
                                 {(() => {
                                   const now = new Date();
                                   const end = new Date(sub.currentPeriodEnd);
                                   const diffTime = end - now;
                                   
                                   if (diffTime <= 0) {
                                     return '⏰ Your trial has ended';
                                   }
                                   
                                   const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                   const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                   const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
                                   
                                   if (diffDays > 1) {
                                     return `⏳ ${diffDays} days, ${diffHours} hours, and ${diffMinutes} minutes of research time left`;
                                   } else if (diffDays === 1) {
                                     return `⏳ 1 day, ${diffHours} hours, and ${diffMinutes} minutes of research time left`;
                                   } else if (diffHours > 0) {
                                     return `⏳ ${diffHours} hours and ${diffMinutes} minutes of research time left`;
                                   } else {
                                     return `⏳ ${diffMinutes} minutes of research time left`;
                                   }
                                 })()}
                               </div>
                             </div>
                           </div>
                         )}
                       </>
                     ) : sub.interval === 'lifetime' ? (
                       <>
                        {/* Lifetime Celebration - Main Content */}
                        <div className="px-8 py-12 rounded-xl text-center" style={{ backgroundColor: 'rgba(250, 250, 248, 0.5)', border: `2px solid ${theme.primary}` }}>
                          <div className="flex items-center justify-center gap-3 mb-5">
                            <Crown size={32} style={{ color: '#3A5A40' }} />
                            <h3 className="text-2xl font-bold" style={{ color: '#344E41' }}>
                              Forever a Researcher
                            </h3>
                          </div>
                          <p className="text-base mb-4" style={{ color: '#5C7659' }}>
                            You have unlimited access to The Pep Planner.
                          </p>
                          <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
                            Thank you for your support!
                          </p>
                          <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.primary }}>
                            <p className="text-xs font-medium" style={{ color: '#3A5A40' }}>
                              Plan: {sub.plan} • One-time payment of ${sub.price}
                            </p>
                          </div>
                        </div>
                       </>
                     ) : (
                       <>
                         {/* Active Subscription Status - For Monthly/Annual */}
                         <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '2px solid rgba(34, 197, 94, 0.3)' }}>
                           <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full bg-green-500"></div>
                               <span className="font-semibold text-sm" style={{ color: theme.primaryDark }}>
                                 Active Researcher
                               </span>
                             </div>
                             <span className="text-sm font-bold text-green-600">
                               {sub.interval === 'year' ? 'Annual' : 'Monthly'}
                             </span>
                           </div>
                           
                           <div className="space-y-2">
                             <div className="w-full bg-gray-200 rounded-full h-3">
                               <div
                                 className="h-3 rounded-full transition-all duration-500 ease-out"
                                 style={{
                                   width: '100%',
                                   background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                                   boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)'
                                 }}
                               ></div>
                             </div>
                             <div className="flex justify-between text-xs" style={{ color: theme.textLight }}>
                               <span>{sub.plan} - ${sub.price}</span>
                               <span>Next billing: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                             </div>
                           </div>
                         </div>
                       </>
                     )}
                  </div>

                   {/* Founder's Pricing Alert - Only show for non-lifetime users */}
                   {sub.interval !== 'lifetime' && (
                   <div className="rounded-lg p-4 text-center shadow-sm" style={{ background: 'linear-gradient(to right, #D4D7CD, #A3B18A)', border: '2px solid #A3B18A' }}>
                     <div className="flex items-center justify-center gap-2 mb-2">
                       <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
                         <Crown size={12} className="text-white" />
                       </div>
                       <div className="text-lg font-bold" style={{ color: '#344E41' }}>
                         Founder's Pricing
                       </div>
                     </div>
                     
                     <div className="rounded-lg p-3 mb-2" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)' }}>
                       <p className="text-xs leading-relaxed" style={{ color: '#3A5A40' }}>
                         As an early supporter, you get grandfathered pricing that <strong>never increases</strong> - 
                         even as we add new features and increase value as we grow!
                       </p>
                     </div>
                     
                   </div>
                   )}

                   {/* Plan Selection Options */}
                   {(sub?.interval !== 'lifetime' || !sub) && (
                   <div>
                     <h4 className="font-semibold mb-4" style={{ color: '#344E41' }}>
                       {(sub?.status === 'trialing' || (sub?.status === 'inactive' && sub?.plan === '7-Day Free Trial') || !sub)
                         ? 'Continue Your Research' 
                         : sub.interval === 'month' 
                         ? 'Save with a Long-Term Plan' 
                         : 'Upgrade to Lifetime Access'}
                     </h4>
                     
                     {/* Show different plan options based on current subscription */}
                     {(() => {
                       return (sub?.status === 'trialing' || (sub?.status === 'inactive' && sub?.plan === '7-Day Free Trial') || !sub);
                     })() ? (
                       // Trial users see all three plans
                       <div className="space-y-4">
                         {/* Monthly and Annual in 2-column layout */}
                         <div className="grid grid-cols-2 gap-3">
                      {/* Monthly Plan */}
                      <div 
                        className="relative bg-white rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
                        style={{ borderColor: sub?.interval === 'month' ? '#A3B18A' : '#D4D7CD' }}
                        onClick={async () => {
                          try {
                            await createCheckoutSession(STRIPE_CONFIG.prices.monthly, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                          } catch (error) {
                            console.error('Stripe checkout error:', error);
                          }
                        }}
                      >
                        {/* Current Plan Badge */}
                        {sub?.interval === 'month' && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#5C7659' }}>
                              Active Research
                            </div>
                          </div>
                        )}

                        {/* Plan Title */}
                        <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                          <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Monthly</h3>
                          <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$8.99</div>
                          <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per month</div>
                        </div>

                        {/* Action Button */}
                        <button 
                          className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                          style={{ backgroundColor: sub?.interval === 'month' ? '#5C7659' : '#344E41' }}
                        >
                          {sub?.interval === 'month' ? 'Active Research' : 'Start Monthly'}
                        </button>
                      </div>

                      {/* Annual Plan */}
                      <div 
                        className="relative bg-white rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
                        style={{ borderColor: sub?.interval === 'year' ? '#A3B18A' : '#D4D7CD' }}
                        onClick={async () => {
                          try {
                            await createCheckoutSession(STRIPE_CONFIG.prices.annual, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                          } catch (error) {
                            console.error('Stripe checkout error:', error);
                          }
                        }}
                      >
                        {/* Current Plan Badge */}
                        {sub?.interval === 'year' && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#5C7659' }}>
                              Active Research
                            </div>
                          </div>
                        )}

                        {/* Popular Badge */}
                        {sub?.interval !== 'year' && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
                              Popular
                            </div>
                          </div>
                        )}

                        {/* Plan Title */}
                        <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                          <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Annual</h3>
                          <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$89.99</div>
                          <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per year</div>
                          
                          {/* Subtitle Badge */}
                          <div className="text-center mt-1">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                              Save $17.89
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button 
                          className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                          style={{ backgroundColor: sub?.interval === 'year' ? '#5C7659' : '#3A5A40' }}
                        >
                          {sub?.interval === 'year' ? 'Active Research' : 'Start Annual'}
                        </button>
                      </div>
                         </div>
                         
                         {/* Lifetime plan in expanded single column */}
                         <div 
                           className="relative bg-white rounded-lg border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200"
                           style={{ borderColor: sub?.interval === 'lifetime' ? '#A3B18A' : '#D4D7CD' }}
                           onClick={async () => {
                             try {
                               await createCheckoutSession(STRIPE_CONFIG.prices.lifetime, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                             } catch (error) {
                               console.error('Stripe checkout error:', error);
                             }
                           }}
                         >
                           {/* Limited Time Badge */}
                           {sub?.interval !== 'lifetime' && (
                             <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                               <div className="px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#344E41' }}>
                                 Limited Time Only
                               </div>
                             </div>
                           )}
                           
                           {/* Content with more vertical space */}
                           <div className="flex items-center justify-between min-h-[80px]">
                             <div className="flex items-center gap-5">
                               <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#344E41' }}>
                                 <Crown size={20} className="text-white" />
                               </div>
                               <div className="space-y-1">
                                 <div className="font-bold text-lg" style={{ color: '#344E41' }}>Lifetime Access</div>
                                 <div className="text-base font-semibold" style={{ color: '#344E41' }}>$249.99</div>
                                 <div className="text-sm" style={{ color: '#5C7659' }}>Never pay again • All features included</div>
                               </div>
                             </div>
                             <button 
                               className="px-6 py-3 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                               style={{ backgroundColor: '#344E41' }}
                             >
                               Join Forever
                             </button>
                           </div>
                         </div>
                       </div>
                     ) : sub.interval === 'month' ? (
                       // Monthly users see subtle Annual and Lifetime upgrade options
                       <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Annual Upgrade */}
                           <div 
                             className="relative bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
                             style={{ borderColor: '#D4D7CD' }}
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
                             <div className="text-center mb-4 flex-1 flex flex-col justify-center">
                               <h3 className="text-lg font-bold mb-2" style={{ color: '#344E41' }}>Save $17.89/year</h3>
                               <p className="text-sm mb-3" style={{ color: '#5C7659' }}>
                                 Switch to Annual billing and save on your subscription
                               </p>
                               <div className="text-2xl font-bold" style={{ color: '#344E41' }}>$89.99/year</div>
                             </div>
                             <button 
                               className="w-full py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                               style={{ backgroundColor: '#3A5A40' }}
                             >
                               Switch to Annual
                             </button>
                           </div>

                           {/* Lifetime Upgrade */}
                           <div 
                             className="relative bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col min-h-[180px]"
                             style={{ borderColor: '#D4D7CD' }}
                             onClick={async () => {
                               try {
                                 await createCheckoutSession(STRIPE_CONFIG.prices.lifetime, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                               } catch (error) {
                                 console.error('Stripe checkout error:', error);
                               }
                             }}
                           >
                             <div className="text-center mb-6 flex-1 flex flex-col justify-center">
                               <div className="flex items-center justify-center mb-3">
                                 <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#344E41' }}>
                                   <Crown size={18} className="text-white" />
                                 </div>
                               </div>
                               <h3 className="text-lg font-bold mb-2" style={{ color: '#344E41' }}>One-Time Payment</h3>
                               <p className="text-sm mb-3" style={{ color: '#5C7659' }}>
                                 Never pay again - lifetime access to all features
                               </p>
                               <div className="text-2xl font-bold" style={{ color: '#344E41' }}>$249.99</div>
                             </div>
                             <button 
                               className="w-full py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 shadow-md"
                               style={{ backgroundColor: '#344E41' }}
                             >
                               Upgrade to Lifetime
                             </button>
                           </div>
                         </div>
                       </div>
                     ) : sub.interval === 'year' ? (
                       // Annual users see subtle Lifetime upgrade option
                       <div className="space-y-4">
                         <div 
                           className="relative bg-white rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-row items-center gap-6 min-h-[120px]"
                           style={{ borderColor: '#D4D7CD' }}
                           onClick={async () => {
                             try {
                               await createCheckoutSession(STRIPE_CONFIG.prices.lifetime, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                             } catch (error) {
                               console.error('Stripe checkout error:', error);
                             }
                           }}
                         >
                           <div className="flex items-center gap-4 flex-1">
                             <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#344E41' }}>
                               <Crown size={18} className="text-white" />
                             </div>
                             <div className="flex-1">
                               <h3 className="text-lg font-bold mb-2" style={{ color: '#344E41' }}>Upgrade to Lifetime Access</h3>
                               <p className="text-sm mb-2" style={{ color: '#5C7659' }}>
                                 One-time payment of $249.99 - never pay again
                               </p>
                               <p className="text-xs" style={{ color: '#6B7280' }}>
                                 We'll credit your unused time toward the lifetime upgrade
                               </p>
                             </div>
                           </div>
                           <button 
                             className="px-6 py-3 rounded-lg text-white font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                             style={{ backgroundColor: '#344E41' }}
                           >
                             Upgrade Now
                           </button>
                         </div>
                       </div>
                     ) : null}
                  </div>
                   )}

                  {/* Billing Management - Show for paid subscriptions (active, not trial) */}
                  {sub && (sub.status === 'active' || sub.status === 'past_due' || sub.status === 'canceled') && 
                   sub.status !== 'trialing' && sub.status !== 'lab_access' ? (
                    <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                      {sub.customerId && !sub.customerId.startsWith('cus_demo_') && sub.customerId !== 'demo_customer' ? (
                        <button 
                          className="px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all" 
                          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} 
                          onClick={() => window.open('https://billing.stripe.com/p/login/3cI00c99kd8w7y20qIebu00', '_blank')}
                        >
                          Manage Billing & Payment Methods
                        </button>
                      ) : (
                        <div className="text-sm p-3 rounded-md" style={{ backgroundColor: theme.secondary, color: theme.textLight }}>
                          <p className="mb-1 font-medium" style={{ color: theme.text }}>Payment History</p>
                          <p>Your subscription was activated. To manage billing, please contact support.</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : (
                // Regular user without subscription - show plans
                <div className="space-y-4">
                  
                  {/* Founder's Pricing Alert - Show for users without subscription */}
                  <div className="rounded-lg p-4 text-center shadow-sm mb-4" style={{ background: 'linear-gradient(to right, #D4D7CD, #A3B18A)', border: '2px solid #A3B18A' }}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
                        <Crown size={12} className="text-white" />
                      </div>
                      <div className="text-lg font-bold" style={{ color: '#344E41' }}>
                        Founder's Pricing
                      </div>
                    </div>
                    
                    <div className="rounded-lg p-3 mb-2" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)' }}>
                      <p className="text-xs leading-relaxed" style={{ color: '#3A5A40' }}>
                        As an early supporter, you get grandfathered pricing that <strong>never increases</strong> - 
                        even as we add new features and increase value as we grow!
                      </p>
                    </div>
                  </div>
                  
                  {/* Show subscription plans for users without subscription */}
                  <div>
                    <h4 className="font-semibold mb-4" style={{ color: '#344E41' }}>
                      Continue Your Research
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Monthly and Annual in 2-column layout */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Monthly Plan */}
                        <div 
                          className="relative bg-white rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
                          style={{ borderColor: '#D4D7CD' }}
                          onClick={async () => {
                            try {
                              await createCheckoutSession(STRIPE_CONFIG.prices.monthly, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                            } catch (error) {
                              console.error('Stripe checkout error:', error);
                            }
                          }}
                        >
                          <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                            <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Monthly</h3>
                            <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$8.99</div>
                            <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per month</div>
                          </div>
                          <button 
                            className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                            style={{ backgroundColor: '#344E41' }}
                          >
                            Start Monthly
                          </button>
                        </div>

                        {/* Annual Plan */}
                        <div 
                          className="relative bg-white rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
                          style={{ borderColor: '#D4D7CD' }}
                          onClick={async () => {
                            try {
                              await createCheckoutSession(STRIPE_CONFIG.prices.annual, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                            } catch (error) {
                              console.error('Stripe checkout error:', error);
                            }
                          }}
                        >
                          {/* Popular Badge */}
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
                              Popular
                            </div>
                          </div>

                          <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                            <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Annual</h3>
                            <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$89.99</div>
                            <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per year</div>
                            
                            {/* Subtitle Badge */}
                            <div className="text-center mt-1">
                              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                                Save $17.89
                              </span>
                            </div>
                          </div>

                          <button 
                            className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                            style={{ backgroundColor: '#3A5A40' }}
                          >
                            Start Annual
                          </button>
                        </div>
                      </div>
                      
                      {/* Lifetime plan in expanded single column */}
                      <div 
                        className="relative bg-white rounded-lg border-2 p-6 cursor-pointer hover:shadow-lg transition-all duration-200"
                        style={{ borderColor: '#D4D7CD' }}
                        onClick={async () => {
                          try {
                            await createCheckoutSession(STRIPE_CONFIG.prices.lifetime, user?.email || 'demo@example.com', user?.uid || 'demo_user');
                          } catch (error) {
                            console.error('Stripe checkout error:', error);
                          }
                        }}
                      >
                        {/* Limited Time Badge */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <div className="px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#344E41' }}>
                            Limited Time Only
                          </div>
                        </div>
                        
                        {/* Content with more vertical space */}
                        <div className="flex items-center justify-between min-h-[80px]">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#344E41' }}>
                              <Crown size={20} className="text-white" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-bold text-lg" style={{ color: '#344E41' }}>Lifetime Access</div>
                              <div className="text-base font-semibold" style={{ color: '#344E41' }}>$249.99</div>
                              <div className="text-sm" style={{ color: '#5C7659' }}>Never pay again • All features included</div>
                            </div>
                          </div>
                          <button 
                            className="px-6 py-3 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                            style={{ backgroundColor: '#344E41' }}
                          >
                            Join Forever
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
        </CollapsibleSection>

        {/* Security */}
        <CollapsibleSection
          title="Security"
          description="Manage your password and two-factor authentication"
          icon={Lock}
          theme={theme}
        >
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium">Password</div>
              <div className="text-xs mb-2" style={{ color: theme.textLight }}>For security, you will be logged out after changing your password.</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="password" className="p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} placeholder="Current" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} />
                <input type="password" className="p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} placeholder="New" value={pwForm.next} onChange={e => setPwForm({ ...pwForm, next: e.target.value })} />
                <input type="password" className="p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} placeholder="Confirm" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                {firebaseUser && (
                  <button 
                    onClick={sendPasswordReset}
                    className="text-xs hover:underline"
                    style={{ color: theme.primary }}
                  >
                    Forgot password? Send reset email
                  </button>
                )}
                <button 
                  className="px-3 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50" 
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} 
                  onClick={changePassword}
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
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
        </CollapsibleSection>

        {/* Legal & Privacy */}
        <CollapsibleSection
          title="Legal & Privacy"
          description="View your agreement history and privacy information"
          icon={FileText}
          theme={theme}
        >
          <div className="space-y-4">
            {/* Privacy Policy Agreement */}
            <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.secondary }}>
                  <Shield className="w-5 h-5" style={{ color: theme.primary }} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>Privacy Policy</div>
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>
                    {(() => {
                      const privacyAgreement = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY) || getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE);
                      if (privacyAgreement) {
                        const agreedDate = new Date(privacyAgreement.timestamp);
                        return `Agreed on ${agreedDate.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}`;
                      }
                      return 'Not recorded';
                    })()}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                    Version: {(() => {
                      const privacyAgreement = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY) || getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE);
                      return privacyAgreement?.version || 'N/A';
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms of Service Agreement */}
            <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.secondary }}>
                  <FileText className="w-5 h-5" style={{ color: theme.primary }} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.textLight }}>Terms of Service</div>
                  <div className="text-sm font-semibold" style={{ color: theme.text }}>
                    {(() => {
                      const termsAgreement = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_TERMS) || getLatestAgreement(AGREEMENT_TYPES.TERMS_UPDATE);
                      if (termsAgreement) {
                        const agreedDate = new Date(termsAgreement.timestamp);
                        return `Agreed on ${agreedDate.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}`;
                      }
                      return 'Not recorded';
                    })()}
                  </div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>
                    Version: {(() => {
                      const termsAgreement = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_TERMS) || getLatestAgreement(AGREEMENT_TYPES.TERMS_UPDATE);
                      return termsAgreement?.version || 'N/A';
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs p-3 rounded-md" style={{ backgroundColor: theme.secondary, color: theme.textLight }}>
              <p>Your agreement timestamps are securely stored for legal compliance. If you have questions about our privacy practices, please contact us at <a href="mailto:contact@thepepplanner.com" className="underline hover:opacity-80" style={{ color: theme.primary }}>contact@thepepplanner.com</a>.</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Two-Factor modal */}
        <Modal 
          open={twoFAOpen} 
          onClose={() => setTwoFAOpen(false)} 
          title="Two-Factor Authentication"
          theme={theme} 
          maxWidth="max-w-md" 
          footer={(
            <>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90" 
                onClick={() => setTwoFAOpen(false)} 
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" 
                onClick={enableTwoFA} 
                style={{ backgroundColor: '#A3B18A' }}
              >
                Save
              </button>
            </>
          )}
        >
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2" style={{ color: '#374151' }}>Authentication Method</div>
              <select 
                className="w-full p-3 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50" 
                value={twoFAMethod} 
                onChange={e => setTwoFAMethod(e.target.value)} 
                style={{ 
                  borderColor: '#D1D5DB', 
                  backgroundColor: '#F9FAFB',
                  focusRingColor: '#A3B18A'
                }}
              >
                <option value="email">Email OTP</option>
                <option value="authenticator">Authenticator App</option>
              </select>
            </div>
            {twoFAMethod === 'authenticator' && (
              <div className="rounded-lg border p-4 bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                <div className="text-sm font-medium mb-2" style={{ color: '#374151' }}>Authenticator Secret</div>
                <div className="font-mono text-sm select-all p-2 bg-white rounded border" style={{ borderColor: '#D1D5DB' }}>{twoFASecret}</div>
                <div className="text-xs text-gray-600 mt-2">Scan this secret in your authenticator app. Store recovery codes safely.</div>
                <div className="text-right mt-3">
                  <button 
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90" 
                    style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' }} 
                    onClick={() => setTwoFASecret(genAuthSecret())}
                  >
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Edit Email Modal */}
        <Modal 
          open={editingEmail} 
          onClose={() => setEditingEmail(false)} 
          title="Edit Email"
          theme={theme} 
          footer={
            <>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90" 
                onClick={() => setEditingEmail(false)} 
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" 
                onClick={saveEmail} 
                style={{ backgroundColor: '#A3B18A' }}
              >
                Save
              </button>
            </>
          }
        >
          <input 
            value={emailDraft} 
            onChange={e => setEmailDraft(e.target.value)} 
            className="w-full p-3 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50" 
            style={{ 
              borderColor: '#D1D5DB', 
              backgroundColor: '#F9FAFB',
              focusRingColor: '#A3B18A'
            }} 
            placeholder="you@example.com" 
          />
        </Modal>

        {/* Confirmation Modal */}
        <Modal 
          open={confirmModalOpen} 
          onClose={handleCancelAction} 
          title={confirmAction === 'switchPlan' ? 'Confirm Lab Access Change' : 'Confirm Cancellation'}
          theme={theme} 
          maxWidth="max-w-md" 
          footer={(
            <div className="w-full flex justify-end gap-3">
              <button 
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90" 
                onClick={handleCancelAction}
                style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90" 
                onClick={handleConfirmAction}
                style={{ 
                  backgroundColor: confirmAction === 'cancelSubscription' ? '#DC2626' : '#A3B18A'
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
                    Update Lab Access to {confirmData.plan.name}?
                  </h3>
                </div>
                
                {confirmData.isSwitching && confirmData.currentPlan && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(212, 215, 205, 0.5)', border: '1px solid #A3B18A' }}>
                    <p className="text-sm" style={{ color: '#344E41' }}>
                      <strong>Current Access:</strong> {confirmData.currentPlan}
                    </p>
                    <p className="text-sm" style={{ color: '#344E41' }}>
                      <strong>New Access:</strong> {confirmData.plan.name} - ${confirmData.plan.price}
                    </p>
                  </div>
                )}
                
                <div className="text-center">
                  <p className="text-sm mb-3" style={{ color: '#5C7659' }}>
                    {confirmData.plan.interval === 'lifetime' 
                      ? 'One-time investment for lifetime research lab access.'
                      : `Lab access will be ${confirmData.plan.price}/${confirmData.plan.interval === 'month' ? 'month' : 'year'}.`
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
                            Prorated billing
                          </p>
                          <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                            You'll be charged a prorated amount for the remaining time in your current billing period.
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
                    End Lab Access?
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
    const [isExpired, setIsExpired] = React.useState(false);

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
                setTimeLeft('Trial expired');
                setIsExpired(true);
            } else {
                const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
                const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                
                if (days > 1) {
                    setTimeLeft(`${days} days, ${hours} hours, and ${minutes} minutes left`);
                } else if (days === 1) {
                    setTimeLeft(`1 day, ${hours} hours, and ${minutes} minutes left`);
                } else if (hours > 0) {
                    setTimeLeft(`${hours} hours and ${minutes} minutes left`);
                } else {
                    setTimeLeft(`${minutes} minutes left`);
                }
                setIsExpired(false);
            }
        };

        calculateProgress();
        const interval = setInterval(calculateProgress, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [startDate, endDate]);

    return (
        <div className="mb-6 p-4 rounded-lg border-2" style={{ 
            backgroundColor: isExpired ? '#fef2f2' : '#f0f9ff', 
            borderColor: isExpired ? '#fecaca' : '#bae6fd' 
        }}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isExpired ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                    <span className="font-semibold text-sm" style={{ color: theme.primaryDark }}>
                        {isExpired ? 'Trial Expired' : 'Trial Status'}
                    </span>
                </div>
                <span className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-blue-600'}`}>
                    {timeLeft}
                </span>
            </div>
            
            {!isExpired && (
                <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                            className="h-3 rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${progress}%`,
                                background: `linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)`,
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}
                        ></div>
                    </div>
                    <div className="text-xs text-center" style={{ color: theme.textLight }}>
                        {Math.round(progress)}% complete
                    </div>
                </div>
            )}
            
            {isExpired && (
                <div className="text-center">
                    <p className="text-sm text-red-600 font-medium">
                        Your trial has ended. Choose a plan to continue.
                    </p>
                </div>
            )}
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
                <span style={{ color: '#3A5A40' }}>7-day lab access</span>
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
                <span style={{ color: '#3A5A40' }}>7-day lab access</span>
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

