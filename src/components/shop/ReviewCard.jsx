import React, { useState } from 'react';
import { motion } from 'framer-motion';
import StarRating from './StarRating';
import ReviewSourceBadge from './ReviewSourceBadge';

export default function ReviewCard({ review, compact = false, index = 0, onClick }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = review.photos || [];
  const hasPhotos = photos.length > 0;
  const hasBody = Boolean(review.body?.trim());
  const productName = review.productName?.trim();
  const interactive = Boolean(onClick);

  const card = (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.36), ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col bg-white rounded-2xl border shadow-sm overflow-hidden h-full text-left w-full ${
        compact ? 'min-w-[260px] max-w-[300px] sm:min-w-[280px]' : ''
      } ${interactive ? 'cursor-pointer transition-shadow duration-200 hover:shadow-md hover:border-[#7F9E95]/40' : ''}`}
      style={{ borderColor: '#DDE6DE' }}
    >
      {hasPhotos && (
        <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: '#EDE9E3' }}>
          <img
            src={photos[photoIdx]}
            alt=""
            className="w-full h-full object-cover transition-opacity duration-500"
            loading="lazy"
          />
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Photo ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPhotoIdx(i);
                  }}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === photoIdx ? 18 : 6,
                    backgroundColor: i === photoIdx ? '#7F9E95' : 'rgba(255,255,255,0.85)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`flex flex-col flex-1 ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <StarRating value={review.rating} size={compact ? 16 : 18} />
          <ReviewSourceBadge review={review} size="sm" />
        </div>

        {productName && (
          <p className="text-sm font-semibold mb-2 leading-snug" style={{ color: '#5F7F76' }}>
            {productName}
          </p>
        )}

        {hasBody ? (
          <p
            className={`flex-1 leading-relaxed ${compact ? 'text-sm line-clamp-5' : 'text-[15px]'}`}
            style={{ color: '#2F3B3A' }}
          >
            “{review.body}”
          </p>
        ) : (
          <p className="flex-1 text-sm" style={{ color: '#9B958D' }}>
            Rating only — no written review
          </p>
        )}

        <footer className="mt-auto pt-4 border-t flex flex-col items-end text-right gap-1" style={{ borderColor: '#EFF2EE' }}>
          {review.verifiedPurchase && (
            <span
              className="text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#E8EFE9', color: '#5F7F76' }}
            >
              Verified purchase
            </span>
          )}
          <p
            className={`italic ${compact ? 'text-sm' : 'text-[15px]'}`}
            style={{ color: '#5F7F76', fontFamily: 'Georgia, "Playfair Display", serif' }}
          >
            — {review.authorName}
          </p>
          {review.authorLocation && (
            <p className="text-[11px] mt-0.5 tracking-wide italic" style={{ color: '#9B958D' }}>
              {review.authorLocation}
            </p>
          )}
        </footer>
      </div>
    </motion.article>
  );

  if (!interactive) return card;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="block text-left rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7F9E95] focus-visible:ring-offset-2"
      aria-label={`Read review by ${review.authorName}`}
    >
      {card}
    </div>
  );
}
