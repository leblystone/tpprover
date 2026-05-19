import React from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import VaultFeaturedCarousel from '../components/shop/VaultFeaturedCarousel';
import CustomWorkShowcaseSection from '../components/shop/CustomWorkShowcaseSection';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { VAULT_BEST_SELLERS } from '../data/vaultBestSellers';

const SHOP_BG = '#EDE9E3';

export default function ShopVault() {
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} />

      <div className="bg-white border-b py-12 sm:py-16 px-5 text-center" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>
          The Vault
        </p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
          The Pep Planner; History
        </h1>
        <p className="text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
          Welcome to the archived designs of the Pep Planner — a look at creative history. These covers laid the
          groundwork for everything we build today, preserved for inspiration and appreciation.
        </p>
      </div>

      <div className="bg-white border-b py-10 sm:py-14" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-6xl mx-auto mb-8 px-5 text-center">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#9B958D' }}>
            Best Sellers
          </h2>
        </div>
        <VaultFeaturedCarousel editions={VAULT_BEST_SELLERS} />
        <p className="text-center text-[10px] mt-8 px-6 max-w-2xl mx-auto leading-relaxed" style={{ color: '#B5A99A' }}>
          The Pep Planner is an independent product. We don&apos;t endorse or have any affiliation with companies,
          brands, or groups that might be mentioned in our planner designs.
        </p>
      </div>

      <CustomWorkShowcaseSection
        title="Custom Work for the Community"
        marqueeId="vault-community-marquee"
        durationSec={55}
      />

      <div className="py-16 px-5 text-center bg-white border-t" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>
          Miss a drop?
        </p>
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#2F3B3A' }}>
          I want it — let&apos;s make it.
        </h2>
        <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: '#6B7575' }}>
          New editions drop seasonally. Shop what&apos;s live now, or request a custom run inspired by the vault.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/shop"
            className="px-8 py-3 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase text-white"
            style={{
              backgroundColor: '#7F9E95',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            Shop Current Collection
          </Link>
          <Link
            to="/shop/custom"
            className="px-8 py-3 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase border"
            style={{ borderColor: '#DDE6DE', color: '#2F3B3A', backgroundColor: 'white' }}
          >
            Custom Pep Planner
          </Link>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
