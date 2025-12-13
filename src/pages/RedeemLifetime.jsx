import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { Gift, CheckCircle, Sparkles, ArrowRight } from 'lucide-react';
import logo from '../assets/tpp_logo.png';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function RedeemLifetime() {
  const navigate = useNavigate();
  const [themeName] = useState(defaultThemeName);
  const theme = themes[themeName];
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validatedCode, setValidatedCode] = useState('');
  
  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

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
      
      // Mark code as validated (but not yet fully redeemed - that happens after signup)
      // Store the validated code for the redirect
      setValidatedCode(codeString);
      setSuccess(true);
      
      // Short delay for success animation, then redirect
      setTimeout(() => {
        // Redirect to signup with lifetime token
        navigate(`/login?signup=true&lifetime=${codeString}`);
      }, 2000);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center" 
        style={{ backgroundColor: theme.background }}
      >
        <div className="text-center p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full mx-4" 
             style={{ backgroundColor: theme.cardBackground }}>
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                 style={{ backgroundColor: theme.successBg }}>
              <CheckCircle className="w-12 h-12" style={{ color: theme.success }} />
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <Sparkles className="w-8 h-8" style={{ color: theme.warning }} />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
            Code Verified! 🎉
          </h2>
          <p style={{ color: theme.textLight }}>
            Redirecting you to create your lifetime account...
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

  return (
    <>
      <style>{`
        /* Hide reCAPTCHA badge on redeem page */
        .grecaptcha-badge {
          visibility: hidden !important;
          opacity: 0 !important;
          display: none !important;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
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
        {/* Celebratory Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <img 
              src={logo} 
              alt="The Pep Planner Logo" 
              className="h-20 w-20 rounded-full shadow-lg object-contain mx-auto mb-4" 
              style={{
                imageRendering: 'auto',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                animation: 'float 3s ease-in-out infinite'
              }}
            />
            <div className="absolute -top-1 -right-1">
              <Sparkles 
                className="w-6 h-6" 
                style={{ 
                  color: theme.warning,
                  animation: 'sparkle 2s ease-in-out infinite'
                }} 
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>
            The Pep Planner
          </h1>
        </div>

        {/* Congrats Banner */}
        <div 
          className="mb-6 px-6 py-3 rounded-full flex items-center gap-2"
          style={{ 
            backgroundColor: theme.warningBg,
            border: `2px solid ${theme.warning}`
          }}
        >
          <Gift className="w-5 h-5" style={{ color: theme.warning }} />
          <span className="font-semibold" style={{ color: theme.text }}>
            🎉 Congrats on Your Lifetime Access! 🎉
          </span>
        </div>

        {/* Main Card */}
        <div className="p-8 space-y-6 rounded-xl shadow-lg max-w-md w-full" 
             style={{ backgroundColor: theme.cardBackground }}>
          
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: theme.primaryDark }}>
              Redeem Your Code
            </h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Enter the 6-character code from your Lifetime Access Kit
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 6-digit code input */}
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
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
                  Redeem Lifetime Access
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs" style={{ color: theme.textLight }}>
              Your code can be found in your Lifetime Access Kit packaging.
              <br />
              Need help? <a 
                href="/contact" 
                className="underline hover:no-underline"
                style={{ color: theme.primary }}
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>

        {/* What You Get Section */}
        <div className="mt-8 text-center max-w-md w-full">
          <h3 className="font-semibold mb-4" style={{ color: theme.text }}>
            What's included with Lifetime Access:
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              'Unlimited protocol tracking',
              'Full vendor analytics',
              'Priority support',
              'All future updates',
              'Advanced research tools',
              'Cloud sync & backup'
            ].map((feature, i) => (
              <div 
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{ backgroundColor: theme.cardBackground }}
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: theme.success }} />
                <span style={{ color: theme.textLight }}>{feature}</span>
              </div>
            ))}
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
    </>
  );
}

