import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Syringe, TrendUp, ShoppingCart, Package, Plus } from '@phosphor-icons/react';

// Pages where the FAB should be hidden entirely
const FAB_HIDDEN_PATHS = [
  '/app/settings',
  '/app/account',
  '/app/calendar',
  '/app/admin',
];

function isHomePath(pathname) {
  return pathname === '/app' || pathname === '/app/' || pathname === '/app/dashboard';
}

export default function GlobalFAB({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Page-specific action(s) broadcast via tpp:set-topbar-tabs
  const [pageAction, setPageAction] = useState(null); // () => void
  const [pageActionItems, setPageActionItems] = useState([]); // [{ label, onClick, Icon? }]
  const [pageActionDisabled, setPageActionDisabled] = useState(false);

  // Speed-dial state
  const [fabOpen, setFabOpen] = useState(false);

  // Scroll-aware visibility
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  const pathHidden = FAB_HIDDEN_PATHS.some(p => location.pathname.startsWith(p));
  const isHome = isHomePath(location.pathname);
  const hasPageMenu = pageActionItems.length > 0;
  const hasSingleAction = !!pageAction && !hasPageMenu;
  // Show FAB on home (global dial), or when the current page registered an add action
  const showFab = !pathHidden && (isHome || hasPageMenu || hasSingleAction);

  // Listen for whatever action the current page registers via topbar tabs
  useEffect(() => {
    const onSetTabs = (e) => {
      const { onActionClick, actionItems, actionDisabled } = e.detail || {};
      setPageAction(() => onActionClick ?? null);
      setPageActionItems(Array.isArray(actionItems) ? actionItems : []);
      setPageActionDisabled(!!actionDisabled);
    };
    const onClearTabs = () => {
      setPageAction(null);
      setPageActionItems([]);
      setPageActionDisabled(false);
    };
    window.addEventListener('tpp:set-topbar-tabs', onSetTabs);
    window.addEventListener('tpp:clear-topbar-tabs', onClearTabs);
    return () => {
      window.removeEventListener('tpp:set-topbar-tabs', onSetTabs);
      window.removeEventListener('tpp:clear-topbar-tabs', onClearTabs);
    };
  }, []);

  // Close speed dial on route change (page actions come from tpp:set/clear-topbar-tabs)
  useEffect(() => {
    setFabOpen(false);
  }, [location.pathname]);

  // Smart scroll hide/show
  useEffect(() => {
    const onScroll = (e) => {
      const y = e.target.scrollTop || window.scrollY;
      if (y <= 20) { setVisible(true); lastScrollY.current = y; return; }
      if (y > lastScrollY.current + 15) { setVisible(false); setFabOpen(false); lastScrollY.current = y; }
      else if (y < lastScrollY.current - 15) { setVisible(true); lastScrollY.current = y; }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

  const isVisible = (visible || fabOpen) && showFab;
  const closeDial = useCallback(() => setFabOpen(false), []);

  // Home speed-dial actions (only used on dashboard)
  const homeDialActions = [
    {
      label: 'Start Protocol',
      Icon: Syringe,
      onClick: () => {
        closeDial();
        navigate('/app/protocols?new=true');
      },
    },
    {
      label: 'Log Metric',
      Icon: TrendUp,
      onClick: () => {
        closeDial();
        if (isHomePath(location.pathname)) {
          window.dispatchEvent(new CustomEvent('tpp:fab-log-metric'));
        } else {
          navigate('/app?metric=true');
        }
      },
    },
    {
      label: 'New Order',
      Icon: ShoppingCart,
      onClick: () => { closeDial(); navigate('/app/orders?new=true'); },
    },
    {
      label: 'Add Stockpile',
      Icon: Package,
      onClick: () => { closeDial(); navigate('/app/stockpile?add=true'); },
    },
  ];

  const dialActions = hasPageMenu
    ? pageActionItems.map((item) => ({
        label: item.label,
        Icon: item.Icon || item.icon || Plus,
        onClick: () => {
          closeDial();
          item.onClick?.();
        },
      }))
    : homeDialActions;

  const usesDial = hasPageMenu || (isHome && !hasSingleAction);

  const handleFabPress = () => {
    if (hasSingleAction) {
      pageAction();
      return;
    }
    if (usesDial) {
      setFabOpen(o => !o);
    }
  };

  return (
    <>
      {/* Backdrop for speed dial */}
      {fabOpen && usesDial && (
        <div
          className="fixed inset-0 z-[9990] lg:hidden"
          style={{ background: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.28)' }}
          onClick={closeDial}
        />
      )}

      <div
        className="fixed z-[9991] flex flex-col items-end gap-2.5 lg:hidden transition-all duration-300 ease-out"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 0.875rem)',
          right: '1rem',
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(120px) scale(0.9)',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {/* Speed dial satellites */}
        {fabOpen && usesDial && dialActions.map((action, i) => {
          const delay = `${(dialActions.length - 1 - i) * 45}ms`;
          const Icon = action.Icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-2.5 touch-manipulation active:scale-95 transition-transform select-none"
              style={{
                animation: `fab-dial-in 0.22s ease-out ${delay} both`,
                height: '44px',
                paddingLeft: '14px',
                paddingRight: '18px',
                borderRadius: '999px',
                background: theme.isDark ? 'rgba(28,33,42,0.94)' : 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(18px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}`,
                boxShadow: theme.isDark ? '0 4px 20px rgba(0,0,0,0.45)' : '0 4px 20px rgba(0,0,0,0.11)',
                color: theme.text,
                fontWeight: 600,
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${theme.primary}22` }}
              >
                <Icon size={15} weight="duotone" color={theme.primary} />
              </span>
              {action.label}
            </button>
          );
        })}

        {/* Main FAB */}
        <button
          type="button"
          onClick={handleFabPress}
          disabled={pageActionDisabled}
          className="w-14 h-14 rounded-full relative flex-shrink-0 touch-manipulation transition-all duration-300 ease-out select-none active:scale-90"
          style={{
            background: pageActionDisabled ? '#aaa' : '#3a5550',
            boxShadow: '0 6px 28px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1.5px 0 rgba(0,0,0,0.25)',
            opacity: pageActionDisabled ? 0.4 : 1,
          }}
          aria-label={fabOpen ? 'Close quick actions' : (hasSingleAction ? 'Add' : 'Quick actions')}
        >
          {/* Bar 1 */}
          <span style={{
            position: 'absolute', width: 22, height: 2.5, borderRadius: 2,
            backgroundColor: '#fff',
            top: '50%', left: '50%',
            transformOrigin: 'center',
            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
            transform: fabOpen && usesDial
              ? 'translate(-50%, calc(-50% - 5px))'
              : 'translate(-50%, -50%)',
          }} />
          {/* Bar 2 — rotated 90° = vertical arm of + when closed */}
          <span style={{
            position: 'absolute', width: 22, height: 2.5, borderRadius: 2,
            backgroundColor: '#fff',
            top: '50%', left: '50%',
            transformOrigin: 'center',
            transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
            transform: fabOpen && usesDial
              ? 'translate(-50%, calc(-50% + 5px))'
              : 'translate(-50%, -50%) rotate(90deg)',
          }} />
        </button>
      </div>
    </>
  );
}
