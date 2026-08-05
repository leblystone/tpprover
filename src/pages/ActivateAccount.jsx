import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { ClockCountdown, SealCheck, SpinnerGap } from '@phosphor-icons/react';
import { themes, defaultThemeName } from '../theme/themes';
import OnboardingLogoFooter from '../components/onboarding/OnboardingLogoFooter';
import { isDevUiPreview } from '../utils/devUiPreview';

/** @typedef {'boot' | 'activating' | 'success' | 'expired'} ActivatePhase */

function classifyActivationError(err, { missingToken = false } = {}) {
  if (missingToken) {
    return {
      title: 'Link expired',
      body: 'This subscription activation link is missing or no longer works. Sign in if you already activated, or email us for a fresh activation link.',
    };
  }
  const code = err?.code || '';
  const msg = (err?.message || '').toLowerCase();
  if (
    code === 'functions/deadline-exceeded' ||
    msg.includes('expired') ||
    msg.includes('deadline')
  ) {
    return {
      title: 'Link expired',
      body: 'Subscription activation links expire after a while. Sign in if you’re already set up, or email us and we’ll send a new activation link.',
    };
  }
  if (
    code === 'functions/not-found' ||
    msg.includes('not-found') ||
    msg.includes('invalid')
  ) {
    return {
      title: 'Link expired',
      body: 'This activation link may have already been used. Try signing in — if you still can’t get in, email us for help.',
    };
  }
  return {
    title: 'Couldn’t activate',
    body: 'We couldn’t finish subscription activation. Try again from your email, or contact us for a new activation link.',
  };
}

export default function ActivateAccount() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = themes[defaultThemeName];
  const auth = getAuth();
  const previewMode = isDevUiPreview(searchParams, auth.currentUser?.uid);

  /** @type {[ActivatePhase, function]} */
  const [phase, setPhase] = useState('boot');
  const [copy, setCopy] = useState({ title: '', body: '' });

  useEffect(() => {
    if (previewMode) {
      const state = searchParams.get('state') || 'expired';
      if (state === 'success') {
        setPhase('success');
        return;
      }
      if (state === 'activating' || state === 'loading') {
        setPhase('activating');
        return;
      }
      setPhase('expired');
      setCopy(
        classifyActivationError(null, {
          missingToken: state === 'invalid' || state === 'missing',
        })
      );
      return;
    }

    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setCopy(classifyActivationError(null, { missingToken: true }));
      setPhase('expired');
      return;
    }
    activateAccount(tokenParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, searchParams]);

  const activateAccount = async (token) => {
    try {
      setPhase('activating');
      const app = getApp();
      const functions = getFunctions(app);
      const activateFn = httpsCallable(functions, 'activateSquarespaceSubscription');
      const result = await activateFn({ token });

      if (!result.data?.success) {
        throw new Error('Activation failed');
      }

      if (result.data.alreadyActivated) {
        setPhase('success');
        setTimeout(() => {
          navigate('/dashboard?subscription=active&welcome=true');
        }, 2000);
        return;
      }

      await signInWithCustomToken(auth, result.data.customToken);
      setPhase('success');
      setTimeout(() => {
        navigate('/dashboard?subscription=active&welcome=true');
      }, 1500);
    } catch (error) {
      console.error('Activation error:', error);
      setCopy(classifyActivationError(error));
      setPhase('expired');
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

  const primaryBtn = (label, onClick) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-3 px-4 rounded-xl font-medium text-sm transition-all hover:opacity-90"
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
    if (phase === 'boot' || phase === 'activating') {
      return (
        <>
          {iconCircle(
            theme.primary + '15',
            <SpinnerGap size={40} weight="bold" className="animate-spin" style={{ color: theme.primary }} />
          )}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              Activating…
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
              Setting up your subscription access.
            </p>
          </div>
        </>
      );
    }

    if (phase === 'success') {
      return (
        <>
          {iconCircle('#dcfce7', <SealCheck size={40} weight="duotone" style={{ color: '#16a34a' }} />)}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              You’re in
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
              Your subscription is active. Taking you to the app…
            </p>
          </div>
          {primaryBtn('Continue', () => navigate('/dashboard?subscription=active&welcome=true'))}
        </>
      );
    }

    // expired / invalid / soft failure
    return (
      <>
        {iconCircle(
          (theme.warning || '#D4A030') + '22',
          <ClockCountdown size={40} weight="duotone" style={{ color: theme.warning || '#D4A030' }} />
        )}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
            {copy.title || 'Link expired'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: theme.textLight || theme.mutedText }}>
            {copy.body}
          </p>
        </div>
        <div className="space-y-3">
          {primaryBtn('Go to Login', () => navigate('/login'))}
          {secondaryBtn('Email us for a new activation link', () => {
            window.location.href =
              'mailto:contact@thepepplanner.com?subject=Need%20a%20new%20subscription%20activation%20link';
          })}
        </div>
        <p className="text-xs" style={{ color: theme.mutedText }}>
          Already activated? Sign in and you’re good.
        </p>
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
          <div key={phase} className="tpp-activate-phase space-y-6">
            {renderBody()}
          </div>
        </div>
        <OnboardingLogoFooter pinned={false} size="md" className="mt-6" />
      </div>
      <style>{`
        @keyframes tpp-activate-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tpp-activate-phase {
          animation: tpp-activate-in 0.35s ease-out both;
        }
      `}</style>
    </div>
  );
}
