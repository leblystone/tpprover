import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { themes, defaultThemeName } from '../theme/themes';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [themeName] = useState(defaultThemeName);
  const theme = themes[themeName];
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
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
      
      const functions = getFunctions();
      const verifyEmailWithToken = httpsCallable(functions, 'verifyEmailWithToken');
      
      const result = await verifyEmailWithToken({ token });
      
      if (result.data.success) {
        setSuccess(true);
        
        // Show success toast
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '✅ Email verified successfully! Welcome to The Pep Planner!', type: 'success' }
        }));
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 3000);
      } else {
        setError(result.data.message || 'Failed to verify email');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      
      let errorMessage = 'Failed to verify email. ';
      if (error.message?.includes('expired')) {
        errorMessage = 'Verification link has expired. Please request a new verification email.';
      } else if (error.message?.includes('already been used')) {
        errorMessage = 'This verification link has already been used.';
      } else if (error.message?.includes('Invalid')) {
        errorMessage = 'Invalid verification link. Please request a new verification email.';
      } else {
        errorMessage += error.message || 'Please try again.';
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
      
      const functions = getFunctions();
      const sendCustomVerificationEmail = httpsCallable(functions, 'sendCustomVerificationEmail');
      
      const result = await sendCustomVerificationEmail();
      
      if (result.data.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '📧 New verification email sent! Check your inbox.', type: 'success' }
        }));
      } else {
        setError('Failed to send verification email. Please try again.');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setError('Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: theme.text }}>Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center" style={{ backgroundColor: theme.cardBackground }}>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Email Verified!</h1>
            <p className="text-gray-600 mb-6" style={{ color: theme.textSecondary }}>
              Your email has been successfully verified. You can now access all features of The Pep Planner.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/app/dashboard')}
                className="w-full px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                Go to Dashboard
              </button>
              <p className="text-sm text-gray-500">
                Redirecting automatically in 3 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
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
