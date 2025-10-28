import React, { useMemo, useState, useEffect, startTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { X, Plus, Mail, RefreshCw, Eye, EyeOff, Clock } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal';
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal';
import SignupAgreementModal from '../components/legal/SignupAgreementModal';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import { clearAllUserData, clearAllLocalStorage } from '../utils/clearUserData';
import { 
  registerUser, 
  loginUser, 
  checkAndAssignFounderStatus,
  getUserFounderStatus
} from '../services/firebase';
import { recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from '../services/agreementTracking';
import { auth } from '../config/firebase';

// Lightweight local auth to mirror old app behavior for local testing
function getAuthDb() { try { return JSON.parse(localStorage.getItem('tpprover_auth_users') || '{}') } catch { return {} } }
function setAuthDb(db) { try { localStorage.setItem('tpprover_auth_users', JSON.stringify(db || {})) } catch {} }
const enc = (s) => { try { return btoa(unescape(encodeURIComponent(String(s)))) } catch { return String(s) } }

// Legacy localStorage functions removed - now using Firebase

// Enhanced email validation with helpful tips
function validateEmail(email) {
  if (!email) {
    return { valid: false, error: 'Email is required.' };
  }
  
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { 
      valid: false, 
      error: 'Please enter a valid email address.',
      tip: 'Email should be in format: yourname@example.com'
    };
  }
  
  if (email.length > 254) {
    return { 
      valid: false, 
      error: 'Email address is too long.',
      tip: 'Email should be less than 254 characters'
    };
  }
  
  return { valid: true };
}

// Enhanced password validation with helpful tips
function validatePassword(password) {
  const errors = [];
  const tips = [];
  
  if (!password) {
    return { valid: false, errors: ['Password is required.'], tips: [] };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
    tips.push('Use at least 6 characters');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long.');
    tips.push('Use less than 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
    tips.push('Add lowercase letters (a-z)');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
    tips.push('Add uppercase letters (A-Z)');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number.');
    tips.push('Add numbers (0-9)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    tips
  };
}

// markInviteUsed now handled by Firebase service

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setUser } = useAppContext();
    const { firebaseUser, isFirebaseLoading, setPassword: setFirebasePassword } = useFirebase();
    const isTrialMode = searchParams.get('trial') === 'true';
    const [themeName] = useState(defaultThemeName);
    const theme = themes[themeName];
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [needsPasswordForSync, setNeedsPasswordForSync] = useState(false);
    const [showAgreementModal, setShowAgreementModal] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState({ valid: true, errors: [], tips: [] });
    const [emailValidation, setEmailValidation] = useState({ valid: true, error: '', tip: '' });
    const [isReturningUser, setIsReturningUser] = useState(false);
    
    // Check if user is already authenticated
    useEffect(() => {
        if (!isFirebaseLoading && firebaseUser) {
            // DEVELOPMENT/TESTING: Check for force logout flag
            const forceLogout = localStorage.getItem('tpp_force_logout');
            if (forceLogout === 'true') {
                console.log('🧪 DEVELOPMENT: Force logout detected, signing out user');
                localStorage.removeItem('tpp_force_logout');
                
                // Clear all data and sign out
                clearAllLocalStorage(); // Complete reset including auth
                
                // Sign out from Firebase
                import('../services/firebase').then(({ logoutUser }) => {
                    logoutUser().then(() => {
                        window.location.reload();
                    });
                });
                return;
            }
            
            // User is already logged in, redirect to dashboard
            setUser({ email: firebaseUser.email, uid: firebaseUser.uid });
            startTransition(() => {
                navigate('/app/dashboard');
            });
        }
        
        // Check if user needs to re-enter password for data sync
        const needsSync = localStorage.getItem('tpp_need_password_for_sync');
        if (needsSync) {
            setNeedsPasswordForSync(true);
            localStorage.removeItem('tpp_need_password_for_sync'); // Clear the flag
        }
    }, [firebaseUser, isFirebaseLoading, setUser, navigate]);

    // DEVELOPMENT/TESTING: Add console command for force logout
    useEffect(() => {
        // Add global function for development testing
        window.forceLogout = () => {
            console.log('🧪 DEVELOPMENT: Setting force logout flag');
            localStorage.setItem('tpp_force_logout', 'true');
            window.location.reload();
        };
        
        // Add global function to clear all data
        window.clearAllData = () => {
            console.log('🧪 DEVELOPMENT: Clearing all localStorage data');
            clearAllLocalStorage();
        };
        
        // Development commands available via window object
    }, []);

    // Real-time validation
    useEffect(() => {
      if (mode === 'signup' && email) {
        const emailResult = validateEmail(email);
        setEmailValidation(emailResult);
      }
    }, [email, mode]);

    useEffect(() => {
      if (mode === 'signup' && password) {
        const passwordResult = validatePassword(password);
        setPasswordValidation(passwordResult);
      }
    }, [password, mode]);

    const canSubmit = useMemo(() => {
      if (!email || !password) return false;
      if (mode === 'signup') {
        return password === confirmPassword && 
               passwordValidation.valid && 
               emailValidation.valid;
      }
      return true;
    }, [email, password, confirmPassword, mode, passwordValidation.valid, emailValidation.valid]);

    const doLogin = async () => {
      try {
        // Set flag to prevent auth token clearing during login
        sessionStorage.setItem('tpp_login_in_progress', 'true');
        
        // CRITICAL FIX: Backup existing localStorage data before login
        const existingData = {};
        const dataKeys = [
          'tpprover_protocols', 'tpprover_recon_items', 'tpprover_recon_history',
          'tpprover_supplements', 'tpprover_orders', 'tpprover_metrics', 
          'tpprover_vendors', 'tpprover_calendar_notes', 'tpprover_stockpile', 
          'tpprover_scheduled_buys'
        ];
        
        dataKeys.forEach(key => {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              existingData[key] = JSON.parse(data);
            } catch (e) {
              console.warn(`Failed to backup ${key}:`, e);
            }
          }
        });
        
        const hasExistingData = Object.keys(existingData).some(key => 
          Array.isArray(existingData[key]) && existingData[key].length > 0
        );
        
        if (hasExistingData) {
          console.log('🔄 Backing up existing user data before login...');
        }
        
        const firebaseUser = await loginUser(email, password);
        
        // Store password for encryption
        setFirebasePassword(password);

        // Set beta tester flag for all users during beta period
        localStorage.setItem('tpprover_is_tester', 'true');
        
        // Check existing founder status for returning users
        try {
          const isFounder = await getUserFounderStatus(firebaseUser.uid);
          if (isFounder) {
            localStorage.setItem('tpprover_is_founder', 'true');
          }
        } catch (error) {
          console.error('Error checking existing founder status:', error);
        }

        // Set user in app context  
        let user = { 
          email: firebaseUser.email, 
          name: firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid
        };
        
        // CRITICAL SECURITY: Check for user change and clear data immediately
        const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
        if (lastUserEmail && lastUserEmail !== user.email) {
          console.log('🚨 SECURITY: User change detected during login!');
          console.log('  Previous user:', lastUserEmail);
          console.log('  Current user:', user.email);
          
          clearAllUserData();
          console.log('✅ Confirmed: Account data cleared for new user');
        }
        
        // Update last user email
        localStorage.setItem('tpprover_last_user_email', user.email);
        
        // Set createdAt for account age tracking - use Firebase user creation date
        try {
          const existingUser = JSON.parse(localStorage.getItem('tpprover_user') || '{}');
          if (existingUser.createdAt) {
            // Use existing localStorage date if available
            user.createdAt = existingUser.createdAt;
          } else if (firebaseUser.metadata?.creationTime) {
            // Use Firebase user creation date for accurate signup date
            user.createdAt = new Date(firebaseUser.metadata.creationTime).toISOString();
          } else {
            // Fallback to current date (should rarely happen)
            user.createdAt = new Date().toISOString();
          }
        } catch {
          // Use Firebase creation time as fallback
          if (firebaseUser.metadata?.creationTime) {
            user.createdAt = new Date(firebaseUser.metadata.creationTime).toISOString();
          } else {
            user.createdAt = new Date().toISOString();
          }
        }
        
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
        
        // Set auth token  
        try {
          localStorage.setItem('tpprover_auth_token', 'firebase_token');
          console.log('🔑 Auth token set to firebase_token');
        } catch (e) {
          console.error('❌ Failed to set auth token:', e);
        }
        
        // Don't set has_onboarded here - let the welcome modal handle it
        
        // DON'T create trial subscriptions on login - only on signup!
        // Existing users should keep their original trial subscription
        
        // CRITICAL FIX: Restore existing data if it was backed up and Firebase sync might overwrite it
        if (hasExistingData) {
          console.log('💾 Restoring backed up data to prevent data loss...');
          
          // Store backup for potential recovery
          localStorage.setItem('tpprover_data_backup', JSON.stringify(existingData));
          
          // Restore the existing data immediately to prevent loss
          Object.keys(existingData).forEach(key => {
            if (existingData[key]) {
              localStorage.setItem(key, JSON.stringify(existingData[key]));
            }
          });
          
        }
        
        setUser(user);
        
        // Clear login flag
        sessionStorage.removeItem('tpp_login_in_progress');
        
        startTransition(() => {
            navigate('/app/dashboard');
        });
        return true;
      } catch (error) {
        // Clear login flag on error too
        sessionStorage.removeItem('tpp_login_in_progress');
        console.error('Login failed:', error);
        if (error.code === 'auth/user-not-found') {
          setError('No account found with this email. Please create a new account.');
        } else if (error.code === 'auth/wrong-password') {
          setError('Incorrect password. Please try again.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else {
          setError('Login failed. Please try again.');
        }
        return false;
      }
    };

    // Validate signup credentials without creating account
    const validateSignupCredentials = async () => {
      if (!passwordValidation.valid) { 
        setError('Please fix the password requirements.'); 
        return false; 
      }
      
      if (!emailValidation.valid) {
        setError(emailValidation.error);
        return false;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
      
      return true; // All validations passed
    };

    const doSignup = async () => {
      try {
        // CRITICAL: Set session flag FIRST to prevent AppContext interference
        sessionStorage.setItem('tpp_signup_in_progress', 'true');
        console.log('🔒 Signup process started - AppContext will not interfere');
        
        // Clear previous seeding flags for fresh demo data on new signup
        localStorage.removeItem('tpprover_has_seeded');
        localStorage.removeItem('tpprover_demo_seeded_at');
        // Clear welcome modal session flag for fresh signup
        sessionStorage.removeItem('tpp_welcome_shown');
        console.log('🧹 Cleared previous demo data flags for fresh signup');
        
        // Set auth token IMMEDIATELY (before anything else)
        try { 
          localStorage.setItem('tpprover_auth_token', 'firebase_token');
          console.log('🔑 Auth token set to firebase_token (FIRST)');
        } catch (e) {
          console.error('❌ Failed to set auth token:', e);
        }
        
        // Set user data in localStorage (before Firebase registration)
        // This ensures AppContext can identify this as a new signup
        const tempUser = {
          email: email,
          name: email.split('@')[0],
          createdAt: new Date().toISOString(),
          isNewSignup: true,
          termsAgreed: { date: new Date().toISOString() }
        };
        try {
          localStorage.setItem('tpprover_user', JSON.stringify(tempUser));
          console.log('👤 Pre-set user data for new signup');
        } catch (e) {
          console.error('❌ Failed to pre-set user data:', e);
        }
        
        // Create Firebase user
        console.log('🔥 About to call registerUser...');
        let firebaseUser;
        try {
          const result = await registerUser(email, password, null);
          firebaseUser = result.user;
          console.log('✅ Firebase user created successfully:', firebaseUser.email);
        } catch (regError) {
          console.error('❌ registerUser FAILED:', regError);
          console.error('❌ Error code:', regError.code);
          console.error('❌ Error message:', regError.message);
          throw regError; // Re-throw to be caught by outer catch
        }
        
        // Store password for encryption
        setFirebasePassword(password);
        console.log('🔐 Password set for encryption');
        
        // Set beta tester flag for all users during beta period
        localStorage.setItem('tpprover_is_tester', 'true');
        console.log('🧪 Beta tester flag set');
        
        // Check and assign founder status (first 100 users)
        console.log('🏁 About to check founder status...');
        try {
          const isFounder = await checkAndAssignFounderStatus(firebaseUser.uid);
          console.log('🏁 Founder status check complete:', isFounder);
          if (isFounder) {
            localStorage.setItem('tpprover_is_founder', 'true');
          }
        } catch (error) {
          console.error('❌ Error checking founder status:', error);
        }
        console.log('🏁 After founder status check');
        
        // Record agreement acceptance (non-blocking with timeout)
        try {
          console.log('📝 Recording signup agreements for:', firebaseUser.email);
          console.log('📝 Using Terms version:', AGREEMENT_VERSIONS.TERMS_OF_SERVICE);
          console.log('📝 Using Privacy version:', AGREEMENT_VERSIONS.PRIVACY_POLICY);
          
          // Add timeout to prevent hanging
          await Promise.race([
            (async () => {
              const termsResult = await recordAgreement(
                AGREEMENT_TYPES.SIGNUP_TERMS,
                AGREEMENT_VERSIONS.TERMS_OF_SERVICE,
                { 
                  signupFlow: true,
                  contentUpdateDate: AGREEMENT_VERSIONS.TERMS_OF_SERVICE.split('-')[1] + '-' + AGREEMENT_VERSIONS.TERMS_OF_SERVICE.split('-')[2]
                },
                firebaseUser.email
              );
              console.log('✅ Terms agreement recorded:', termsResult);
              
              const privacyResult = await recordAgreement(
                AGREEMENT_TYPES.SIGNUP_PRIVACY,
                AGREEMENT_VERSIONS.PRIVACY_POLICY,
                { 
                  signupFlow: true,
                  contentUpdateDate: AGREEMENT_VERSIONS.PRIVACY_POLICY.split('-')[1] + '-' + AGREEMENT_VERSIONS.PRIVACY_POLICY.split('-')[2]
                },
                firebaseUser.email
              );
              console.log('✅ Privacy agreement recorded:', privacyResult);
            })(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Agreement recording timeout')), 3000)
            )
          ]);
          
        } catch (error) {
          console.warn('⚠️ Agreement recording timed out or failed (offline?), continuing with signup');
          console.error('Agreement error:', error.message);
          // Continue with signup even if agreement recording fails
        }
        
        // Set user in app context
        const user = { 
          email: firebaseUser.email, 
          name: firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid,
          createdAt: new Date().toISOString(),
          termsAgreed: { date: new Date().toISOString() }
        };
        
        // CRITICAL SECURITY: Check for user change and clear data immediately
        const lastUserEmail = localStorage.getItem('tpprover_last_user_email');
        if (lastUserEmail && lastUserEmail !== user.email) {
          console.log('🚨 SECURITY: User change detected during signup!');
          console.log('  Previous user:', lastUserEmail);
          console.log('  New user:', user.email);
          
          // Clear ALL user-specific data from localStorage
          clearAllUserData();
          console.log('✅ Confirmed: Account data cleared for new user');
          
          // RE-SET auth token after clearing (it was cleared by clearAllUserData)
          try { 
            localStorage.setItem('tpprover_auth_token', 'firebase_token');
            console.log('🔑 Auth token RE-SET after user change clear');
          } catch (e) {
            console.error('❌ Failed to re-set auth token:', e);
          }
        }
        
        // Update last user email
        localStorage.setItem('tpprover_last_user_email', user.email);
        
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
        
        // Create 7-day trial subscription and save to BOTH cloud AND localStorage
        try {
          const now = new Date();
          const end = new Date(now);
          end.setDate(end.getDate() + 7);
          const trial = {
            id: String(Date.now()),
            plan: '7-Day Free Trial',
            price: 0,
            interval: 'trial',
            currency: 'USD',
            status: 'trialing',
            startedAt: now.toISOString(),
            currentPeriodEnd: end.toISOString(),
            paymentMethod: null,
          };
          
          // CRITICAL: Save to localStorage FIRST (immediate fallback)
          try {
            localStorage.setItem('tpprover_subscription', JSON.stringify(trial));
            console.log('💾 Trial subscription saved to localStorage (fallback)');
          } catch (e) {
            console.error('❌ Failed to save trial to localStorage:', e);
          }
          
          // Save trial subscription to cloud storage (with timeout)
          try {
            const { saveUserSubscription } = await import('../services/cloudStorage');
            await Promise.race([
              saveUserSubscription(firebaseUser.uid, trial),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Cloud save timeout')), 3000)
              )
            ]);
            console.log('☁️ Trial subscription saved to cloud storage');
          } catch (cloudError) {
            console.warn('⚠️ Cloud save timed out or failed (offline?), but localStorage has the trial:', cloudError.message);
            // Don't throw - localStorage has the fallback
          }
        } catch (error) {
          console.error('❌ Failed to create trial subscription:', error);
          // This is critical - we should still create a minimal trial
          const minimalTrial = {
            id: String(Date.now()),
            plan: '7-Day Free Trial',
            status: 'trialing',
            currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          try {
            localStorage.setItem('tpprover_subscription', JSON.stringify(minimalTrial));
            console.log('💾 Minimal trial subscription created in localStorage');
          } catch (e) {
            console.error('❌ CRITICAL: Cannot create trial subscription at all');
          }
        }
        
        setUser(user);
        
        // CRITICAL: Seed demo data for new users - NOW USING FIRESTORE
        try {
          console.log('☁️ Seeding demo data to Firestore for new signup...');
          
          const { seedDemoDataToCloud } = await import('../services/demoDataSeeder');
          const seeded = await seedDemoDataToCloud(firebaseUser.uid, password);
          
          if (seeded) {
            console.log('✅ Demo data seeded successfully (localStorage + Firestore)');
            
            // Tiny delay for subscription to save (demo data loads instantly from localStorage)
            console.log('⏱️ Waiting 100ms for subscription to save...');
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('✅ Subscription saved');
          } else {
            console.warn('⚠️ Demo data seeding had issues');
          }
        } catch (seedError) {
          console.error('❌ Failed to seed demo data:', seedError);
        }
        
        // Clear signup flag BEFORE navigating
        console.log('✅ Clearing signup flag before navigation');
        sessionStorage.removeItem('tpp_signup_in_progress');
        
        // Give a tiny delay to ensure flag is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force a full page reload to trigger AppContext to load fresh data from Firestore
        console.log('🚀 Forcing full page reload to load demo data from Firestore');
        window.location.href = '/app/dashboard';
        return true;
      } catch (error) {
        // Clear signup flag on error too
        sessionStorage.removeItem('tpp_signup_in_progress');
        console.error('Signup failed:', error);
        if (error.code === 'auth/email-already-in-use') {
          setError('Account found! Switching to login form...');
          // Automatically switch to login mode for existing users
          setTimeout(() => {
            setIsReturningUser(true);
            setMode('login');
            setError('Please enter your password to log in.');
          }, 1500);
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address (example: user@example.com).');
        } else if (error.code === 'auth/weak-password') {
          setError('Password must be at least 8 characters with uppercase, lowercase, and numbers. Try: MyPassword123');
        } else if (error.code === 'auth/network-request-failed') {
          setError('Network error. Please check your internet connection and try again.');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please wait a few minutes before trying again.');
        } else {
          setError(`Registration failed: ${error.message}. Please try again or contact support if this persists.`);
        }
        return false;
      }
    };


    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }

        try {
            setLoading(true);
            console.log('🔐 Sending custom password reset email via SendGrid...');
            
            // Call the custom password reset email function
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const sendCustomPasswordResetEmail = httpsCallable(functions, 'sendCustomPasswordResetEmail');
            
            const result = await sendCustomPasswordResetEmail();
            
            console.log('✅ Custom password reset email sent successfully:', result.data);
            
            setError('');
            alert(`Password reset email sent to ${email}. Check your inbox (not spam folder).`);
            setShowForgotPassword(false);
        } catch (error) {
            console.error('Password reset failed:', error);
            if (error.code === 'functions/too-many-requests') {
                setError('Too many requests. Please try again later.');
            } else if (error.message?.includes('SendGrid')) {
                setError('Email service temporarily unavailable. Please try again later.');
            } else {
                setError('Failed to send password reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'login') {
            setLoading(true);
            try {
                const success = await doLogin();
                if (!success) {
                    // Reset loading state if login failed
                    setLoading(false);
                }
            } catch (error) {
                setLoading(false);
            }
        } else { // signup
            // Show agreement modal instead of proceeding directly
            setShowAgreementModal(true);
        }
    };

    const handleAgreementAccept = async () => {
        setLoading(true);
        setShowAgreementModal(false);
        try {
            const success = await doSignup();
            if (!success) {
                // Reset loading state if signup failed
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
        }
    };



    return (
        <>
            <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover mx-auto mb-4" />
                        <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
                        <p className="mt-2 text-md text-gray-500">Organize Your Research</p>
                        {isTrialMode && (
                            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                                <div className="flex items-center justify-center mb-2">
                                    <Clock className="w-5 h-5 text-green-600 mr-2" />
                                    <span className="text-green-800 font-semibold">Start Your 7-Day Free Trial</span>
                                </div>
                                <p className="text-green-700 text-sm">No credit card required • Full access to all features</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 space-y-6 rounded-xl shadow-lg" style={{ backgroundColor: theme.white }}>
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold" style={{ color: theme.primaryDark }}>
                                {mode === 'login' && 'Welcome Back'}
                                {mode === 'signup' && 'Create Your Account'}
                            </h2>
                            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
                                {mode === 'login' && 'Sign in to your account'}
                                {mode === 'signup' && 'Join The Pep Planner'}
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit} onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}>
                            <div className="relative">
                                <input 
                                    type="email" 
                                    placeholder="Email Address" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    required 
                                    className={`w-full px-4 py-3 border rounded-lg bg-gray-50 ${
                                        mode === 'signup' && email && !emailValidation.valid 
                                            ? 'border-red-300 focus:border-red-500' 
                                            : ''
                                    }`}
                                    style={{ 
                                        borderColor: mode === 'signup' && email && !emailValidation.valid 
                                            ? '#FCA5A5' 
                                            : theme.border 
                                    }} 
                                />
                            </div>
                            
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    required 
                                    className={`w-full px-4 py-3 border rounded-lg bg-gray-50 ${
                                        mode === 'signup' && password && !passwordValidation.valid 
                                            ? 'border-red-300 focus:border-red-500' 
                                            : ''
                                    }`}
                                    style={{ 
                                        borderColor: mode === 'signup' && password && !passwordValidation.valid 
                                            ? '#FCA5A5' 
                                            : theme.border 
                                    }} 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>

                            {mode === 'signup' && (
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Confirm Password" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                        required 
                                        className={`w-full px-4 py-3 border rounded-lg bg-gray-50 ${
                                            password && confirmPassword && password !== confirmPassword 
                                                ? 'border-red-300 focus:border-red-500' 
                                                : ''
                                        }`}
                                        style={{ 
                                            borderColor: password && confirmPassword && password !== confirmPassword 
                                                ? '#FCA5A5' 
                                                : theme.border 
                                        }} 
                                    />
                                </div>
                            )}
                            

                            {/* Email validation errors */}
                            {mode === 'signup' && email && !emailValidation.valid && (
                                <div className="text-xs text-red-600 p-3 rounded border border-red-200 bg-red-50">
                                    <div className="font-medium mb-1">{emailValidation.error}</div>
                                    {emailValidation.tip && (
                                        <div className="text-red-500">💡 {emailValidation.tip}</div>
                                    )}
                                </div>
                            )}

                            {/* Password validation errors */}
                            {mode === 'signup' && password && !passwordValidation.valid && (
                                <div className="text-xs text-red-600 p-3 rounded border border-red-200 bg-red-50">
                                    <div className="font-medium mb-2">Password requirements:</div>
                                    <ul className="space-y-1">
                                        {passwordValidation.errors.map((error, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                                <span className="text-red-500">❌</span>
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                    {passwordValidation.tips.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-red-200">
                                            <div className="font-medium text-red-700 mb-1">💡 Tips:</div>
                                            <ul className="space-y-1">
                                                {passwordValidation.tips.map((tip, index) => (
                                                    <li key={index} className="text-red-600">• {tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Password match validation */}
                            {mode === 'signup' && password && confirmPassword && password !== confirmPassword && (
                                <div className="text-xs text-red-600 p-3 rounded border border-red-200 bg-red-50">
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-500">❌</span>
                                        <span className="font-medium">Passwords do not match</span>
                                    </div>
                                    <div className="mt-1 text-red-500">💡 Make sure both password fields are identical</div>
                                </div>
                            )}

                            {needsPasswordForSync && mode === 'login' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                    <div className="flex items-start gap-2">
                                        <div className="text-blue-600 mt-0.5">🔐</div>
                                        <div className="text-sm text-blue-800">
                                            <strong>Data Sync Required:</strong> You're logging in from a new device or browser. 
                                            Enter your password to sync your data (protocols, orders, stockpile, etc.) from your other devices.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded-md">{error}</p>
                            )}

                            

                            <button type="submit" disabled={loading || !canSubmit} className="w-full px-4 py-3 font-semibold rounded-lg transition-opacity duration-200" style={{ backgroundColor: theme.primary, color: theme.white, opacity: (loading || !canSubmit) ? 0.7 : 1 }}>
                                {loading ? 'Processing...' : 
                                 (mode === 'login' ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>

                        {/* Additional Options */}
                        <div className="mt-4 text-center space-y-3">
                            {mode === 'signup' && (
                                <div className="flex justify-center">
                                    <button 
                                        onClick={() => { setMode('login'); setPassword(''); setConfirmPassword(''); setError(''); }}
                                        className="text-sm underline hover:no-underline font-medium"
                                        style={{ color: theme.primary }}
                                    >
                                        Already have an account? Sign in instead
                                    </button>
                                </div>
                            )}
                            {mode === 'login' && (
                                <div className="flex flex-col items-center space-y-3">
                                    <button 
                                        onClick={handleForgotPassword}
                                        disabled={loading}
                                        className="text-sm underline hover:no-underline disabled:opacity-50"
                                        style={{ color: theme.primary }}
                                    >
                                        Forgot your password?
                                    </button>
                                    <button 
                                        onClick={() => { setMode('signup'); setPassword(''); setConfirmPassword(''); setError(''); }}
                                        className="text-sm underline hover:no-underline font-medium"
                                        style={{ color: theme.primary }}
                                    >
                                        Don't have an account? Create one
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showTerms && (
                <TermsOfServiceModal
                    open={showTerms}
                    onClose={() => setShowTerms(false)}
                    theme={theme}
                />
            )}

            {showPrivacy && (
                <LandingPrivacyModal
                    open={showPrivacy}
                    onClose={() => setShowPrivacy(false)}
                />
            )}

            {showAgreementModal && (
                <SignupAgreementModal
                    open={showAgreementModal}
                    onAccept={handleAgreementAccept}
                    onClose={() => setShowAgreementModal(false)}
                    theme={theme}
                />
            )}

        </>
    );
}



