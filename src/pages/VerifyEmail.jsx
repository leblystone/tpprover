import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { themes, defaultThemeName } from '../theme/themes';
import { isDevUiPreview } from '../utils/devUiPreview';
import {
  getVerificationReturnTo,
  openNativeAppAfterVerification,
} from '../utils/deepLinks';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [themeName] = useState(defaultThemeName);
  const theme = themes[themeName];
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [token, setToken] = useState('');
  // 'native' = reopen mobile app; 'web' = continue in browser
  const [returnTo, setReturnTo] = useState(() =>
    searchParams.get('returnTo') === 'native' ? 'native' : 'web'
  );

  const goToWebDashboard = useCallback(() => {
    navigate('/app/dashboard');
  }, [navigate]);

  const finishVerified = useCallback((resolvedReturnTo) => {
    const dest = resolvedReturnTo === 'native' ? 'native' : 'web';
    setReturnTo(dest);
    if (dest === 'native') {
      // Hand user back into the app they signed up on
      openNativeAppAfterVerification();
      return;
    }
    setTimeout(() => {
      goToWebDashboard();
    }, 3000);
  }, [goToWebDashboard]);

  useEffect(() => {
    const auth = getAuth();
    if (isDevUiPreview(searchParams, auth.currentUser?.uid)) {
      const state = searchParams.get('state') || 'success';
      setLoading(state === 'loading');
      setSuccess(state === 'success');
      setAlreadyVerified(state === 'alreadyVerified');
      setError(state === 'error' ? 'Invalid verification link. Please request a new verification email.' : '');
      setToken('dev-preview');
      if (searchParams.get('returnTo') === 'native') setReturnTo('native');
      return;
    }

    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      verifyEmail(tokenParam);
    } else {
      setError('Invalid verification link. Please request a new verification email.');
      setLoading(false);
    }
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setLoading(true);
      setError('');
      
      const functions = getFunctions(getApp(), 'us-central1');
      const verifyEmailWithToken = httpsCallable(functions, 'verifyEmailWithToken');
      
      const result = await verifyEmailWithToken({ token });
      
      if (result.data.success) {
        const resolvedReturnTo =
          result.data.returnTo === 'native' || searchParams.get('returnTo') === 'native'
            ? 'native'
            : 'web';

        // CRITICAL: Reload the Firebase Auth user to get updated emailVerified status
        const auth = getAuth();
        if (auth.currentUser) {
          await auth.currentUser.reload();
          console.log('✅ Firebase Auth user reloaded, emailVerified:', auth.currentUser.emailVerified);
        }

        if (result.data.alreadyVerified) {
          setAlreadyVerified(true);
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: '✅ Your email is already verified!', type: 'success' }
          }));
        } else {
          setSuccess(true);
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: '✅ Email verified successfully! Welcome to The Pep Planner!', type: 'success' }
          }));
        }

        finishVerified(resolvedReturnTo);
      } else {
        setError(result.data.message || 'Failed to verify email');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      
      // Handle Firebase Functions HttpsError
      let errorMessage = 'Failed to verify email. ';
      
      // Check for Firebase Functions error code
      if (error.code) {
        switch (error.code) {
          case 'deadline-exceeded':
            errorMessage = 'Verification link has expired. Please request a new verification email.';
            break;
          case 'already-exists':
            errorMessage = 'This verification link has already been used.';
            break;
          case 'not-found':
          case 'invalid-argument':
            errorMessage = 'Invalid verification link. Please request a new verification email.';
            break;
          case 'internal':
            errorMessage = 'An error occurred while verifying your email. Please try again or request a new verification email.';
            break;
          default:
            errorMessage = error.message || 'Please try again.';
        }
      } else if (error.message) {
        // Fallback to message-based error handling
        if (error.message.includes('expired')) {
          errorMessage = 'Verification link has expired. Please request a new verification email.';
        } else if (error.message.includes('already been used') || error.message.includes('already-exists')) {
          errorMessage = 'This verification link has already been used.';
        } else if (error.message.includes('Invalid') || error.message.includes('not-found')) {
          errorMessage = 'Invalid verification link. Please request a new verification email.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please try again or request a new verification email.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    try {
      setLoading(true);
      setError('');
      
      const functions = getFunctions(getApp(), 'us-central1');
      const sendCustomVerificationEmail = httpsCallable(functions, 'sendCustomVerificationEmail');
      
      const result = await sendCustomVerificationEmail({ returnTo: getVerificationReturnTo() });
      
      if (result.data?.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '📧 New verification email sent! Check your inbox.', type: 'success' }
        }));
        setError(''); // Clear any previous errors
      } else {
        setError('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      
      let errorMessage = 'Failed to send verification email. ';
      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in to request a verification email. Please log in first.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifiedActions = (heading, body) => (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center" style={{ backgroundColor: theme.cardBackground }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: alreadyVerified ? '#dbeafe' : '#dcfce7' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: alreadyVerified ? '#2563eb' : '#16a34a' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={alreadyVerified
                  ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  : 'M5 13l4 4L19 7'}
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>{heading}</h1>
          <p className="mb-6" style={{ color: theme.textSecondary || theme.textLight }}>
            {body}
          </p>
          <div className="space-y-3">
            {returnTo === 'native' ? (
              <>
                <button
                  type="button"
                  onClick={openNativeAppAfterVerification}
                  className="w-full px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: theme.primary }}
                >
                  Open the app
                </button>
                <button
                  type="button"
                  onClick={goToWebDashboard}
                  className="w-full px-4 py-2 rounded-lg font-medium border hover:opacity-90 transition-all"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: 'transparent',
                  }}
                >
                  Continue in browser instead
                </button>
                <p className="text-sm" style={{ color: theme.mutedText || theme.textLight }}>
                  Opening The Pep Planner app…
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={goToWebDashboard}
                  className="w-full px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-all"
                  style={{ backgroundColor: theme.primary }}
                >
                  Go to Dashboard
                </button>
                <p className="text-sm" style={{ color: theme.mutedText || theme.textLight }}>
                  Redirecting automatically in 3 seconds...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="text-center p-8">
          {/* Animated Logo Container */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Outer rotating ring */}
            <div 
              className="absolute inset-0 rounded-full animate-spin"
              style={{ 
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
                opacity: 0.2,
                animation: 'spin 3s linear infinite'
              }}
            />
            
            {/* Middle pulsing ring */}
            <div 
              className="absolute inset-2 rounded-full"
              style={{ 
                background: `linear-gradient(135deg, ${theme.primaryLight} 0%, ${theme.primary} 100%)`,
                opacity: 0.15,
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
            
            {/* Inner content circle */}
            <div 
              className="absolute inset-4 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: theme.cardBackground,
                boxShadow: `0 8px 32px ${theme.primary}20`
              }}
            >
              {/* Animated envelope icon */}
              <svg 
                className="w-12 h-12" 
                style={{ color: theme.primary }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
                {/* Animated checkmark */}
                <circle 
                  cx="17" 
                  cy="7" 
                  r="3" 
                  fill={theme.success}
                  className="animate-pulse"
                />
              </svg>
            </div>
            
            {/* Orbiting dots */}
            <div 
              className="absolute top-0 left-1/2 w-3 h-3 rounded-full -ml-1.5"
              style={{ 
                backgroundColor: theme.primary,
                animation: 'spin 3s linear infinite'
              }}
            />
            <div 
              className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full -ml-1.5"
              style={{ 
                backgroundColor: theme.primaryLight,
                animation: 'spin 3s linear infinite reverse'
              }}
            />
          </div>
          
          {/* Text content */}
          <h2 
            className="text-2xl font-bold mb-3"
            style={{ color: theme.text }}
          >
            Verifying Your Email
          </h2>
          <p 
            className="text-base mb-2"
            style={{ color: theme.textLight }}
          >
            Please wait while we confirm your email address...
          </p>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center space-x-2 mt-6">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: theme.primary,
                animation: 'bounce 1.4s ease-in-out infinite'
              }}
            />
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: theme.primary,
                animation: 'bounce 1.4s ease-in-out 0.2s infinite'
              }}
            />
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: theme.primary,
                animation: 'bounce 1.4s ease-in-out 0.4s infinite'
              }}
            />
          </div>
        </div>
        
        {/* Add custom keyframes */}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.15; }
            50% { transform: scale(1.05); opacity: 0.25; }
          }
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    );
  }

  if (alreadyVerified) {
    return verifiedActions(
      'Already Verified!',
      returnTo === 'native'
        ? 'Your email is already verified. Jump back into the app to continue.'
        : "Your email address is already verified. You're all set to use all features of The Pep Planner!"
    );
  }

  if (success) {
    return verifiedActions(
      'Email Verified!',
      returnTo === 'native'
        ? 'Your email is verified. Opening The Pep Planner app so you can keep going where you left off.'
        : 'Your email has been successfully verified. You can now access all features of The Pep Planner.'
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8" style={{ backgroundColor: theme.cardBackground }}>
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Verification Failed</h1>
            <p className="text-gray-600 mb-6" style={{ color: theme.textSecondary }}>
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={resendVerification}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                {loading ? 'Sending...' : 'Resend Verification Email'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2 rounded-lg font-medium border hover:opacity-90 transition-all"
                style={{ 
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: 'transparent'
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
