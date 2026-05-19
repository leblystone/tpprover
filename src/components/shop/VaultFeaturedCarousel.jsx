import React from 'react';
import PlannerShowcaseCarousel from './PlannerShowcaseCarousel';

/**
 * Auto-scrolling showcase of vault best sellers.
 */
export default function VaultFeaturedCarousel({ editions }) {
  return (
    <PlannerShowcaseCarousel
      items={editions}
      marqueeId="vault-marquee"
      durationSec={55}
      fadeColor="#ffffff"
      hint="Hover to pause · Our most-loved covers from the archive."
    />
  );
}
