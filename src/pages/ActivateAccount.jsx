import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { themes, defaultThemeName } from '../theme/themes';

export default function ActivateAccount() {
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
      activateAccount(tokenParam);
    } else {
      setError('Invalid activation link. Please check your email and try again.');
      setLoading(false);
    }
  }, [searchParams]);

  const activateAccount = async (token) => {
    try {
      setLoading(true);
      setError('');
      
      const app = getApp();
      const functions = getFunctions(app);
      const activateFn = httpsCallable(functions, 'activateSquarespaceSubscription');
      
      const result = await activateFn({ token });

      if (result.data.success) {
        // Check if already activated
        if (result.data.alreadyActivated) {
          setSuccess(true);
          setError('');
          setTimeout(() => {
            navigate('/dashboard?subscription=active&welcome=true');
          }, 2000);
          return;
        }
        
        // Auto-login user with custom token
        const auth = getAuth();
        await signInWithCustomToken(auth, result.data.customToken);
        
        setSuccess(true);
        setError('');
        
        // Redirect to app with subscription active
        setTimeout(() => {
          navigate('/dashboard?subscription=active&welcome=true');
        }, 1500);
      } else {
        throw new Error('Activation failed');
      }
    } catch (error) {
      console.error('Activation error:', error);
      
      let errorMessage = 'Failed to activate your account. ';
      
      if (error.code === 'functions/not-found' || error.message?.includes('not-found')) {
        errorMessage += 'Invalid activation link. Please check your email and try again, or contact support at contact@thepepplanner.com';
      } else if (error.code === 'functions/deadline-exceeded' || error.message?.includes('expired')) {
        errorMessage += 'This activation link has expired. Please contact support at contact@thepepplanner.com to get a new activation link.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again or contact support at contact@thepepplanner.com';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: theme.background,
        color: theme.text
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px'
          }}>🧬</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '12px',
            color: theme.text
          }}>Activating your account...</h1>
          <p style={{
            fontSize: '16px',
            color: theme.textLight,
            marginBottom: '24px'
          }}>Setting up your subscription access</p>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${theme.border}`,
            borderTopColor: theme.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: theme.background,
        color: theme.text
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '20px'
          }}>✅</div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            marginBottom: '12px',
            color: theme.primary
          }}>Account Activated!</h1>
          <p style={{
            fontSize: '16px',
            color: theme.textLight,
            marginBottom: '24px'
          }}>Your subscription is now active. Redirecting you to the app...</p>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${theme.border}`,
            borderTopColor: theme.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundColor: theme.background,
      color: theme.text
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>⚠️</div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '12px',
          color: theme.error
        }}>Activation Failed</h1>
        <p style={{
          fontSize: '16px',
          color: theme.textLight,
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>{error}</p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 24px',
            backgroundColor: theme.primary,
            color: theme.textOnPrimary,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '12px'
          }}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}

