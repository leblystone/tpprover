import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { CaretDown } from '@phosphor-icons/react';
import logo from '../../assets/tpp_logo.png';
import { themes, defaultThemeName } from '../../theme/themes';
import PublicMobileNavDrawer from './PublicMobileNavDrawer';

const SHOP_SUB_ITEMS = [
  { path: '/shop',                 label: 'Shop All',         end: true },
  { path: '/shop/custom',          label: 'Custom Orders' },
  { path: '/shop/wholesale',       label: 'Bulk & Wholesale' },
  { path: '/shop/group-discounts', label: 'Group Discounts' },
  { path: '/shop/vault',           label: 'The Vault' },
];

const NAV_ITEMS = [
  { path: '/',        label: 'Home' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/shop',    label: 'Shop', hasChildren: true },
  { path: '/faq',     label: 'FAQ' },
];

export default function LandingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = themes[defaultThemeName];
  const [open, setOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const shopRef = useRef(null);
  const shopCloseTimer = useRef(null);

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const close = () => setOpen(false);

  const openShop = () => {
    clearTimeout(shopCloseTimer.current);
    setShopOpen(true);
  };

  const scheduleCloseShop = () => {
    clearTimeout(shopCloseTimer.current);
    shopCloseTimer.current = setTimeout(() => setShopOpen(false), 150);
  };

  useEffect(() => () => clearTimeout(shopCloseTimer.current), []);

  useEffect(() => {
    if (!shopOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShopOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shopOpen]);

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
                decoding="async"
                fetchpriority="high"
                draggable={false}
                className="h-[52px] w-[52px] shrink-0 object-contain select-none"
                style={{
                  imageRendering: 'auto',
                  filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.15))',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  WebkitTransform: 'translateZ(0)',
                }}
              />
            </button>

            {/* Log In + Sign Up */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => { close(); navigate('/login'); }}
                className="text-xs font-bold uppercase transition-opacity hover:opacity-60"
                style={{ color: theme.primary, letterSpacing: '0.12em' }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { close(); navigate('/login?trial=true'); }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase shadow-sm btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: '#FFFFFF', letterSpacing: '0.12em' }}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-center justify-between h-[72px] relative">
            {/* Left — primary nav */}
            <nav className="flex items-center gap-5 z-10 pr-20" aria-label="Primary">
              {NAV_ITEMS.map(({ path, label, hasChildren }) => {
                const active = isActive(path);
                const linkStyle = {
                  color: active ? theme.primaryDark || theme.primary : theme.text,
                  fontWeight: active ? 700 : 600,
                  letterSpacing: '0.12em',
                  textDecoration: 'none',
                };
                if (hasChildren) {
                  return (
                    <div
                      key={path}
                      ref={shopRef}
                      className="relative"
                      onMouseEnter={openShop}
                      onMouseLeave={scheduleCloseShop}
                    >
                      <button
                        type="button"
                        aria-expanded={shopOpen}
                        aria-haspopup="true"
                        onClick={() => setShopOpen((o) => !o)}
                        className={`public-nav-link flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold uppercase${active ? ' is-active' : ''}`}
                        style={linkStyle}
                      >
                        {label}
                        <CaretDown
                          size={12}
                          weight="bold"
                          style={{
                            opacity: 0.55,
                            transition: 'transform 0.2s',
                            transform: shopOpen ? 'rotate(180deg)' : 'none',
                          }}
                        />
                      </button>
                      {shopOpen && (
                        <div
                          className="absolute left-0 top-full pt-1 z-[110]"
                          onMouseEnter={openShop}
                          onMouseLeave={scheduleCloseShop}
                        >
                          <div
                            className="min-w-[220px] py-2 rounded-xl shadow-lg"
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #DDE6DE',
                            }}
                          >
                            {SHOP_SUB_ITEMS.map(({ path: sp, label: sl, end }) => {
                              const subActive = end
                                ? location.pathname === sp
                                : location.pathname.startsWith(sp);
                              return (
                                <Link
                                  key={sp}
                                  to={sp}
                                  onClick={() => setShopOpen(false)}
                                  className={`public-nav-link block mx-1.5 px-3 py-2.5 rounded-lg text-sm font-bold uppercase${subActive ? ' is-active' : ''}`}
                                  style={{
                                    color: subActive ? theme.primaryDark || theme.primary : theme.text,
                                    letterSpacing: '0.1em',
                                    textDecoration: 'none',
                                  }}
                                >
                                  {sl}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`public-nav-link px-3 py-2 rounded-lg text-sm font-bold uppercase${active ? ' is-active' : ''}`}
                    style={linkStyle}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Center — logo (absolutely centered, independent of nav/auth width) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0"
              >
                <img
                  src={logo}
                  alt="The Pep Planner"
                  decoding="async"
                  fetchpriority="high"
                  draggable={false}
                  className="h-14 w-14 shrink-0 object-contain select-none"
                  style={{
                    imageRendering: 'auto',
                    filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.13))',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    WebkitTransform: 'translateZ(0)',
                  }}
                />
              </button>
            </div>

            {/* Right — auth */}
            <div className="flex items-center justify-end gap-5 z-10 pl-20 ml-auto">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-bold uppercase transition-opacity hover:opacity-60"
                style={{ color: theme.primary, letterSpacing: '0.12em' }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => navigate('/login?trial=true')}
                className="px-5 py-2 rounded-lg text-sm font-bold uppercase shadow-md hover:shadow-lg btn-primary-inset"
                style={{ backgroundColor: theme.primary, color: '#FFFFFF', letterSpacing: '0.12em' }}
              >
                Sign Up
              </button>
            </div>
          </div>

        </div>
      </header>

      <PublicMobileNavDrawer open={open} onClose={close} theme={theme} />
    </>
  );
}
