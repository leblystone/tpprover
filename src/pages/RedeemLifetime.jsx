import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { CheckCircle, ArrowRight, User, UserPlus, Loader } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { grantLifetimeAccessFirestore } from '../services/firebase';
import LandingContactModal from '../components/legal/LandingContactModal';

export default function RedeemLifetime() {
  const navigate = useNavigate();
  const [themeName] = useState(defaultThemeName);
  const theme = themes[themeName];
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validatedCode, setValidatedCode] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [applyingToAccount, setApplyingToAccount] = useState(false);
  
  const inputRefs = useRef([]);

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0] && !checkingAuth) {
      inputRefs.current[0].focus();
    }
  }, [checkingAuth]);

  const handleInputChange = (index, value) => {
    // Only allow alphanumeric characters
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (sanitized.length <= 1) {
      const newCode = [...code];
      newCode[index] = sanitized;
      setCode(newCode);
      setError('');
      
      // Auto-advance to next input
      if (sanitized && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (sanitized.length === 6) {
      // Handle paste of full code
      const newCode = sanitized.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const validateCode = async (codeString) => {
    try {
      // Check the lifetimeCodes collection
      const codeRef = doc(db, 'lifetimeCodes', codeString);
      const codeDoc = await getDoc(codeRef);
      
      if (!codeDoc.exists()) {
        return { valid: false, error: 'Invalid code. Please check and try again.' };
      }
      
      const codeData = codeDoc.data();
      
      if (codeData.used) {
        return { valid: false, error: 'This code has already been redeemed.' };
      }
      
      if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
        return { valid: false, error: 'This code has expired.' };
      }
      
      return { valid: true, codeData };
    } catch (err) {
      console.error('Error validating code:', err);
      return { valid: false, error: 'Unable to validate code. Please try again.' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const codeString = code.join('');
    
    if (codeString.length !== 6) {
      setError('Please enter a complete 6-character code.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await validateCode(codeString);
      
      if (!result.valid) {
        setError(result.error);
        setLoading(false);
        return;
      }
      
      // Store the validated code
      setValidatedCode(codeString);
      setCodeValidated(true);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply lifetime to existing logged-in account
  const handleApplyToCurrentAccount = async () => {
    if (!currentUser || !validatedCode) return;
    
    setApplyingToAccount(true);
    setError('');
    
    try {
      console.log('🎁 Applying lifetime to existing account:', currentUser.email);
      
      // Grant lifetime access
      await grantLifetimeAccessFirestore(
        currentUser.uid,
        currentUser.email,
        'Lifetime Kit Redemption (Upgrade)',
        'lifetime-kit'
      );
      console.log('✅ Lifetime access granted!');
      
      // Mark code as used
      const codeRef = doc(db, 'lifetimeCodes', validatedCode);
      await updateDoc(codeRef, {
        used: true,
        usedBy: currentUser.email,
        usedByUid: currentUser.uid,
        usedAt: new Date().toISOString()
      });
      console.log('✅ Code marked as used:', validatedCode);
      
      // Update localStorage subscription
      const lifetimeSubscription = {
        id: `lifetime_${Date.now()}`,
        plan: 'lifetime',
        interval: 'lifetime',
        status: 'active',
        hasLifetimeAccess: true,
        lifetimeReason: 'Lifetime Kit Redemption (Upgrade)',
        lifetimeGrantedAt: new Date().toISOString(),
        currentPeriodEnd: null,
      };
      localStorage.setItem('tpprover_subscription', JSON.stringify(lifetimeSubscription));
      
      setSuccess(true);
      
      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/app/dashboard?lifetime_activated=true');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Failed to apply lifetime:', err);
      setError('Failed to activate lifetime. Please try again or contact support.');
    } finally {
      setApplyingToAccount(false);
    }
  };

  // Handle new account signup
  const handleNewAccount = () => {
    navigate(`/login?signup=true&lifetime=${validatedCode}`);
  };

  // Handle sign in to existing account
  const handleSignInExisting = () => {
    navigate(`/login?lifetime=${validatedCode}`);
  };

  // Success screen
  if (success) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center" 
        style={{ backgroundColor: theme.background }}
      >
        <div className="text-center p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full mx-4" 
             style={{ backgroundColor: theme.cardBackground }}>
          <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
               style={{ backgroundColor: theme.successBg }}>
            <CheckCircle className="w-12 h-12" style={{ color: theme.success }} />
          </div>
          
          <h2 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
            Lifetime Activated! 🎉
          </h2>
          <p style={{ color: theme.textLight }}>
            {currentUser 
              ? 'Your account has been upgraded to lifetime!'
              : 'Redirecting you to complete setup...'
            }
          </p>
          
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 rounded-full animate-bounce" 
                 style={{ backgroundColor: theme.primary, animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full animate-bounce" 
                 style={{ backgroundColor: theme.primary, animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full animate-bounce" 
                 style={{ backgroundColor: theme.primary, animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Code validated - show options
  if (codeValidated) {
    return (
      <>
        <div 
          className="min-h-screen flex flex-col items-center justify-center" 
          style={{ 
            backgroundColor: theme.background,
            padding: '1rem'
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <img 
              src={logo} 
              alt="The Pep Planner Logo" 
              className="h-20 w-20 rounded-full shadow-lg object-contain mx-auto mb-4" 
            />
            <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>
              The Pep Planner
            </h1>
          </div>

          {/* Success Card */}
          <div className="p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full" 
               style={{ backgroundColor: theme.cardBackground }}>
            
            {/* Code Verified */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                   style={{ backgroundColor: theme.successBg }}>
                <CheckCircle className="w-10 h-10" style={{ color: theme.success }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                Code Verified!
              </h2>
              <p className="text-sm" style={{ color: theme.textLight }}>
                Code: <span className="font-mono font-bold">{validatedCode.slice(0,3)}-{validatedCode.slice(3)}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="p-3 rounded-lg text-center text-sm"
                style={{ 
                  backgroundColor: theme.error + '15',
                  color: theme.error,
                  border: `1px solid ${theme.error}40`
                }}
              >
                {error}
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              {/* If logged in - show apply to current account */}
              {currentUser && (
                <>
                  <div 
                    className="p-4 rounded-lg text-center"
                    style={{ backgroundColor: theme.primary + '10', border: `1px solid ${theme.primary}30` }}
                  >
                    <p className="text-sm mb-1" style={{ color: theme.textLight }}>
                      Logged in as:
                    </p>
                    <p className="font-semibold" style={{ color: theme.text }}>
                      {currentUser.email}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleApplyToCurrentAccount}
                    disabled={applyingToAccount}
                    className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    style={{ 
                      backgroundColor: theme.primary,
                      color: theme.textOnPrimary,
                      opacity: applyingToAccount ? 0.7 : 1
                    }}
                  >
                    {applyingToAccount ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Upgrade This Account to Lifetime
                      </>
                    )}
                  </button>
                  
                  <div className="text-center">
                    <p className="text-xs" style={{ color: theme.textLight }}>
                      Or use a different account:
                    </p>
                  </div>
                </>
              )}

              {/* New Account Option */}
              <button
                onClick={handleNewAccount}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: currentUser ? theme.background : theme.primary,
                  color: currentUser ? theme.text : theme.textOnPrimary,
                  border: currentUser ? `2px solid ${theme.border}` : 'none'
                }}
              >
                <UserPlus className="w-5 h-5" />
                Create New Account
              </button>

              {/* Sign In Option (only if not logged in) */}
              {!currentUser && (
                <button
                  onClick={handleSignInExisting}
                  className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: theme.background,
                    color: theme.text,
                    border: `2px solid ${theme.border}`
                  }}
                >
                  <User className="w-5 h-5" />
                  Sign In to Existing Account
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Initial code entry screen
  return (
    <>
      <style>{`
        /* Hide reCAPTCHA badge on redeem page */
        .grecaptcha-badge {
          visibility: hidden !important;
          opacity: 0 !important;
          display: none !important;
        }
      `}</style>
      
      <div 
        className="min-h-screen flex flex-col items-center justify-center" 
        style={{ 
          backgroundColor: theme.background,
          paddingTop: 'max(1rem, calc(1rem + var(--safe-area-top, env(safe-area-inset-top, 0px))))',
          paddingBottom: 'max(1rem, calc(1rem + var(--safe-area-bottom, env(safe-area-inset-bottom, 0px))))',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          minHeight: 'calc(100vh - var(--safe-area-top, env(safe-area-inset-top, 0px)) - var(--safe-area-bottom, env(safe-area-inset-bottom, 0px)))'
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <img 
            src={logo} 
            alt="The Pep Planner Logo" 
            className="h-20 w-20 rounded-full shadow-lg object-contain mx-auto mb-4" 
            style={{
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}
          />
          <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>
            The Pep Planner
          </h1>
        </div>

        {/* Main Card */}
        <div className="p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full" 
             style={{ backgroundColor: theme.cardBackground }}>
          
          {/* Welcome Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3" style={{ color: theme.primaryDark }}>
              Welcome to your Lifetime Kit!
            </h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Enter the 6-character code on your welcome card
            </p>
          </div>

          {checkingAuth ? (
            <div className="flex justify-center py-4">
              <Loader className="w-6 h-6 animate-spin" style={{ color: theme.primary }} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 6-digit code input with dash separator */}
              <div className="flex justify-center items-center gap-2">
                {code.slice(0, 3).map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: error ? theme.error : (digit ? theme.primary : theme.border),
                      backgroundColor: digit ? theme.accent : theme.cardBackground,
                      color: theme.text,
                      '--tw-ring-color': theme.primary
                    }}
                    placeholder="•"
                  />
                ))}
                
                {/* Dash separator */}
                <span className="text-2xl font-bold mx-1" style={{ color: theme.textLight }}>
                  –
                </span>
                
                {code.slice(3, 6).map((digit, index) => (
                  <input
                    key={index + 3}
                    ref={(el) => (inputRefs.current[index + 3] = el)}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index + 3, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index + 3, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2"
                    style={{ 
                      borderColor: error ? theme.error : (digit ? theme.primary : theme.border),
                      backgroundColor: digit ? theme.accent : theme.cardBackground,
                      color: theme.text,
                      '--tw-ring-color': theme.primary
                    }}
                    placeholder="•"
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="p-3 rounded-lg text-center text-sm"
                  style={{ 
                    backgroundColor: theme.error + '15',
                    color: theme.error,
                    border: `1px solid ${theme.error}40`
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || code.join('').length !== 6}
                className="w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: loading || code.join('').length !== 6 
                    ? theme.buttonDisabled 
                    : theme.primary,
                  color: theme.textOnPrimary,
                  opacity: loading || code.join('').length !== 6 ? 0.7 : 1,
                  cursor: loading || code.join('').length !== 6 ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Activate Lifetime
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs" style={{ color: theme.textLight }}>
              Your code can be found on your welcome card.
              <br />
              Need help?{' '}
              <button
                type="button"
                onClick={() => setShowContact(true)}
                className="underline hover:no-underline"
                style={{ color: theme.primary }}
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>

        {/* Already have an account? */}
        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: theme.textLight }}>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-semibold underline hover:no-underline"
              style={{ color: theme.primary }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>

      {/* Contact Support Modal */}
      <LandingContactModal
        open={showContact}
        onClose={() => setShowContact(false)}
      />
    </>
  );
}
