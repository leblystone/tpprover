import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, ArrowSquareOut } from '@phosphor-icons/react';
import StarRating from './StarRating';
import ReviewSourceBadge from './ReviewSourceBadge';
import { getReviewSource, getReviewVerifyUrl } from '../../config/reviewSources';

const PRIMARY = '#7F9E95';
const TEXT = '#2F3B3A';

export default function ReviewDetailModal({ review, open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !review) return null;

  const source = getReviewSource(review.source);
  const verifyUrl = getReviewVerifyUrl(review);
  const hasBody = Boolean(review.body?.trim());
  const photos = review.photos || [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close review"
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl border"
        style={{ backgroundColor: '#fff', borderColor: '#DDE6DE' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/95 backdrop-blur-sm" style={{ borderColor: '#EFF2EE' }}>
          <h2 id="review-modal-title" className="text-sm font-semibold" style={{ color: TEXT }}>
            Customer review
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full transition-opacity hover:opacity-70"
            style={{ backgroundColor: '#f0eee7' }}
            aria-label="Close"
          >
            <X size={18} style={{ color: TEXT }} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {photos.length > 0 && (
            <div className="rounded-xl overflow-hidden aspect-[4/3]" style={{ backgroundColor: '#EDE9E3' }}>
              <img src={photos[0]} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <StarRating value={review.rating} size={20} />
            <ReviewSourceBadge review={review} size="md" />
          </div>

          {review.productName?.trim() && (
            <p className="text-sm font-semibold leading-snug" style={{ color: '#5F7F76' }}>
              {review.productName}
            </p>
          )}

          {hasBody ? (
            <p className="text-[15px] leading-relaxed" style={{ color: TEXT }}>
              “{review.body}”
            </p>
          ) : (
            <p className="text-sm" style={{ color: '#9B958D' }}>
              Rating only — no written review
            </p>
          )}

          <p
            className="text-right italic text-[15px]"
            style={{ color: '#5F7F76', fontFamily: 'Georgia, "Playfair Display", serif' }}
          >
            — {review.authorName}
            {review.authorLocation ? ` · ${review.authorLocation}` : ''}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Link
              to="/shop/reviews"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[11px] font-bold tracking-[0.12em] uppercase text-white transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: PRIMARY }}
            >
              All reviews
              <ArrowRight size={14} />
            </Link>
            {verifyUrl && (
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full text-[11px] font-bold tracking-[0.12em] uppercase border transition-colors hover:bg-[#f0eee7]"
                style={{ borderColor: `${source.brandColor}50`, color: source.brandColor }}
              >
                Verify on {source.shortLabel || source.label}
                <ArrowSquareOut size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
