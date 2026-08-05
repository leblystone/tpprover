import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { themes, defaultThemeName } from '../theme/themes';
import { isDevUiPreview } from '../utils/devUiPreview';

export default function VerifyEmailRequired() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = themes[defaultThemeName];
  const auth = getAuth();
  const previewMode = isDevUiPreview(searchParams, auth.currentUser?.uid);

  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const [lastError, setLastError] = useState('');

  // Redirect if no user is logged in (unless UI preview)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (isDevUiPreview(searchParams, user?.uid)) return;
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      // Already verified — go to app
      if (user.emailVerified) {
        navigate('/app/dashboard', { replace: true });
        return;
      }
    });
    return () => unsubscribe();
  }, [searchParams]);

  // Poll Firebase Auth every 5s to detect verification
  useEffect(() => {
    if (previewMode) return undefined;
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        await user.reload();
        if (user.emailVerified) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Email verified! Welcome to The Pep Planner.', type: 'success' }
          }));
          navigate('/app/dashboard', { replace: true });
        }
      } catch {
        // Network error — silently ignore and retry
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [previewMode]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendVerificationEmail = async ({ silent = false } = {}) => {
    if (isSending || cooldown > 0) return false;
    setIsSending(true);
    setLastError('');
    try {
      const functions = getFunctions(getApp(), 'us-central1');
      const sendVerification = httpsCallable(functions, 'sendCustomVerificationEmail');
      const { getVerificationReturnTo } = await import('../utils/deepLinks');
      const result = await sendVerification({ returnTo: getVerificationReturnTo() });
      if (result.data?.success) {
        setSent(true);
        setCooldown(60);
        try {
          sessionStorage.setItem('tpp_verification_email_sent', '1');
        } catch (_) {}
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: {
            message: silent
              ? 'Verification email sent — check inbox and spam.'
              : 'Verification email sent! Check your inbox (and spam).',
            type: 'success',
          }
        }));
        return true;
      }
      const failMsg = 'Failed to send email. Please try again.';
      setLastError(failMsg);
      if (!silent) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: failMsg, type: 'error' }
        }));
      }
      return false;
    } catch (err) {
      const failMsg =
        err?.message?.replace(/^Firebase:\s*/i, '').replace(/\s*\(.*\)\s*$/, '').trim() ||
        'Failed to send email. Please try again.';
      setLastError(failMsg);
      if (!silent) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: failMsg, type: 'error' }
        }));
      }
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // If signup never successfully requested an email, send one once when this page loads.
  useEffect(() => {
    if (previewMode) return undefined;
    let alreadySent = false;
    try {
      alreadySent = sessionStorage.getItem('tpp_verification_email_sent') === '1';
    } catch (_) {}
    if (alreadySent) return undefined;

    const timer = setTimeout(() => {
      if (!auth.currentUser || auth.currentUser.emailVerified) return;
      sendVerificationEmail({ silent: true });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode]);

  const handleResend = () => sendVerificationEmail({ silent: false });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('tpprover_auth_token');
      localStorage.removeItem('tpprover_user');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const userEmail = auth.currentUser?.email || (previewMode ? 'preview@example.com' : '');

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: theme.background }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-xl text-center space-y-6"
          style={{ backgroundColor: theme.cardBackground }}
        >
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ backgroundColor: theme.primary + '15' }}
          >
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: theme.primary }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              Verify Your Email
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
              We sent a verification link to{' '}
              <strong style={{ color: theme.text }}>{userEmail}</strong>.
              Click the link in that email to unlock your account.
            </p>
          </div>

          {/* Status indicator */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-left"
            style={{ backgroundColor: theme.secondary }}
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: theme.primary }}
              />
            </div>
            <p className="text-xs" style={{ color: theme.mutedText }}>
              Waiting for verification — this page checks automatically every few seconds.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primary, color: '#fff' }}
            >
              {isSending
                ? 'Sending...'
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : sent
                ? 'Resend Verification Email'
                : 'Resend Verification Email'}
            </button>

            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-80 border"
              style={{
                borderColor: theme.border,
                color: theme.textLight || theme.mutedText,
                backgroundColor: 'transparent',
              }}
            >
              Sign Out
            </button>
          </div>

          {/* Help text */}
          <div className="space-y-2">
            {lastError ? (
              <p className="text-xs" style={{ color: '#b45309' }}>
                {lastError}
              </p>
            ) : null}
            <p className="text-xs" style={{ color: theme.mutedText }}>
              Can't find the email? Check spam/junk for a message from{' '}
              <strong style={{ color: theme.text }}>noreply@thepepplanner.app</strong>
              {' '}(subject: “Verify your email for The Pep Planner”). Using the wrong email?{' '}
              <button
                onClick={handleSignOut}
                className="underline hover:opacity-70 transition-opacity"
                style={{ color: theme.primary }}
              >
                Sign out and use a different account.
              </button>
            </p>
          </div>
        </div>

        {/* Brand footer */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: theme.mutedText }}
        >
          The Pep Planner · Email verification required for new accounts
        </p>
      </div>
    </div>
  );
}
