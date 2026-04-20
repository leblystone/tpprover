import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';
import { themes, defaultThemeName } from '../../theme/themes';
import logo from '../../assets/tpp_logo.png';
import { useCart } from '../../context/CartContext';

function NavButton({ to, children, className = '', style = {} }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`text-left bg-transparent border-0 p-0 cursor-pointer ${className}`}
      style={{ color: 'inherit', ...style }}
    >
      {children}
    </button>
  );
}

export default function PublicNavigation() {
  const theme = themes[defaultThemeName];
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartCount } = useCart();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/resources', label: 'Resources' },
    { path: '/faq', label: 'FAQ' },
    { path: '/shop', label: 'Shop' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav
        className="border-b sticky top-0 z-[105]"
        style={{ backgroundColor: '#FFFFFF', borderColor: theme.border }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 md:justify-between relative">

            {/* ── Mobile: hamburger left ── */}
            <div className="md:hidden flex-none">
              <button
                type="button"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((o) => !o)}
                className="flex flex-col justify-center items-center w-10 h-10 gap-0"
                style={{ color: theme.text }}
              >
                {/* Two bars → X animation */}
                <span
                  className="block transition-all duration-300 origin-center"
                  style={{
                    width: 22,
                    height: 2,
                    backgroundColor: theme.text,
                    transform: mobileOpen
                      ? 'translateY(5px) rotate(45deg)'
                      : 'translateY(-3px) rotate(0deg)',
                  }}
                />
                <span
                  className="block transition-all duration-300 origin-center"
                  style={{
                    width: 22,
                    height: 2,
                    backgroundColor: theme.text,
                    transform: mobileOpen
                      ? 'translateY(-3px) rotate(-45deg)'
                      : 'translateY(3px) rotate(0deg)',
                    opacity: 1,
                  }}
                />
              </button>
            </div>

            {/* ── Logo — mobile: absolute center / desktop: left (flex-none) ── */}
            <div className="flex-1 flex md:flex-none justify-center md:justify-start">
              <Link
                to="/"
                className="flex items-center justify-center md:justify-start"
                onClick={() => setMobileOpen(false)}
              >
                <img
                  src={logo}
                  alt="The Pep Planner"
                  className="h-10 w-10 rounded-full object-cover"
                />
              </Link>
            </div>

            {/* ── Desktop nav links (center) ── */}
            <div className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-sm font-medium transition-opacity"
                  style={{ color: isActive(item.path) ? theme.primary : theme.text, opacity: isActive(item.path) ? 1 : undefined }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* ── Right: cart + login (both views) ── */}
            <div className="flex-none flex items-center gap-3">
              <Link
                to="/shop/cart"
                aria-label="Cart"
                className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-gray-100"
              >
                <ShoppingCart className="w-5 h-5" style={{ color: theme.primary }} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* thin divider */}
              <span className="hidden md:block h-5 w-px" style={{ backgroundColor: 'rgba(47,59,58,0.25)' }} />

              <Link
                to="/login"
                className="hidden md:flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-75"
                style={{ color: theme.text }}
              >
                <User className="w-4 h-4" style={{ color: theme.primary }} />
                Sign In
              </Link>

              {/* Mobile: user icon only */}
              <Link
                to="/login"
                aria-label="Sign in"
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-gray-100"
              >
                <User className="w-5 h-5" style={{ color: theme.primary }} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[102] md:hidden transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
        }}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 left-0 h-full z-[104] md:hidden flex flex-col"
        style={{
          width: 260,
          backgroundColor: '#FFFFFF',
          boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Drawer header with logo */}
        <div
          className="flex items-center px-5 h-16 flex-shrink-0 border-b"
          style={{ borderColor: theme.border }}
        >
          <img src={logo} alt="Logo" className="h-9 w-9 rounded-full object-cover mr-3" />
          <span className="text-sm font-semibold" style={{ color: theme.primaryDark }}>
            Pep Planner
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className="flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors mb-0.5"
              style={{
                color: isActive(item.path) ? theme.primary : theme.text,
                backgroundColor: isActive(item.path) ? `${theme.primary}12` : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Drawer footer CTA */}
        <div className="flex-shrink-0 px-4 pb-6 pt-4 border-t" style={{ borderColor: theme.border }}>
          <Link
            to="/login?trial=true"
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors"
            style={{ backgroundColor: theme.primary }}
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </>
  );
}
