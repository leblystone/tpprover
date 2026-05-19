import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bag } from '@phosphor-icons/react';
import { themes, defaultThemeName } from '../../theme/themes';
import logo from '../../assets/tpp_logo.png';
import CartBadge from './CartBadge';

const theme = themes[defaultThemeName];
const navLinks = [['/', 'THE APP'], ['/shop', 'SHOP'], ['/pricing', 'PRICING'], ['/faq', 'FAQ']];
const shopSubLinks = [
  ['/shop', 'Shop All'],
  ['/shop/custom', 'Custom Orders'],
  ['/shop/wholesale', 'Bulk & Wholesale'],
  ['/shop/group-discounts', 'Group Discounts'],
  ['/shop/vault', 'The Vault'],
];

export default function ShopHeader({ cartCount = 0, onCartOpen }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[105] bg-white border-b" style={{ borderColor: '#DDE6DE' }}>
        <div className="w-full px-5 md:max-w-7xl md:mx-auto">

          {/* Mobile */}
          <div className="flex lg:hidden items-center justify-between h-[60px]">
            <button
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
              className="flex flex-col justify-center gap-[6px] w-9 h-9"
            >
              <span style={{ display:'block', width:20, height:1.5, borderRadius:1, backgroundColor:theme.text,
                transform: mobileOpen ? 'translateY(3.75px) rotate(45deg)' : 'none', transition:'transform 0.2s' }} />
              <span style={{ display:'block', width:20, height:1.5, borderRadius:1, backgroundColor:theme.text,
                transform: mobileOpen ? 'translateY(-3.75px) rotate(-45deg)' : 'none', transition:'transform 0.2s' }} />
            </button>

            <button onClick={() => navigate('/')} className="absolute left-1/2 -translate-x-1/2">
              <img src={logo} alt="The Pep Planner" className="h-11 w-11 object-contain"
                style={{ filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.12))' }} />
            </button>

            <div className="flex items-center gap-1">
              <button onClick={() => navigate('/login?trial=true')}
                className="px-3 py-1.5 rounded text-[11px] font-bold tracking-wide uppercase text-white"
                style={{ backgroundColor: theme.primary }}>
                Sign Up
              </button>
              {onCartOpen && (
                <button onClick={onCartOpen} className="relative p-2" style={{ color: theme.text }}>
                  <Bag size={22} weight="duotone" className="pointer-events-none" />
                  {cartCount > 0 && (
                    <CartBadge count={cartCount} className="absolute -top-0.5 -right-0.5 pointer-events-none" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center h-[68px]">
            {/* Logo left */}
            <button onClick={() => navigate('/')} className="flex-shrink-0 mr-10">
              <img src={logo} alt="The Pep Planner" className="h-[52px] w-[52px] object-contain"
                style={{ filter:'drop-shadow(0 3px 8px rgba(0,0,0,0.13))' }} />
            </button>

            {/* Nav center */}
            <nav className="flex items-center gap-8 flex-1">
              {navLinks.map(([path, label]) => (
                <Link key={path} to={path}
                  className="text-[11px] font-bold tracking-[0.13em] transition-opacity hover:opacity-60"
                  style={{ color: theme.text, textDecoration: path === '/shop' ? 'underline' : 'none', textUnderlineOffset: 4 }}>
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right */}
            <div className="flex items-center gap-5">
              <button onClick={() => navigate('/login')}
                className="text-[11px] font-bold tracking-[0.13em] uppercase transition-opacity hover:opacity-60"
                style={{ color: theme.text }}>
                LOGIN
              </button>
              {onCartOpen && (
                <button onClick={onCartOpen}
                  className="relative flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] uppercase transition-opacity hover:opacity-70"
                  style={{ color: theme.text }}>
                  <Bag size={20} weight="duotone" className="pointer-events-none" />
                  CART
                  {cartCount > 0 && (
                    <CartBadge count={cartCount} className="absolute -top-1.5 left-3.5 pointer-events-none" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 top-[60px] z-[103] bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-[60px] left-0 bottom-0 z-[104] w-60 bg-white shadow-2xl flex flex-col">
            <nav className="flex-1 py-5 px-4 overflow-y-auto">
              {/* Top-level links */}
              <div className="space-y-0.5 mb-4">
                {navLinks.map(([path, label]) => (
                  <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                    className="block px-3 py-3 text-[11px] font-bold tracking-widest uppercase"
                    style={{ color: theme.text }}>
                    {label}
                  </Link>
                ))}
              </div>

              {/* Shop sub-pages */}
              <div className="border-t pt-4" style={{ borderColor: `${theme.text}12` }}>
                <p className="px-3 mb-2 text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: theme.textLight }}>
                  Shop Collections
                </p>
                <div className="space-y-0.5">
                  {shopSubLinks.map(([path, label]) => (
                    <Link key={path} to={path} onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2.5 text-[11px] font-semibold tracking-wide rounded-lg transition-colors"
                      style={{ color: theme.text }}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
            <div className="p-4 border-t space-y-2" style={{ borderColor: theme.border }}>
              <button onClick={() => { setMobileOpen(false); navigate('/login?trial=true'); }}
                className="w-full py-2.5 rounded text-[11px] font-bold tracking-wide uppercase text-white"
                style={{ backgroundColor: theme.primary }}>
                Sign Up Free
              </button>
              <button onClick={() => { setMobileOpen(false); navigate('/login'); }}
                className="w-full py-2.5 rounded text-[11px] font-bold tracking-wide uppercase border"
                style={{ color: theme.primary, borderColor: theme.primary }}>
                Login
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
