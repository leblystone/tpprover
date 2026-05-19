import React, { useState } from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import ShopSubNav from '../components/shop/ShopSubNav';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';

const SHOP_BG = '#EDE9E3';

// Past limited editions — populate with real data / images as you have them
const EDITIONS = [
  { name: 'In the Clouds', year: '2024', desc: 'Dreamy pastel cloud cover. Sold out in 48 hours.', tag: 'Sold Out' },
  { name: 'Dune', year: '2024', desc: 'Warm sand tones inspired by desert landscapes.', tag: 'Sold Out' },
  { name: 'Skyline', year: '2024', desc: 'Minimal sage — the clean slate for serious researchers.', tag: 'Sold Out' },
  { name: 'Alchemist Bloom', year: '2024', desc: 'Botanical florals meet research precision.', tag: 'Sold Out' },
  { name: 'Strata', year: '2023', desc: 'Bold layered earth tones. A cult favorite.', tag: 'Archived' },
  { name: 'Umber', year: '2023', desc: 'Muted warm brown — understated and elegant.', tag: 'Archived' },
  { name: 'Amino Axis', year: '2023', desc: 'Dark cartographic cover. The most requested re-release.', tag: 'Archived' },
  { name: 'Serum', year: '2023', desc: 'Navy with teal accents. The original fan favorite.', tag: 'Archived' },
];

const COMMUNITY_QUOTES = [
  { quote: "I've gone through 6 planners now. My research is more organized than my doctor's notes.", author: 'Sarah M.', community: 'GLP-1 Research Community' },
  { quote: "Ordered 12 for my entire coaching cohort. Everyone started their protocols the same week.", author: 'Coach Daniella R.', community: 'Peptide Protocol Coaches' },
  { quote: "The Vault is what made me trust the brand. Seeing the history of drops showed me this isn't just a side hustle.", author: 'Marcus T.', community: 'Serum Research Group' },
  { quote: "Dune was my first. I've been on the waitlist for every drop since.", author: 'Priya K.', community: 'Independent Researcher' },
];

const TAG_STYLES = {
  'Sold Out': { bg: '#F5F2EE', color: '#9B958D' },
  'Archived': { bg: '#F0ECE8', color: '#B5A99A' },
  'Limited': { bg: '#EBF4F1', color: '#7F9E95' },
};

export default function ShopVault() {
  const { cartCount } = useCart();
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ['All', '2024', '2023'];
  const visible = activeFilter === 'All' ? EDITIONS : EDITIONS.filter(e => e.year === activeFilter);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} />
      <ShopSubNav />

      {/* Hero */}
      <div className="bg-white border-b py-16 px-5 text-center" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>The Vault</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
          Every Drop. Every Story.
        </h1>
        <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
          A living archive of every PEP Planner edition ever released — and the communities that made them meaningful. This is where the research gets personal.
        </p>
      </div>

      {/* Past editions */}
      <div className="py-14 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#9B958D' }}>Past Editions</h2>
            <div className="flex gap-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase transition-all"
                  style={activeFilter === f
                    ? { backgroundColor: '#7F9E95', color: 'white' }
                    : { backgroundColor: 'white', color: '#9B958D', border: '1px solid #DDE6DE' }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visible.map(ed => (
              <div key={ed.name} className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: '#DDE6DE' }}>
                {/* Placeholder image area */}
                <div className="aspect-[3/4] flex items-center justify-center" style={{ backgroundColor: SHOP_BG }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-center px-3" style={{ color: '#C4BBB0' }}>
                    {ed.name}
                  </p>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-xs font-bold leading-tight" style={{ color: '#2F3B3A' }}>{ed.name}</h3>
                    <span className="text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
                      style={TAG_STYLES[ed.tag] || TAG_STYLES['Archived']}>
                      {ed.tag}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: '#9B958D' }}>{ed.desc}</p>
                  <p className="text-[9px] mt-2 font-bold tracking-wider uppercase" style={{ color: '#C4BBB0' }}>{ed.year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Community quotes */}
      <div className="bg-white border-t border-b py-16 px-5" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-10 text-center" style={{ color: '#9B958D' }}>From the Community</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {COMMUNITY_QUOTES.map(({ quote, author, community }) => (
              <div key={author} className="rounded-2xl p-6 border" style={{ borderColor: '#DDE6DE', backgroundColor: SHOP_BG }}>
                <p className="text-sm leading-relaxed mb-4 italic" style={{ color: '#2F3B3A' }}>"{quote}"</p>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#2F3B3A' }}>{author}</p>
                  <p className="text-[10px] tracking-wide" style={{ color: '#9B958D' }}>{community}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 px-5 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>Be Part of the Next Drop</p>
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#2F3B3A' }}>New editions drop seasonally.</h2>
        <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: '#6B7575' }}>
          Follow along and be first to know when a new cover goes live.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/shop"
            className="px-8 py-3 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase text-white"
            style={{ backgroundColor: '#7F9E95', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.12)' }}>
            Shop Current Collection
          </Link>
          <Link to="/shop/custom"
            className="px-8 py-3 rounded-lg text-[11px] font-bold tracking-[0.15em] uppercase border"
            style={{ borderColor: '#DDE6DE', color: '#2F3B3A', backgroundColor: 'white' }}>
            Request a Custom Edition
          </Link>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
