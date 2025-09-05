import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { X, Plus, Mail, RefreshCw, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/tpp-logo.png';
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal';
import { useAppContext } from '../context/AppContext';

// Lightweight local auth to mirror old app behavior for local testing
function getAuthDb() { try { return JSON.parse(localStorage.getItem('tpprover_auth_users') || '{}') } catch { return {} } }
function setAuthDb(db) { try { localStorage.setItem('tpprover_auth_users', JSON.stringify(db || {})) } catch {} }
const enc = (s) => { try { return btoa(unescape(encodeURIComponent(String(s)))) } catch { return String(s) } }

export default function Login() {
    const navigate = useNavigate();
    const { setUser } = useAppContext();
    const [themeName] = useState(defaultThemeName);
    const theme = themes[themeName];
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

    const doLogin = () => {
      const db = getAuthDb()
      const rec = db[(email || '').toLowerCase()]
      if (!rec) { setError('No account found with this email. Please create a new account.'); return false; }
      if (rec.p !== enc(password)) { setError('Incorrect password. Please try again or reset your password.'); return false; }
      const user = { email, name: email.split('@')[0] }
      try { localStorage.setItem('tpprover_user', JSON.stringify(user)) } catch {}
      try { localStorage.setItem('tpprover_auth_token', 'local_dev_token') } catch {}
      try { localStorage.setItem('tpprover_has_onboarded', 'true') } catch {}
      setUser(user);
      navigate('/dashboard');
      return true;
    };

    const doSignup = () => {
      if (pwErrors.length > 0) { setError('Please fix the password requirements.'); return false; }
      const db = getAuthDb()
      const key = (email || '').toLowerCase()
      if (!key) { setError('Email is required'); return false; }
      if (db[key]) { setError('An account already exists with this email. Please login.'); return false; }
      db[key] = { p: enc(password), createdAt: Date.now() }
      setAuthDb(db)
      const user = { 
        email, 
        name: email.split('@')[0],
        termsAgreed: { date: new Date().toISOString() }
      }
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
      try { localStorage.setItem('tpprover_auth_token', 'local_dev_token') } catch {}
      setUser(user);
      navigate('/dashboard');
      return true;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      setTimeout(() => {
          if (mode === 'login') {
              if (!doLogin()) {
                setLoading(false);
              }
          } else {
              setShowTerms(true);
              setLoading(false);
          }
      }, 500); // Simulate network delay
  };

  const acceptTerms = () => {
      setShowTerms(false);
      setLoading(true);
      setTimeout(() => {
          if (!doSignup()) {
            setLoading(false);
          }
      }, 500);
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
                            <h2 className="text-2xl font-semibold" style={{ color: theme.primaryDark }}>{mode === 'login' ? 'Welcome Back' : 'Create an Account'}</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} className="font-semibold hover:underline" style={{ color: theme.primary }}>
                                    {mode === 'login' ? "Sign Up" : "Login"}
                                </button>
                            </p>
                        </div>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="relative">
                                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-50" style={{ borderColor: theme.border }} />
                            </div>
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-50" style={{ borderColor: theme.border }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {mode === 'signup' && (
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg bg-gray-50" style={{ borderColor: theme.border }} />
                                </div>
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
                                {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Create Account')}
                            </button>
                        </form>
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


