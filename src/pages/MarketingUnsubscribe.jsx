import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleNotch, CheckCircle, EnvelopeSimple } from '@phosphor-icons/react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';

const theme = themes[defaultThemeName];

export default function MarketingUnsubscribe() {
  usePageSEO();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const autoRan = useRef(false);

  const runUnsubscribe = useCallback(async (emailValue, token) => {
    const trimmed = emailValue.trim();
    if (!trimmed) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const fn = httpsCallable(functions, 'unsubscribeShopMarketingContact');
      await fn({
        email: trimmed,
        ...(token ? { token } : {}),
      });
      setStatus('success');
      setMessage('You have been unsubscribed from promotional emails about new products, sales, and shop updates.');
    } catch (err) {
      console.error('Unsubscribe failed:', err);
      setStatus('error');
      setMessage(
        (err.message || 'Something went wrong. Please try again or email contact@thepepplanner.com.')
          .replace(/^FirebaseError:\s*/i, ''),
      );
    }
  }, []);

  useEffect(() => {
    const paramEmail = searchParams.get('email');
    const paramToken = searchParams.get('token');
    if (paramEmail && !email) setEmail(paramEmail);
    if (paramEmail && paramToken && !autoRan.current) {
      autoRan.current = true;
      runUnsubscribe(paramEmail, paramToken);
    }
  }, [searchParams, email, runUnsubscribe]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runUnsubscribe(email, searchParams.get('token') || undefined);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div
            className="rounded-2xl border p-8 shadow-sm"
            style={{ borderColor: `${theme.text}15`, backgroundColor: theme.white || '#fff' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <EnvelopeSimple size={28} weight="duotone" style={{ color: theme.primary }} />
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>
                Unsubscribe
              </h1>
            </div>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: theme.textLight }}>
              Opt out of promotional emails from The Pep Planner shop (new products, sales, and updates).
              Order confirmations and shipping notices are not affected.
            </p>

            {status === 'success' ? (
              <div
                className="rounded-lg p-4 flex gap-3 items-start"
                style={{ backgroundColor: `${theme.primary}12` }}
              >
                <CheckCircle size={22} weight="fill" className="flex-shrink-0 mt-0.5" style={{ color: theme.primary }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text }}>
                    You&apos;re opted out
                  </p>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>{message}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="unsub-email" className="block text-xs font-semibold mb-1.5" style={{ color: theme.text }}>
                    Email address
                  </label>
                  <input
                    id="unsub-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={status === 'loading'}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border"
                    style={{
                      borderColor: theme.border || `${theme.text}20`,
                      color: theme.text,
                      backgroundColor: theme.cardBackground || '#fff',
                    }}
                  />
                </div>

                {status === 'error' && message && (
                  <p className="text-sm" style={{ color: '#b45309' }}>{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: theme.primary }}
                >
                  {status === 'loading' ? (
                    <>
                      <CircleNotch size={18} className="animate-spin" />
                      Unsubscribing…
                    </>
                  ) : (
                    'Unsubscribe from promotional emails'
                  )}
                </button>
              </form>
            )}

            <p className="text-xs mt-6 text-center" style={{ color: theme.textLight }}>
              Questions?{' '}
              <a href="mailto:contact@thepepplanner.com" className="underline" style={{ color: theme.primary }}>
                contact@thepepplanner.com
              </a>
              {' · '}
              <Link to="/privacy" className="underline" style={{ color: theme.primary }}>
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
