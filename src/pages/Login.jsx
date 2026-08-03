import React, { useMemo, useState, useEffect, useTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { Mailbox, Eye as PhosphorEye, EyeClosed, FingerprintSimple, PaperPlaneTilt } from '@phosphor-icons/react';
import { X, Plus, RefreshCw, Apple, Monitor, CheckCircle, AlertCircle, Info } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal';
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal';
import SignupAgreementModal from '../components/legal/SignupAgreementModal';
import LandingContactModal from '../components/legal/LandingContactModal';
import TwoFactorModal from '../components/auth/TwoFactorModal';
import Modal from '../components/common/Modal';
import SwipeableIntro from '../components/onboarding/SwipeableIntro';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import { clearAllUserData, clearAllLocalStorage } from '../utils/clearUserData';
import { 
  registerUser, 
  loginUser, 
  checkAndAssignFounderStatus,
  getUserFounderStatus,
  getAccountStatus,
  signInWithGoogle,
  completeGoogleRedirectSignIn,
  linkGoogleToPasswordAccount,
  getOrCreateSocialEncKey,
  loadUserData,
  saveUserData,
  sendMagicLink,
  isMagicLinkUrl,
  completeMagicLink,
} from '../services/firebase';
import { recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from '../services/agreementTracking';
import { trackConversion, EVENTS } from '../services/conversionAnalytics';
import { getTwoFactorSettings, verifyAndConsumeBackupCode } from '../services/twoFactorAuth';
import { verifyTOTPCode, isValidCodeFormat } from '../utils/totp';
import { auth } from '../config/firebase';
import { executeRecaptcha } from '../utils/recaptcha';
import { validateEmailWithDisposableCheck } from '../utils/disposableEmailDomains';
import { shouldShowIntro, isNative, isPWAInstalled, APP_STORE_IOS_URL } from '../utils/platform';
import {
  buildAppMagicLinkSchemeUrl,
  buildAndroidMagicLinkIntentUrl,
  isMobileBrowserUserAgent,
} from '../utils/deepLinks';
import {
  checkBiometricAvailable,
  doBiometricLogin,
  saveBiometricCredentials,
  isBiometricEnabled,
  disableBiometricLogin,
} from '../utils/biometricAuth';
import { isPasskeySupported, loginWithPasskey, registerPasskey, listPasskeys } from '../utils/passkeyAuth';

const PASSKEY_PROMPT_SEEN_KEY = 'tpp_passkey_setup_prompted';

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
    const setUser = appContext?.setUser ?? (() => {});
    const { firebaseUser, isFirebaseLoading, setPassword: setFirebasePassword, setSocialKey } = useFirebase();
    const isTrialMode = searchParams.get('trial') === 'true';
    const isSignupMode = searchParams.get('signup') === 'true';
    const isPreGranted = searchParams.get('pregrant') === 'true';
    const emailFromUrl = searchParams.get('email');
    const lifetimeCode = searchParams.get('lifetime'); // Lifetime access code from redemption page
    const annualCode = searchParams.get('annual'); // Annual subscription code from redemption page
    const testIntro = searchParams.get('testIntro') === 'true'; // Testing: Force show intro
    const skipIntro = searchParams.get('skipIntro') === 'true'; // Testing: Force skip intro
    // Safe internal redirect after auth — only allow paths starting with /app/
    const rawRedirect = searchParams.get('redirect') || '';
    const postAuthRedirect = rawRedirect.startsWith('/app/') ? rawRedirect : null;
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
    const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
    const [twoFactorMethod, setTwoFactorMethod] = useState('authenticator');
    const [twoFactorSecret, setTwoFactorSecret] = useState('');
    const [pendingLoginData, setPendingLoginData] = useState(null);
    const [isPending, startTransition] = useTransition();
    const [showTryLoginButton, setShowTryLoginButton] = useState(false);
    const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

    // Social / passwordless login state
    const [googleLoading, setGoogleLoading] = useState(false);
    const [magicLinkLoading, setMagicLinkLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    // 'idle' | 'loading' | 'exiting' | 'sent' — drives the send-button icon animation
    const [sendPhase, setSendPhase] = useState('idle');
    const [showMagicLinkInput, setShowMagicLinkInput] = useState(false);
    // 'none' = equal dual buttons; 'passwordless' / 'biometric' = one expands, other collapses to icon
    const [altSignInFocus, setAltSignInFocus] = useState('none');
    const [magicLinkEmail, setMagicLinkEmail] = useState('');
    const [magicLinkError, setMagicLinkError] = useState('');
    // Mobile browser landed on magic-link — offer / try opening the native app
    // before consuming the oobCode on the web.
    const [magicLinkOpenAppPrompt, setMagicLinkOpenAppPrompt] = useState(false);
    // Google account-link modal: populated when sign-in detects an existing password account
    const [linkAccountData, setLinkAccountData] = useState(null); // { email, credential }
    const [linkAccountPassword, setLinkAccountPassword] = useState('');
    const [linkAccountLoading, setLinkAccountLoading] = useState(false);
    const [linkAccountError, setLinkAccountError] = useState('');

    // Biometric login state
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState(null);   // 'faceId'|'touchId'|'fingerprint'|'web'|null
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);

    // Passkey (Face ID / Fingerprint) — discoverable WebAuthn, separate from local biometric unlock
    const [passkeySupported, setPasskeySupported] = useState(false);
    const [passkeyLabel, setPasskeyLabel] = useState('Face or Fingerprint');
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [showPasskeySetup, setShowPasskeySetup] = useState(false); // one-time post-login enroll prompt
    const [passkeyEnrolling, setPasskeyEnrolling] = useState(false);
    const [pendingPostAuthDest, setPendingPostAuthDest] = useState(null);
    const [showBiometricSetup, setShowBiometricSetup] = useState(false); // post-login "enable?" prompt
    const [pendingBiometricCreds, setPendingBiometricCreds] = useState(null); // { uid, email, password?, encKey? }
    
    // DISABLED: Intro screen disabled - go straight to login
    // Only show intro for testing with ?testIntro=true
    const [showIntro, setShowIntro] = useState(testIntro ? true : false);

    // Lock body scroll on login/signup screen (fixes iOS scrollable login)
    useEffect(() => {
        if (showIntro) return; // intro has its own layout
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        const prevBodyPosition = body.style.position;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.width = '100%';
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
            body.style.position = prevBodyPosition;
            body.style.width = '';
        };
    }, [showIntro]);
    
    const handleIntroComplete = () => {
        setShowIntro(false);
        try {
            localStorage.setItem('tpp_has_seen_intro', 'true');
        } catch (error) {
            console.error('❌ Failed to save intro state:', error);
        }
    };
    
    useEffect(() => {
        // Intro screen logic
    }, []);
    
    // Check if user is already authenticated
    useEffect(() => {
        if (!isFirebaseLoading && firebaseUser) {
            // DEVELOPMENT/TESTING: Check for force logout flag
            const forceLogout = localStorage.getItem('tpp_force_logout');
            if (forceLogout === 'true') {
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
                    // Don't redirect - let them sign up with the pre-granted email
                    // Clear the current user session so they can sign up with the pre-granted email
                    return;
                }
            }
            
            // User is already logged in, redirect to intended destination or dashboard
            setUser({ email: firebaseUser.email, uid: firebaseUser.uid });
            startTransition(() => {
                navigate(postAuthRedirect || '/app/dashboard');
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
        }
        
        // Show message if coming from pre-grant email
        if (isPreGranted && emailFromUrl) {
            setError('');
        }
    }, [firebaseUser, isFirebaseLoading, setUser, navigate, emailFromUrl, isPreGranted, email]);

    // DEVELOPMENT/TESTING: Add console command for force logout
    useEffect(() => {
        // Add global function for development testing
        window.forceLogout = () => {
            localStorage.setItem('tpp_force_logout', 'true');
            window.location.reload();
        };
        
        // Add global function to clear all data
        window.clearAllData = () => {
            clearAllLocalStorage();
        };
        
        // Add function to check account status
        window.checkAccountStatus = async (emailToCheck) => {
            const emailAddr = emailToCheck || email;
            if (!emailAddr) {
                console.error('❌ Please provide an email address or fill in the email field');
                return;
            }
            try {
                const status = await getAccountStatus(emailAddr);
                
                if (!status.existsInAuth && status.existsInFirestore) {
                    console.error('❌ ORPHANED ACCOUNT: Exists in Firestore but NOT in Firebase Auth!');
                }
                
                return status;
            } catch (error) {
                console.error('❌ Error checking account status:', error);
            }
        };
        
        // Admin function to check blocked account (uses Admin SDK to see disabled accounts)
        // Auth is verified via Firebase Auth token — must be logged in as admin
        window.checkBlockedAccount = async (emailToCheck) => {
            const emailAddr = emailToCheck || email;
            if (!emailAddr) {
                console.error('❌ Please provide an email address or fill in the email field');
                return;
            }
            
            try {
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const functions = getFunctions();
                const checkBlockedAccount = httpsCallable(functions, 'checkAndCleanBlockedAccount');
                
                const result = await checkBlockedAccount({ email: emailAddr });
                
                return result.data;
            } catch (error) {
                console.error('❌ Error checking blocked account:', error);
                console.error('   Error code:', error.code);
                console.error('   Error message:', error.message);
            }
        };
        
        // Admin function to delete blocked account
        // Auth is verified via Firebase Auth token — must be logged in as admin
        window.deleteBlockedAccount = async (emailToDelete, deleteFirestore = true) => {
            const emailAddr = emailToDelete || email;
            if (!emailAddr) {
                console.error('❌ Please provide an email address or fill in the email field');
                return;
            }
            
            const confirmDelete = confirm(`⚠️ Are you sure you want to delete the account for ${emailAddr}?\n\nThis will delete from Firebase Auth${deleteFirestore ? ' and Firestore' : ''}.\n\nThis action cannot be undone!`);
            if (!confirmDelete) {
                return;
            }
            
            try {
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const functions = getFunctions();
                const deleteBlockedAccount = httpsCallable(functions, 'deleteBlockedAccount');
                
                const result = await deleteBlockedAccount({ 
                    email: emailAddr, 
                    deleteFirestore 
                });
                
                return result.data;
            } catch (error) {
                console.error('❌ Error deleting blocked account:', error);
                console.error('   Error code:', error.code);
                console.error('   Error message:', error.message);
            }
        };
        
        // Development commands available via window object
    }, [email]);

    // Real-time validation
    useEffect(() => {
      if (mode === 'signup' && email) {
        // Use disposable email check for signup
        const emailResult = validateEmailWithDisposableCheck(email);
        setEmailValidation(emailResult);
      } else if (mode === 'login' && email) {
        // Basic validation for login
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

    // ── Biometric availability check ─────────────────────────────────────────
    useEffect(() => {
      checkBiometricAvailable().then(({ available, type }) => {
        setBiometricAvailable(available);
        setBiometricType(type);
        setBiometricEnabled(isBiometricEnabled());
      });
      isPasskeySupported().then(({ supported, label }) => {
        setPasskeySupported(supported);
        setPasskeyLabel(label);
      });
    }, []);

    // ── Passkey (Face ID / Fingerprint) login ────────────────────────────────
    const handlePasskeyLogin = async () => {
      setPasskeyLoading(true);
      setError('');
      try {
        const { user } = await loginWithPasskey();
        const encKey = await getOrCreateSocialEncKey(user.uid);
        await completeSocialSignIn(user, encKey);
      } catch (err) {
        if (err?.name === 'NotAllowedError' || /cancel|abort/i.test(err?.message || '')) {
          // User dismissed the OS prompt — no error toast needed
        } else {
          console.error('Passkey login failed:', err);
          setError(err?.message || 'Face ID / Fingerprint sign-in failed. Try email/password or enroll a device in Account settings.');
        }
      } finally {
        setPasskeyLoading(false);
        setAltSignInFocus((prev) => (prev === 'biometric' ? 'none' : prev));
      }
    };

    const markPasskeyPromptSeen = () => {
      try { localStorage.setItem(PASSKEY_PROMPT_SEEN_KEY, 'true'); } catch {}
    };

    const hasSeenPasskeyPrompt = () => {
      try { return localStorage.getItem(PASSKEY_PROMPT_SEEN_KEY) === 'true'; } catch { return false; }
    };

    const goPostAuth = (dest) => {
      window.location.href = dest || postAuthRedirect || '/app/dashboard';
    };

    /**
     * After a fresh sign-in: one-time Face ID / Fingerprint (passkey) enroll prompt,
     * then fall back to the existing local biometric unlock prompt, else navigate.
     */
    const offerPostAuthSecuritySetup = async ({ bioCreds = null, dest = null } = {}) => {
      const destination = dest || postAuthRedirect || '/app/dashboard';

      try {
        const { supported, label } = await isPasskeySupported();
        if (supported && !hasSeenPasskeyPrompt()) {
          let alreadyHas = false;
          try {
            const keys = await listPasskeys();
            alreadyHas = Array.isArray(keys) && keys.length > 0;
          } catch {
            // Functions cold / not deployed yet — still offer enroll
          }
          if (!alreadyHas) {
            setPasskeyLabel(label);
            setPendingPostAuthDest(destination);
            if (bioCreds) setPendingBiometricCreds(bioCreds);
            setShowPasskeySetup(true);
            return;
          }
          markPasskeyPromptSeen();
        }
      } catch {
        // ignore — fall through
      }

      if (bioCreds) {
        try {
          const { available } = await checkBiometricAvailable();
          if (available && !isBiometricEnabled()) {
            setPendingBiometricCreds(bioCreds);
            setPendingPostAuthDest(destination);
            setShowBiometricSetup(true);
            return;
          }
        } catch {
          // ignore
        }
      }

      goPostAuth(destination);
    };

    const handlePasskeySetupEnable = async () => {
      setPasskeyEnrolling(true);
      try {
        await registerPasskey(passkeyLabel || 'This device');
        markPasskeyPromptSeen();
        setShowPasskeySetup(false);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: `${passkeyLabel} enabled for this device!`, type: 'success' }
        }));
        goPostAuth(pendingPostAuthDest);
      } catch (err) {
        if (err?.name === 'NotAllowedError' || /cancel|abort/i.test(err?.message || '')) {
          // dismissed OS prompt — stay on modal
        } else {
          console.error('Passkey enroll failed:', err);
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: err?.message || `Could not enable ${passkeyLabel}. Try again from Account settings.`, type: 'error' }
          }));
        }
      } finally {
        setPasskeyEnrolling(false);
      }
    };

    const handlePasskeySetupSkip = async () => {
      markPasskeyPromptSeen();
      setShowPasskeySetup(false);
      const destination = pendingPostAuthDest || postAuthRedirect || '/app/dashboard';
      const bioCreds = pendingBiometricCreds;
      if (bioCreds) {
        try {
          const { available } = await checkBiometricAvailable();
          if (available && !isBiometricEnabled()) {
            setShowBiometricSetup(true);
            return;
          }
        } catch {
          // ignore
        }
      }
      goPostAuth(destination);
    };

    // ── Biometric login handler ───────────────────────────────────────────────
    const handleBiometricLogin = async () => {
      setBiometricLoading(true);
      setError('');
      const { success, credentials, error: bioError } = await doBiometricLogin();
      if (!success) {
        if (bioError !== 'cancelled') setError(bioError || 'Biometric sign-in failed.');
        setBiometricLoading(false);
        setAltSignInFocus((prev) => (prev === 'biometric' ? 'none' : prev));
        return;
      }

      const { email: storedEmail, password: storedPassword, encKey: storedEncKey } = credentials;

      if (storedPassword) {
        // Email/password user — re-login with stored credentials
        setEmail(storedEmail);
        setPassword(storedPassword);
        // Trigger the real login flow via loginUser directly
        try {
          const firebaseUser = await loginUser(storedEmail, storedPassword);
          setFirebasePassword(storedPassword);
          let user = {
            email: firebaseUser.email,
            name: firebaseUser.email.split('@')[0],
            uid: firebaseUser.uid,
            createdAt: firebaseUser.metadata?.creationTime
              ? new Date(firebaseUser.metadata.creationTime).toISOString()
              : new Date().toISOString(),
          };
          const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
          if (lastUserEmail && lastUserEmail !== user.email.toLowerCase()) clearAllUserData();
          localStorage.setItem('tpprover_last_user_email', user.email.toLowerCase());
          try { localStorage.setItem('tpprover_user', JSON.stringify(user)); } catch {}
          try { localStorage.setItem('tpprover_auth_token', 'firebase_token'); } catch {}
          setUser(user);
          window.location.href = '/app/dashboard';
        } catch (err) {
          setError('Biometric sign-in failed: ' + (err.message || 'Please log in manually.'));
        }
      } else if (storedEncKey) {
        // Social/magic-link user — Firebase session should still be active
        setSocialKey(storedEncKey);
        const fbUser = (await import('../config/firebase')).auth.currentUser;
        if (fbUser) {
          let user = {
            email: fbUser.email,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || '',
            uid: fbUser.uid,
            createdAt: fbUser.metadata?.creationTime ? new Date(fbUser.metadata.creationTime).toISOString() : new Date().toISOString(),
          };
          try { localStorage.setItem('tpprover_user', JSON.stringify(user)); } catch {}
          try { localStorage.setItem('tpprover_auth_token', 'firebase_token'); } catch {}
          setUser(user);
          window.location.href = '/app/dashboard';
        } else {
          setError('Your session has expired. Please sign in with Google or a magic link, then re-enable biometrics.');
          disableBiometricLogin();
          setBiometricEnabled(false);
        }
      } else {
        setError('No credentials found. Please log in manually and enable biometrics again.');
        disableBiometricLogin();
        setBiometricEnabled(false);
      }
      setBiometricLoading(false);
      setAltSignInFocus((prev) => (prev === 'biometric' ? 'none' : prev));
    };

    // ── Magic-link completion (runs when user clicks the email link) ────────
    const finishMagicLinkSignIn = async (emailOverride) => {
      // Clear any stale login-in-progress flags so AppContext's onAuthChange
      // doesn't skip user setup and loop back to /login after redirect.
      sessionStorage.removeItem('tpp_login_in_progress');
      sessionStorage.removeItem('tpp_signup_in_progress');
      setMagicLinkOpenAppPrompt(false);

      const savedEmail = (emailOverride || localStorage.getItem('tpp_magic_link_email') || '').trim();
      if (!savedEmail) {
        // Different device or storage cleared — ask for email
        setShowMagicLinkInput(true);
        setAltSignInFocus('passwordless');
        setMagicLinkError('Please enter the email address you used to request the link.');
        return;
      }
      setMagicLinkLoading(true);
      try {
        const { user, encKey } = await completeMagicLink(savedEmail);
        await completeSocialSignIn(user, encKey);
      } catch (err) {
        // Make the error visible even when the input panel isn't open
        setShowMagicLinkInput(true);
        setAltSignInFocus('passwordless');
        setMagicLinkError(
          err.code === 'auth/invalid-action-code'
            ? 'This sign-in link has expired or already been used. Request a new one below.'
            : err.code === 'auth/operation-not-allowed'
            ? 'Passwordless sign-in is not enabled yet. Contact support.'
            : 'Sign-in failed. Please request a new link.'
        );
        setMagicLinkLoading(false);
      }
    };

    const tryOpenNativeAppFromMagicLink = () => {
      const href = window.location.href;
      const ua = navigator.userAgent || '';
      if (/android/i.test(ua)) {
        window.location.href = buildAndroidMagicLinkIntentUrl(href);
      } else {
        window.location.href = buildAppMagicLinkSchemeUrl(href);
      }
    };

    useEffect(() => {
      if (!isMagicLinkUrl()) return;

      // Already inside the Capacitor app — complete sign-in here.
      if (isNative()) {
        void finishMagicLinkSignIn();
        return;
      }

      // Mobile browser (email client in-app browser, Safari, Chrome): try to
      // hand off to the installed app first so the oobCode isn't burned on web.
      if (isMobileBrowserUserAgent()) {
        setMagicLinkOpenAppPrompt(true);
        tryOpenNativeAppFromMagicLink();
        return;
      }

      // Desktop web — complete in the browser.
      void finishMagicLinkSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Google redirect completion (runs after popup fallback redirect) ──────
    useEffect(() => {
      completeGoogleRedirectSignIn()
        .then((result) => {
          if (!result?.user) return;
          return completeSocialSignIn(result.user, result.encKey);
        })
        .catch((err) => {
          // Silence all codes that just mean "no redirect was pending" or the
          // environment doesn't support redirect auth — these fire on every normal
          // page load and are not user-facing errors.
          const benign = [
            'auth/no-auth-event',
            'auth/null-user',
            'auth/internal-error',
            'auth/argument-error',
            'auth/operation-not-supported-in-this-environment',
          ];
          if (!err?.code || benign.includes(err?.code)) return;
          setError('Google sign-in failed. Please try again.');
          setGoogleLoading(false);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Shared post-social-signin completion ────────────────────────────────
    const completeSocialSignIn = async (firebaseUser, encKey) => {
      setSocialKey(encKey);

      const currentEmail = (firebaseUser.email || '').toLowerCase();
      const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
      if (lastUserEmail && lastUserEmail !== currentEmail) {
        clearAllUserData();
      }
      localStorage.setItem('tpprover_last_user_email', currentEmail);

      let user = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        uid: firebaseUser.uid,
      };

      try {
        const existingUser = JSON.parse(localStorage.getItem('tpprover_user') || '{}');
        user.createdAt = existingUser.createdAt
          || (firebaseUser.metadata?.creationTime ? new Date(firebaseUser.metadata.creationTime).toISOString() : new Date().toISOString());
      } catch {
        user.createdAt = firebaseUser.metadata?.creationTime
          ? new Date(firebaseUser.metadata.creationTime).toISOString()
          : new Date().toISOString();
      }

      try { localStorage.setItem('tpprover_user', JSON.stringify(user)); } catch {}
      try { localStorage.setItem('tpprover_auth_token', 'firebase_token'); } catch {}

      try {
        const isFounder = await getUserFounderStatus(firebaseUser.uid);
        if (isFounder) localStorage.setItem('tpprover_is_founder', 'true');
      } catch {}

      try {
        const { checkLifetimeAccessFirestore } = await import('../services/firebase');
        const lifetimeAccess = await checkLifetimeAccessFirestore(firebaseUser.uid);
        if (lifetimeAccess?.metadata?.isBetaTester) localStorage.setItem('tpprover_is_tester', 'true');
      } catch {}

      setUser(user);
      
      // Clear any stale in-progress flags so AppContext picks up the new auth state cleanly
      sessionStorage.removeItem('tpp_login_in_progress');
      sessionStorage.removeItem('tpp_signup_in_progress');

      // Check if 2FA is enabled for this Google/social user
      const twoFactorSettings = await Promise.race([
        getTwoFactorSettings(firebaseUser.uid, encKey),
        new Promise((resolve) => setTimeout(() => resolve(null), 5000))
      ]);

      if (twoFactorSettings?.enabled && twoFactorSettings?.method === 'authenticator' && twoFactorSettings?.secret) {
        const biometricCreds = { uid: firebaseUser.uid, email: firebaseUser.email, encKey };
        setPendingLoginData({ firebaseUser, isSocial: true, encKey, user, biometricCreds });
        setTwoFactorMethod('authenticator');
        setTwoFactorSecret(twoFactorSettings.secret);
        setShowTwoFactorModal(true);
        return; // Pause — handleTwoFactorVerify will resume
      }

      // One-time Face ID / Fingerprint prompt, then optional local biometric unlock
      await offerPostAuthSecuritySetup({
        bioCreds: { uid: firebaseUser.uid, email: firebaseUser.email, encKey },
        dest: postAuthRedirect || '/app/dashboard',
      });
    };

    // ── Google Sign-In ───────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
      setGoogleLoading(true);
      setError('');
      try {
        const { user, encKey } = await signInWithGoogle();
        if (!user) {
          // Redirect flow started — full-page navigation follows shortly.
          return;
        }
        await completeSocialSignIn(user, encKey);
      } catch (err) {
        if (err.code === 'auth/account-exists-with-different-credential') {
          // The email already belongs to an email/password account.
          // Save the pending Google credential so the user can link after entering their password.
          const { GoogleAuthProvider } = await import('firebase/auth');
          const credential = GoogleAuthProvider.credentialFromError(err);
          setLinkAccountData({ email: err.customData?.email || '', credential });
        } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          // User dismissed — no error message needed
        } else if (err.code === 'auth/operation-not-allowed') {
          setError('Google sign-in is not enabled yet. Go to Firebase Console → Authentication → Sign-in method → Google → Enable → Save.');
        } else if (err.code === 'auth/unauthorized-domain') {
          setError('This domain is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.');
        } else if (err.code === 'auth/popup-blocked') {
          setError('Your browser blocked the Google sign-in window. On mobile, open this site in Chrome or Safari (not an in-app browser), then try again.');
        } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
          setError('Google sign-in is not supported in this browser. Please open the site in Chrome or Safari and try again.');
        } else {
          setError('Google sign-in failed. Please try again.');
        }
      } finally {
        setGoogleLoading(false);
      }
    };

    // ── Link Google to existing email/password account ───────────────────────
    const handleLinkAccounts = async () => {
      if (!linkAccountData || !linkAccountPassword) return;
      setLinkAccountLoading(true);
      setLinkAccountError('');
      try {
        const linkedUser = await linkGoogleToPasswordAccount(
          linkAccountData.email,
          linkAccountPassword,
          linkAccountData.credential
        );
        // Use the existing password as enc key (linked account keeps password encryption)
        setFirebasePassword(linkAccountPassword);
        // Re-encrypt cloud data with the social key so future Google-only sign-ins
        // (which have no password in memory) can still decrypt their data.
        try {
          const socialKey = await getOrCreateSocialEncKey(linkedUser.uid);
          const cloudData = await loadUserData(linkedUser.uid, linkAccountPassword);
          if (cloudData) {
            await saveUserData(linkedUser.uid, cloudData, socialKey);
          }
          setSocialKey(socialKey);
        } catch (_) {}
        const currentEmail = linkedUser.email.toLowerCase();
        const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
        if (lastUserEmail && lastUserEmail !== currentEmail) clearAllUserData();
        localStorage.setItem('tpprover_last_user_email', currentEmail);
        let user = {
          email: linkedUser.email,
          name: linkedUser.displayName || linkedUser.email.split('@')[0],
          uid: linkedUser.uid,
          createdAt: linkedUser.metadata?.creationTime ? new Date(linkedUser.metadata.creationTime).toISOString() : new Date().toISOString(),
        };
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)); } catch {}
        try { localStorage.setItem('tpprover_auth_token', 'firebase_token'); } catch {}
        setUser(user);
        setLinkAccountData(null);
        window.location.href = '/app/dashboard';
      } catch (err) {
        setLinkAccountError(err.code === 'auth/wrong-password' ? 'Incorrect password. Please try again.' : 'Account linking failed. Please try again.');
      }
      setLinkAccountLoading(false);
    };

    // ── Magic Link ───────────────────────────────────────────────────────────
    const handleSendMagicLink = async () => {
      const emailToUse = (magicLinkEmail || email || '').trim();
      if (!emailToUse) {
        setMagicLinkError('Please enter your email address.');
        return;
      }
      setMagicLinkLoading(true);
      setSendPhase('loading');
      setMagicLinkError('');
      const minSpinMs = 1600;
      const start = Date.now();
      let succeeded = false;
      try {
        await sendMagicLink(emailToUse);
        succeeded = true;
        const elapsed = Date.now() - start;
        if (elapsed < minSpinMs) {
          await new Promise(res => setTimeout(res, minSpinMs - elapsed));
        }
      } catch (err) {
        if (err.code === 'auth/operation-not-allowed') {
          setMagicLinkError('Magic link sign-in is not enabled yet. Go to Firebase Console → Authentication → Sign-in method → Email/Password → enable "Email link (passwordless)" and save.');
        } else {
          setMagicLinkError('Failed to send magic link. Please try again.');
        }
      }
      setMagicLinkLoading(false);
      if (succeeded) {
        // 'exiting' = spinner fades out, plane stays hidden, checkmark not yet shown
        setSendPhase('exiting');
        await new Promise(res => setTimeout(res, 250));
        setSendPhase('sent');
        setMagicLinkSent(true);
      } else {
        setSendPhase('idle');
      }
    };

    const doLogin = async (recaptchaToken = null) => {
      try {
        // Set flag to prevent auth token clearing during login
        sessionStorage.setItem('tpp_login_in_progress', 'true');
        
        // Store reCAPTCHA token for server verification (if provided)
        if (recaptchaToken) {
          sessionStorage.setItem('tpp_login_recaptcha_token', recaptchaToken);
        }
        
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
        
        // loginUser() handles the native vs web branching and race internally.
        const firebaseUser = await loginUser(email, password);
        // Check if 2FA is enabled for this user
        const twoFactorSettings = await Promise.race([
          getTwoFactorSettings(firebaseUser.uid, password),
          new Promise((resolve) => setTimeout(() => resolve(null), 5000))
        ]);
        
        if (twoFactorSettings && twoFactorSettings.enabled && twoFactorSettings.method === 'authenticator' && twoFactorSettings.secret) {
          // Store password temporarily for decryption
          sessionStorage.setItem('tpprover_user_password', password);
          
          // Store pending login data to resume after 2FA verification
          setPendingLoginData({
            firebaseUser,
            password,
            existingData,
            hasExistingData,
            sampleDataCleared,
            sampleDataClearedAt,
            sampleBannerDismissed
          });
          
          // Set 2FA state
          setTwoFactorMethod(twoFactorSettings.method);
          setTwoFactorSecret(twoFactorSettings.secret);
          setShowTwoFactorModal(true);
          
          // Pause login flow - will resume after 2FA verification
          return true; // Return true to prevent error, but don't navigate yet
        }
        
        // Store password for encryption
        setFirebasePassword(password);
        
        // Check existing founder status for returning users.
        // 3s quick-check: if Firestore is fast, badge shows immediately.
        // Background retry: always finishes eventually and stamps subscription so badge
        // appears on the Profile page even if the quick-check timed out (common on native).
        const stampFounderOnSubscription = (sub) => {
          if (!sub || sub.isFounder === true) return;
          try {
            const updated = { ...sub, isFounder: true };
            localStorage.setItem('tpprover_subscription', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('subscription:updated', { detail: { subscription: updated } }));
          } catch {}
        };

        let quickFounderChecked = false;
        try {
          const isFounder = await Promise.race([
            getUserFounderStatus(firebaseUser.uid),
            new Promise(resolve => setTimeout(() => resolve(false), 3000)),
          ]);
          quickFounderChecked = true;
          if (isFounder) {
            localStorage.setItem('tpprover_is_founder', 'true');
            try { stampFounderOnSubscription(JSON.parse(localStorage.getItem('tpprover_subscription') || 'null')); } catch {}
          }
        } catch (error) {
          console.warn('Could not check founder status (network?):', error?.message);
        }

        // Background retry (no timeout) — ensures badge shows even if quick-check timed out
        if (!quickFounderChecked || localStorage.getItem('tpprover_is_founder') !== 'true') {
          void getUserFounderStatus(firebaseUser.uid).then(isFounder => {
            if (isFounder) {
              localStorage.setItem('tpprover_is_founder', 'true');
              try { stampFounderOnSubscription(JSON.parse(localStorage.getItem('tpprover_subscription') || 'null')); } catch {}
            }
          }).catch(() => {});
        }
        
        // Check Firestore for beta tester status (non-blocking, 3s cap).
        try {
          const { checkLifetimeAccessFirestore } = await import('../services/firebase');
          const lifetimeAccess = await Promise.race([
            checkLifetimeAccessFirestore(firebaseUser.uid),
            new Promise(resolve => setTimeout(() => resolve(null), 3000)),
          ]);
          if (lifetimeAccess?.metadata?.isBetaTester) {
            localStorage.setItem('tpprover_is_tester', 'true');
          }
        } catch (error) {
          console.warn('Could not check beta tester status (network?):', error?.message);
        }

        // Set user in app context  
        let user = { 
          email: firebaseUser.email, 
          name: firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid,
          // Persist emailVerified so native builds don't lose it when web SDK auth state is slow/absent
          emailVerified: firebaseUser.emailVerified === true,
        };
        
        // CRITICAL SECURITY: Check for user change and clear data immediately (case-insensitive)
        const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
        const currentEmail = (user.email || '').toLowerCase();
        if (lastUserEmail && lastUserEmail !== currentEmail) {
          clearAllUserData();
        }
        
        // Update last user email (store lowercase for consistent comparison)
        localStorage.setItem('tpprover_last_user_email', currentEmail);
        
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
        } catch (e) {
          console.error('❌ Failed to set auth token:', e);
        }
        
        // Don't set has_onboarded here - let the welcome modal handle it
        
        // DON'T create trial subscriptions on login - only on signup!
        // Existing users should keep their original trial subscription
        
        // CRITICAL FIX: Restore existing data if it was backed up and Firebase sync might overwrite it
        if (hasExistingData) {
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
        }
        if (sampleDataClearedAt) {
          localStorage.setItem('tpprover_sample_data_cleared_at', sampleDataClearedAt);
        }
        if (sampleBannerDismissed) {
          localStorage.setItem('tpprover_sample_banner_dismissed', sampleBannerDismissed);
        }
        
        setUser(user);
        
        // Check if this login has a lifetime code to redeem (upgrade existing account)
        if (lifetimeCode) {
          try {
            const { grantLifetimeAccessFirestore } = await import('../services/firebase');
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            
            // Grant lifetime access
            await grantLifetimeAccessFirestore(
              firebaseUser.uid,
              firebaseUser.email,
              'Lifetime Kit Redemption (Login Upgrade)',
              'lifetime-kit'
            );
            
            // Mark code as used
            try {
              const codeRef = doc(db, 'lifetimeCodes', lifetimeCode);
              await updateDoc(codeRef, {
                used: true,
                usedBy: firebaseUser.email,
                usedByUid: firebaseUser.uid,
                usedAt: new Date().toISOString()
              });
            } catch (codeError) {
              console.error('⚠️ Failed to mark code as used:', codeError);
            }
            
            // Update localStorage subscription
            const lifetimeSubscription = {
              id: `lifetime_${Date.now()}`,
              plan: 'lifetime',
              interval: 'lifetime',
              status: 'active',
              hasLifetimeAccess: true,
              lifetimeReason: 'Lifetime Kit Redemption (Login Upgrade)',
              lifetimeGrantedAt: new Date().toISOString(),
              currentPeriodEnd: null,
            };
            localStorage.setItem('tpprover_subscription', JSON.stringify(lifetimeSubscription));
            
            // CRITICAL: Trigger subscription refresh
            window.dispatchEvent(new CustomEvent('subscription:updated', { 
              detail: { subscription: lifetimeSubscription } 
            }));
            
            // Refresh from cloud after a moment
            setTimeout(async () => {
              try {
                const { loadUserSubscription } = await import('../services/cloudStorage');
                const refreshedSubscription = await loadUserSubscription(firebaseUser.uid);
                if (refreshedSubscription) {
                  window.dispatchEvent(new CustomEvent('subscription:updated', { 
                    detail: { subscription: refreshedSubscription } 
                  }));
                }
              } catch (err) {
                console.error('⚠️ Failed to refresh subscription from cloud:', err);
              }
            }, 1000);
          } catch (lifetimeError) {
            console.error('❌ Failed to apply lifetime during login:', lifetimeError);
            // Continue with login even if lifetime fails - user can contact support
          }
        }
        
        // Check if this login has an annual code to redeem (upgrade existing account)
        if (annualCode) {
          try {
            const { grantAnnualAccessFirestore } = await import('../services/firebase');
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            
            // Calculate expiration (1 year from now)
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            
            // Grant annual access
            await grantAnnualAccessFirestore(
              firebaseUser.uid,
              firebaseUser.email,
              'Annual Kit Redemption (Login Upgrade)',
              'annual-kit'
            );
            
            // Mark code as used
            try {
              const codeRef = doc(db, 'annualCodes', annualCode);
              await updateDoc(codeRef, {
                used: true,
                usedBy: firebaseUser.email,
                usedByUid: firebaseUser.uid,
                usedAt: new Date().toISOString()
              });
            } catch (codeError) {
              console.error('⚠️ Failed to mark annual code as used:', codeError);
            }
            
            // Update localStorage subscription
            const annualSubscription = {
              id: `annual_kit_${Date.now()}`,
              plan: 'annual',
              interval: 'year',
              status: 'active',
              source: 'annual-kit',
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: expiresAt.toISOString(),
              redeemedAt: now.toISOString(),
            };
            localStorage.setItem('tpprover_subscription', JSON.stringify(annualSubscription));
            
            // CRITICAL: Trigger subscription refresh
            window.dispatchEvent(new CustomEvent('subscription:updated', { 
              detail: { subscription: annualSubscription } 
            }));
            
            // Refresh from cloud after a moment
            setTimeout(async () => {
              try {
                const { loadUserSubscription } = await import('../services/cloudStorage');
                const refreshedSubscription = await loadUserSubscription(firebaseUser.uid);
                if (refreshedSubscription) {
                  window.dispatchEvent(new CustomEvent('subscription:updated', { 
                    detail: { subscription: refreshedSubscription } 
                  }));
                }
              } catch (err) {
                console.error('⚠️ Failed to refresh subscription from cloud:', err);
              }
            }, 1000);
          } catch (annualError) {
            console.error('❌ Failed to apply annual during login:', annualError);
            // Continue with login even if annual fails - user can contact support
          }
        }
        
        // Clear login flag
        sessionStorage.removeItem('tpp_login_in_progress');

        const activatedParam = lifetimeCode ? 'lifetime_activated=true' : (annualCode ? 'annual_activated=true' : '');
        const dest = activatedParam
          ? `/app/dashboard?${activatedParam}`
          : (postAuthRedirect || '/app/dashboard');
        await offerPostAuthSecuritySetup({
          bioCreds: { uid: firebaseUser.uid, email, password },
          dest,
        });
        return true;
      } catch (error) {
        // Clear login flag on error too
        sessionStorage.removeItem('tpp_login_in_progress');
        console.error('Login failed:', {
          code: error?.code,
          message: error?.message,
          name: error?.name
        });
        
        // Get account status for better error messages
        let accountStatus = null;
        try {
          accountStatus = await getAccountStatus(email);
        } catch (statusError) {
          // Silent fail for account status check
        }
        
        if (error.code === 'auth/network-request-failed') {
          setError('🌐 Network Error: Cannot reach authentication servers. Common causes:\n\n1️⃣ Browser cache issue → Run: window.clearAppCache()\n2️⃣ VPN/Firewall blocking Firebase → Try disabling VPN\n3️⃣ Ad blocker interference → Disable ad blocker\n4️⃣ DNS issue → Try different network\n\n💡 Open browser console (F12) and run: window.diagnoseNetwork()');
        } else if (error.code === 'auth/user-not-found') {
          setError('No account found with this email. Please create a new account.');
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          // Wrong password - keep it simple and user-friendly
          setError('Incorrect password. Use "Forgot password?" to reset it.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else if (error.code === 'auth/user-disabled') {
          setError('Your account has been disabled. Please contact support for assistance.');
        } else if (error.code === 'auth/operation-not-allowed') {
          setError('Email/password sign-in is not enabled for your account. Please contact support.');
        } else if (error.code === 'auth/too-many-requests') {
          setError('Too many failed login attempts. Please wait a few minutes before trying again, or use "Forgot password?" to reset your password.');
        } else if (error.code === 'auth/requires-recent-login') {
          setError('For security, please log out and log back in to continue.');
        } else {
          // Show actual error for debugging
          console.error('Unhandled login error:', error.code, error.message);
          if (accountStatus && accountStatus.existsInAuth) {
            setError('Your account exists but sign-in failed. Please try "Forgot password?" or contact support if this persists.');
          } else {
            setError('Sign-in failed. Please double-check your credentials or contact support.');
          }
        }
        return false;
      }
    };

    // Handle 2FA verification and continue login
    const handleTwoFactorVerify = async (code) => {
      if (!pendingLoginData) {
        throw new Error('No pending login data');
      }

      const { firebaseUser, password, encKey: socialEncKey, isSocial, existingData, hasExistingData, sampleDataCleared, sampleDataClearedAt, sampleBannerDismissed, biometricCreds } = pendingLoginData;
      // Effective key: password for email/password users, socialEncKey for Google/magic-link
      const encKeyForVerify = isSocial ? socialEncKey : password;

      // Verify the code — try TOTP first, then backup code
      let isValid = false;
      if (twoFactorMethod === 'authenticator' && twoFactorSecret) {
        if (isValidCodeFormat(code)) {
          isValid = verifyTOTPCode(twoFactorSecret, code);
        }
        if (!isValid) {
          // Backup codes are alphanumeric, pass as-is
          isValid = await verifyAndConsumeBackupCode(firebaseUser.uid, code, encKeyForVerify);
        }
      }

      if (!isValid) {
        throw new Error('Invalid verification code. Please try again.');
      }

      // Clear 2FA modal
      setShowTwoFactorModal(false);
      setPendingLoginData(null);

      // ── Social (Google/magic-link) post-2FA ────────────────────────────────
      if (isSocial) {
        setSocialKey(socialEncKey);
        await offerPostAuthSecuritySetup({
          bioCreds: biometricCreds || { uid: firebaseUser.uid, email: firebaseUser.email, encKey: socialEncKey },
          dest: postAuthRedirect || '/app/dashboard',
        });
        return;
      }

      // ── Email/password post-2FA ────────────────────────────────────────────
      setFirebasePassword(password);
      try {
        const isFounder = await getUserFounderStatus(firebaseUser.uid);
        if (isFounder) {
          localStorage.setItem('tpprover_is_founder', 'true');
        }
      } catch (error) {
        console.error('Error checking existing founder status:', error);
      }
      
      try {
        const { checkLifetimeAccessFirestore } = await import('../services/firebase');
        const lifetimeAccess = await checkLifetimeAccessFirestore(firebaseUser.uid);
        if (lifetimeAccess && lifetimeAccess.metadata?.isBetaTester) {
          localStorage.setItem('tpprover_is_tester', 'true');
        }
      } catch (error) {
        console.error('Error checking beta tester status:', error);
      }

      let user = { 
        email: firebaseUser.email, 
        name: firebaseUser.email.split('@')[0],
        uid: firebaseUser.uid
      };
      
      const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
      const currentEmail = (user.email || '').toLowerCase();
      if (lastUserEmail && lastUserEmail !== currentEmail) {
        clearAllUserData();
      }
      
      localStorage.setItem('tpprover_last_user_email', currentEmail);
      
      try {
        const existingUser = JSON.parse(localStorage.getItem('tpprover_user') || '{}');
        if (existingUser.createdAt) {
          user.createdAt = existingUser.createdAt;
        } else if (firebaseUser.metadata?.creationTime) {
          user.createdAt = new Date(firebaseUser.metadata.creationTime).toISOString();
        } else {
          user.createdAt = new Date().toISOString();
        }
      } catch {
        if (firebaseUser.metadata?.creationTime) {
          user.createdAt = new Date(firebaseUser.metadata.creationTime).toISOString();
        } else {
          user.createdAt = new Date().toISOString();
        }
      }
      
      try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
      
      try {
        localStorage.setItem('tpprover_auth_token', 'firebase_token');
      } catch (e) {
        console.error('❌ Failed to set auth token:', e);
      }
      
      if (hasExistingData) {
        localStorage.setItem('tpprover_data_backup', JSON.stringify(existingData));
        Object.keys(existingData).forEach(key => {
          if (existingData[key]) {
            localStorage.setItem(key, JSON.stringify(existingData[key]));
          }
        });
      }
      
      if (sampleDataCleared) {
        localStorage.setItem('tpprover_sample_data_cleared', sampleDataCleared);
      }
      if (sampleDataClearedAt) {
        localStorage.setItem('tpprover_sample_data_cleared_at', sampleDataClearedAt);
      }
      if (sampleBannerDismissed) {
        localStorage.setItem('tpprover_sample_banner_dismissed', sampleBannerDismissed);
      }
      
      setUser(user);
      
      sessionStorage.removeItem('tpp_login_in_progress');
      
      await offerPostAuthSecuritySetup({
        bioCreds: { uid: firebaseUser.uid, email: firebaseUser.email, password },
        dest: postAuthRedirect || '/app/dashboard',
      });
    };

    const handleTwoFactorCancel = () => {
      setShowTwoFactorModal(false);
      setPendingLoginData(null);
      setLoading(false);
      sessionStorage.removeItem('tpp_login_in_progress');
      setError('Login cancelled. Two-factor authentication is required.');
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

    const doSignup = async (recaptchaToken = null) => {
      try {
        // CRITICAL: Set session flag FIRST to prevent AppContext interference
        sessionStorage.setItem('tpp_signup_in_progress', 'true');
        trackConversion(EVENTS.SIGNUP_STARTED, { method: 'email' });
        
        // Store reCAPTCHA token for server verification (if provided)
        if (recaptchaToken) {
          sessionStorage.setItem('tpp_signup_recaptcha_token', recaptchaToken);
        }
        
        // NOTE: We don't pre-check if account exists because fetchSignInMethodsForEmail
        // can return false negatives (empty array) for accounts that exist but are disabled
        // or have no sign-in methods. Instead, we try registration and handle auth/email-already-in-use
        
        // Clear previous seeding flags for fresh demo data on new signup
        localStorage.removeItem('tpprover_has_seeded');
        localStorage.removeItem('tpprover_demo_seeded_at');
        // Clear welcome modal session flag for fresh signup
        sessionStorage.removeItem('tpp_welcome_shown');
        
        // Set auth token IMMEDIATELY (before anything else)
        try { 
          localStorage.setItem('tpprover_auth_token', 'firebase_token');
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
        } catch (e) {
          console.error('❌ Failed to pre-set user data:', e);
        }
        
        // Create Firebase user
        let firebaseUser;
        try {
          const result = await registerUser(email, password, null);
          firebaseUser = result.user;
          trackConversion(EVENTS.SIGNUP_COMPLETED, { method: 'email', uid: firebaseUser.uid });
          trackConversion(EVENTS.TRIAL_STARTED, { uid: firebaseUser.uid });
        } catch (regError) {
          console.error('❌ registerUser FAILED:', regError);
          console.error('❌ Error code:', regError.code);
          console.error('❌ Error message:', regError.message);
          
          // Get account status to provide better error message
          if (regError.code === 'auth/email-already-in-use') {
            try {
              const accountStatus = await getAccountStatus(email);
              if (accountStatus.existsInAuth && !accountStatus.existsInFirestore) {
                console.warn('⚠️ Orphaned account detected: exists in Auth but not Firestore');
              }
            } catch (statusError) {
              // Silent fail for account status check
            }
          }
          
          throw regError; // Re-throw to be caught by outer catch
        }
        
        // Store password for encryption
        setFirebasePassword(password);
        
        // Check and assign founder status (first 100 users starting Nov 4, 2025)
        try {
          const isFounder = await checkAndAssignFounderStatus(firebaseUser.uid);
          if (isFounder) {
            localStorage.setItem('tpprover_is_founder', 'true');
          }
        } catch (error) {
          console.error('❌ Error checking founder status:', error);
        }
        
        // Record agreement acceptance (non-blocking with timeout)
        try {
          // Add timeout to prevent hanging
          await Promise.race([
            (async () => {
              await recordAgreement(
                AGREEMENT_TYPES.SIGNUP_TERMS,
                AGREEMENT_VERSIONS.TERMS_OF_SERVICE,
                { 
                  signupFlow: true,
                  contentUpdateDate: AGREEMENT_VERSIONS.TERMS_OF_SERVICE.split('-')[1] + '-' + AGREEMENT_VERSIONS.TERMS_OF_SERVICE.split('-')[2]
                },
                firebaseUser.email
              );
              
              await recordAgreement(
                AGREEMENT_TYPES.SIGNUP_PRIVACY,
                AGREEMENT_VERSIONS.PRIVACY_POLICY,
                { 
                  signupFlow: true,
                  contentUpdateDate: AGREEMENT_VERSIONS.PRIVACY_POLICY.split('-')[1] + '-' + AGREEMENT_VERSIONS.PRIVACY_POLICY.split('-')[2]
                },
                firebaseUser.email
              );
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
        
        // CRITICAL SECURITY: Check for user change and clear data immediately (case-insensitive)
        const lastUserEmail = (localStorage.getItem('tpprover_last_user_email') || '').toLowerCase();
        const currentEmail = (user.email || '').toLowerCase();
        const isNewAccount = !lastUserEmail || lastUserEmail !== currentEmail;
        
        if (lastUserEmail && lastUserEmail !== currentEmail) {
          // Clear ALL user-specific data from localStorage
          clearAllUserData();
          
          // RE-SET auth token after clearing (it was cleared by clearAllUserData)
          try { 
            localStorage.setItem('tpprover_auth_token', 'firebase_token');
          } catch (e) {
            console.error('❌ Failed to re-set auth token:', e);
          }
        }
        
        // Reset theme to default (sage) for new accounts
        if (isNewAccount) {
          try {
            localStorage.setItem('tpprover_theme', defaultThemeName);
          } catch (error) {
            console.error('❌ Failed to reset theme for new account:', error);
          }
        }
        
        // Update last user email (store lowercase for consistent comparison)
        localStorage.setItem('tpprover_last_user_email', currentEmail);
        
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
        
        // Check if this is a lifetime code redemption
        if (lifetimeCode) {
          try {
            // Import lifetime access function
            const { grantLifetimeAccessFirestore } = await import('../services/firebase');
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            
            // Grant lifetime access
            await grantLifetimeAccessFirestore(
              firebaseUser.uid, 
              firebaseUser.email, 
              'Lifetime Access Kit Redemption',
              'lifetime-kit'
            );
            
            // Mark the code as used
            try {
              const codeRef = doc(db, 'lifetimeCodes', lifetimeCode);
              await updateDoc(codeRef, {
                used: true,
                usedBy: firebaseUser.email,
                usedByUid: firebaseUser.uid,
                usedAt: new Date().toISOString()
              });
            } catch (codeError) {
              console.error('⚠️ Failed to mark code as used (but access was granted):', codeError);
              // Log more details for debugging
              console.error('Code that failed:', lifetimeCode);
              console.error('Error details:', codeError.code, codeError.message);
            }
            
            // Create lifetime subscription in localStorage
            const lifetimeSubscription = {
              id: `lifetime_${Date.now()}`,
              plan: 'lifetime',
              interval: 'lifetime',
              status: 'active',
              hasLifetimeAccess: true,
              lifetimeReason: 'Lifetime Access Kit Redemption',
              lifetimeGrantedAt: new Date().toISOString(),
              currentPeriodEnd: null,
            };
            try {
              localStorage.setItem('tpprover_subscription', JSON.stringify(lifetimeSubscription));
              
              // CRITICAL: Trigger subscription refresh
              window.dispatchEvent(new CustomEvent('subscription:updated', { 
                detail: { subscription: lifetimeSubscription } 
              }));
              
              // Refresh from cloud after a moment
              setTimeout(async () => {
                try {
                  const { loadUserSubscription } = await import('../services/cloudStorage');
                  const refreshedSubscription = await loadUserSubscription(firebaseUser.uid);
                  if (refreshedSubscription) {
                    window.dispatchEvent(new CustomEvent('subscription:updated', { 
                      detail: { subscription: refreshedSubscription } 
                    }));
                  }
                } catch (err) {
                  console.error('⚠️ Failed to refresh subscription from cloud:', err);
                }
              }, 1000);
            } catch (e) {
              console.error('❌ Failed to save lifetime to localStorage:', e);
            }
          } catch (lifetimeError) {
            console.error('❌ Failed to grant lifetime access:', lifetimeError);
            // Fall back to trial if lifetime granting fails
            throw new Error('Failed to activate lifetime access. Please contact support.');
          }
        } else if (annualCode) {
          // Check if this is an annual code redemption
          try {
            // Import annual access function
            const { grantAnnualAccessFirestore } = await import('../services/firebase');
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../config/firebase');
            
            // Calculate expiration (1 year from now)
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            
            // Grant annual access
            await grantAnnualAccessFirestore(
              firebaseUser.uid, 
              firebaseUser.email, 
              'Annual Kit Redemption',
              'annual-kit'
            );
            
            // Mark the code as used
            try {
              const codeRef = doc(db, 'annualCodes', annualCode);
              await updateDoc(codeRef, {
                used: true,
                usedBy: firebaseUser.email,
                usedByUid: firebaseUser.uid,
                usedAt: new Date().toISOString()
              });
            } catch (codeError) {
              console.error('⚠️ Failed to mark annual code as used (but access was granted):', codeError);
            }
            
            // Create annual subscription in localStorage
            const annualSubscription = {
              id: `annual_kit_${Date.now()}`,
              plan: 'annual',
              interval: 'year',
              status: 'active',
              source: 'annual-kit',
              currentPeriodStart: now.toISOString(),
              currentPeriodEnd: expiresAt.toISOString(),
              redeemedAt: now.toISOString(),
            };
            try {
              localStorage.setItem('tpprover_subscription', JSON.stringify(annualSubscription));
              
              // CRITICAL: Trigger subscription refresh
              window.dispatchEvent(new CustomEvent('subscription:updated', { 
                detail: { subscription: annualSubscription } 
              }));
              
              // Refresh from cloud after a moment
              setTimeout(async () => {
                try {
                  const { loadUserSubscription } = await import('../services/cloudStorage');
                  const refreshedSubscription = await loadUserSubscription(firebaseUser.uid);
                  if (refreshedSubscription) {
                    window.dispatchEvent(new CustomEvent('subscription:updated', { 
                      detail: { subscription: refreshedSubscription } 
                    }));
                  }
                } catch (err) {
                  console.error('⚠️ Failed to refresh subscription from cloud:', err);
                }
              }, 1000);
            } catch (e) {
              console.error('❌ Failed to save annual to localStorage:', e);
            }
          } catch (annualError) {
            console.error('❌ Failed to grant annual access:', annualError);
            throw new Error('Failed to activate annual access. Please contact support.');
          }
        } else {
          // Create 14-day research trial subscription and save to BOTH cloud AND localStorage
          try {
            const now = new Date();
            const end = new Date(now);
            end.setDate(end.getDate() + 14);
            const trial = {
              id: String(Date.now()),
              plan: '14-Day Research Trial',
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
            } catch (cloudError) {
              // Don't throw - localStorage has the fallback
            }
          } catch (error) {
            console.error('❌ Failed to create trial subscription:', error);
            // This is critical - we should still create a minimal trial
            const minimalTrial = {
              id: String(Date.now()),
              plan: '14-Day Research Trial',
              status: 'trialing',
              currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            };
            try {
              localStorage.setItem('tpprover_subscription', JSON.stringify(minimalTrial));
            } catch (e) {
              console.error('❌ CRITICAL: Cannot create trial subscription at all');
            }
          }
        }
        
        setUser(user);
        
        // Clear signup flag BEFORE navigating
        sessionStorage.removeItem('tpp_signup_in_progress');
        
        // Give a tiny delay to ensure flag is cleared
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // One-time Face ID / Fingerprint prompt after fresh signup
        const activatedQuery = lifetimeCode ? '?lifetime_activated=true' : (annualCode ? '?annual_activated=true' : '');
        const dest = postAuthRedirect || `/app/dashboard${activatedQuery}`;
        await offerPostAuthSecuritySetup({
          bioCreds: { uid: firebaseUser.uid, email, password },
          dest,
        });
        return true;
      } catch (error) {
        // Clear signup flag on error too
        sessionStorage.removeItem('tpp_signup_in_progress');
        console.error('Signup failed:', error);
        
        if (error.code === 'auth/email-already-in-use') {
          // Get detailed account status
          try {
            const accountStatus = await getAccountStatus(email);
            
            // If account doesn't exist in Auth but Firebase says email is in use,
            // it might be a recently deleted account, disabled account, or propagation delay
            if (!accountStatus.existsInAuth && !accountStatus.existsInFirestore) {
              setError('This email was recently used. Please wait a few minutes and try again, or click "Try Logging In" below if you already have an account.');
              setShowTryLoginButton(true); // Show button to try logging in
            } else if (accountStatus.existsInAuth && !accountStatus.existsInFirestore) {
              setError('Account found but incomplete setup. Switching to login...');
              setTimeout(() => {
                setIsReturningUser(true);
                setMode('login');
                if (accountStatus.hasPassword) {
                  setError('Please enter your password to log in. Use "Forgot password?" if needed.');
                } else {
                  setError('Account exists but password authentication is not set up. Please use "Forgot password?" to set one.');
                }
              }, 1500);
            } else if (accountStatus.existsInAuth) {
              setError('Account found! Switching to login form...');
              setTimeout(() => {
                setIsReturningUser(true);
                setMode('login');
                if (accountStatus.hasPassword) {
                  setError('Please enter your password to log in. Use "Forgot password?" if needed.');
                } else {
                  setError('Account exists but password authentication is not set up. Please use "Forgot password?" to set one.');
                }
              }, 1500);
            } else {
              // Account exists in Firestore but not Auth - orphaned account
              setError('We found your account but there\'s a setup issue. Please contact support for assistance.');
            }
          } catch (statusError) {
            // Fallback error handling
            console.error('Error checking account status:', statusError);
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
          setError('Registration failed. Please try again or contact support if this persists.');
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
            
            // First check if account exists
            let accountStatus = null;
            try {
                accountStatus = await getAccountStatus(email);
                } catch (statusError) {
                  // Silent fail for account status check
            }
            
            // Use our custom password reset function with SendGrid email templates
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const functions = getFunctions();
            const requestPasswordReset = httpsCallable(functions, 'requestPasswordReset');
            
            const result = await requestPasswordReset({ email });
            
            if (result.data.success) {
                setError('');
                setShowForgotPassword(false);
                setShowPasswordResetModal(true);
            } else {
                throw new Error(result.data.message || 'Failed to send password reset email');
            }
        } catch (error) {
            console.error('Password reset failed:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Handle Firebase Functions errors
            if (error.code === 'functions/invalid-argument') {
                setError('Please enter a valid email address.');
            } else if (error.code === 'functions/not-found' || error.message?.includes('user-not-found')) {
                // For security, don't reveal if user exists - show success message anyway
                setError('');
                setShowForgotPassword(false);
                setShowPasswordResetModal(true);
            } else if (error.code === 'functions/too-many-requests') {
                setError('Too many password reset requests. Please wait a few minutes before trying again.');
            } else if (error.code === 'functions/unavailable' || error.message?.includes('network')) {
                setError('Network error. Please check your internet connection and try again.');
            } else {
                // For security, show success even on errors (don't reveal if account exists)
                console.warn('Password reset error, but showing success for security:', error);
                setError('');
                setShowForgotPassword(false);
                setShowPasswordResetModal(true);
            }
        } finally {
            setLoading(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setShowTryLoginButton(false);

        if (mode === 'login') {
            setLoading(true);
            try {
                
                let recaptchaToken = null;
                if (!isNative()) {
                    try {
                        recaptchaToken = await executeRecaptcha('login');
                    } catch (recaptchaError) {
                        // Continue without token - server will handle gracefully
                    }
                }
                
                // Outer timeout guards the whole doLogin flow (2FA check, data load, etc.)
                // Inner Firebase sign-in already has its own 30s race inside loginUser.
                const loginPromise = doLogin(recaptchaToken);
                const loginOverallMs = isNative() ? 75000 : 35000;
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Login timeout - network may be slow or blocked')), loginOverallMs)
                );
                
                const success = await Promise.race([loginPromise, timeoutPromise]);
                
                // CRITICAL FIX: Always reset loading state
                // Navigation happens in startTransition, so we can safely reset here
                if (!success) {
                    setLoading(false);
                } else {
                    // Give navigation a moment to start, then reset loading
                    // This prevents the stuck loading state if navigation fails
                    setTimeout(() => setLoading(false), 100);
                }
            } catch (error) {
                console.error('❌ Login error:', {
                    code: error?.code,
                    message: error?.message,
                    name: error?.name
                });
                setLoading(false);
                if (error.message?.includes('timeout')) {
                    if (isNative()) {
                        setError('Login timed out. On a simulator, try: Device → Erase All Content and Settings, or test on a physical iPhone. On a real device, check Wi-Fi / VPN.');
                    } else {
                        setError('Login timed out. Please check your internet connection and try again.');
                    }
                } else {
                    setError('Login failed. Please try again.');
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
            let recaptchaToken = null;
            if (!isNative()) {
                try {
                    recaptchaToken = await executeRecaptcha('signup');
                } catch (recaptchaError) {
                    // Continue without token - server will handle gracefully
                }
            }

            const signupTimeoutMs = isNative() ? 45000 : 30000;
            const signupPromise = doSignup(recaptchaToken);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('signup-timeout')), signupTimeoutMs)
            );

            const success = await Promise.race([signupPromise, timeoutPromise]);
            if (!success) {
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            if (error.message?.includes('timeout') || error.message?.includes('auth/network-timeout')) {
                if (isNative()) {
                    setError('Sign up timed out. On a simulator, try Device → Erase All Content and Settings, or test on a physical iPhone. On a real device, check your Wi-Fi or VPN.');
                } else {
                    setError('Sign up timed out. Please check your internet connection and try again.');
                }
            } else if (error.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Try signing in instead.');
            } else {
                setError('Sign up failed. Please try again.');
            }
        }
    };



    // Show intro first if user hasn't seen it
    if (showIntro) {
        return (
            <SwipeableIntro
                open={true}
                onComplete={handleIntroComplete}
                theme={theme}
            />
        );
    }

    // Full-screen: hand off magic link from mobile browser → native app
    if (isMagicLinkUrl() && magicLinkOpenAppPrompt && !magicLinkLoading) {
        return (
            <div
                className="fixed inset-0 flex flex-col items-center justify-center gap-5 px-6"
                style={{ backgroundColor: theme.background }}
            >
                <img src={logo} alt="The Pep Planner" className="w-16 h-16 object-contain" />
                <div className="text-center max-w-sm">
                    <p className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
                        Open in The Pep Planner
                    </p>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                        Continue in the app to finish signing in. If nothing happens, tap the button below.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={tryOpenNativeAppFromMagicLink}
                    className="w-full max-w-sm py-3.5 rounded-xl font-semibold text-white"
                    style={{ backgroundColor: theme.primary }}
                >
                    Open the app
                </button>
                <button
                    type="button"
                    onClick={() => { void finishMagicLinkSignIn(); }}
                    className="text-sm font-medium underline-offset-2 hover:underline"
                    style={{ color: theme.textLight }}
                >
                    Continue in browser instead
                </button>
            </div>
        );
    }

    // Full-screen loading overlay while completing a magic link sign-in.
    // Prevents the login form from flashing before the redirect fires.
    if (isMagicLinkUrl() && magicLinkLoading) {
        return (
            <div
                className="fixed inset-0 flex flex-col items-center justify-center gap-4"
                style={{ backgroundColor: theme.background }}
            >
                <div
                    className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: theme.primary, borderTopColor: 'transparent' }}
                />
                <p className="text-sm font-medium" style={{ color: theme.textLight }}>
                    Signing you in…
                </p>
            </div>
        );
    }

    return (
        <>
            <style>{`
                /* Hide reCAPTCHA badge on login/signup page */
                .grecaptcha-badge {
                    visibility: hidden !important;
                    opacity: 0 !important;
                    display: none !important;
                    position: absolute !important;
                    left: -9999px !important;
                    width: 0 !important;
                    height: 0 !important;
                    overflow: hidden !important;
                }

                @keyframes tpp-login-header-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes tpp-login-card-in {
                    from { opacity: 0; transform: translateY(18px) scale(0.985); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes tpp-login-logo-in {
                    from { opacity: 0; transform: scale(0.92); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes tppAltOpen {
                    from { opacity: 0; transform: translateX(12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes tppPlaneFly {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    55% { opacity: 1; transform: translate(28px, -22px) rotate(18deg) scale(1.05); }
                    100% { opacity: 0; transform: translate(56px, -48px) rotate(32deg) scale(0.7); }
                }
                @keyframes tppSentPop {
                    0% { opacity: 0; transform: scale(0.7); }
                    60% { opacity: 1; transform: scale(1.08); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes tppSendIconIn {
                    from { opacity: 0; transform: scale(0.6); }
                    to { opacity: 1; transform: scale(1); }
                }
                .tpp-plane-fly {
                    animation: tppPlaneFly 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                }
                .tpp-sent-pop {
                    animation: tppSentPop 0.4s cubic-bezier(0.34, 1.3, 0.64, 1) both;
                }
                .tpp-send-icon-in {
                    animation: tppSendIconIn 0.22s ease-out both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .tpp-sbi-plane, .tpp-sbi-spin, .tpp-sbi-check {
                        transition: none !important;
                    }
                }
                .tpp-login-header-wrap {
                    animation: tpp-login-header-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .tpp-login-card-wrap {
                    animation: tpp-login-card-in 0.65s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
                }
                .tpp-login-logo {
                    animation: tpp-login-logo-in 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) both;
                }
                @media (prefers-reduced-motion: reduce) {
                    .tpp-login-header-wrap,
                    .tpp-login-card-wrap,
                    .tpp-login-logo,
                    .tpp-plane-fly,
                    .tpp-sent-pop,
                    .tpp-send-icon-in {
                        animation: none !important;
                        opacity: 1 !important;
                        transform: none !important;
                    }
                }

                .tpp-login-field {
                    width: 100%;
                    padding: 0.875rem 1rem;
                    border-radius: 0.75rem;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    color: var(--login-input-text);
                    background: var(--login-input-bg);
                    border: 1px solid var(--login-input-border);
                    transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
                }
                .tpp-login-field::placeholder {
                    color: var(--login-input-placeholder);
                    opacity: 0.72;
                }
                .tpp-login-field:hover:not(:focus):not(:disabled) {
                    border-color: var(--login-input-border-hover);
                }
                .tpp-login-field:focus {
                    outline: none;
                    border-color: var(--login-focus);
                    background: var(--login-input-bg-focus);
                    box-shadow: 0 0 0 3px var(--login-focus-ring);
                }
                .tpp-login-field.tpp-login-field--invalid:not(:focus) {
                    border-color: color-mix(in srgb, var(--login-error) 45%, var(--login-input-border));
                    box-shadow: 0 0 0 2px color-mix(in srgb, var(--login-error) 14%, transparent);
                }
                .tpp-login-field.tpp-login-field--invalid:focus {
                    border-color: var(--login-error);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--login-error) 22%, transparent);
                }
            `}</style>
            {/* Single fixed viewport: no document scroll on iOS (100dvh = dynamic viewport height) */}
            <div 
                className="fixed inset-0 flex flex-col items-center z-10 overflow-y-auto"
                style={{ 
                    backgroundColor: theme.background,
                    height: '100dvh',
                    minHeight: '-webkit-fill-available',
                    paddingTop: 'max(1.5rem, calc(1rem + var(--safe-area-top, env(safe-area-inset-top, 0px))))',
                    paddingBottom: 'max(1.5rem, calc(1rem + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))))',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                <div className="w-full max-w-md my-auto">
                    <div className="text-center mb-6 sm:mb-8 tpp-login-header-wrap">
                        <h1 className="sr-only">The Pep Planner</h1>
                        <div
                          className="mx-auto mb-4 h-[8rem] w-[8rem] sm:h-[9.5rem] sm:w-[9.5rem] cursor-pointer"
                          onClick={() => navigate('/')}
                          title="Back to home"
                        >
                          <img 
                            src={logo} 
                            alt="The Pep Planner — go to home" 
                            className="tpp-login-logo h-full w-full object-contain" 
                            style={{
                              imageRendering: 'auto',
                              filter: `drop-shadow(0 8px 24px ${theme.primary}40)`,
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden',
                              willChange: 'transform',
                              WebkitTransform: 'translateZ(0)',
                              msTransform: 'translateZ(0)'
                            }}
                          />
                        </div>
                    </div>

                    <div
                        className="tpp-login-card-wrap p-8 space-y-6 rounded-2xl border shadow-xl"
                        style={{
                            backgroundColor: theme.white,
                            borderColor: theme.border,
                            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.04)',
                            '--login-input-text': theme.text,
                            '--login-input-bg': theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(47, 59, 58, 0.045)',
                            '--login-input-bg-focus': theme.isDark ? 'rgba(255,255,255,0.1)' : '#fff',
                            '--login-input-border': theme.isDark ? 'rgba(255,255,255,0.11)' : theme.border,
                            '--login-input-border-hover': theme.isDark ? 'rgba(255,255,255,0.18)' : `color-mix(in srgb, ${theme.border} 78%, ${theme.primary})`,
                            '--login-input-placeholder': theme.textLight,
                            '--login-focus': theme.primary,
                            '--login-focus-ring': `${theme.primary}2b`,
                            '--login-error': theme.error,
                        }}
                    >
                        <div className="text-center">
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: theme.primaryDark }}>
                                {mode === 'login' && 'Welcome back'}
                                {mode === 'signup' && 'Create your account'}
                            </h2>
                        </div>

                        <form
                          className="space-y-4"
                          onSubmit={handleSubmit} onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}>
                            <div className="relative">
                                <input 
                                    type="email" 
                                    autoComplete="email"
                                    placeholder="Email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    required 
                                    className={`tpp-login-field pr-4 ${mode === 'signup' && email && !emailValidation.valid ? 'tpp-login-field--invalid' : ''}`} 
                                />
                            </div>
                            
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                    placeholder="Password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    required 
                                    className={`tpp-login-field pr-11 ${mode === 'signup' && password && !passwordValidation.valid ? 'tpp-login-field--invalid' : ''}`} 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center justify-center transition-opacity hover:opacity-80" style={{ color: theme.textLight }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? (
                                      <EyeClosed weight="duotone" size={20} color="currentColor" aria-hidden />
                                    ) : (
                                      <PhosphorEye weight="duotone" size={20} color="currentColor" aria-hidden />
                                    )}
                                </button>
                            </div>

                            {mode === 'signup' && (
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        autoComplete="new-password"
                                        placeholder="Confirm password" 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)} 
                                        required 
                                        className={`tpp-login-field ${password && confirmPassword && password !== confirmPassword ? 'tpp-login-field--invalid' : ''}`} 
                                    />
                                </div>
                            )}
                            

                            {/* Email validation errors */}
                            {mode === 'signup' && email && !emailValidation.valid && (
                                <div
                                  className="flex gap-3 rounded-xl p-4"
                                  style={{
                                    backgroundColor: `${theme.error}14`,
                                    border: `1px solid ${theme.error}36`,
                                  }}
                                  role="alert"
                                >
                                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: theme.error }} aria-hidden />
                                  <div className="min-w-0 text-left">
                                    <p className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>{emailValidation.error}</p>
                                    {emailValidation.tip && (
                                      <div className="mt-2 flex gap-2 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                                        <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" style={{ color: theme.primary }} aria-hidden />
                                        <span>{emailValidation.tip}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                            )}

                            {/* Password validation errors */}
                            {mode === 'signup' && password && !passwordValidation.valid && (
                                <div
                                  className="flex gap-3 rounded-xl p-4"
                                  style={{
                                    backgroundColor: `${theme.error}14`,
                                    border: `1px solid ${theme.error}36`,
                                  }}
                                  role="alert"
                                >
                                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: theme.error }} aria-hidden />
                                  <div className="min-w-0 flex-1 text-left">
                                    <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Password needs a quick tweak</p>
                                    <ul className="space-y-1.5 text-sm" style={{ color: theme.textLight }}>
                                        {passwordValidation.errors.map((err, index) => (
                                            <li key={index} className="flex items-start gap-2 leading-snug">
                                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: theme.error }} aria-hidden />
                                                <span>{err}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {passwordValidation.tips.length > 0 && (
                                        <div className="mt-3 pt-3 flex gap-2 border-t text-sm leading-relaxed" style={{ borderColor: `${theme.error}28`, color: theme.textLight }}>
                                            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: theme.primary }} aria-hidden />
                                            <ul className="space-y-1">
                                                {passwordValidation.tips.map((tip, index) => (
                                                    <li key={index}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                  </div>
                                </div>
                            )}

                            {/* Password match validation */}
                            {mode === 'signup' && password && confirmPassword && password !== confirmPassword && (
                                <div
                                  className="flex gap-3 rounded-xl p-4"
                                  style={{
                                    backgroundColor: `${theme.error}14`,
                                    border: `1px solid ${theme.error}36`,
                                  }}
                                  role="alert"
                                >
                                  <AlertCircle className="w-5 h-5 shrink-0" style={{ color: theme.error }} aria-hidden />
                                  <div className="text-left text-sm leading-relaxed">
                                    <p className="font-semibold" style={{ color: theme.text }}>Passwords don&apos;t match yet</p>
                                    <p className="mt-1" style={{ color: theme.textLight }}>Make sure both fields are exactly the same — copy-paste helps.</p>
                                  </div>
                                </div>
                            )}

                            {/* Pre-granted user message */}
                            {isPreGranted && emailFromUrl && mode === 'signup' && (
                                <div className="rounded-xl p-4" style={{ backgroundColor: theme.successBg, border: `1px solid color-mix(in srgb, ${theme.success} 45%, transparent)` }}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-lg shrink-0" aria-hidden>🎁</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold mb-1" style={{ color: theme.accentText }}>Lifetime access is ready for you</div>
                                            <div className="text-sm leading-relaxed" style={{ color: theme.text }}>
                                                Your account is pre-approved. Create your password below to activate it.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="space-y-3">
                                    <div
                                      className="flex gap-3 rounded-xl p-4"
                                      style={{
                                        backgroundColor: `${theme.error}14`,
                                        border: `1px solid ${theme.error}36`,
                                      }}
                                      role="alert"
                                    >
                                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: theme.error }} aria-hidden />
                                      <p className="text-sm text-left leading-relaxed whitespace-pre-line flex-1 min-w-0" style={{ color: theme.text }}>{error}</p>
                                    </div>
                                    {mode === 'login' && (error.includes('Network') || error.includes('timeout') || error.includes('timed out')) && (
                                        <button
                                            type="button"
                                            onClick={() => { setError(''); setLoading(false); }}
                                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all"
                                            style={{
                                                border: `1px solid ${theme.primary}55`,
                                                color: theme.primary,
                                                backgroundColor: `${theme.primary}12`,
                                            }}
                                        >
                                            <RefreshCw size={16} strokeWidth={2} aria-hidden />
                                            Try again
                                        </button>
                                    )}
                                    {showTryLoginButton && mode === 'signup' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMode('login');
                                                setShowTryLoginButton(false);
                                                setError('');
                                                setPassword('');
                                                setConfirmPassword('');
                                            }}
                                            className="mt-2 w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-all"
                                            style={{
                                                color: theme.primary,
                                                backgroundColor: theme.primary + '15'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.primary + '25';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.primary + '15';
                                            }}
                                        >
                                            Sign in to existing account
                                        </button>
                                    )}
                                </div>
                            )}

                            

                            <button type="submit" disabled={loading || !canSubmit} className="w-full px-4 py-3.5 font-semibold rounded-xl transition-all duration-200" style={{ backgroundColor: theme.primary, color: theme.white, opacity: (loading || !canSubmit) ? 0.6 : 1, boxShadow: (loading || !canSubmit) ? 'none' : '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)' }}>
                                {loading ? 'Researching...' : 
                                 (mode === 'login' ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>

                        {/* ── Social / Passwordless Login ─────────────────── */}
                        <div className="mt-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                            <span className="text-xs font-medium" style={{ color: theme.textLight }}>Other ways to sign in</span>
                            <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                          </div>

                          <div className="flex flex-col gap-2">
                            {(() => {
                              const showBioOption =
                                (passkeySupported && mode === 'login') ||
                                (biometricAvailable && biometricEnabled);
                              const usePasskey = passkeySupported && mode === 'login';
                              const focus = altSignInFocus;
                              const panelBg = theme.isDark ? 'rgba(255,255,255,0.05)' : '#fff';
                              const cellBase =
                                'min-h-[46px] h-full rounded-xl border overflow-hidden transition-all duration-300 ease-out flex flex-col';
                              const iconBtnClass =
                                'w-full flex-1 min-h-[46px] flex items-center justify-center transition-all duration-150 active:scale-[0.96] disabled:opacity-60';
                              const labelBtnClass =
                                'w-full flex-1 min-h-[46px] flex items-center justify-center gap-2 px-3 font-medium text-sm transition-all duration-150 hover:shadow-md active:scale-[0.96] active:shadow-none disabled:opacity-60 disabled:active:scale-100';

                              const resetAltMenu = () => {
                                setAltSignInFocus('none');
                                setShowMagicLinkInput(false);
                                setMagicLinkSent(false);
                                setSendPhase('idle');
                                setMagicLinkError('');
                              };

                              const openPasswordless = () => {
                                setAltSignInFocus('passwordless');
                                setShowMagicLinkInput(true);
                                setMagicLinkSent(false);
                                setSendPhase('idle');
                                setMagicLinkEmail(email);
                                setMagicLinkError('');
                              };

                              const startBiometric = () => {
                                setAltSignInFocus('biometric');
                                setShowMagicLinkInput(false);
                                setMagicLinkSent(false);
                                setSendPhase('idle');
                                setMagicLinkError('');
                                if (usePasskey) void handlePasskeyLogin();
                                else void handleBiometricLogin();
                              };

                              const gridCols = !showBioOption
                                ? '1fr'
                                : focus === 'passwordless'
                                  ? '3rem 1fr'
                                  : focus === 'biometric'
                                    ? '1fr 3rem'
                                    : '1fr 1fr';

                              return (
                                <div
                                  className="grid gap-2 items-stretch"
                                  style={{
                                    gridTemplateColumns: gridCols,
                                    transition: 'grid-template-columns 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                                  }}
                                >
                                  {/* Biometric cell */}
                                  {showBioOption && (
                                    <div
                                      className={cellBase}
                                      style={{
                                        borderColor: theme.border,
                                        backgroundColor: panelBg,
                                        color: theme.text,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (focus === 'passwordless') {
                                            resetAltMenu();
                                            return;
                                          }
                                          startBiometric();
                                        }}
                                        disabled={passkeyLoading || biometricLoading || loading || googleLoading}
                                        className={focus === 'passwordless' ? iconBtnClass : labelBtnClass}
                                        aria-label={
                                          focus === 'passwordless'
                                            ? 'Back — use Biometric Login'
                                            : 'Biometric Login'
                                        }
                                        title={focus === 'passwordless' ? 'Back to biometric' : undefined}
                                      >
                                        {(passkeyLoading || biometricLoading) ? (
                                          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <FingerprintSimple weight="duotone" size={20} color={theme.primary} />
                                        )}
                                        <span
                                          className={`whitespace-nowrap transition-all duration-300 ${
                                            focus === 'passwordless'
                                              ? 'max-w-0 opacity-0 overflow-hidden'
                                              : 'max-w-[10rem] opacity-100'
                                          }`}
                                        >
                                          Biometric Login
                                        </span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Passwordless cell */}
                                  <div
                                    className={cellBase}
                                    style={{
                                      borderColor: theme.border,
                                      backgroundColor: panelBg,
                                      color: theme.text,
                                    }}
                                  >
                                    {focus === 'passwordless' || showMagicLinkInput || magicLinkSent || sendPhase !== 'idle' ? (
                                      <div className="px-2.5 py-2 animate-[tppAltOpen_320ms_ease-out]">
                                        <form
                                          className="space-y-1.5"
                                          onSubmit={(e) => {
                                            e.preventDefault();
                                            if (sendPhase === 'loading' || sendPhase === 'exiting') return;
                                            if (sendPhase === 'sent') {
                                              setMagicLinkSent(false);
                                              setSendPhase('idle');
                                            }
                                            void handleSendMagicLink();
                                          }}
                                        >
                                          <div className="relative flex items-center">
                                            <input
                                              type="email"
                                              placeholder="Account Email"
                                              value={magicLinkEmail}
                                              onChange={(e) => {
                                                setMagicLinkEmail(e.target.value);
                                                setMagicLinkError('');
                                                if (sendPhase === 'sent') { setMagicLinkSent(false); setSendPhase('idle'); }
                                              }}
                                              className={`tpp-login-field !py-2.5 !pr-11 ${magicLinkError ? 'tpp-login-field--invalid' : ''}`}
                                              autoFocus
                                              autoComplete="email"
                                              aria-label="Account Email"
                                              readOnly={magicLinkLoading}
                                            />
                                            {/* "Sent" label slides in from right next to the button */}
                                            <span
                                              aria-hidden
                                              style={{
                                                position: 'absolute',
                                                right: '2.6rem',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                letterSpacing: '0.01em',
                                                color: theme.primary,
                                                opacity: sendPhase === 'sent' ? 1 : 0,
                                                transform: sendPhase === 'sent' ? 'translateX(0)' : 'translateX(10px)',
                                                transition: 'opacity 280ms ease 60ms, transform 320ms cubic-bezier(0.22,1,0.36,1) 60ms',
                                                pointerEvents: 'none',
                                                whiteSpace: 'nowrap',
                                              }}
                                            >
                                              Sent
                                            </span>
                                            <button
                                              type="submit"
                                              disabled={sendPhase === 'loading' || sendPhase === 'exiting'}
                                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-70"
                                              style={{ color: theme.primary, backgroundColor: `${theme.primary}14` }}
                                              aria-label={
                                                sendPhase === 'sent'
                                                  ? 'Link sent — click to resend'
                                                  : sendPhase === 'loading'
                                                    ? 'Sending sign-in link'
                                                    : 'Send sign-in link'
                                              }
                                              title={sendPhase === 'sent' ? 'Resend' : 'Send link'}
                                            >
                                              <span className="relative w-[18px] h-[18px] flex items-center justify-center" aria-hidden>
                                                {/* Paper plane — only visible when idle */}
                                                <PaperPlaneTilt
                                                  weight="duotone"
                                                  size={18}
                                                  style={{
                                                    position: 'absolute',
                                                    opacity: sendPhase === 'idle' ? 1 : 0,
                                                    transform: sendPhase === 'idle' ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-30deg)',
                                                    transition: 'opacity 200ms ease, transform 200ms ease',
                                                  }}
                                                />
                                                {/* Spinner wrapper handles scale/opacity; inner span handles rotation */}
                                                <span
                                                  style={{
                                                    position: 'absolute',
                                                    opacity: sendPhase === 'loading' ? 1 : 0,
                                                    transform: sendPhase === 'loading' ? 'scale(1)' : 'scale(0.3)',
                                                    transition: 'opacity 220ms ease, transform 220ms ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                  }}
                                                >
                                                  <span className="w-[14px] h-[14px] border-2 border-current border-t-transparent rounded-full animate-spin block" />
                                                </span>
                                                {/* Checkmark — visible when sent */}
                                                <CheckCircle
                                                  className="w-[18px] h-[18px]"
                                                  style={{
                                                    position: 'absolute',
                                                    opacity: sendPhase === 'sent' ? 1 : 0,
                                                    transform: sendPhase === 'sent' ? 'scale(1)' : 'scale(0.3)',
                                                    transition: 'opacity 260ms ease, transform 260ms cubic-bezier(0.34,1.3,0.64,1)',
                                                  }}
                                                  aria-hidden
                                                />
                                              </span>
                                            </button>
                                          </div>
                                          {magicLinkError && (
                                            <div
                                              className="flex gap-1.5 rounded-lg px-2 py-1.5 text-[11px] leading-snug text-left"
                                              style={{ backgroundColor: `${theme.error}12`, color: theme.text }}
                                              role="alert"
                                            >
                                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: theme.error }} aria-hidden />
                                              <span>{magicLinkError}</span>
                                            </div>
                                          )}
                                        </form>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (focus === 'biometric') {
                                            resetAltMenu();
                                            return;
                                          }
                                          openPasswordless();
                                        }}
                                        disabled={loading || googleLoading || passkeyLoading || biometricLoading}
                                        className={focus === 'biometric' ? iconBtnClass : labelBtnClass}
                                        aria-label={
                                          focus === 'biometric'
                                            ? 'Back — use Passwordless Link'
                                            : "Passwordless Link — we'll email you a secure one-time link."
                                        }
                                        title={focus === 'biometric' ? 'Back to passwordless' : undefined}
                                      >
                                        <Mailbox weight="duotone" size={20} color={theme.primary} aria-hidden />
                                        <span
                                          className={`whitespace-nowrap transition-all duration-300 ${
                                            focus === 'biometric'
                                              ? 'max-w-0 opacity-0 overflow-hidden'
                                              : 'max-w-[12rem] opacity-100'
                                          }`}
                                        >
                                          Passwordless Link
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* ── One-time Face ID / Fingerprint (passkey) enroll prompt ─ */}
                        {showPasskeySetup && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                            <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4" style={{ backgroundColor: theme.cardBackground }}>
                              <div className="text-center">
                                <div className="flex justify-center mb-2">
                                  <FingerprintSimple weight="duotone" size={48} style={{ color: theme.primary }} />
                                </div>
                                <h3 className="font-bold text-base" style={{ color: theme.text }}>
                                  Enable {passkeyLabel}?
                                </h3>
                                <p className="text-sm mt-2" style={{ color: theme.textLight }}>
                                  Next time, sign in with {passkeyLabel.toLowerCase()} — no password to type.
                                  You can turn this off anytime in Account settings.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handlePasskeySetupEnable}
                                  disabled={passkeyEnrolling}
                                  className="flex-1 py-3 text-sm font-semibold rounded-lg text-white disabled:opacity-60"
                                  style={{ backgroundColor: theme.primary }}
                                >
                                  {passkeyEnrolling ? 'Waiting for device…' : `Enable ${passkeyLabel}`}
                                </button>
                                <button
                                  type="button"
                                  onClick={handlePasskeySetupSkip}
                                  disabled={passkeyEnrolling}
                                  className="px-4 py-3 text-sm rounded-lg border disabled:opacity-60"
                                  style={{ borderColor: theme.border, color: theme.textLight }}
                                >
                                  Not now
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Biometric Setup Prompt (local quick unlock, after passkey skip) ─ */}
                        {showBiometricSetup && pendingBiometricCreds && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                            <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4" style={{ backgroundColor: theme.cardBackground }}>
                              <div className="text-center">
                                <div className="flex justify-center mb-2">
                                  <FingerprintSimple weight="duotone" size={48} style={{ color: theme.primary }} />
                                </div>
                                <h3 className="font-bold text-base" style={{ color: theme.text }}>
                                  {biometricType === 'faceId' ? 'Also enable quick unlock?' :
                                   biometricType === 'touchId' ? 'Also enable quick unlock?' :
                                   biometricType === 'web' ? 'Save credentials for quick sign-in?' :
                                   'Also enable quick unlock?'}
                                </h3>
                                <p className="text-sm mt-2" style={{ color: theme.textLight }}>
                                  Unlock this device with your{' '}
                                  {biometricType === 'faceId' ? 'face' :
                                   biometricType === 'touchId' ? 'fingerprint' :
                                   biometricType === 'web' ? 'saved credentials (secured by your device)' :
                                   'fingerprint'}{' '}
                                  for faster access.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    saveBiometricCredentials(pendingBiometricCreds);
                                    setBiometricEnabled(true);
                                    setShowBiometricSetup(false);
                                    setPendingBiometricCreds(null);
                                    goPostAuth(pendingPostAuthDest);
                                  }}
                                  className="flex-1 py-3 text-sm font-semibold rounded-lg text-white"
                                  style={{ backgroundColor: theme.primary }}
                                >
                                  Enable
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBiometricSetup(false);
                                    setPendingBiometricCreds(null);
                                    goPostAuth(pendingPostAuthDest);
                                  }}
                                  className="px-4 py-3 text-sm rounded-lg border"
                                  style={{ borderColor: theme.border, color: theme.textLight }}
                                >
                                  Not now
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Google Account-Link Modal ──────────────────── */}
                        {linkAccountData && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                            <div
                              className="w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4"
                              style={{
                                backgroundColor: theme.cardBackground,
                                '--login-input-text': theme.text,
                                '--login-input-bg': theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(47, 59, 58, 0.045)',
                                '--login-input-bg-focus': theme.isDark ? 'rgba(255,255,255,0.1)' : '#fff',
                                '--login-input-border': theme.isDark ? 'rgba(255,255,255,0.11)' : theme.border,
                                '--login-input-border-hover': theme.isDark ? 'rgba(255,255,255,0.18)' : `color-mix(in srgb, ${theme.border} 78%, ${theme.primary})`,
                                '--login-input-placeholder': theme.textLight,
                                '--login-focus': theme.primary,
                                '--login-focus-ring': `${theme.primary}2b`,
                                '--login-error': theme.error,
                              }}
                            >
                              <div className="text-center">
                                <div className="text-3xl mb-2">🔗</div>
                                <h3 className="font-bold text-base" style={{ color: theme.text }}>Link Google to your account</h3>
                                <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                                  <strong>{linkAccountData.email}</strong> already has an email/password account. Enter your existing password to link Google sign-in to it.
                                </p>
                              </div>
                              <div className="relative">
                                <input
                                  type="password"
                                  placeholder="Your existing password"
                                  value={linkAccountPassword}
                                  onChange={e => { setLinkAccountPassword(e.target.value); setLinkAccountError(''); }}
                                  className={`tpp-login-field ${linkAccountError ? 'tpp-login-field--invalid' : ''}`}
                                  autoFocus
                                />
                              </div>
                              {linkAccountError && (
                                <div className="flex gap-2 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: `${theme.error}12` }} role="alert">
                                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: theme.error }} aria-hidden />
                                  <span style={{ color: theme.text }}>{linkAccountError}</span>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleLinkAccounts}
                                  disabled={linkAccountLoading || !linkAccountPassword}
                                  className="flex-1 py-3 text-sm font-semibold rounded-lg text-white disabled:opacity-60 transition-opacity"
                                  style={{ backgroundColor: theme.primary }}
                                >
                                  {linkAccountLoading ? 'Linking...' : 'Link & Sign In'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setLinkAccountData(null); setLinkAccountPassword(''); setLinkAccountError(''); setGoogleLoading(false); }}
                                  className="px-4 py-3 text-sm rounded-lg border"
                                  style={{ borderColor: theme.border, color: theme.textLight }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Additional Options */}
                        <div className="mt-4 text-center">
                            {mode === 'signup' && (
                                <div className="flex justify-center mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                                    <button 
                                        onClick={() => { 
                                            setMode('login'); 
                                            setPassword(''); 
                                            setConfirmPassword(''); 
                                            setError(''); 
                                            setShowTryLoginButton(false);
                                        }}
                                        className="text-sm font-semibold transition-colors hover:opacity-80"
                                        style={{ color: theme.primary }}
                                    >
                                        Already have an account? Sign in
                                    </button>
                                </div>
                            )}
                            {mode === 'login' && (
                                <div className="flex flex-row flex-nowrap items-center justify-center gap-x-2 sm:gap-3 mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                                    <button 
                                        onClick={handleForgotPassword}
                                        disabled={loading}
                                        className="shrink-0 text-sm font-medium transition-colors hover:opacity-70 disabled:opacity-50"
                                        style={{ color: theme.textLight }}
                                    >
                                        Forgot password?
                                    </button>
                                    <span className="shrink-0 text-gray-300 select-none" aria-hidden="true">·</span>
                                    <button 
                                        onClick={() => { setMode('signup'); setPassword(''); setConfirmPassword(''); setError(''); }}
                                        className="shrink-0 text-sm font-semibold transition-colors hover:opacity-80"
                                        style={{ color: theme.primary }}
                                    >
                                        New here? Sign up
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 mb-2 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setShowContact(true)}
                            className="text-sm font-medium transition-colors hover:opacity-70"
                            style={{ color: theme.textLight }}
                        >
                            Need help? Contact Support
                        </button>
                    </div>
                    <p
                      className="mb-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.26em] text-center px-2"
                      style={{ color: theme.primaryDark }}
                      aria-hidden="true"
                    >
                      The Pep Planner
                    </p>

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
                    theme={theme}
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
                source="login" // Track that this came from login page
            />

            {/* Two-Factor Authentication Modal */}
            {showTwoFactorModal && (
                <TwoFactorModal
                    open={showTwoFactorModal}
                    onClose={handleTwoFactorCancel}
                    onVerify={handleTwoFactorVerify}
                    theme={theme}
                    method={twoFactorMethod}
                />
            )}

            {/* Password Reset Confirmation Modal */}
            <Modal
                open={showPasswordResetModal}
                onClose={() => setShowPasswordResetModal(false)}
                title=""
                theme={theme}
                variant="modern"
                maxWidth="max-w-md"
            >
                <div className="text-center py-6 px-4">
                    {/* Success Icon */}
                    <div className="mx-auto mb-4">
                        <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
                            style={{ 
                                backgroundColor: theme?.success ? `${theme.success}20` : '#10b98120'
                            }}
                        >
                            <CheckCircle 
                                size={32} 
                                style={{ 
                                    color: theme?.success || '#10b981' 
                                }} 
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 
                        className="text-xl font-bold mb-3"
                        style={{ color: theme?.text || '#2F3B3A' }}
                    >
                        Password Reset Email Sent
                    </h3>

                    {/* Message */}
                    <div className="mb-6">
                        <p 
                            className="text-base leading-relaxed mb-2"
                            style={{ color: theme?.text || '#374151' }}
                        >
                            We've sent a password reset link to:
                        </p>
                        <p 
                            className="text-base font-medium"
                            style={{ color: theme?.primary || '#7F9E95' }}
                        >
                            {email}
                        </p>
                        <p 
                            className="text-sm mt-3"
                            style={{ color: theme?.textLight || '#6B7280' }}
                        >
                            Please check your inbox and spam folder for the reset link.
                        </p>
                    </div>

                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={() => setShowPasswordResetModal(false)}
                        className="w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 touch-manipulation"
                        style={{
                            backgroundColor: theme?.primary || '#7F9E95',
                            color: theme?.textOnPrimary || '#FFFFFF',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        Got it
                    </button>
                </div>
            </Modal>

            {/* iOS App Available Popup */}
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
                                Now Available on iOS!
                            </h3>
                            <p className="text-base mb-6" style={{ color: '#6B7D7A' }}>
                                <strong>The Pep Planner</strong> is available on the App Store.
                                Download now and start organizing your peptide research!
                            </p>
                            <a
                                href={APP_STORE_IOS_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full mb-3 px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg text-center"
                                style={{ backgroundColor: '#4c6b52', color: '#FFFFFF' }}
                            >
                                View on App Store
                            </a>
                            <button
                                onClick={() => setShowIOSPopup(false)}
                                className="w-full px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                                style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}



