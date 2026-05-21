import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import ShopHeader from '../components/shop/ShopHeader';
import LandingFooter from '../components/layout/LandingFooter';
import StarRating from '../components/shop/StarRating';
import { useCart } from '../context/CartContext';
import { usePageSEO } from '../utils/pageSEO';

const PAGE_BG = '#f0eee7';
const PRIMARY = '#7F9E95';
const TEXT = '#2F3B3A';

export default function ShopWriteReview() {
  usePageSEO({
    title: 'Write a Review | The Pep Planner Shop',
    description: 'Leave a verified review for your PEP Planner purchase.',
    canonical: 'https://thepepplanner.app/shop/review',
  });

  const { cartCount } = useCart();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState(null);
  const [meta, setMeta] = useState(null);

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [productName, setProductName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!token) {
      setTokenError('Missing review link. Request a new one from the shop.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const fn = httpsCallable(functions, 'getShopReviewToken');
        const { data } = await fn({ token });
        if (cancelled) return;
        setMeta(data);
        setAuthorName(data.customerName || '');
        if (data.productNames?.length === 1) {
          setProductName(data.productNames[0]);
        } else if (data.productNames?.length > 1) {
          setProductName(data.productNames[0]);
        }
      } catch (err) {
        if (!cancelled) setTokenError(err.message || 'Invalid or expired link.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fn = httpsCallable(functions, 'submitVerifiedShopReview');
      await fn({
        token,
        rating,
        body: body.trim(),
        authorName: authorName.trim(),
        productName: productName.trim(),
      });
      setDone(true);
    } catch (err) {
      setSubmitError(err.message || 'Could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
      <ShopHeader cartCount={cartCount} />

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-10 pb-24">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#9B958D' }}>
          Verified purchase
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold mb-6"
          style={{ color: TEXT, fontFamily: 'Playfair Display, serif' }}
        >
          Write your review
        </h1>

        {loading && (
          <div className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: '#E8E4DC' }} />
        )}

        {!loading && tokenError && (
          <div className="content-section p-6 rounded-2xl space-y-4">
            <p className="text-sm" style={{ color: '#6B7575' }}>
              {tokenError}
            </p>
            <Link
              to="/shop/reviews"
              className="inline-block text-sm font-semibold"
              style={{ color: PRIMARY }}
            >
              Back to reviews
            </Link>
          </div>
        )}

        {!loading && !tokenError && done && (
          <div className="content-section p-6 rounded-2xl space-y-4 text-center">
            <p className="text-lg font-semibold" style={{ color: PRIMARY }}>
              Thank you!
            </p>
            <p className="text-sm" style={{ color: '#6B7575' }}>
              Your verified review is now on the shop.
            </p>
            <Link
              to="/shop/reviews"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              See all reviews
            </Link>
          </div>
        )}

        {!loading && !tokenError && meta && !done && (
          <form onSubmit={handleSubmit} className="content-section p-6 rounded-2xl space-y-5">
            <p className="text-sm" style={{ color: '#6B7575' }}>
              Thanks for your order{meta.customerName ? `, ${meta.customerName}` : ''}! Your review helps other
              researchers choose the right planner.
            </p>

            <div>
              <span className="text-xs font-semibold block mb-2" style={{ color: '#9B958D' }}>
                Rating
              </span>
              <StarRating value={rating} size={28} interactive onChange={setRating} />
            </div>

            {meta.productNames?.length > 1 && (
              <label className="block">
                <span className="text-xs font-semibold block mb-1.5" style={{ color: '#9B958D' }}>
                  Product
                </span>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm"
                  style={{ borderColor: '#DDE6DE' }}
                >
                  {meta.productNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="text-xs font-semibold block mb-1.5" style={{ color: '#9B958D' }}>
                Your name
              </span>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm"
                style={{ borderColor: '#DDE6DE' }}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold block mb-1.5" style={{ color: '#9B958D' }}>
                Review (optional)
              </span>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What did you love about your planner?"
                className="w-full px-4 py-3 rounded-xl border text-sm resize-y"
                style={{ borderColor: '#DDE6DE' }}
              />
            </label>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full text-[11px] font-bold tracking-[0.14em] uppercase text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {submitting ? 'Publishing…' : 'Publish review'}
            </button>
          </form>
        )}

        {!token && !loading && (
          <p className="text-sm mt-6" style={{ color: '#9B958D' }}>
            <Link to="/shop" className="font-semibold" style={{ color: PRIMARY }}>
              Shop planners
            </Link>
            {' · '}
            <Link to="/shop/reviews" className="font-semibold" style={{ color: PRIMARY }}>
              Customer reviews
            </Link>
          </p>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
