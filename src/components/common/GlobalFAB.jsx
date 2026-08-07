import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
} from 'framer-motion';
import { Syringe, TrendUp, ShoppingCart, Package, Plus } from '@phosphor-icons/react';
import { X } from 'lucide-react';
import { hapticsLight, hapticsMedium } from '../../utils/haptics';

const FAB_HIDDEN_PATHS = [
  '/app/settings',
  '/app/account',
  '/app/calendar',
  '/app/admin',
];

const FAB_COLOR = '#3a5550';
const FAB_SIZE = 56;

/** One-time eye-catcher on FAB sheet → Scan Label */
const SCAN_LABEL_SPOTLIGHT_KEY = 'tpp_scan_label_spotlight_done_v1';

function isScanLabelSpotlightDone() {
  try {
    return localStorage.getItem(SCAN_LABEL_SPOTLIGHT_KEY) === '1';
  } catch {
    return true;
  }
}

function markScanLabelSpotlightDone() {
  try {
    localStorage.setItem(SCAN_LABEL_SPOTLIGHT_KEY, '1');
  } catch {
    /* ignore */
  }
}

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
    ? pageActionItems.map((item) => ({
        label: item.label,
        Icon: item.Icon || item.icon || Plus,
        onClick: () => {
          const run = item.onClick;
          closeSheet();
          // Defer so Framer drag release + sheet exit don't swallow the open
          queueMicrotask(() => { run?.(); });
        },
      }))
    : homeDialActions;

  const hasScanLabelAction = useMemo(() => {
    if (!hasPageMenu) return false;
    return pageActionItems.some((a) => a?.label === 'Scan Label');
  }, [hasPageMenu, pageActionItems]);

  const [showScanLabelSpotlight, setShowScanLabelSpotlight] = useState(false);
  const [scanLabelSpotlightAnchor, setScanLabelSpotlightAnchor] = useState(null);
  const scanLabelBtnRef = useRef(null);
  const scanLabelTipRef = useRef(null);

  const dismissScanLabelSpotlight = useCallback(() => {
    markScanLabelSpotlightDone();
    setShowScanLabelSpotlight(false);
    setScanLabelSpotlightAnchor(null);
  }, []);

  useEffect(() => {
    if (!open || !hasScanLabelAction) {
      setShowScanLabelSpotlight(false);
      return undefined;
    }
    if (isScanLabelSpotlightDone()) return undefined;
    const t = setTimeout(() => setShowScanLabelSpotlight(true), 650);
    return () => clearTimeout(t);
  }, [open, hasScanLabelAction]);

  useEffect(() => {
    const onPreview = () => {
      try {
        localStorage.removeItem(SCAN_LABEL_SPOTLIGHT_KEY);
      } catch {
        /* ignore */
      }
      if (open && hasScanLabelAction) setShowScanLabelSpotlight(true);
    };
    window.addEventListener('tpp:dev-preview-scan-label-spotlight', onPreview);
    return () => window.removeEventListener('tpp:dev-preview-scan-label-spotlight', onPreview);
  }, [open, hasScanLabelAction]);

  useEffect(() => {
    if (!showScanLabelSpotlight) {
      setScanLabelSpotlightAnchor(null);
      return undefined;
    }
    const measure = () => {
      const btn = scanLabelBtnRef.current;
      if (!btn) {
        setScanLabelSpotlightAnchor(null);
        return;
      }
      const r = btn.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        setScanLabelSpotlightAnchor(null);
        return;
      }
      setScanLabelSpotlightAnchor({
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        width: r.width,
        height: r.height,
      });
    };
    measure();
    const t = setTimeout(measure, 80);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [showScanLabelSpotlight, open]);

  useEffect(() => {
    if (!showScanLabelSpotlight) return undefined;
    const onPointerDown = (e) => {
      const tip = scanLabelTipRef.current;
      const btn = scanLabelBtnRef.current;
      const target = e.target;
      if (tip && tip.contains(target)) return;
      if (btn && (btn === target || btn.contains(target))) return;
      dismissScanLabelSpotlight();
    };
    const attach = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 50);
    return () => {
      clearTimeout(attach);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [showScanLabelSpotlight, dismissScanLabelSpotlight]);

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
                    ? { left: 0, right: 0, bottom: 0, width: '100%', maxHeight: 'min(88vh, 640px)', borderRadius: '28px 28px 0 0', backgroundColor: sheetBg, y: 0 }
                    : { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: from.borderRadius, backgroundColor: FAB_COLOR, y: 0 }
                }
                animate={{
                  left: 0,
                  right: 0,
                  top: 'auto',
                  bottom: 0,
                  width: '100%',
                  height: 'auto',
                  maxHeight: 'min(88vh, 640px)',
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
                    className="px-3 flex flex-col gap-1.5"
                    style={{ paddingBottom: 'calc(4.5rem + max(1rem, env(safe-area-inset-bottom, 0px)))' }}
                  >
                    {dialActions.map((action, i) => {
                      const Icon = action.Icon;
                      const isScanLabel = action.label === 'Scan Label';
                      const spotlightHere = showScanLabelSpotlight && isScanLabel;
                      return (
                        <motion.button
                          key={action.label}
                          ref={isScanLabel ? scanLabelBtnRef : undefined}
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            hapticsLight();
                            if (spotlightHere) dismissScanLabelSpotlight();
                            action.onClick?.();
                          }}
                          className={`flex items-center gap-3.5 w-full text-left px-3.5 py-3.5 rounded-2xl touch-manipulation select-none active:scale-[0.98] transition-transform ${spotlightHere ? 'tpp-scan-label-spotlight-btn' : ''}`}
                          style={{
                            background: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            border: spotlightHere
                              ? `1.5px solid ${theme.primary || FAB_COLOR}`
                              : `1px solid ${borderSubtle}`,
                            color: textColor,
                            boxShadow: spotlightHere ? `0 0 0 2px ${(theme.primary || FAB_COLOR)}33` : undefined,
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...contentSpr, delay: reduceMotion ? 0 : 0.05 + i * 0.04 }}
                        >
                          <span
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: `${theme.primary || FAB_COLOR}22` }}
                          >
                            <Icon size={22} weight="duotone" color={theme.primary || FAB_COLOR} />
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

  const scanLabelSpotlightPortal =
    showScanLabelSpotlight && scanLabelSpotlightAnchor
      ? createPortal(
          (() => {
            const primary = theme?.primary || FAB_COLOR;
            const tipBg = theme?.isDark ? 'rgba(20,25,33,0.98)' : '#ffffff';
            const tipText = theme?.text || '#1f2937';
            const tipBorder = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
            const tipW = 150;
            const padX = 4;
            const padY = 2;
            const rowCx = scanLabelSpotlightAnchor.left + scanLabelSpotlightAnchor.width / 2;
            const ovalLeft = Math.max(4, scanLabelSpotlightAnchor.left - padX);
            const ovalTop = Math.max(4, scanLabelSpotlightAnchor.top - padY);
            const ovalW = scanLabelSpotlightAnchor.width + padX * 2;
            const ovalH = Math.max(scanLabelSpotlightAnchor.height + padY * 2, 36);
            let tipLeft = rowCx - tipW / 2;
            tipLeft = Math.max(8, Math.min(tipLeft, window.innerWidth - tipW - 8));
            const arrowLeft = Math.max(14, Math.min(rowCx - tipLeft, tipW - 14));
            const tipH = 78;
            const tipTop = Math.max(8, scanLabelSpotlightAnchor.top - tipH - 10);
            return (
              <>
                <div
                  aria-hidden
                  className="fixed z-[10050] pointer-events-none tpp-scan-label-spotlight-oval"
                  style={{
                    top: ovalTop,
                    left: ovalLeft,
                    width: ovalW,
                    height: ovalH,
                    borderRadius: 18,
                    boxShadow: `0 0 0 2px ${primary}`,
                  }}
                />
                <div
                  className="fixed z-[10051] pointer-events-none"
                  style={{
                    top: tipTop,
                    left: tipLeft,
                    width: tipW,
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <div
                    ref={scanLabelTipRef}
                    className="pointer-events-auto rounded-xl shadow-2xl border px-3.5 pt-3 pb-3.5 relative text-center"
                    style={{ backgroundColor: tipBg, borderColor: tipBorder }}
                  >
                    <span
                      aria-hidden
                      className="absolute -bottom-1.5 w-3 h-3 rotate-45 border-r border-b"
                      style={{
                        backgroundColor: tipBg,
                        borderColor: tipBorder,
                        left: arrowLeft,
                        transform: 'translateX(-50%) rotate(45deg)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissScanLabelSpotlight();
                      }}
                      className="absolute top-2 right-2 p-0.5 opacity-40 hover:opacity-70 transition-opacity"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" style={{ color: tipText }} />
                    </button>
                    <div className="flex flex-col items-center gap-1.5 px-1">
                      <span
                        className="text-[11px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-md"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(90,110,101,0.85)' : '#4a5f56',
                          color: 'rgba(255,255,255,0.95)',
                        }}
                      >
                        New
                      </span>
                      <p className="text-sm font-semibold leading-snug" style={{ color: tipText }}>
                        Scan Label
                      </p>
                    </div>
                  </div>
                </div>
                <style>{`
                  @keyframes tppScanLabelOval {
                    0%, 100% { transform: scale(1, 1); opacity: 0.95; }
                    50% { transform: scale(1.01, 1.04); opacity: 0.4; }
                  }
                  .tpp-scan-label-spotlight-oval {
                    animation: tppScanLabelOval 1.4s ease-out infinite;
                    transform-origin: center center;
                  }
                  @keyframes tppScanLabelBtn {
                    0%, 100% { transform: scale(1); }
                    40% { transform: scale(1.015); }
                    70% { transform: scale(1.005); }
                  }
                  .tpp-scan-label-spotlight-btn {
                    animation: tppScanLabelBtn 1.4s ease-in-out infinite;
                  }
                `}</style>
              </>
            );
          })(),
          document.body
        )
      : null;

  // ── FAB button ────────────────────────────────────────────────────────────
  return (
    <>
      {sheetPortal}
      {scanLabelSpotlightPortal}

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
