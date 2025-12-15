import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { CheckCircle, ArrowRight, User, UserPlus, Loader, Calendar } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { grantAnnualAccessFirestore } from '../services/firebase';
import LandingContactModal from '../components/legal/LandingContactModal';

export default function RedeemAnnual() {
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
  const [expirationDate, setExpirationDate] = useState(null);
  
  const inputRefs = useRef([]);

  // Calculate expiration date (1 year from now)
  const getExpirationDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  };

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
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (sanitized.length <= 1) {
      const newCode = [...code];
      newCode[index] = sanitized;
      setCode(newCode);
      setError('');
      
      if (sanitized && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (sanitized.length === 6) {
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
      const codeRef = doc(db, 'annualCodes', codeString);
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
      
      setValidatedCode(codeString);
      setCodeValidated(true);
      setExpirationDate(getExpirationDate());
      
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply annual to existing logged-in account
  const handleApplyToCurrentAccount = async () => {
    if (!currentUser || !validatedCode) return;
    
    setApplyingToAccount(true);
    setError('');
    
    try {
      console.log('📅 Applying annual subscription to existing account:', currentUser.email);
      
      const expDate = getExpirationDate();
      
      // Grant annual access
      await grantAnnualAccessFirestore(
        currentUser.uid,
        currentUser.email,
        'Annual Kit Redemption (Upgrade)',
        'annual-kit'
      );
      console.log('✅ Annual access granted!');
      
      // Mark code as used
      const codeRef = doc(db, 'annualCodes', validatedCode);
      await updateDoc(codeRef, {
        used: true,
        usedBy: currentUser.email,
        usedByUid: currentUser.uid,
        usedAt: new Date().toISOString()
      });
      console.log('✅ Code marked as used:', validatedCode);
      
      // Update localStorage subscription
      const annualSubscription = {
        id: `annual_kit_${Date.now()}`,
        plan: 'annual',
        interval: 'year',
        status: 'active',
        source: 'annual-kit',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: expDate.toISOString(),
        redeemedAt: new Date().toISOString(),
      };
      localStorage.setItem('tpprover_subscription', JSON.stringify(annualSubscription));
      
      // Trigger subscription refresh
      window.dispatchEvent(new CustomEvent('subscription:updated', { 
        detail: { subscription: annualSubscription } 
      }));
      
      setTimeout(async () => {
        try {
          const { loadUserSubscription } = await import('../services/cloudStorage');
          const refreshedSubscription = await loadUserSubscription(currentUser.uid);
          if (refreshedSubscription) {
            window.dispatchEvent(new CustomEvent('subscription:updated', { 
              detail: { subscription: refreshedSubscription } 
            }));
            console.log('✅ Subscription refreshed from cloud after annual grant');
          }
        } catch (err) {
          console.error('⚠️ Failed to refresh subscription from cloud:', err);
        }
      }, 1000);
      
      setSuccess(true);
      setExpirationDate(expDate);
      
      setTimeout(() => {
        navigate('/app/dashboard?annual_activated=true');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Failed to apply annual:', err);
      setError('Failed to activate annual subscription. Please try again or contact support.');
    } finally {
      setApplyingToAccount(false);
    }
  };

  const handleNewAccount = () => {
    navigate(`/login?signup=true&annual=${validatedCode}`);
  };

  const handleSignInExisting = () => {
    navigate(`/login?annual=${validatedCode}`);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
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
            Annual Subscription Activated! 🎉
          </h2>
          <p style={{ color: theme.textLight }}>
            {currentUser 
              ? 'Your account has been upgraded!'
              : 'Redirecting you to complete setup...'
            }
          </p>
          
          {expirationDate && (
            <div 
              className="p-3 rounded-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.primary + '10' }}
            >
              <Calendar className="w-4 h-4" style={{ color: theme.primary }} />
              <span className="text-sm" style={{ color: theme.text }}>
                Valid until: <strong>{formatDate(expirationDate)}</strong>
              </span>
            </div>
          )}
          
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

          <div className="p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full" 
               style={{ backgroundColor: theme.cardBackground }}>
            
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

            {/* Subscription Duration Info */}
            {expirationDate && (
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: theme.infoBg || theme.primary + '10', border: `1px solid ${theme.info || theme.primary}30` }}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" style={{ color: theme.info || theme.primary }} />
                  <span className="font-semibold text-sm" style={{ color: theme.text }}>
                    1 Year of Research Access
                  </span>
                </div>
                <p className="text-xs" style={{ color: theme.textLight }}>
                  Valid until {formatDate(expirationDate)}
                </p>
              </div>
            )}

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

            <div className="space-y-3">
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
                        Activate Annual Subscription
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

        <div className="p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full" 
             style={{ backgroundColor: theme.cardBackground }}>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-3" style={{ color: theme.primaryDark }}>
              Welcome to your Annual Kit!
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
                    Activate Annual
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

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

      <LandingContactModal
        open={showContact}
        onClose={() => setShowContact(false)}
      />
    </>
  );
}

