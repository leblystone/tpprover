import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useShopReviews } from '../../config/shopReviews';
import ReviewCard from './ReviewCard';

const FADE = '#f0eee7';

export default function RecentReviewsCarousel({ fadeColor = FADE }) {
  const { reviews, loading, error } = useShopReviews(5);
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scrollBy = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: 'smooth' });
    setTimeout(updateScrollHints, 350);
  };

  useEffect(() => {
    if (!loading && reviews.length) {
      const t = setTimeout(updateScrollHints, 100);
      return () => clearTimeout(t);
    }
  }, [loading, reviews.length]);

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
    <section className="relative py-14 sm:py-16" style={{ backgroundColor: fadeColor }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#9B958D' }}>
              Customer love
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#2F3B3A', fontFamily: 'Playfair Display, serif' }}>
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
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-20 z-10"
          style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-20 z-10"
          style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
        />

        {canScrollLeft && (
          <button
            type="button"
            aria-label="Previous reviews"
            onClick={() => scrollBy(-1)}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border items-center justify-center shadow-md transition-all duration-200 hover:scale-105"
            style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            aria-label="Next reviews"
            onClick={() => scrollBy(1)}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border items-center justify-center shadow-md transition-all duration-200 hover:scale-105"
            style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}
          >
            <ChevronRight size={20} />
          </button>
        )}

        <div
          ref={trackRef}
          onScroll={updateScrollHints}
          className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth px-5 sm:px-8 pb-2 max-w-6xl mx-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .recent-reviews-track::-webkit-scrollbar { display: none; }
          `}</style>
          {reviews.map((review, i) => (
            <div key={review.id} className="snap-start flex-shrink-0 recent-reviews-track">
              <ReviewCard review={review} compact index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
