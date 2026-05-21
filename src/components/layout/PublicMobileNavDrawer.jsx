import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/** Paper planner shop links — shared with landing mobile drawer */
export const PAPER_PLANNER_LINKS = [
  { path: '/shop', label: 'Shop All' },
  { path: '/shop/reviews', label: 'Reviews' },
  { path: '/shop/custom', label: 'Custom Orders' },
  { path: '/shop/wholesale', label: 'Bulk & Wholesale' },
  { path: '/shop/group-discounts', label: 'Group Discounts' },
  { path: '/shop/vault', label: 'The Vault' },
];

const APP_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/faq', label: 'FAQ' },
];

const linkClass = 'block px-6 py-2.5 text-[11px] font-bold tracking-widest uppercase rounded-lg';

/**
 * Mobile slide-out nav — matches landing page drawer (The App + Paper Planners).
 */
export default function PublicMobileNavDrawer({ open, onClose, theme }) {
  const navigate = useNavigate();

  return (
    <>
      <div
        className="fixed top-16 inset-x-0 bottom-0 z-[103] lg:hidden transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden="true"
      />
      <DrawerPanel open={open} theme={theme} onClose={onClose} navigate={navigate} />
    </>
  );
}

function DrawerPanel({ open, theme, onClose, navigate }) {
  return (
    <div
      className="fixed top-16 left-0 bottom-0 z-[104] lg:hidden flex flex-col"
      style={{
        width: 260,
        backgroundColor: '#FFFFFF',
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <nav className="flex-1 overflow-y-auto py-5 px-4">
        <p
          className="px-3 mb-2 text-[11px] font-bold tracking-[0.15em] uppercase"
          style={{ color: theme.textLight }}
        >
          The App
        </p>
        <div className="space-y-0.5 mb-5">
          {APP_LINKS.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              onClick={onClose}
              className={linkClass}
              style={{ color: theme.text }}
            >
              {label}
            </Link>
          ))}
        </div>

        <PaperPlannersSection theme={theme} onClose={onClose} />
      </nav>

      <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/login?trial=true');
          }}
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
          onClick={() => {
            onClose();
            navigate('/login');
          }}
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
  );
}

function PaperPlannersSection({ theme, onClose }) {
  return (
    <div className="border-t pt-4" style={{ borderColor: `${theme.text}12` }}>
      <p
        className="px-3 mb-2 text-[11px] font-bold tracking-[0.15em] uppercase"
        style={{ color: theme.textLight }}
      >
        Paper Planners
      </p>
      <div className="space-y-0.5">
        {PAPER_PLANNER_LINKS.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            onClick={onClose}
            className={linkClass}
            style={{ color: theme.text }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

