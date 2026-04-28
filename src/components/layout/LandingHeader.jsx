import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import logo from '../../assets/tpp_logo.png';
import { themes, defaultThemeName } from '../../theme/themes';

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/shop', label: 'Shop' },
  { path: '/resources', label: 'Resources' },
  { path: '/faq', label: 'FAQ' },
];

// Pricing, Shop, and Resources are WIP — hide from mobile drawer until ready
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !['/pricing', '/shop', '/resources'].includes(item.path)
);

export default function LandingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = themes[defaultThemeName];
  const [open, setOpen] = useState(false);

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const close = () => setOpen(false);

  return (
    <>
      {/* ─── Header bar ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-[105]"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DDE6DE' }}
      >
        <div className="w-full px-4 md:max-w-7xl md:mx-auto md:px-8">

          {/* Mobile — fixed 64px row */}
          <div className="flex lg:hidden items-center justify-between h-16">

            {/* Two-line hamburger → X */}
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
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
                  transform: open ? 'translateY(4.5px) rotate(45deg)' : 'none',
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
                  transform: open ? 'translateY(-4.5px) rotate(-45deg)' : 'none',
                }}
              />
            </button>

            {/* Logo — absolute center */}
            <button
              type="button"
              onClick={() => { close(); navigate('/'); }}
              className="absolute left-1/2 -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0"
            >
              <img
                src={logo}
                alt="The Pep Planner"
                className="rounded-full shadow-sm object-contain"
                style={{ width: 44, height: 44 }}
              />
            </button>

            {/* Log In + Sign Up */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { close(); navigate('/login'); }}
                className="px-2 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: theme.primary }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { close(); navigate('/login?trial=true'); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center justify-between py-3">
            <p
              className="text-sm font-medium tracking-widest uppercase"
              style={{ color: '#9CA3AF', letterSpacing: '0.15em' }}
            >
              Organize Your Research
            </p>
            <div className="flex-1 flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0"
              >
                <img src={logo} alt="Logo" className="rounded-full shadow object-cover" style={{ width: 72, height: 72 }} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ color: theme.primary }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?trial=true')}
                className="px-6 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
              >
                Sign Up
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* ─── Backdrop (below header) ─────────────────────────────────────── */}
      <div
        className="fixed top-16 inset-x-0 bottom-0 z-[103] lg:hidden transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={close}
        aria-hidden="true"
      />

      {/* ─── Drawer (starts below header) ────────────────────────────────── */}
      <div
        className="fixed top-16 left-0 bottom-0 z-[104] lg:hidden flex flex-col"
        style={{
          width: 260,
          backgroundColor: '#FFFFFF',
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {MOBILE_NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={close}
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

        {/* CTA */}
        <div className="flex-shrink-0 px-4 pb-8 pt-4 border-t flex flex-col gap-2" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={() => { close(); navigate('/login?trial=true'); }}
            className="w-full px-4 py-3 rounded-lg font-semibold transition-opacity duration-200"
            style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
          >
            Sign Up Free
          </button>
          <button
            type="button"
            onClick={() => { close(); navigate('/login'); }}
            className="w-full px-4 py-3 rounded-lg font-semibold border transition-opacity duration-200"
            style={{ backgroundColor: 'transparent', color: theme.primary, borderColor: theme.primary }}
          >
            Log In
          </button>
        </div>
      </div>
    </>
  );
}
