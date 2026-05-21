import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from '@phosphor-icons/react';
import StarRating from './StarRating';
import ReviewCarousel from './ReviewCarousel';
import ReviewDetailModal from './ReviewDetailModal';
import { useShopReviews } from '../../config/shopReviews';
import {
  filterReviewsForProduct,
  averageRating,
  getShopReviewStats,
} from '../../utils/reviewProductMatch';
import {
  ShopSectionGroupHeader,
  ShopContentSection,
} from './ProductPageSection';
import AddReviewRequestModal from './AddReviewRequestModal';

const PAGE_BG = '#f0eee7';
const PRIMARY = '#7F9E95';
const TEXT = '#2F3B3A';
/** Max cards in horizontal track (scroll for more; avoids huge vertical stacks) */
const CAROUSEL_LIMIT = 24;

export const PRODUCT_REVIEWS_SECTION_ID = 'product-reviews';

export function scrollToProductReviews() {
  const el = document.getElementById(PRODUCT_REVIEWS_SECTION_ID);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ReviewsSummaryRow({ ratingLine, avg, compact, onAddReview }) {
  return (
    <div
      className="py-4 border-b border-dashed"
      style={{ borderColor: `${PRIMARY}40` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${PRIMARY}15` }}
        >
          <Star size={16} style={{ color: PRIMARY }} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold" style={{ color: TEXT }}>
              Customer reviews
            </p>
            <Link
              to="/shop/reviews"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase shrink-0 transition-all hover:gap-2 whitespace-nowrap"
              style={{ color: PRIMARY }}
            >
              See all
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex items-center justify-between gap-3 mt-2 flex-wrap">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <StarRating value={Number(avg) || 5} size={compact ? 14 : 16} />
              <span className="text-xs opacity-60" style={{ color: TEXT }}>
                {ratingLine}
              </span>
            </div>
            <button
              type="button"
              onClick={onAddReview}
              className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] font-bold tracking-[0.12em] uppercase border transition-all hover:opacity-90 whitespace-nowrap shrink-0"
              style={{ borderColor: PRIMARY, color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
            >
              Add your review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductReviewsSection({
  product,
  compact = false,
  className = '',
}) {
  const { reviews: allReviews, loading, error } = useShopReviews();
  const [selectedReview, setSelectedReview] = useState(null);
  const [addReviewOpen, setAddReviewOpen] = useState(false);

  const matched = useMemo(
    () => filterReviewsForProduct(allReviews, product),
    [allReviews, product?.id, product?.name, product?.category, product?.size]
  );

  const shopStats = useMemo(() => getShopReviewStats(allReviews), [allReviews]);
  const shopAvg = averageRating(allReviews);
  const isProductSpecific = matched.length > 0;
  const sourceList = isProductSpecific ? matched : allReviews;
  const carouselReviews = useMemo(() => sourceList.slice(0, CAROUSEL_LIMIT), [sourceList]);

  const avg = isProductSpecific ? averageRating(matched) : shopAvg;

  const ratingLine = isProductSpecific
    ? `${avg} · ${matched.length} review${matched.length !== 1 ? 's' : ''}`
    : `${shopAvg} · ${shopStats.total} reviews`;

  if (loading) {
    return (
      <section
        id={PRODUCT_REVIEWS_SECTION_ID}
        className={`border-t scroll-mt-24 ${className}`}
        style={{ borderColor: '#E8EFE9', backgroundColor: PAGE_BG }}
      >
        <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${compact ? 'py-6' : 'py-6 md:py-8'}`}>
          <div className="space-y-3">
            <ShopSectionGroupHeader icon={Star} label="Customer reviews" />
            <ShopContentSection innerClassName="py-4">
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="min-w-[260px] h-52 rounded-2xl animate-pulse flex-shrink-0"
                    style={{ backgroundColor: '#E8E4DC' }}
                  />
                ))}
              </div>
            </ShopContentSection>
          </div>
        </div>
      </section>
    );
  }

  if (error || allReviews.length === 0) return null;

  return (
    <section
      id={PRODUCT_REVIEWS_SECTION_ID}
      className={`border-t scroll-mt-24 ${className}`}
      style={{ borderColor: '#E8EFE9', backgroundColor: PAGE_BG }}
    >
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 ${compact ? 'py-6' : 'py-6 md:py-8'}`}>
        <div className="space-y-3">
          <ShopSectionGroupHeader icon={Star} label="Customer reviews" />

          <ShopContentSection>
            <ReviewsSummaryRow
              ratingLine={ratingLine}
              avg={avg}
              compact={compact}
              onAddReview={() => setAddReviewOpen(true)}
            />

            <div className={`${compact ? 'pt-2 pb-3' : 'py-4 pb-5'}`}>
              <ReviewCarousel
                reviews={carouselReviews}
                fadeColor="rgba(255,255,255,0.92)"
                onReviewClick={setSelectedReview}
                cardCompact
              />
              {sourceList.length > CAROUSEL_LIMIT && (
                <p className="text-center text-xs mt-3 opacity-60" style={{ color: TEXT }}>
                  Showing {CAROUSEL_LIMIT} of {sourceList.length} —{' '}
                  <Link to="/shop/reviews" className="font-semibold underline" style={{ color: PRIMARY }}>
                    view all on reviews page
                  </Link>
                </p>
              )}
            </div>
          </ShopContentSection>
        </div>
      </div>

      <ReviewDetailModal
        review={selectedReview}
        open={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
      />

      <AddReviewRequestModal
        open={addReviewOpen}
        onClose={() => setAddReviewOpen(false)}
        productSlug={product?.slug}
      />
    </section>
  );
}

function ReviewSummaryButton({ className = '', children, label = 'Scroll to customer reviews' }) {
  return (
    <button
      type="button"
      onClick={scrollToProductReviews}
      className={`text-left cursor-pointer rounded-md transition-opacity hover:opacity-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F9E95] focus-visible:ring-offset-2 ${className}`}
      aria-label={label}
    >
      {children}
    </button>
  );
}

export function ProductReviewSummary({ product, className = '' }) {
  const { reviews: allReviews, loading } = useShopReviews();
  const matched = useMemo(
    () => filterReviewsForProduct(allReviews, product),
    [allReviews, product?.id, product?.name, product?.category, product?.size]
  );
  const shopStats = useMemo(() => getShopReviewStats(allReviews), [allReviews]);
  const specificAvg = averageRating(matched);
  const shopAvg = averageRating(allReviews);

  if (loading || allReviews.length === 0) return null;

  if (matched.length > 0) {
    return (
      <ReviewSummaryButton className={`flex flex-wrap items-center gap-2 ${className}`}>
        <StarRating value={Number(specificAvg) || 5} size={16} />
        <span className="text-sm font-medium underline-offset-2 hover:underline" style={{ color: '#5F7F76' }}>
          {specificAvg} · {matched.length} review{matched.length !== 1 ? 's' : ''}
        </span>
      </ReviewSummaryButton>
    );
  }

  return (
    <ReviewSummaryButton className={`flex flex-wrap items-center gap-2 ${className}`}>
      <StarRating value={Number(shopAvg) || 5} size={16} />
      <span className="text-sm font-medium underline-offset-2 hover:underline" style={{ color: '#5F7F76' }}>
        {shopAvg} · {shopStats.total} shop reviews
      </span>
    </ReviewSummaryButton>
  );
}
