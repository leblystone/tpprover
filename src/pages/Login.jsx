import React, { useMemo, useState } from 'react';
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
  getInviteCodes, 
  getEmailWhitelist,
  markInviteCodeUsed 
} from '../services/firebase';
import { initializeFirebaseData, addEmailToWhitelist } from '../utils/firebaseInit';

// Lightweight local auth to mirror old app behavior for local testing
function getAuthDb() { try { return JSON.parse(localStorage.getItem('tpprover_auth_users') || '{}') } catch { return {} } }
function setAuthDb(db) { try { localStorage.setItem('tpprover_auth_users', JSON.stringify(db || {})) } catch {} }
const enc = (s) => { try { return btoa(unescape(encodeURIComponent(String(s)))) } catch { return String(s) } }

// Legacy localStorage functions removed - now using Firebase

async function validateInvite(email, code) {
  try {
    const whitelist = await getEmailWhitelist();
    const codes = await getInviteCodes();
    
    // Check if email is whitelisted
    if (!whitelist.includes(email.toLowerCase())) {
      return { valid: false, error: 'This email is not authorized for beta access. Please contact support if you believe this is an error.' };
    }
    
    // Check if invite code exists and is valid
    if (!codes[code]) {
      return { valid: false, error: 'Invalid invite code. Please check your invitation email for the correct code.' };
    }
    
    // Check if code is already used
    if (codes[code].used) {
      return { valid: false, error: 'This invite code has already been used.' };
    }
    
    // Check if code is for this email (if email is specified)
    if (codes[code].email && codes[code].email.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, error: 'This invite code is not valid for your email address.' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Invite validation failed:', error);
    return { valid: false, error: 'Unable to validate invite code. Please try again.' };
  }
}

// markInviteUsed now handled by Firebase service

export default function Login() {
    const navigate = useNavigate();
    const { setUser } = useAppContext();
    const { setPassword: setFirebasePassword } = useFirebase();
    const [themeName] = useState(defaultThemeName);
    const theme = themes[themeName];
    const [mode, setMode] = useState('promptEmail'); // 'promptEmail' | 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);

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
        
        // Set user in app context
        const user = { 
          email: firebaseUser.email, 
          name: firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid
        };
        
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

    const doSignup = async () => {
      if (pwErrors.length > 0) { setError('Please fix the password requirements.'); return false; }
      
      // Validate invite code and email
      if (!inviteCode.trim()) {
        setError('Invite code is required for beta access.');
        return false;
      }
      
      try {
        const inviteValidation = await validateInvite(email, inviteCode.trim());
        if (!inviteValidation.valid) {
          setError(inviteValidation.error);
          return false;
        }
        
        // Create Firebase user
        const { user: firebaseUser } = await registerUser(email, password, inviteCode.trim());
        
        // Store password for encryption
        setFirebasePassword(password);
        
        // Set user in app context
        const user = { 
          email: firebaseUser.email, 
          name: firebaseUser.email.split('@')[0],
          uid: firebaseUser.uid,
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
          setError('An account already exists with this email. Please login.');
        } else if (error.code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else if (error.code === 'auth/weak-password') {
          setError('Password is too weak. Please choose a stronger password.');
        } else {
          setError('Registration failed. Please try again.');
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
            // Check if email is whitelisted for beta
            const whitelist = await getEmailWhitelist();
            if (!whitelist.includes(email.toLowerCase())) {
                setError('This email is not authorized for beta access. Please contact support if you believe this is an error.');
                return;
            }
            
            // For now, always go to signup for new Firebase users
            // Firebase will handle if user already exists
            setMode('signup');
            setError('');
        } catch (error) {
            console.error('Email validation failed:', error);
            setError('Unable to validate email. Please try again.');
        }
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
                setShowTerms(true);
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

  // Initialize Firebase with test data
  const handleInitializeFirebase = async () => {
    setIsInitializing(true);
    try {
      await initializeFirebaseData();
      if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        await addEmailToWhitelist(email);
      }
      alert('Firebase initialized! You can now test with:\nEmail: ' + (email || 'test@example.com') + '\nInvite Code: BETA-TEST123');
    } catch (error) {
      alert('Failed to initialize Firebase: ' + error.message);
    }
    setIsInitializing(false);
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
                                {mode === 'signup' && 'Create an Account'}
                            </h2>
                            {mode !== 'promptEmail' && (
                                <p className="text-sm text-gray-500 mt-1">
                                    <button onClick={() => { setMode('promptEmail'); setPassword(''); setConfirmPassword(''); setError(''); }} className="font-semibold hover:underline" style={{ color: theme.primary }}>
                                        Use a different email
                                    </button>
                                </p>
                            )}
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
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

                            {mode === 'signup' && (
                                <>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Beta Invite Code" 
                                            value={inviteCode} 
                                            onChange={e => setInviteCode(e.target.value)} 
                                            required 
                                            className="w-full px-4 py-3 border rounded-lg bg-gray-50 font-mono tracking-wider" 
                                            style={{ borderColor: theme.border }}
                                        />
                                        <div className="text-xs text-gray-500 mt-1">Enter the invite code from your beta invitation email</div>
                                    </div>
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
                                 (mode === 'login' ? 'Login' : 'Create Account'))}
                            </button>
                        </form>

                        {/* Temporary Firebase Initialization Button */}
                        {import.meta.env.DEV && (
                            <div className="mt-4 p-4 border rounded-lg" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
                                <p className="text-xs text-gray-600 mb-2">Development Only - Initialize Firebase:</p>
                                <button
                                    type="button"
                                    onClick={handleInitializeFirebase}
                                    disabled={isInitializing}
                                    className="w-full px-4 py-2 rounded-md text-sm font-semibold"
                                    style={{ 
                                        backgroundColor: isInitializing ? theme.textLight : theme.info, 
                                        color: theme.textOnPrimary 
                                    }}
                                >
                                    {isInitializing ? 'Initializing...' : 'Setup Firebase Test Data'}
                                </button>
                            </div>
                        )}
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



