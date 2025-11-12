import React, { useMemo, useState, useEffect, startTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { X, Plus, Mail, RefreshCw, Eye, EyeOff, Apple, Play, Monitor } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal';
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal';
import SignupAgreementModal from '../components/legal/SignupAgreementModal';
import LandingContactModal from '../components/legal/LandingContactModal';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import { clearAllUserData, clearAllLocalStorage } from '../utils/clearUserData';
import { 
  registerUser, 
  loginUser, 
  checkAndAssignFounderStatus,
  getUserFounderStatus,
  checkUserExists,
  getAccountStatus
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
    const appContext = useAppContext();
    const setUser = appContext?.setUser ?? (() => {
        console.warn('useAppContext() returned undefined - falling back to no-op setUser. Ensure AppProvider is mounted.');
    });
    const { firebaseUser, isFirebaseLoading, setPassword: setFirebasePassword } = useFirebase();
    const isTrialMode = searchParams.get('trial') === 'true';
    const isSignupMode = searchParams.get('signup') === 'true';
    const isPreGranted = searchParams.get('pregrant') === 'true';
    const emailFromUrl = searchParams.get('email');
    const [themeName] = useState(defaultThemeName);
    const theme = themes[themeName];
    // Default to signup mode if coming from trial link or signup=true, otherwise login
    const [mode, setMode] = useState(isTrialMode || isSignupMode ? 'signup' : 'login'); // 'login' | 'signup'
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
    const [showContact, setShowContact] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState({ valid: true, errors: [], tips: [] });
    const [emailValidation, setEmailValidation] = useState({ valid: true, error: '', tip: '' });
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [showIOSPopup, setShowIOSPopup] = useState(false);
    
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
            
            // If coming from pre-grant email link, check if the logged-in user matches the email
            // If not, don't auto-redirect - let them sign up with the pre-granted email
            if (isPreGranted && emailFromUrl) {
                const normalizedUrlEmail = emailFromUrl.toLowerCase().trim();
                const normalizedFirebaseEmail = firebaseUser.email?.toLowerCase().trim();
                
                if (normalizedUrlEmail !== normalizedFirebaseEmail) {
                    console.log('⚠️ Pre-granted email does not match logged-in user. Staying on login page.');
                    console.log('📧 Pre-granted email:', normalizedUrlEmail);
                    console.log('👤 Logged-in user:', normalizedFirebaseEmail);
                    // Don't redirect - let them sign up with the pre-granted email
                    // Clear the current user session so they can sign up with the pre-granted email
                    return;
                }
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
        
        // Pre-fill email from URL parameter if provided
        if (emailFromUrl && !email) {
            setEmail(emailFromUrl);
            console.log('📧 Pre-filled email from URL:', emailFromUrl);
        }
        
        // Show message if coming from pre-grant email
        if (isPreGranted && emailFromUrl) {
            setError('');
            console.log('🎁 Pre-granted user detected:', emailFromUrl);
        }
    }, [firebaseUser, isFirebaseLoading, setUser, navigate, emailFromUrl, isPreGranted, email]);

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
        
        // Add function to check account status
        window.checkAccountStatus = async (emailToCheck) => {
            const emailAddr = emailToCheck || email;
            if (!emailAddr) {
                console.error('❌ Please provide an email address or fill in the email field');
                return;
            }
            console.log('🔍 Checking account status for:', emailAddr);
            try {
                const status = await getAccountStatus(emailAddr);
                console.log('📊 Account Status:', {
                    'Exists in Auth': status.existsInAuth,
                    'Exists in Firestore': status.existsInFirestore,
                    'Has Password Auth': status.hasPassword,
                    'Sign-in Methods': status.signInMethods,
                    'Details': status.details,
                    'Firestore Doc': status.firestoreDoc
                });
                
                if (status.existsInAuth && !status.existsInFirestore) {
                    console.warn('⚠️ ORPHANED ACCOUNT: Exists in Firebase Auth but not in Firestore!');
                    console.warn('   This means the account was created but the Firestore document failed to save.');
                }
                
                if (status.existsInAuth && !status.hasPassword) {
                    console.warn('⚠️ ACCOUNT HAS NO PASSWORD: User exists but password authentication is not set up.');
                }
                
                return status;
            } catch (error) {
                console.error('❌ Error checking account status:', error);
            }
        };
        
        // Development commands available via window object
    }, [email]);

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
        console.log('🔄 Step 1: Initializing login...');
        // Set flag to prevent auth token clearing during login
        sessionStorage.setItem('tpp_login_in_progress', 'true');
        
        console.log('🔄 Step 2: Backing up existing data...');
        // CRITICAL FIX: Backup existing localStorage data before login
        const existingData = {};
        const dataKeys = [
          'tpprover_protocols', 'tpprover_recon_items', 'tpprover_recon_history',
          'tpprover_supplements', 'tpprover_orders', 'tpprover_metrics', 
          'tpprover_vendors', 'tpprover_calendar_notes', 'tpprover_stockpile', 
          'tpprover_scheduled_buys'
        ];
        
        // CRITICAL: Also backup sample data flags
        const sampleDataCleared = localStorage.getItem('tpprover_sample_data_cleared');
        const sampleDataClearedAt = localStorage.getItem('tpprover_sample_data_cleared_at');
        const sampleBannerDismissed = localStorage.getItem('tpprover_sample_banner_dismissed');
        
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
          console.log('💾 Existing user data backed up');
        }
        
        console.log('🔄 Step 3: Authenticating with Firebase...');
        const firebaseUser = await loginUser(email, password);
        console.log('✅ Firebase authentication successful');
        
        console.log('🔄 Step 4: Setting up encryption...');
        // Store password for encryption
        setFirebasePassword(password);
        
        console.log('🔄 Step 5: Checking founder status...');
        // Check existing founder status for returning users
        try {
          const isFounder = await getUserFounderStatus(firebaseUser.uid);
          if (isFounder) {
            localStorage.setItem('tpprover_is_founder', 'true');
            console.log('👑 Founder status confirmed');
          }
        } catch (error) {
          console.error('Error checking existing founder status:', error);
        }
        
        console.log('🔄 Step 6: Checking beta tester status...');
        // Check Firestore for beta tester status (from manual admin grants)
        try {
          const { checkLifetimeAccessFirestore } = await import('../services/firebase');
          const lifetimeAccess = await checkLifetimeAccessFirestore(firebaseUser.uid);
          if (lifetimeAccess && lifetimeAccess.metadata?.isBetaTester) {
            localStorage.setItem('tpprover_is_tester', 'true');
            console.log('🧪 Beta tester status synced from Firestore');
          }
        } catch (error) {
          console.error('Error checking beta tester status:', error);
        }

        console.log('🔄 Step 7: Setting up user context...');
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
        
        console.log('🔄 Step 8: Storing user data...');
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
        
        console.log('🔄 Step 9: Setting auth token...');
        // Set auth token  
        try {
          localStorage.setItem('tpprover_auth_token', 'firebase_token');
          console.log('🔑 Auth token set');
        } catch (e) {
          console.error('❌ Failed to set auth token:', e);
        }
        
        // Don't set has_onboarded here - let the welcome modal handle it
        
        // DON'T create trial subscriptions on login - only on signup!
        // Existing users should keep their original trial subscription
        
        console.log('🔄 Step 10: Restoring backed up data...');
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
        
        // CRITICAL: Restore sample data flags regardless of whether there's existing data
        if (sampleDataCleared) {
          localStorage.setItem('tpprover_sample_data_cleared', sampleDataCleared);
          console.log('💾 Restored sampleDataCleared flag:', sampleDataCleared);
        }
        if (sampleDataClearedAt) {
          localStorage.setItem('tpprover_sample_data_cleared_at', sampleDataClearedAt);
          console.log('💾 Restored sampleDataClearedAt timestamp:', sampleDataClearedAt);
        }
        if (sampleBannerDismissed) {
          localStorage.setItem('tpprover_sample_banner_dismissed', sampleBannerDismissed);
        }
        
        console.log('🔄 Step 11: Setting user context...');
        setUser(user);
        
        // Clear login flag
        sessionStorage.removeItem('tpp_login_in_progress');
        
        console.log('✅ Login complete! Navigating to dashboard...');
        startTransition(() => {
            navigate('/app/dashboard');
        });
        return true;
      } catch (error) {
        // Clear login flag on error too
        sessionStorage.removeItem('tpp_login_in_progress');
        console.error('Login failed:', error);
        
        // Get account status for better error messages
        let accountStatus = null;
        try {
          accountStatus = await getAccountStatus(email);
          console.log('🔍 Account status:', accountStatus);
        } catch (statusError) {
          console.warn('Could not get account status:', statusError);
        }
        
        if (error.code === 'auth/network-request-failed') {
          setError('🌐 Network Error: Cannot reach authentication servers. Common causes:\n\n1️⃣ Browser cache issue → Run: window.clearAppCache()\n2️⃣ VPN/Firewall blocking Firebase → Try disabling VPN\n3️⃣ Ad blocker interference → Disable ad blocker\n4️⃣ DNS issue → Try different network\n\n💡 Open browser console (F12) and run: window.diagnoseNetwork()');
        } else if (error.code === 'auth/user-not-found') {
          setError('No account found with this email. Please create a new account.');
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          // Check if account exists but password is wrong
          if (accountStatus && accountStatus.existsInAuth) {
            setError('Incorrect password. Use "Forgot password?" to reset it.');
          } else if (accountStatus && !accountStatus.existsInAuth && accountStatus.existsInFirestore) {
            setError('Account exists in database but authentication setup is incomplete. Please contact support.');
          } else {
            setError('Invalid email or password. Please try again or use "Forgot password?" to reset.');
          }
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
        
        // Check if account already exists before attempting registration
        console.log('🔍 Checking if account already exists...');
        const accountExists = await checkUserExists(email);
        if (accountExists) {
          console.log('⚠️ Account already exists, switching to login mode');
          sessionStorage.removeItem('tpp_signup_in_progress');
          setError('An account with this email already exists. Switching to login...');
          setTimeout(() => {
            setIsReturningUser(true);
            setMode('login');
            setError('Please enter your password to log in. Use "Forgot password?" if needed.');
          }, 1500);
          return false;
        }
        
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
          
          // Get account status to provide better error message
          if (regError.code === 'auth/email-already-in-use') {
            try {
              const accountStatus = await getAccountStatus(email);
              console.log('🔍 Account status after signup failure:', accountStatus);
              
              if (accountStatus.existsInAuth && !accountStatus.existsInFirestore) {
                console.warn('⚠️ Orphaned account detected: exists in Auth but not Firestore');
              }
            } catch (statusError) {
              console.warn('Could not get account status:', statusError);
            }
          }
          
          throw regError; // Re-throw to be caught by outer catch
        }
        
        // Store password for encryption
        setFirebasePassword(password);
        console.log('🔐 Password set for encryption');
        
        // Check and assign founder status (first 100 users starting Nov 4, 2025)
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
        const isNewAccount = !lastUserEmail || lastUserEmail !== user.email;
        
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
        
        // Reset theme to default (sage) for new accounts
        if (isNewAccount) {
          console.log('🎨 New account signup - resetting theme to default (sage)');
          try {
            localStorage.setItem('tpprover_theme', defaultThemeName);
            console.log('✅ Theme reset to default:', defaultThemeName);
          } catch (error) {
            console.error('❌ Failed to reset theme for new account:', error);
          }
        }
        
        // Update last user email
        localStorage.setItem('tpprover_last_user_email', user.email);
        
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
        
        // Create 10-day research trial subscription and save to BOTH cloud AND localStorage
        try {
          const now = new Date();
          const end = new Date(now);
          end.setDate(end.getDate() + 10);
          const trial = {
            id: String(Date.now()),
            plan: '10-Day Research Trial',
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
            plan: '10-Day Research Trial',
            status: 'trialing',
            currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          };
          try {
            localStorage.setItem('tpprover_subscription', JSON.stringify(minimalTrial));
            console.log('💾 Minimal trial subscription created in localStorage');
          } catch (e) {
            console.error('❌ CRITICAL: Cannot create trial subscription at all');
          }
        }
        
        setUser(user);
        
        // Clear signup flag BEFORE navigating
        console.log('✅ Clearing signup flag before navigation');
        sessionStorage.removeItem('tpp_signup_in_progress');
        
        // Give a tiny delay to ensure flag is cleared
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Navigate to dashboard
        console.log('🚀 Navigating to dashboard');
        window.location.href = '/app/dashboard';
        return true;
      } catch (error) {
        // Clear signup flag on error too
        sessionStorage.removeItem('tpp_signup_in_progress');
        console.error('Signup failed:', error);
        
        if (error.code === 'auth/email-already-in-use') {
          // Get detailed account status
          try {
            const accountStatus = await getAccountStatus(email);
            console.log('🔍 Account status on signup failure:', accountStatus);
            
            if (accountStatus.existsInAuth && !accountStatus.existsInFirestore) {
              setError('Account found but incomplete setup. Switching to login...');
            } else {
              setError('Account found! Switching to login form...');
            }
            
            // Automatically switch to login mode for existing users
            setTimeout(() => {
              setIsReturningUser(true);
              setMode('login');
              if (accountStatus.hasPassword) {
                setError('Please enter your password to log in. Use "Forgot password?" if needed.');
              } else {
                setError('Account exists but password authentication is not set up. Please use "Forgot password?" to set one.');
              }
            }, 1500);
          } catch (statusError) {
            // Fallback error handling
            setError('Account found! Switching to login form...');
            setTimeout(() => {
              setIsReturningUser(true);
              setMode('login');
              setError('Please enter your password to log in.');
            }, 1500);
          }
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
                console.log('🔐 Starting login process...');
                
                // Add timeout to prevent infinite loading state
                const loginPromise = doLogin();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Login timeout - network may be slow or blocked')), 30000)
                );
                
                const success = await Promise.race([loginPromise, timeoutPromise]);
                
                // CRITICAL FIX: Always reset loading state
                // Navigation happens in startTransition, so we can safely reset here
                if (!success) {
                    console.log('❌ Login failed, resetting loading state');
                    setLoading(false);
                } else {
                    console.log('✅ Login successful, navigation in progress');
                    // Give navigation a moment to start, then reset loading
                    // This prevents the stuck loading state if navigation fails
                    setTimeout(() => setLoading(false), 100);
                }
            } catch (error) {
                console.error('❌ Login error:', error);
                setLoading(false);
                if (error.message?.includes('timeout')) {
                    setError('Login timed out. Please check your internet connection and try again.');
                } else {
                    setError(error.message || 'Login failed. Please try again.');
                }
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
                    </div>

                    <div className="p-8 space-y-6 rounded-xl shadow-lg" style={{ backgroundColor: theme.white }}>
                        <div className="text-center">
                            <h2 className="text-2xl font-semibold" style={{ color: theme.primaryDark }}>
                                {mode === 'login' && 'Welcome Back'}
                                {mode === 'signup' && 'Create Your Account'}
                            </h2>
                            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
                                {mode === 'login' && 'Sign in to your account'}
                                {mode === 'signup' && 'Try everything free for 10 days'}
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

                            {/* Pre-granted user message */}
                            {isPreGranted && emailFromUrl && mode === 'signup' && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                    <div className="flex items-start gap-2">
                                        <div className="text-green-600 mt-0.5">🎁</div>
                                        <div className="flex-1">
                                            <div className="font-medium text-green-800 mb-1">Lifetime Access Pre-Granted!</div>
                                            <div className="text-sm text-green-700">
                                                Your account has been pre-approved for lifetime access. Create your account below to activate it.
                                            </div>
                                        </div>
                                    </div>
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

                    <div className="mt-4 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setShowContact(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border transition-transform"
                            style={{
                                color: theme.textOnPrimary || '#FFFFFF',
                                borderColor: 'transparent',
                                backgroundColor: theme.primary,
                                boxShadow: '0 6px 18px rgba(127, 158, 149, 0.25)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.primaryDark || '#6b8b78';
                                e.currentTarget.style.boxShadow = '0 10px 24px rgba(95, 127, 118, 0.35)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = theme.primary;
                                e.currentTarget.style.boxShadow = '0 6px 18px rgba(127, 158, 149, 0.25)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Support
                        </button>
                    </div>

                    {/* Download Section - Simplified */}
                    <div className="mt-6 pt-6 border-t w-full max-w-md" style={{ borderColor: theme.border }}>
                        <p className="text-xs text-center mb-3" style={{ color: theme.textLight }}>Also available on</p>
                        <div className="flex gap-2 justify-center items-center">
                            {/* Apple App Store Button */}
                            <button 
                                className="transition-opacity hover:opacity-80"
                                onClick={() => setShowIOSPopup(true)}
                            >
                                <div 
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md shadow-sm"
                                    style={{ backgroundColor: '#4c6b52' }}
                                >
                                    <Apple className="w-4 h-4 text-white" />
                                    <span className="text-[10px] text-white font-medium">iOS</span>
                                </div>
                            </button>

                            {/* Google Play Store Button */}
                            <a 
                                href="https://play.google.com/store/apps/details?id=com.thepepplanner.app" 
                                className="transition-opacity hover:opacity-80"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <div 
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md shadow-sm"
                                    style={{ backgroundColor: '#364b3d' }}
                                >
                                    <Play className="w-4 h-4 text-white" />
                                    <span className="text-[10px] text-white font-medium">Android</span>
                                </div>
                            </a>

                            {/* Web Access Button */}
                            <button 
                                className="cursor-default"
                            >
                                <div 
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md shadow-sm opacity-60"
                                    style={{ backgroundColor: '#2d3d34' }}
                                >
                                    <Monitor className="w-4 h-4 text-white" />
                                    <span className="text-[10px] text-white font-medium">Web</span>
                                </div>
                            </button>
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

            <LandingContactModal
                open={showContact}
                onClose={() => setShowContact(false)}
            />

            {/* iOS Coming Soon Popup */}
            {showIOSPopup && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
                    onClick={() => setShowIOSPopup(false)}
                >
                    <div 
                        className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl transform animate-scaleIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="mb-4">
                                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#B8A99A' }}>
                                    <Apple className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold mb-3" style={{ color: '#2F3B3A' }}>
                                iOS App Coming Soon!
                            </h3>
                            <p className="text-base mb-6" style={{ color: '#6B7D7A' }}>
                                We're working hard to bring <strong>The Pep Planner</strong> to the App Store. 
                                In the meantime, you can access the full experience on <strong>Android</strong> or <strong>Web</strong>!
                            </p>
                            <button
                                onClick={() => setShowIOSPopup(false)}
                                className="w-full px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}



