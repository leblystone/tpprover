import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { themes, defaultThemeName } from '../theme/themes';
import { Eye, EyeOff, Lock } from 'lucide-react';
import logo from '../assets/tpp_logo.png';

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
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src={logo} 
              alt="The Pep Planner" 
              className="h-12 mx-auto mb-4"
            />
          </div>

          <div className="p-8 space-y-6 rounded-xl shadow-lg" style={{ backgroundColor: theme.white }}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2" style={{ color: theme.primaryDark }}>
                Invalid Reset Link
              </h2>
              <p className="text-sm mt-2 mb-6" style={{ color: theme.textLight }}>
                {error}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 font-semibold rounded-lg transition-opacity duration-200 hover:opacity-90"
                style={{ backgroundColor: theme.primary, color: theme.white }}
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={logo} 
            alt="The Pep Planner" 
            className="h-12 mx-auto mb-4"
          />
        </div>

        {/* Card */}
        <div className="p-8 space-y-6 rounded-xl shadow-lg" style={{ backgroundColor: theme.white }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
              <Lock className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: theme.primaryDark }}>
              Reset Your Password
            </h2>
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="New Password"
                required
                className={`w-full px-4 py-3 border rounded-lg bg-gray-50 ${
                  password && !passwordValidation.valid 
                    ? 'border-red-300 focus:border-red-500' 
                    : ''
                }`}
                style={{ 
                  borderColor: password && !passwordValidation.valid 
                    ? '#FCA5A5' 
                    : theme.border 
                }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {/* Password validation errors */}
            {password && !passwordValidation.valid && (
              <div className="text-xs text-red-600 p-3 rounded border border-red-200 bg-red-50">
                <div className="font-medium mb-2">Password requirements:</div>
                <ul className="space-y-1">
                  {passwordValidation.errors.map((error, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-red-500">❌</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Password validation tips */}
            {password && passwordValidation.tips.length > 0 && (
              <div className="text-xs text-green-600 p-3 rounded border border-green-200 bg-green-50">
                <ul className="space-y-1">
                  {passwordValidation.tips.map((tip, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-green-500">💡</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Password match validation */}
            {password && confirmPassword && password !== confirmPassword && (
              <div className="text-xs text-red-600 p-3 rounded border border-red-200 bg-red-50">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  <span className="font-medium">Passwords do not match</span>
                </div>
              </div>
            )}

            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
                className={`w-full px-4 py-3 border rounded-lg bg-gray-50 ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-300 focus:border-red-500' 
                    : ''
                }`}
                style={{ 
                  borderColor: confirmPassword && password !== confirmPassword 
                    ? '#FCA5A5' 
                    : theme.border 
                }}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !passwordValidation.valid || password !== confirmPassword} 
              className="w-full px-4 py-3 font-semibold rounded-lg transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              style={{ 
                backgroundColor: theme.primary, 
                color: theme.white, 
                opacity: (loading || !passwordValidation.valid || password !== confirmPassword) ? 0.7 : 1 
              }}
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

          {/* Back to Login */}
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm underline hover:no-underline font-medium transition-colors"
              style={{ color: theme.primary }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
