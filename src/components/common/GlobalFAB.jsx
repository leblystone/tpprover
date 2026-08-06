import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import { Syringe, TrendUp, ShoppingCart, Package, Plus } from '@phosphor-icons/react';
import { hapticsLight, hapticsMedium } from '../../utils/haptics';

const FAB_HIDDEN_PATHS = [
  '/app/settings',
  '/app/account',
  '/app/calendar',
  '/app/admin',
];

const FAB_COLOR = '#3a5550';
const FAB_SIZE = 56;

// Spring: quick rise with a hair of overshoot, settles firm
const SHEET_SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.85 };
const SNAP_SPRING  = { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 };
const CLOSE_SPRING = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 };
const CONTENT_SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 };
const FLING_VELOCITY = 700;   // px/s
const DISMISS_DISTANCE = 110; // px

function isHomePath(pathname) {
  return pathname === '/app' || pathname === '/app/' || pathname === '/app/dashboard';
}

function FabPlusIcon() {
  return (
    <>
      <span aria-hidden style={{
        position: 'absolute', width: 22, height: 2.5, borderRadius: 2,
        backgroundColor: '#fff', top: '50%', left: '50%', transformOrigin: 'center',
        transform: 'translate(-50%, -50%)',
      }} />
      <span aria-hidden style={{
        position: 'absolute', width: 22, height: 2.5, borderRadius: 2,
        backgroundColor: '#fff', top: '50%', left: '50%', transformOrigin: 'center',
        transform: 'translate(-50%, -50%) rotate(90deg)',
      }} />
    </>
  );
}

function readFabRect(el) {
  if (el) {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: Math.min(r.width, r.height) / 2 };
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
  return { left: vw - 16 - FAB_SIZE, top: vh - 86 - FAB_SIZE, width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 };
}

