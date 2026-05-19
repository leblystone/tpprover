import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  House,
  Tag,
  BookOpen,
  Question,
  Storefront,
  PencilLine,
  UsersThree,
  Vault,
  Scales,
  CaretDown,
} from '@phosphor-icons/react';
import logo from '../../assets/tpp_logo.png';
import { themes, defaultThemeName } from '../../theme/themes';

const SHOP_SUB_ITEMS = [
  { path: '/shop',                 label: 'Shop All',         icon: Storefront, end: true },
  { path: '/shop/custom',          label: 'Custom Orders',    icon: PencilLine },
  { path: '/shop/wholesale',       label: 'Bulk & Wholesale', icon: Scales },
  { path: '/shop/group-discounts', label: 'Group Discounts',  icon: UsersThree },
  { path: '/shop/vault',           label: 'The Vault',        icon: Vault },
];

const NAV_ITEMS = [
  { path: '/',        label: 'Home',    icon: House },
  { path: '/pricing', label: 'Pricing', icon: Tag },
  { path: '/shop',    label: 'Shop',    icon: Storefront, hasChildren: true },
  { path: '/faq',     label: 'FAQ',     icon: Question },
];

// Shop hidden from mobile drawer until ready; everything else (Home, Pricing, FAQ) shows
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !['/resources'].includes(item.path)
);

export default function LandingHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = themes[defaultThemeName];
  const [open, setOpen] = useState(false);
  const onShop = location.pathname.startsWith('/shop');
  const [shopExpanded, setShopExpanded] = useState(onShop);

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
                <img
                  src={logo}
                  alt="The Pep Planner"
                  decoding="async"
                  fetchpriority="high"
                  draggable={false}
                  className="h-20 w-20 shrink-0 object-contain select-none"
                  style={{
                    imageRendering: 'auto',
                    filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    WebkitTransform: 'translateZ(0)',
                  }}
                />
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

      {/* ─── Desktop floating side nav ──────────────────────────────────── */}
      <nav
        className="landing-sidenav hidden lg:flex flex-col gap-0.5 fixed left-0 top-1/2 z-[102] py-3 px-2"
        style={{
          transform: 'translateY(-50%)',
          backgroundColor: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '0 14px 14px 0',
          border: '1px solid rgba(221,230,222,0.8)',
          borderLeft: 'none',
          boxShadow: '2px 4px 20px rgba(0,0,0,0.07)',
        }}
      >
        {NAV_ITEMS.map(({ path, label, icon: Icon, hasChildren }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          if (hasChildren) {
            return (
              <React.Fragment key={path}>
                <button
                  type="button"
                  onClick={() => setShopExpanded(e => !e)}
                  className="landing-sidenav-link flex items-center gap-0 rounded-lg transition-all duration-200 w-full text-left"
                  style={{
                    color: active ? theme.primary : theme.textLight,
                    backgroundColor: active ? `${theme.primary}14` : 'transparent',
                    fontWeight: active ? 600 : 500,
                    padding: '8px 10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={20} weight={active ? 'fill' : 'duotone'} style={{ flexShrink: 0 }} />
                  <span className="landing-sidenav-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {label}
                    <CaretDown size={11} weight="bold" style={{ transition: 'transform 0.2s', transform: shopExpanded ? 'rotate(180deg)' : 'rotate(0deg)', opacity: 0.6 }} />
                  </span>
                </button>
                {shopExpanded && SHOP_SUB_ITEMS.map(({ path: sp, label: sl, icon: SI, end }) => {
                  const subActive = end ? location.pathname === sp : location.pathname.startsWith(sp) && sp !== '/';
                  return (
                    <Link
                      key={sp}
                      to={sp}
                      title={sl}
                      className="landing-sidenav-link flex items-center gap-0 rounded-lg transition-all duration-200"
                      style={{
                        color: subActive ? theme.primary : theme.textLight,
                        backgroundColor: subActive ? `${theme.primary}14` : 'transparent',
                        fontWeight: subActive ? 600 : 400,
                        padding: '5px 10px 5px 14px',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <SI size={16} weight={subActive ? 'fill' : 'duotone'} style={{ flexShrink: 0 }} />
                      <span className="landing-sidenav-label">{sl}</span>
                    </Link>
                  );
                })}
              </React.Fragment>
            );
          }
          return (
            <Link
              key={path}
              to={path}
              title={label}
              className="landing-sidenav-link flex items-center gap-0 rounded-lg transition-all duration-200"
              style={{
                color: active ? theme.primary : theme.textLight,
                backgroundColor: active ? `${theme.primary}14` : 'transparent',
                fontWeight: active ? 600 : 500,
                padding: '8px 10px',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={20} weight={active ? 'fill' : 'duotone'} style={{ flexShrink: 0 }} />
              <span className="landing-sidenav-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ─── Drawer (starts below header) ────────────────────────────────── */}
      <div
        className="fixed top-16 left-0 bottom-0 z-[104] lg:hidden flex flex-col"
        style={{
          width: 260,
          backgroundColor: '#FFFFFF',
          boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-5 px-4">
          {/* The App */}
          <p className="px-3 mb-2 text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: theme.textLight }}>
            The App
          </p>
          <div className="space-y-0.5 mb-5">
            {MOBILE_NAV_ITEMS.filter(i => !i.hasChildren).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={close}
                  className="block px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase rounded-lg"
                  style={{ color: theme.text }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Paper Planners */}
          <div className="border-t pt-4" style={{ borderColor: `${theme.text}12` }}>
            <p className="px-3 mb-2 text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: theme.textLight }}>
              Paper Planners
            </p>
            <div className="space-y-0.5">
              {SHOP_SUB_ITEMS.map(({ path: sp, label: sl }) => (
                <Link
                  key={sp}
                  to={sp}
                  onClick={close}
                  className="block px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase rounded-lg"
                  style={{ color: theme.text }}
                >
                  {sl}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* CTA */}
        <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: theme.border }}>
          <button
            type="button"
            onClick={() => { close(); navigate('/login?trial=true'); }}
            className="flex-1 py-2 rounded text-[10px] font-bold tracking-wide uppercase text-white"
            style={{
              backgroundColor: theme.primary,
              boxShadow: '0 2px 8px rgba(95,127,118,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { close(); navigate('/login'); }}
            className="flex-1 py-2 rounded text-[10px] font-bold tracking-wide uppercase border"
            style={{
              color: theme.primary,
              borderColor: theme.primary,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
          >
            Log In
          </button>
        </div>
      </div>
    </>
  );
}
