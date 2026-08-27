import React from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import VaultFeaturedCarousel from '../components/shop/VaultFeaturedCarousel';
import CustomWorkShowcaseSection from '../components/shop/CustomWorkShowcaseSection';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { VAULT_BEST_SELLERS } from '../data/vaultBestSellers';
import { usePageSEO } from '../utils/pageSEO';
import useShopPageView from '../utils/useShopPageView';

/** Landing-aligned sage palette */
const PAGE_BG = '#D7E0D9';
const HERO_BG = '#EFF2EE';
const WHITE = '#FFFFFF';
const WARM_GREIGE = '#F5F5F0';
const SAGE_CTA = '#6B8B78';

export default function ShopVault() {
  usePageSEO();
  useShopPageView('vault');
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
      <ShopHeader cartCount={cartCount} />

      <section className="relative overflow-hidden py-12 sm:py-16 px-5 text-center" style={{ backgroundColor: HERO_BG }}>
        <div
          className="pointer-events-none absolute -top-24 right-0 w-64 h-64 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: '#7F9E95' }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#D5E0DC' }}
        />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>
            The Vault
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
            Our History
          </h1>
          <p className="text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
            Welcome to the archived designs of the Pep Planner — a look at creative history. These covers laid the
            groundwork for everything we build today, preserved for inspiration and appreciation.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14" style={{ backgroundColor: WHITE }}>
        <div className="max-w-6xl mx-auto mb-8 px-5 text-center">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#9B958D' }}>
            Best Sellers
          </h2>
        </div>
        <VaultFeaturedCarousel editions={VAULT_BEST_SELLERS} fadeColor={WHITE} />
        <p className="text-center text-[10px] mt-8 px-6 max-w-2xl mx-auto leading-relaxed" style={{ color: '#B5A99A' }}>
          The Pep Planner is an independent product. We don&apos;t endorse or have any affiliation with companies,
          brands, or groups that might be mentioned in our planner designs.
        </p>
      </section>

      <CustomWorkShowcaseSection
        eyebrow="Community"
        title="Custom work for the community"
        subtitle="Covers we've made with groups and brands — explore archived editions in The Vault above."
        marqueeId="vault-community-marquee"
        durationSec={55}
        sectionBg={WARM_GREIGE}
        fadeColor={WARM_GREIGE}
        showVaultCta={false}
      />

      <section className="py-16 px-5 text-center" style={{ backgroundColor: SAGE_CTA }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Miss a drop?
        </p>
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
          I want it — let&apos;s make it.
        </h2>
        <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.92)' }}>
          New editions drop seasonally. Shop what&apos;s live now, or request a custom run inspired by the vault.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/shop"
            className="px-8 py-3 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#7F9E95',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            Shop Current Collection
          </Link>
          <Link
            to="/shop/custom"
            className="px-8 py-3 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase border-2"
            style={{ borderColor: '#FFFFFF', color: '#FFFFFF', backgroundColor: 'transparent' }}
          >
            Custom Pep Planner
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
