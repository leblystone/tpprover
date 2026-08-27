import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { useShopReviews } from '../../config/shopReviews';
import ReviewCarousel from './ReviewCarousel';
import ReviewDetailModal from './ReviewDetailModal';

const FADE = '#f0eee7';

export default function RecentReviewsCarousel({ fadeColor = FADE }) {
  const { reviews, loading, error } = useShopReviews(12);
  const [selectedReview, setSelectedReview] = useState(null);

  if (loading) {
    return (
      <section className="py-12 px-5">
        <div className="max-w-6xl mx-auto flex gap-4 overflow-hidden">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="min-w-[280px] h-64 rounded-2xl animate-pulse flex-shrink-0"
              style={{ backgroundColor: '#E8E4DC' }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || reviews.length === 0) return null;

  return (
    <section className="relative pt-6 pb-14 sm:pt-8 sm:pb-16" style={{ backgroundColor: fadeColor }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#9B958D' }}>
              Customer love
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: '#2F3B3A', fontFamily: 'Playfair Display, serif' }}
            >
              Recent reviews
            </h2>
          </div>
          <Link
            to="/shop/reviews"
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase transition-all duration-200 hover:gap-3"
            style={{ color: '#7F9E95' }}
          >
            View all reviews
            <ArrowRight size={14} />
          </Link>
        </div>

        <ReviewCarousel
          reviews={reviews}
          fadeColor={fadeColor}
          onReviewClick={setSelectedReview}
          cardCompact
        />
      </div>

      <ReviewDetailModal
        review={selectedReview}
        open={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
      />
    </section>
  );
}
