import React from 'react';
import PlannerShowcaseCarousel from './PlannerShowcaseCarousel';
import { CUSTOM_SHOWCASE } from '../../data/customShowcase';

/**
 * Horizontal carousel of real custom orders (shared on Custom + Vault pages).
 */
export default function CustomWorkShowcaseSection({
  title,
  marqueeId = 'custom-work-marquee',
  durationSec = 50,
  hint = 'Hover to pause',
  showDescription = false,
  showMeta = false,
}) {
  return (
    <div className="bg-white border-b py-10 sm:py-14" style={{ borderColor: '#DDE6DE' }}>
      <div className="max-w-6xl mx-auto mb-8 px-5 text-center">
        <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#9B958D' }}>
          {title}
        </h2>
      </div>
      <PlannerShowcaseCarousel
        items={CUSTOM_SHOWCASE}
        marqueeId={marqueeId}
        durationSec={durationSec}
        fadeColor="#ffffff"
        hint={hint}
        showDescription={showDescription}
        showMeta={showMeta}
      />
    </div>
  );
}
