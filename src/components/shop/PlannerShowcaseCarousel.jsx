import React from 'react';

function ShowcaseCard({ item, showDescription = true, showMeta = true }) {
  const meta = item.meta ?? item.year;

  return (
    <article
      className="w-[188px] sm:w-[220px] flex-shrink-0 bg-white rounded-2xl overflow-hidden border shadow-sm"
      style={{ borderColor: '#DDE6DE' }}
    >
      <div className="relative aspect-[3/4] overflow-hidden" style={{ backgroundColor: '#EDE9E3' }}>
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover object-center"
          loading="lazy"
          draggable={false}
        />
        {item.badge && (
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide text-white max-w-[85%] truncate"
            style={{ backgroundColor: 'rgba(47, 59, 58, 0.82)' }}
            title={item.badge}
          >
            {item.badge}
          </span>
        )}
      </div>
      <div className={`p-3.5 ${!showDescription && !showMeta ? 'flex items-center justify-center min-h-[52px]' : ''}`}>
        <h3
          className={`text-sm font-bold leading-tight tracking-wide ${showDescription || showMeta ? 'mb-1' : ''}`}
          style={{ color: '#6B7575' }}
        >
          {item.name}
        </h3>
        {showDescription && item.desc && (
          <p className="text-[11px] leading-relaxed" style={{ color: '#6B7575' }}>
            {item.desc}
          </p>
        )}
        {showMeta && meta && (
          <p className="text-[9px] mt-2 font-bold tracking-wider uppercase" style={{ color: '#C4BBB0' }}>
            {meta}
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * Auto-scrolling horizontal planner showcase — continuous marquee, no manual scroll.
 */
export default function PlannerShowcaseCarousel({
  items,
  hint = 'Hover to pause',
  fadeColor = '#ffffff',
  durationSec = 55,
  marqueeId = 'planner-showcase',
  showDescription = true,
  showMeta = true,
}) {
  const trackItems = [...items, ...items];
  const trackClass = `${marqueeId}-track`;
  const wrapClass = `${marqueeId}-wrap`;

  return (
    <section className="relative">
      <style>{`
        @keyframes ${marqueeId}-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .${trackClass} {
          animation: ${marqueeId}-scroll ${durationSec}s linear infinite;
          width: max-content;
          will-change: transform;
        }
        .${wrapClass}:hover .${trackClass} {
          animation-play-state: paused;
        }
        .${wrapClass} {
          overflow-x: hidden;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .${wrapClass}::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-16 z-10"
        style={{ background: `linear-gradient(to right, ${fadeColor} 0%, transparent 100%)` }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-16 z-10"
        style={{ background: `linear-gradient(to left, ${fadeColor} 0%, transparent 100%)` }}
      />

      <div className={`${wrapClass} overflow-y-hidden py-2`}>
        <div className={`${trackClass} flex flex-nowrap gap-4 sm:gap-5 px-4`}>
          {trackItems.map((item, i) => (
            <ShowcaseCard
              key={`${item.id}-${i}`}
              item={item}
              showDescription={showDescription}
              showMeta={showMeta}
            />
          ))}
        </div>
      </div>

      {hint && (
        <p className="text-center text-[11px] mt-6 px-6 max-w-xl mx-auto leading-relaxed" style={{ color: '#9B958D' }}>
          {hint}
        </p>
      )}
    </section>
  );
}
