import React, { useState } from 'react';
import { motion } from 'framer-motion';
import StarRating from './StarRating';
import ReviewSourceBadge from './ReviewSourceBadge';

export default function ReviewCard({ review, compact = false, index = 0 }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = review.photos || [];
  const hasPhotos = photos.length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`flex flex-col bg-white rounded-2xl border shadow-sm overflow-hidden h-full ${
        compact ? 'min-w-[280px] max-w-[320px] sm:min-w-[300px]' : ''
      }`}
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
                  onClick={() => setPhotoIdx(i)}
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

        <p
          className={`flex-1 leading-relaxed ${compact ? 'text-sm line-clamp-5' : 'text-[15px]'}`}
          style={{ color: '#2F3B3A' }}
        >
          “{review.body}”
        </p>

        <footer className="mt-4 pt-3 border-t" style={{ borderColor: '#EFF2EE' }}>
          <p className="text-sm font-semibold" style={{ color: '#2F3B3A' }}>
            {review.authorName}
          </p>
          {review.authorLocation && (
            <p className="text-[11px] mt-0.5 tracking-wide" style={{ color: '#9B958D' }}>
              {review.authorLocation}
            </p>
          )}
        </footer>
      </div>
    </motion.article>
  );
}
