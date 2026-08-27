import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_LINKS, PAPER_PLANNER_LINKS } from '../../config/publicNavConfig';

export { APP_LINKS, PAPER_PLANNER_LINKS };

const linkClass = 'public-nav-link block px-4 py-3.5 text-sm font-bold tracking-[0.12em] uppercase rounded-lg';

function SectionLabel({ children, theme }) {
  return (
    <div className="px-4 mb-4">
      <p
        className="text-sm uppercase"
        style={{
          color: theme.textLight,
          fontFamily: 'Poppins, system-ui, sans-serif',
          fontWeight: 300,
          letterSpacing: '0.18em',
        }}
      >
        {children}
      </p>
      <div
        className="mt-2.5"
        style={{
          width: 32,
          height: 1.5,
          borderRadius: 1,
          backgroundColor: theme.primary,
          opacity: 0.55,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

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
        width: 280,
        backgroundColor: '#FFFFFF',
        boxShadow: '4px 0 24px rgba(0,0,0,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <SectionLabel theme={theme}>The App</SectionLabel>
        <div className="space-y-1 mb-8">
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

      <div className="px-4 py-4 border-t flex gap-2.5" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate('/login?trial=true');
          }}
          className="flex-1 py-3 rounded-lg text-xs font-bold tracking-[0.12em] uppercase text-white"
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
          className="flex-1 py-3 rounded-lg text-xs font-bold tracking-[0.12em] uppercase border"
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
    <div className="border-t pt-7" style={{ borderColor: `${theme.text}12` }}>
      <SectionLabel theme={theme}>Paper Planners</SectionLabel>
      <div className="space-y-1">
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

