import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bag, UserCircle } from '@phosphor-icons/react';
import { themes, defaultThemeName } from '../../theme/themes';
import logo from '../../assets/tpp_logo.png';
import CartBadge from './CartBadge';
import PublicMobileNavDrawer from '../layout/PublicMobileNavDrawer';

const theme = themes[defaultThemeName];
const navLinks = [['/', 'THE APP'], ['/shop', 'SHOP'], ['/pricing', 'PRICING'], ['/faq', 'FAQ']];

function AccountLoginButton({ onNavigate, className = '', size = 26 }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.();
        navigate('/login');
      }}
      aria-label="Log in to your account"
      className={`p-2 rounded-lg transition-opacity hover:opacity-70 ${className}`}
      style={{ color: theme.primary }}
    >
      <UserCircle size={size} weight="duotone" />
    </button>
  );
}

export default function ShopHeader({ cartCount = 0, onCartOpen }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-[105] bg-white border-b" style={{ borderColor: '#DDE6DE' }}>
        <div className="w-full px-4 md:max-w-7xl md:mx-auto md:px-8">

          {/* Mobile */}
          <div className="flex lg:hidden items-center justify-between h-16 relative">
            <button
              type="button"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
              className="flex flex-col justify-center items-center w-10 h-10 flex-shrink-0 -ml-1 gap-[7px]"
            >
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: theme.text,
                  transformOrigin: 'center',
                  transition: 'transform 0.25s ease',
                  transform: mobileOpen ? 'translateY(4.5px) rotate(45deg)' : 'none',
                }}
              />
              <span
                style={{
                  display: 'block',
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: theme.text,
                  transformOrigin: 'center',
                  transition: 'transform 0.25s ease',
                  transform: mobileOpen ? 'translateY(-4.5px) rotate(-45deg)' : 'none',
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => { close(); navigate('/'); }}
              className="absolute left-1/2 -translate-x-1/2"
            >
              <img
                src={logo}
                alt="The Pep Planner"
                className="h-[52px] w-[52px] object-contain"
                style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}
              />
            </button>

            <div className="flex items-center gap-0.5">
              <AccountLoginButton onNavigate={close} size={24} />
              {onCartOpen && (
                <button type="button" onClick={onCartOpen} className="relative p-2" style={{ color: theme.text }}>
                  <Bag size={22} weight="duotone" />
                  {cartCount > 0 && (
                    <CartBadge count={cartCount} className="absolute -top-0.5 -right-0.5 pointer-events-none" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Desktop — account icon left of logo */}
          <div className="hidden lg:flex items-center h-[68px]">
            <div className="flex items-center gap-4 flex-shrink-0 mr-8">
              <AccountLoginButton size={28} />
              <button type="button" onClick={() => navigate('/')} className="flex-shrink-0">
                <img
                  src={logo}
                  alt="The Pep Planner"
                  className="h-[52px] w-[52px] object-contain"
                  style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.13))' }}
                />
              </button>
            </div>

            <nav className="flex items-center gap-5 flex-1">
              {navLinks.map(([path, label]) => (
                <Link
                  key={path}
                  to={path}
                  className="public-nav-link px-3 py-2 rounded-lg text-[11px] font-bold tracking-[0.13em] uppercase"
                  style={{ color: theme.text }}
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-5">
              {onCartOpen && (
                <button
                  type="button"
                  onClick={onCartOpen}
                  className="relative flex items-center gap-2 text-[11px] font-bold tracking-[0.13em] uppercase transition-opacity hover:opacity-70"
                  style={{ color: theme.text }}
                >
                  <Bag size={20} weight="duotone" />
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

      <PublicMobileNavDrawer open={mobileOpen} onClose={close} theme={theme} />
    </>
  );
}
