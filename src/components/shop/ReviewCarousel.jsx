import React, { useRef, useState, useEffect, useMemo } from 'react';
import ReviewCard from './ReviewCard';

const PRIMARY = '#7F9E95';

/**
 * Horizontal review strip — CSS marquee auto-drift + zigzag offsets.
 * Pauses on hover / touch. Respects prefers-reduced-motion.
 */
export default function ReviewCarousel({
  reviews,
  onReviewClick,
  fadeColor = '#f0eee7',
  className = '',
  cardCompact = true,
  maxHeight = 'min(22rem, 52dvh)',
  autoPlay = true,
}) {
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchPauseRef = useRef(null);

  const loopReviews = useMemo(() => {
    if (reviews.length < 2) return reviews;
    return [...reviews, ...reviews];
  }, [reviews]);

  const canAnimate = autoPlay && reviews.length >= 2;
  /** ~5s per card; slower when OS requests reduced motion */
  const durationSec = reduceMotion
    ? Math.max(90, reviews.length * 10)
    : Math.max(36, reviews.length * 5);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const pauseTouch = () => {
    setPaused(true);
    if (touchPauseRef.current) clearTimeout(touchPauseRef.current);
    touchPauseRef.current = setTimeout(() => setPaused(false), 4000);
  };

  if (!reviews.length) return null;

  return (
    <div
      className={`relative -mx-1 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={pauseTouch}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-14 z-10"
        style={{ background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-14 z-10"
        style={{ background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
      />

      <div
        className={`overflow-hidden pb-3 ${canAnimate ? '' : 'overflow-x-auto'}`}
        style={{ minHeight: maxHeight }}
      >
        <div
          className={`review-carousel-marquee flex gap-4 sm:gap-5 w-max items-center px-1 ${
            canAnimate ? 'review-carousel-marquee--animate' : ''
          } ${paused && canAnimate ? 'review-carousel-marquee--paused' : ''}`}
          style={
            canAnimate
              ? { animationDuration: `${durationSec}s` }
              : undefined
          }
        >
          {loopReviews.map((review, i) => {
            const zigUp = i % 2 === 0;
            return (
              <div
                key={`${review.id}-${i}`}
                className="flex-shrink-0 flex"
                style={{
                  alignSelf: zigUp ? 'flex-start' : 'flex-end',
                  marginTop: zigUp ? 0 : '2.25rem',
                  marginBottom: zigUp ? '2.25rem' : 0,
                }}
              >
                <ReviewCard
                  review={review}
                  compact={cardCompact}
                  index={i % reviews.length}
                  onClick={onReviewClick ? () => onReviewClick(review) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[10px] mt-2 tracking-wide" style={{ color: `${PRIMARY}99` }}>
        {canAnimate
          ? 'Auto-scrolling · hover to pause · tap a card to read'
          : 'Swipe for more · tap a card to read'}
      </p>

      <style>{`
        @keyframes review-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .review-carousel-marquee--animate {
          animation-name: review-marquee-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .review-carousel-marquee--paused {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
