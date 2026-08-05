import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signOut } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { themes, defaultThemeName } from '../theme/themes';
import { isDevUiPreview } from '../utils/devUiPreview';
import OnboardingLogoFooter from '../components/onboarding/OnboardingLogoFooter';
import {
  getVerificationReturnTo,
  openNativeAppAfterVerification,
} from '../utils/deepLinks';

/** @typedef {'boot' | 'waiting' | 'verifying' | 'success' | 'already' | 'error'} VerifyPhase */

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = themes[defaultThemeName];
  const auth = getAuth();
  const previewMode = isDevUiPreview(searchParams, auth.currentUser?.uid);

  /** @type {[VerifyPhase, function]} */
  const [phase, setPhase] = useState('boot');
  const [error, setError] = useState('');
  const [returnTo, setReturnTo] = useState(() =>
    searchParams.get('returnTo') === 'native' ? 'native' : 'web'
  );
  const [userEmail, setUserEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendError, setResendError] = useState('');
  const tokenHandled = useRef(false);

  const goToWebDashboard = useCallback(() => {
    navigate('/app/dashboard', { replace: true });
  }, [navigate]);

  const finishVerified = useCallback(
    (resolvedReturnTo) => {
      const dest = resolvedReturnTo === 'native' ? 'native' : 'web';
      setReturnTo(dest);
      if (dest === 'native') {
        openNativeAppAfterVerification();
        return;
      }
      setTimeout(() => goToWebDashboard(), 3000);
    },
    [goToWebDashboard]
  );

  const mapVerifyError = (err) => {
    if (err?.code) {
      switch (err.code) {
        case 'deadline-exceeded':
          return 'This link has expired. Request a new one below.';
        case 'already-exists':
          return 'This link was already used.';
        case 'not-found':
        case 'invalid-argument':
          return 'This link is invalid. Request a new one below.';
        case 'internal':
          return 'Something went wrong. Try again or request a new link.';
        default:
          return err.message || 'Please try again.';
      }
    }
    const msg = err?.message || '';
    if (msg.includes('expired')) return 'This link has expired. Request a new one below.';
    if (msg.includes('already been used') || msg.includes('already-exists')) {
      return 'This link was already used.';
    }
    if (msg.includes('Invalid') || msg.includes('not-found')) {
      return 'This link is invalid. Request a new one below.';
    }
    return msg || 'Failed to verify. Please try again.';
  };

  const verifyWithToken = useCallback(
    async (token) => {
      setPhase('verifying');
      setError('');
      try {
        const functions = getFunctions(getApp(), 'us-central1');
        const verifyEmailWithToken = httpsCallable(functions, 'verifyEmailWithToken');
        const result = await verifyEmailWithToken({ token });

        if (!result.data?.success) {
          setError(result.data?.message || 'Failed to verify email');
          setPhase('error');
          return;
        }

        const resolvedReturnTo =
          result.data.returnTo === 'native' || searchParams.get('returnTo') === 'native'
            ? 'native'
            : 'web';

        if (auth.currentUser) {
          await auth.currentUser.reload();
        }

        if (result.data.alreadyVerified) {
          setPhase('already');
          window.dispatchEvent(
            new CustomEvent('tpp:toast', {
              detail: { message: 'Your email is already verified.', type: 'success' },
            })
          );
        } else {
          setPhase('success');
          window.dispatchEvent(
            new CustomEvent('tpp:toast', {
              detail: { message: 'Email verified! Welcome to The Pep Planner.', type: 'success' },
            })
          );
        }
        finishVerified(resolvedReturnTo);
      } catch (err) {
        console.error('Email verification error:', err);
        setError(mapVerifyError(err));
        setPhase('error');
      }
    },
    [auth, finishVerified, searchParams]
  );

  // Boot: preview | token | waiting session | redirect
  useEffect(() => {
    if (previewMode) {
      const state = searchParams.get('state') || 'waiting';
      const map = {
        waiting: 'waiting',
        loading: 'verifying',
        verifying: 'verifying',
        success: 'success',
        alreadyVerified: 'already',
        already: 'already',
        error: 'error',
      };
      setPhase(map[state] || 'waiting');
      if (state === 'error') {
        setError('Invalid verification link. Please request a new one.');
      }
      if (searchParams.get('returnTo') === 'native') setReturnTo('native');
      setUserEmail('preview@example.com');
      return;
    }

    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      if (tokenHandled.current) return;
      tokenHandled.current = true;
      verifyWithToken(tokenParam);
      return;
    }

    const unsub = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }
      setUserEmail(user.email || '');
      if (user.emailVerified) {
        navigate('/app/dashboard', { replace: true });
        return;
      }
      setPhase('waiting');
    });
    return () => unsub();
  }, [previewMode, searchParams, auth, navigate, verifyWithToken]);

  // Poll while waiting (other device / other tab clicked the link)
  useEffect(() => {
    if (previewMode || phase !== 'waiting') return undefined;
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        await user.reload();
        if (user.emailVerified) {
          setPhase('success');
          window.dispatchEvent(
            new CustomEvent('tpp:toast', {
              detail: { message: 'Email verified! Welcome to The Pep Planner.', type: 'success' },
            })
          );
          setTimeout(() => goToWebDashboard(), 1600);
        }
      } catch {
        // ignore network blips
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [previewMode, phase, auth, goToWebDashboard]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendVerificationEmail = async ({ silent = false } = {}) => {
    if (isSending || cooldown > 0) return false;
    setIsSending(true);
    setResendError('');
    try {
      const functions = getFunctions(getApp(), 'us-central1');
      const sendVerification = httpsCallable(functions, 'sendCustomVerificationEmail');
      const result = await sendVerification({ returnTo: getVerificationReturnTo() });
      if (result.data?.success) {
        setCooldown(60);
        try {
          sessionStorage.setItem('tpp_verification_email_sent', '1');
        } catch (_) {}
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              message: silent
                ? 'Link sent — check inbox and spam.'
                : 'Link sent! Check your inbox (and spam).',
              type: 'success',
            },
          })
        );
        return true;
      }
      const failMsg = 'Failed to send. Please try again.';
      setResendError(failMsg);
      if (!silent) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: failMsg, type: 'error' } }));
      }
      return false;
    } catch (err) {
      const failMsg =
        err?.message?.replace(/^Firebase:\s*/i, '').replace(/\s*\(.*\)\s*$/, '').trim() ||
        'Failed to send. Please try again.';
      setResendError(failMsg);
      if (!silent) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: failMsg, type: 'error' } }));
      }
      return false;
    } finally {
      setIsSending(false);
    }
  };

  // Auto-send once when entering waiting if signup never sent
  useEffect(() => {
    if (previewMode || phase !== 'waiting') return undefined;
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
  }, [previewMode, phase]);

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

  const iconCircle = (bg, children) => (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
      style={{ backgroundColor: bg }}
    >
      {children}
    </div>
  );

  const envelopeIcon = (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: theme.primary }}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );

  const checkIcon = (color) => (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );

  const alertIcon = (
    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );

  const primaryBtn = (label, onClick, opts = {}) => (
    <button
      type="button"
      onClick={onClick}
      disabled={opts.disabled}
      className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ backgroundColor: theme.primary, color: '#fff' }}
    >
      {label}
    </button>
  );

  const secondaryBtn = (label, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-80 border"
      style={{
        borderColor: theme.border,
        color: theme.textLight || theme.mutedText,
        backgroundColor: 'transparent',
      }}
    >
      {label}
    </button>
  );

  const renderBody = () => {
    if (phase === 'boot') {
      return (
        <div className="py-8">
          <div
            className="w-10 h-10 rounded-full mx-auto animate-pulse"
            style={{ backgroundColor: theme.primary + '30' }}
          />
        </div>
      );
    }

    if (phase === 'verifying') {
      return (
        <>
          {iconCircle(theme.primary + '15', (
            <div className="relative">
              {envelopeIcon}
              <span
                className="absolute -inset-3 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: theme.primary, opacity: 0.5 }}
              />
            </div>
          ))}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              Verifying…
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
              Confirming your email — hang tight.
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: theme.primary,
                  animation: `tpp-verify-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </>
      );
    }

    if (phase === 'waiting') {
      return (
        <>
          {iconCircle(theme.primary + '15', envelopeIcon)}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              Check your inbox
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
              We sent a link to{' '}
              <strong style={{ color: theme.text }}>{userEmail}</strong>.
              {' '}Open it to verify your email and continue.
            </p>
          </div>
          <div
            className="flex items-center gap-3 p-3 rounded-xl text-left"
            style={{ backgroundColor: theme.secondary }}
          >
            <div className="relative flex-shrink-0 w-3 h-3" aria-hidden>
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-40"
                style={{ backgroundColor: theme.primary }}
              />
              <span
                className="relative block w-3 h-3 rounded-full"
                style={{ backgroundColor: theme.primary }}
              />
            </div>
            <p className="text-xs" style={{ color: theme.mutedText }}>
              Waiting for confirmation…
            </p>
          </div>
          <div className="space-y-3">
            {primaryBtn(
              isSending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link',
              () => sendVerificationEmail({ silent: false }),
              { disabled: isSending || cooldown > 0 }
            )}
            {secondaryBtn('Sign Out', handleSignOut)}
          </div>
          <div className="space-y-2">
            {resendError ? (
              <p className="text-xs" style={{ color: '#b45309' }}>
                {resendError}
              </p>
            ) : null}
            <p className="text-xs" style={{ color: theme.mutedText }}>
              Nothing yet? Check spam for{' '}
              <strong style={{ color: theme.text }}>noreply@thepepplanner.app</strong>
              . Wrong address?{' '}
              <button
                type="button"
                onClick={handleSignOut}
                className="underline hover:opacity-70 transition-opacity"
                style={{ color: theme.primary }}
              >
                Use a different account
              </button>
              .
            </p>
          </div>
        </>
      );
    }

    if (phase === 'success' || phase === 'already') {
      const isAlready = phase === 'already';
      return (
        <>
          {iconCircle(isAlready ? '#dbeafe' : '#dcfce7', checkIcon(isAlready ? '#2563eb' : '#16a34a'))}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              {isAlready ? 'Already verified' : 'Email verified'}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
              {returnTo === 'native'
                ? isAlready
                  ? 'Jump back into the app to continue.'
                  : 'Opening the app so you can pick up where you left off.'
                : isAlready
                  ? "You're all set — continue to your dashboard."
                  : 'You can use all features of The Pep Planner now.'}
            </p>
          </div>
          <div className="space-y-3">
            {returnTo === 'native' ? (
              <>
                {primaryBtn('Open the app', openNativeAppAfterVerification)}
                {secondaryBtn('Continue in browser', goToWebDashboard)}
                <p className="text-xs" style={{ color: theme.mutedText }}>
                  Opening The Pep Planner…
                </p>
              </>
            ) : (
              <>
                {primaryBtn('Go to Dashboard', goToWebDashboard)}
                <p className="text-xs" style={{ color: theme.mutedText }}>
                  Redirecting in a moment…
                </p>
              </>
            )}
          </div>
        </>
      );
    }

    // error
    return (
      <>
        {iconCircle('#fee2e2', alertIcon)}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
            Couldn't verify
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
            {error || 'Something went wrong with this link.'}
          </p>
        </div>
        <div className="space-y-3">
          {auth.currentUser
            ? primaryBtn(
                isSending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link',
                () => {
                  sendVerificationEmail({ silent: false }).then((ok) => {
                    if (ok) setPhase('waiting');
                  });
                },
                { disabled: isSending || cooldown > 0 }
              )
            : null}
          {secondaryBtn(auth.currentUser ? 'Sign Out' : 'Back to Login', () =>
            auth.currentUser ? handleSignOut() : navigate('/login')
          )}
        </div>
        {resendError ? (
          <p className="text-xs" style={{ color: '#b45309' }}>
            {resendError}
          </p>
        ) : null}
      </>
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: theme.background }}
    >
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl p-8 shadow-xl text-center space-y-6 overflow-hidden"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <div key={phase} className="tpp-verify-phase space-y-6">
            {renderBody()}
          </div>
        </div>
        <OnboardingLogoFooter pinned={false} size="md" className="mt-6" />
      </div>
      <style>{`
        @keyframes tpp-verify-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tpp-verify-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .tpp-verify-phase {
          animation: tpp-verify-in 0.35s ease-out both;
        }
      `}</style>
    </div>
  );
}
