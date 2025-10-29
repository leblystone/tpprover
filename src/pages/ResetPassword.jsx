import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { themes, defaultThemeName } from '../theme/themes';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [themeName] = useState(defaultThemeName);
  const theme = themes[themeName];
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({ valid: true, errors: [], tips: [] });

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    } else {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const validateToken = async (token) => {
    try {
      setLoading(true);
      
      console.log(`🔍 Token length: ${token.length} characters`);
      console.log(`🔍 Token preview: ${token.substring(0, 10)}...`);
      
      // Our custom tokens are 64 characters (32 bytes hex), Firebase tokens are much longer
      // Firebase tokens typically start with specific patterns and are 100+ characters
      if (token.length > 100) {
        console.log('🔍 Using Firebase token validation');
        // Firebase token - verify it
        const auth = getAuth();
        await verifyPasswordResetCode(auth, token);
        setIsValidToken(true);
      } else {
        console.log('🔍 Using custom token validation');
        // Custom token - check with our function
        const functions = getFunctions();
        const verifyResetToken = httpsCallable(functions, 'verifyResetToken');
        
        const result = await verifyResetToken({ token });
        console.log('🔍 Token validation result:', result.data);
        if (result.data.success) {
          setIsValidToken(true);
        } else {
          setError(result.data.message || 'Invalid reset token');
        }
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setError('Invalid or expired reset token. Please request a new password reset.');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password) => {
    const errors = [];
    const tips = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (password.length >= 12) {
      tips.push('Great! Longer passwords are more secure');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      tips.push('Excellent! Special characters make passwords stronger');
    }

    return {
      valid: errors.length === 0,
      errors,
      tips
    };
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordValidation(validatePassword(newPassword));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordValidation.valid) {
      setError('Please fix password requirements before continuing');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (token.length > 100) {
        // Firebase token - use Firebase's confirmPasswordReset
        const auth = getAuth();
        await confirmPasswordReset(auth, token, password);
        
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '✅ Password reset successfully! Please log in with your new password.', type: 'success' }
        }));
        
        navigate('/login');
      } else {
        // Custom token - use our function
        const functions = getFunctions();
        const resetPasswordWithToken = httpsCallable(functions, 'resetPasswordWithToken');
        
        const result = await resetPasswordWithToken({ token, newPassword: password });
        
        if (result.data.success) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: '✅ Password reset successfully! Please log in with your new password.', type: 'success' }
          }));
          
          navigate('/login');
        } else {
          setError(result.data.message || 'Failed to reset password');
        }
      }
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to reset password. ';
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = 'Invalid or expired reset link. Please request a new password reset.';
      } else if (error.message?.includes('expired')) {
        errorMessage = 'Reset link has expired. Please request a new password reset.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: theme.text }}>Validating reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken && error) {
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
              <h1 className="text-2xl font-bold mb-4" style={{ color: theme.text }}>Invalid Reset Link</h1>
              <p className="text-gray-600 mb-6" style={{ color: theme.textSecondary }}>
                {error}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: theme.primary }}
              >
                Back to Login
              </button>
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>Reset Your Password</h1>
            <p className="text-gray-600" style={{ color: theme.textSecondary }}>
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ 
                    backgroundColor: theme.inputBackground,
                    borderColor: passwordValidation.valid ? theme.border : '#ef4444',
                    color: theme.text
                  }}
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              
              {passwordValidation.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">• {error}</p>
                  ))}
                </div>
              )}
              
              {passwordValidation.tips.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordValidation.tips.map((tip, index) => (
                    <p key={index} className="text-sm text-green-600">• {tip}</p>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ 
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                  color: theme.text
                }}
                placeholder="Confirm new password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordValidation.valid || password !== confirmPassword}
              className="w-full px-4 py-3 rounded-lg font-medium text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primary }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              style={{ color: theme.textSecondary }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
