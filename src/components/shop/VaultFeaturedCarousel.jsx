import React from 'react';
import PlannerShowcaseCarousel from './PlannerShowcaseCarousel';

/**
 * Auto-scrolling showcase of vault best sellers.
 */
export default function VaultFeaturedCarousel({ editions, fadeColor = '#ffffff' }) {
  return (
    <PlannerShowcaseCarousel
      items={editions}
      marqueeId="vault-marquee"
      durationSec={55}
      fadeColor={fadeColor}
      showDescription={false}
      hint="Hover to pause · Our most-loved covers from the archive."
    />
  );
}
