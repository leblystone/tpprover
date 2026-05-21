import React from 'react';
import { Link } from 'react-router-dom';
import ShopHeader from '../components/shop/ShopHeader';
import LandingFooter from '../components/layout/LandingFooter';
import ReviewCard from '../components/shop/ReviewCard';
import { useShopReviews } from '../config/shopReviews';
import { usePageSEO } from '../utils/pageSEO';
import { useCart } from '../context/CartContext';
import { REVIEW_SOURCE_IDS, getReviewSource } from '../config/reviewSources';
import { SourceIcon } from '../components/shop/ReviewSourceBadge';

const PAGE_BG = '#f0eee7';

export default function ShopReviews() {
  usePageSEO({
    title: 'Customer Reviews | The Pep Planner Shop',
    description:
      'Read what customers say about our physical PEP Planners and shop experience — reviews from our website, Etsy, TikTok Shop, and peptide research communities.',
    canonical: 'https://thepepplanner.app/shop/reviews',
  });

  const { cartCount } = useCart();
  const { reviews, loading, error } = useShopReviews();

  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAGE_BG }}>
      <ShopHeader cartCount={cartCount} />

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-10 pb-28">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>
            The Pep Planner shop
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ color: '#2F3B3A', fontFamily: 'Playfair Display, serif' }}
          >
            Customer reviews
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#6B7575' }}>
            Real feedback from planner buyers across our website, Etsy, TikTok Shop, and peptide research communities.
            Tap a source badge to verify on the original storefront.
          </p>
          {avg && (
            <p className="mt-4 text-lg font-semibold" style={{ color: '#7F9E95' }}>
              {avg} average · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {REVIEW_SOURCE_IDS.map((id) => {
            const src = getReviewSource(id);
            return (
              <a
                key={id}
                href={src.verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
                style={{ borderColor: `${src.brandColor}40`, backgroundColor: '#fff' }}
              >
                <SourceIcon sourceId={id} size={18} />
                <span style={{ color: src.brandColor }}>{src.label}</span>
              </a>
            );
          })}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-72 rounded-2xl animate-pulse" style={{ backgroundColor: '#E8E4DC' }} />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-500">Could not load reviews. Please refresh.</p>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: '#9B958D' }}>
              Reviews coming soon.
            </p>
            <Link to="/shop" className="inline-block mt-4 text-sm font-semibold" style={{ color: '#7F9E95' }}>
              Back to shop
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {reviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} index={i} />
            ))}
          </div>
        )}

        <div className="text-center mt-14">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full text-[11px] font-bold tracking-[0.15em] uppercase text-white transition-transform duration-200 hover:scale-[1.02]"
            style={{ backgroundColor: '#7F9E95' }}
          >
            Shop planners
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
