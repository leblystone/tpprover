import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { X, Plus, Mail, RefreshCw, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/tpp-logo.png';
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal';
import { useAppContext } from '../context/AppContext';
import { useFirebase } from '../context/FirebaseContext';
import { 
  registerUser, 
  loginUser, 
  getEmailWhitelist,
  checkAndAssignFounderStatus,
  getUserFounderStatus,
  checkUserExists
} from '../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

// Lightweight local auth to mirror old app behavior for local testing
function getAuthDb() { try { return JSON.parse(localStorage.getItem('tpprover_auth_users') || '{}') } catch { return {} } }
function setAuthDb(db) { try { localStorage.setItem('tpprover_auth_users', JSON.stringify(db || {})) } catch {} }
const enc = (s) => { try { return btoa(unescape(encodeURIComponent(String(s)))) } catch { return String(s) } }

// Legacy localStorage functions removed - now using Firebase

async function validateEmail(email) {
  try {
    const whitelist = await getEmailWhitelist();
    
    // Check if email is whitelisted
    if (!whitelist.includes(email.toLowerCase())) {
      return { valid: false, error: 'This email is not authorized for beta access. Please contact support if you believe this is an error.' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Email validation failed:', error);
    return { valid: false, error: 'Unable to validate email access. Please try again.' };
  }
}

// markInviteUsed now handled by Firebase service

export default function Login() {
    const navigate = useNavigate();
    const { setUser } = useAppContext();
    const { firebaseUser, isFirebaseLoading, setPassword: setFirebasePassword } = useFirebase();
    const [themeName] = useState(defaultThemeName);
    const theme = themes[themeName];
    const [mode, setMode] = useState('promptEmail'); // 'promptEmail' | 'login' | 'signup'
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isReturningUser, setIsReturningUser] = useState(false);
    
    // Check if user is already authenticated
    useEffect(() => {
        if (!isFirebaseLoading && firebaseUser) {
            // User is already logged in, redirect to dashboard
            setUser({ email: firebaseUser.email, uid: firebaseUser.uid });
            navigate('/dashboard');
        }
    }, [firebaseUser, isFirebaseLoading, setUser, navigate]);

    const pwErrors = useMemo(() => {
      if (mode !== 'signup') return []
      const errs = []
      if (password.length < 8) errs.push('At least 8 characters')
      if (!/[A-Z]/.test(password)) errs.push('One uppercase letter')
      if (!/[a-z]/.test(password)) errs.push('One lowercase letter')
      if (!/\d/.test(password)) errs.push('One number')
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errs.push('One special character')
      if (confirmPassword && password !== confirmPassword) errs.push('Passwords must match')
      return errs
    }, [mode, password, confirmPassword]);

    const doLogin = async () => {
      try {
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
        try { localStorage.setItem('tpprover_auth_token', 'firebase_token') } catch {}
        try { localStorage.setItem('tpprover_has_onboarded', 'true') } catch {}
        
        setUser(user);
        navigate('/dashboard');
        return true;
      } catch (error) {
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
      if (pwErrors.length > 0) { setError('Please fix the password requirements.'); return false; }
      
      try {
        // Validate email whitelist for new users
        if (!isReturningUser) {
          const emailValidation = await validateEmail(email);
          if (!emailValidation.valid) {
            setError(emailValidation.error);
            return false;
          }
        }
        
        return true; // All validations passed
      } catch (error) {
        console.error('Validation failed:', error);
        setError('Validation failed. Please try again.');
        return false;
      }
    };

    const doSignup = async () => {
      try {
        // Create Firebase user
        const { user: firebaseUser } = await registerUser(email, password, null);
        
        // Store password for encryption
        setFirebasePassword(password);
        
        // Set beta tester flag for all users during beta period
        localStorage.setItem('tpprover_is_tester', 'true');
        
        // Check and assign founder status (first 100 users)
        try {
          const isFounder = await checkAndAssignFounderStatus(firebaseUser.uid);
          if (isFounder) {
            localStorage.setItem('tpprover_is_founder', 'true');
          }
        } catch (error) {
          console.error('Error checking founder status:', error);
        }
        
        // Set user in app context
        const user = { 
          email: firebaseUser.email, 
          name: firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid,
          createdAt: new Date().toISOString(),
          termsAgreed: { date: new Date().toISOString() }
        };
        
        try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
        try {
          const now = new Date()
          const end = new Date(now)
          end.setDate(end.getDate() + 7)
          const trial = {
            id: String(Date.now()),
            plan: 'Pro Monthly',
            price: 9.99,
            interval: 'month',
            currency: 'USD',
            status: 'trialing',
            startedAt: now.toISOString(),
            currentPeriodEnd: end.toISOString(),
            paymentMethod: null,
          }
          localStorage.setItem('tpprover_subscription', JSON.stringify(trial))
        } catch {}
        try { localStorage.setItem('tpprover_auth_token', 'firebase_token') } catch {}
        
        setUser(user);
        navigate('/dashboard');
        return true;
      } catch (error) {
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

    const handleEmailSubmit = async () => {
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        
        try {
            console.log('🔍 STEP 1: Checking if user exists for email:', email);
            
            // Check if user exists using proper Firebase method
            const userExists = await checkUserExists(email);
            console.log('🔍 STEP 2: checkUserExists result:', userExists);
            
            if (userExists) {
                // User exists! Show login form - skip all invite/whitelist validation
                console.log('✅ STEP 3: Existing user detected - showing login form');
                console.log('🔄 STEP 4: Setting isReturningUser to true and mode to login');
                setIsReturningUser(true);
                setMode('login');
                setError('');
                console.log('✅ STEP 5: Returning early - should NOT show invite code field');
                setLoading(false);
                return;
            } else {
                // New user - continue with signup flow
                console.log('🆕 STEP 3: New user detected - checking whitelist');
                console.log('❗ If you are an existing user but seeing this, use "Already have an account?" button below');
                setIsReturningUser(false);
            }
            
            // For new users, check if email is whitelisted for beta
            const whitelist = await getEmailWhitelist();
            console.log('📋 Email whitelist:', whitelist);
            console.log('🔍 Checking if', email.toLowerCase(), 'is in whitelist');
            
            if (!whitelist.includes(email.toLowerCase())) {
                setError('This email is not authorized for beta access. Please check your invitation email or contact support with your email address for assistance.');
                return;
            }
            
            // New user - show signup form
            console.log('✅ Email is whitelisted - showing signup form');
            setMode('signup');
            setError('');
        } catch (error) {
            console.error('❌ Email validation failed:', error);
            setError('Unable to validate email. Please try again.');
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Please enter your email address first.');
            return;
        }

        try {
            setLoading(true);
            await sendPasswordResetEmail(auth, email);
            setError('');
            alert(`Password reset email sent to ${email}. Check your inbox and spam folder.`);
            setShowForgotPassword(false);
        } catch (error) {
            console.error('Password reset failed:', error);
            if (error.code === 'auth/user-not-found') {
                setError('No account found with this email address.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else {
                setError('Failed to send password reset email. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const forceLoginMode = () => {
        setIsReturningUser(true);
        setMode('login');
        setError('Please enter your password to log in.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (mode === 'promptEmail') {
            await handleEmailSubmit();
            setLoading(false);
            return;
        }

        try {
            if (mode === 'login') {
                await doLogin();
            } else { // signup
                // Validate credentials first, then show terms
                const validationSuccess = await validateSignupCredentials();
                if (validationSuccess) {
                    setShowTerms(true);
                }
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
        }
    };

  const acceptTerms = async () => {
      setShowTerms(false);
      setLoading(true);
      try {
          await doSignup();
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
                                {mode === 'promptEmail' && 'Sign in or create an account'}
                                {mode === 'login' && 'Welcome Back'}
                                {mode === 'signup' && (isReturningUser ? 'Complete Your Account Setup' : 'Join the Beta')}
                            </h2>
                            {mode !== 'promptEmail' && (
                                <p className="text-sm text-gray-500 mt-1">
                                    <button onClick={() => { setMode('promptEmail'); setPassword(''); setConfirmPassword(''); setError(''); }} className="font-semibold hover:underline" style={{ color: theme.primary }}>
                                        Use a different email
                                    </button>
                                </p>
                            )}
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
                                    className="w-full px-4 py-3 border rounded-lg bg-gray-50" 
                                    style={{ borderColor: theme.border }} 
                                    disabled={mode !== 'promptEmail'}
                                />
                            </div>
                            
                            {mode === 'login' && (
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-50" style={{ borderColor: theme.border }} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            )}

                            {mode === 'signup' && !isReturningUser && (
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <div className="text-sm text-blue-800">
                                        <strong>Beta Access:</strong> Only whitelisted email addresses can create accounts during the beta period.
                                    </div>
                                </div>
                            )}
                            
                            {mode === 'signup' && (
                                <>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-50" style={{ borderColor: theme.border }} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-50" style={{ borderColor: theme.border }} />
                                    </div>
                                </>
                            )}

                            {error && (
                                <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded-md">{error}</p>
                            )}

                            {mode === 'signup' && password && (
                                <div className="text-xs rounded border p-3" style={{ borderColor: theme.border, color: theme.textLight }}>
                                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                        {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character', 'Passwords must match'].map(rule => (
                                            <li key={rule} className="flex items-center gap-1.5" style={{ color: pwErrors.includes(rule) ? '#991B1B' : '#16A34A' }}>
                                                <span className="font-mono text-base">{pwErrors.includes(rule) ? '×' : '✓'}</span>
                                                {rule}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {mode === 'login' && (
                                <div className="text-right">
                                    <button type="button" className="text-sm text-gray-500 hover:underline">Forgot password?</button>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="w-full px-4 py-3 font-semibold rounded-lg transition-opacity duration-200" style={{ backgroundColor: theme.primary, color: theme.white, opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Processing...' : 
                                 (mode === 'promptEmail' ? 'Continue' : 
                                 (mode === 'login' ? 'Login' : 
                                 (isReturningUser ? 'Create Account' : 'Join Beta')))}
                            </button>
                        </form>

                        {/* Additional Options */}
                        <div className="mt-4 text-center space-y-2">
                            {(mode === 'signup' && !isReturningUser) && (
                                <div className="space-y-2">
                                    <button 
                                        onClick={forceLoginMode}
                                        className="text-sm underline hover:no-underline font-medium"
                                        style={{ color: theme.primary }}
                                    >
                                        Already have an account? Log in instead
                                    </button>
                                    <div className="text-xs" style={{ color: theme.textLight }}>
                                        Use this if you're an existing user but weren't automatically detected
                                    </div>
                                </div>
                            )}
                            
                            {mode === 'login' && (
                                <button 
                                    onClick={handleForgotPassword}
                                    disabled={loading}
                                    className="text-sm underline hover:no-underline disabled:opacity-50"
                                    style={{ color: theme.primary }}
                                >
                                    Forgot your password?
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showTerms && (
                <TermsOfServiceModal
                    open={showTerms}
                    onClose={() => setShowTerms(false)}
                    onAgree={acceptTerms}
                    theme={theme}
                />
            )}
        </>
    );
}



