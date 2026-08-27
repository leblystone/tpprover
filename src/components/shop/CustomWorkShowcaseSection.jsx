import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import PlannerShowcaseCarousel from './PlannerShowcaseCarousel';
import { CUSTOM_SHOWCASE } from '../../data/customShowcase';

/**
 * Community custom-work showcase — layout aligned with wholesale / bulk sections.
 * Shared on Custom, Vault, and Wholesale pages.
 */
export default function CustomWorkShowcaseSection({
  eyebrow = 'Custom Work',
  title = "We've shipped for the community",
  subtitle = 'Real covers made for clinics, groups, and brands — browse more in The Vault.',
  marqueeId = 'custom-work-marquee',
  durationSec = 50,
  showDescription = false,
  showMeta = false,
  sectionBg = '#FFFFFF',
  fadeColor,
  showVaultCta = true,
}) {
  const edgeFade = fadeColor ?? sectionBg;

  return (
    <section className="border-b py-10 sm:py-12 px-5" style={{ backgroundColor: sectionBg, borderColor: '#DDE6DE' }}>
      <div className="max-w-2xl mx-auto text-center mb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>
          {eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight" style={{ color: '#2F3B3A' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: '#6B7575' }}>
            {subtitle}
          </p>
        )}
      </div>

      <PlannerShowcaseCarousel
        items={CUSTOM_SHOWCASE}
        marqueeId={marqueeId}
        durationSec={durationSec}
        fadeColor={edgeFade}
        hint=""
        showDescription={showDescription}
        showMeta={showMeta}
      />

      {showVaultCta && (
        <div className="flex justify-center mt-8">
          <Link
            to="/shop/vault"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold tracking-[0.12em] uppercase text-white transition-all hover:-translate-y-0.5 group"
            style={{
              backgroundColor: '#2F3B3A',
              boxShadow: '0 4px 14px rgba(47,59,58,0.2)',
            }}
          >
            View The Vault
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
