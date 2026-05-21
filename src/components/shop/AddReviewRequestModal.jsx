import React, { useState } from 'react';
import { X, EnvelopeSimple, CheckCircle } from '@phosphor-icons/react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

const PRIMARY = '#7F9E95';
const TEXT = '#2F3B3A';

export default function AddReviewRequestModal({ open, onClose, productSlug = null }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (loading) return;
    setEmail('');
    setMessage(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter the email you used at checkout.');
      return;
    }

    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'requestShopReviewLink');
      const { data } = await fn({ email: trimmed, productSlug });
      setMessage(
        data?.message ||
          'If we find an order for that email, we will send a review link shortly. Check your inbox and spam folder.'
      );
      setEmail('');
    } catch (err) {
      setError(err.message || 'Could not send the review link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close"
        onClick={handleClose}
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl border p-6"
        style={{ backgroundColor: '#fff', borderColor: '#DDE6DE' }}
        role="dialog"
        aria-labelledby="add-review-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${PRIMARY}15` }}
            >
              <EnvelopeSimple size={20} style={{ color: PRIMARY }} weight="duotone" />
            </div>
            <div>
              <h2 id="add-review-title" className="text-base font-semibold" style={{ color: TEXT }}>
                Add your review
              </h2>
              <p className="text-xs mt-0.5 opacity-70" style={{ color: TEXT }}>
                Verified purchases only
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full hover:opacity-70"
            style={{ backgroundColor: '#f0eee7' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {message ? (
          <div
            className="flex items-start gap-3 p-4 rounded-xl text-sm"
            style={{ backgroundColor: '#E8EFE9', color: TEXT }}
          >
            <CheckCircle size={22} style={{ color: PRIMARY }} className="shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: '#6B7575' }}>
              Enter the email from your order confirmation. We will check our shop orders and email you a
              private link to write your review.
            </p>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: '#9B958D' }}>
                Order email
              </span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2"
                style={{ borderColor: '#DDE6DE', color: TEXT }}
                disabled={loading}
              />
            </label>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full text-[11px] font-bold tracking-[0.14em] uppercase text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {loading ? 'Checking…' : 'Send review link'}
            </button>
          </form>
        )}

        {message && (
          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-4 py-3 rounded-full text-[11px] font-bold tracking-[0.14em] uppercase border"
            style={{ borderColor: '#DDE6DE', color: PRIMARY }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