export default function GlobalFAB({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const fabBtnRef = useRef(null);
  const closingRef = useRef(false);

  const [pageAction, setPageAction]         = useState(null);
  const [pageActionItems, setPageActionItems] = useState([]);
  const [pageActionDisabled, setPageActionDisabled] = useState(false);

  const [open, setOpen]     = useState(false);
  const [origin, setOrigin] = useState(null);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Ref to the sheet element so we can programmatically snap it back
  const sheetRef = useRef(null);

  const pathHidden    = FAB_HIDDEN_PATHS.some((p) => location.pathname.startsWith(p));
  const isHome        = isHomePath(location.pathname);
  const hasPageMenu   = pageActionItems.length > 0;
  const hasSingleAction = !!pageAction && !hasPageMenu;
  const showFab  = !pathHidden && (isHome || hasPageMenu || hasSingleAction);
  const usesDial = hasPageMenu || (isHome && !hasSingleAction);

  const spring       = reduceMotion ? { duration: 0.2 } : SHEET_SPRING;
  const contentSpr   = reduceMotion ? { duration: 0.15 } : CONTENT_SPRING;
  const sheetBg      = theme?.isDark ? 'rgba(24, 28, 36, 0.98)' : (theme?.cardBackground || '#FFFFFF');
  const textColor    = theme?.text || '#111';
  const borderSubtle = theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // ── Event listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const onSet = (e) => {
      const { onActionClick, actionItems, actionDisabled } = e.detail || {};
      setPageAction(() => onActionClick ?? null);
      setPageActionItems(Array.isArray(actionItems) ? actionItems : []);
      setPageActionDisabled(!!actionDisabled);
    };
    const onClear = () => { setPageAction(null); setPageActionItems([]); setPageActionDisabled(false); };
    window.addEventListener('tpp:set-topbar-tabs', onSet);
    window.addEventListener('tpp:clear-topbar-tabs', onClear);
    return () => { window.removeEventListener('tpp:set-topbar-tabs', onSet); window.removeEventListener('tpp:clear-topbar-tabs', onClear); };
  }, []);

  useEffect(() => {
    closingRef.current = false;
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = (e) => {
      const y = e.target.scrollTop || window.scrollY;
      if (y <= 20) { setVisible(true); lastScrollY.current = y; return; }
      if (y > lastScrollY.current + 15) {
        setVisible(false);
        if (open) { closingRef.current = false; setOpen(false); }
        lastScrollY.current = y;
      } else if (y < lastScrollY.current - 15) {
        setVisible(true); lastScrollY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('tpp:modal-open'));
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const isVisible = (visible || open) && showFab;

  // ── Open / close ──────────────────────────────────────────────────────────
  const openSheet = useCallback(() => {
    closingRef.current = false;
    setOrigin(readFabRect(fabBtnRef.current));
    setOpen(true);
    hapticsLight();
  }, []);

  const closeSheet = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const homeDialActions = [
    { label: 'Start Protocol', Icon: Syringe,       onClick: () => { closeSheet(); navigate('/app/protocols?new=true'); } },
    { label: 'Log Metric',     Icon: TrendUp,        onClick: () => { closeSheet(); isHomePath(location.pathname) ? window.dispatchEvent(new CustomEvent('tpp:fab-log-metric')) : navigate('/app?metric=true'); } },
    { label: 'New Order',      Icon: ShoppingCart,   onClick: () => { closeSheet(); navigate('/app/orders?new=true'); } },
    { label: 'Add Stockpile',  Icon: Package,        onClick: () => { closeSheet(); navigate('/app/stockpile?add=true'); } },
  ];

  const dialActions = hasPageMenu
    ? pageActionItems.map((item) => ({ label: item.label, Icon: item.Icon || item.icon || Plus, onClick: () => { closeSheet(); item.onClick?.(); } }))
    : homeDialActions;

  const handleFabPress = () => {
    if (hasSingleAction) { pageAction(); return; }
    if (!usesDial) return;
    if (open) closeSheet();
    else openSheet();
  };

  // ── Drag handlers — framer owns `y` internally via drag="y" ──────────────
  const handleDragEnd = (_e, info) => {
    const flung = info.velocity.y > FLING_VELOCITY;
    const pulled = info.offset.y > DISMISS_DISTANCE;

    if (flung || pulled) {
      hapticsMedium();
      closeSheet();
      return;
    }
    // Snap back — framer will apply the `animate` target (y:0) with its spring
    // after drag is released when we don't call setOpen(false)
  };

  const from = origin || readFabRect(null);
  const fabHidden = open && usesDial;

  // ── Portal ────────────────────────────────────────────────────────────────
  const sheetPortal = usesDial
    ? createPortal(
        <AnimatePresence onExitComplete={() => { closingRef.current = false; }}>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                key="fab-backdrop"
                className="fixed inset-0 z-[9990] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.28 }}
                style={{
                  background: theme.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.32)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
                onClick={() => { hapticsMedium(); closeSheet(); }}
              />

              {/* Sheet — morphs from FAB circle on open, slides off on close */}
              <motion.div
                key="fab-sheet"
                className="fixed z-[9991] lg:hidden flex flex-col overflow-hidden"
                style={{
                  boxShadow: theme.isDark
                    ? '0 -12px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 -12px 40px rgba(0,0,0,0.18)',
                  touchAction: 'none',
                }}
                initial={
                  reduceMotion
                    ? { left: 0, right: 0, bottom: 0, width: '100%', maxHeight: 'min(72vh, 520px)', borderRadius: '28px 28px 0 0', backgroundColor: sheetBg, y: 0 }
                    : { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: from.borderRadius, backgroundColor: FAB_COLOR, y: 0 }
                }
                animate={{
                  left: 0,
                  right: 0,
                  top: 'auto',
                  bottom: 0,
                  width: '100%',
                  height: 'auto',
                  maxHeight: 'min(72vh, 520px)',
                  borderRadius: '28px 28px 0 0',
                  backgroundColor: sheetBg,
                  y: 0,
                  transition: spring,
                }}
                exit={{
                  y: typeof window !== 'undefined' ? window.innerHeight : 900,
                  transition: CLOSE_SPRING,
                }}
                ref={sheetRef}
                drag="y"
                dragConstraints={{ top: 0, bottom: typeof window !== 'undefined' ? window.innerHeight : 900 }}
                dragElastic={{ top: 0.04, bottom: 0 }}
                dragMomentum={false}
                dragTransition={SNAP_SPRING}
                onDragEnd={handleDragEnd}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-11 h-1 rounded-full opacity-35" style={{ backgroundColor: textColor }} />
                </div>

                {/* Header + content fade in after morph settles */}
                <motion.div
                  className="flex flex-col min-h-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ ...contentSpr, delay: reduceMotion ? 0 : 0.07 }}
                >
                  <div className="px-5 pt-1 pb-2 flex items-center justify-end flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { hapticsLight(); closeSheet(); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center touch-manipulation"
                      style={{ background: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textColor }}
                      aria-label="Close"
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>×</span>
                    </button>
                  </div>

                  <div
                    className="px-3 flex flex-col gap-1.5 overflow-y-auto overscroll-contain"
                    style={{ touchAction: 'pan-y', paddingBottom: 'calc(4.5rem + max(1rem, env(safe-area-inset-bottom, 0px)))' }}
                  >
                    {dialActions.map((action, i) => {
                      const Icon = action.Icon;
                      return (
                        <motion.button
                          key={action.label}
                          type="button"
                          onClick={action.onClick}
                          className="flex items-center gap-3.5 w-full text-left px-3.5 py-3.5 rounded-2xl touch-manipulation select-none active:scale-[0.98] transition-transform"
                          style={{
                            background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            border: `1px solid ${borderSubtle}`,
                            color: textColor,
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...contentSpr, delay: reduceMotion ? 0 : 0.05 + i * 0.04 }}
                        >
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: `${theme.primary || FAB_COLOR}22` }}
                          >
                            <Icon size={18} weight="duotone" color={theme.primary || FAB_COLOR} />
                          </span>
                          <span className="font-semibold text-[15px]">{action.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  // ── FAB button ────────────────────────────────────────────────────────────
  return (
    <>
      {sheetPortal}

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
        <button
          ref={fabBtnRef}
          type="button"
          onClick={handleFabPress}
          disabled={pageActionDisabled}
          className="w-14 h-14 rounded-full relative flex-shrink-0 touch-manipulation select-none active:scale-90"
          style={{
            background: pageActionDisabled ? '#aaa' : FAB_COLOR,
            boxShadow: '0 6px 28px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1.5px 0 rgba(0,0,0,0.25)',
            opacity: pageActionDisabled ? 0.4 : fabHidden ? 0 : 1,
            pointerEvents: fabHidden ? 'none' : 'auto',
            transition: 'opacity 80ms linear',
          }}
          aria-label={hasSingleAction ? 'Add' : 'Quick actions'}
          aria-expanded={open && usesDial}
        >
          <FabPlusIcon />
        </button>
      </div>
    </>
  );
}
