 import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { CalendarDots, Flask, ListMagnifyingGlass, ChatCenteredDots, NewspaperClipping, Stack, DotsThreeOutline, ClipboardText, BookOpen, Microscope, Gift } from '@phosphor-icons/react';
import { X } from 'lucide-react';
import ShareIncentiveModal from '../shared/ShareIncentiveModal';
import SearchAIModal from '../search/SearchAIModal';
import { PIP_OPEN_EVENT } from '../../utils/pipOpen';
import navCenterLogo from '../../assets/tpp_nav_center_logo.png';
import navCenterPearlLogo from '../../assets/tpp_nav_center_logo_pearl.png';
import { isNative } from '../../utils/platform';
import { useAppContext } from '../../context/AppContext';
import { useAnnouncementsUnseen } from '../../hooks/useAnnouncementsUnseen';
import { useSupportInbox } from '../../hooks/useSupportInbox';
import { isFeatureEnabled } from '../../config/featureFlags';
import BadgeBump from '../ui/BadgeBump';
import { getResearchMenuItems, getInventoryMenuItems } from '../../config/navigation';
import { getLocalTrackingMode, isSimpleMode } from '../../utils/trackingMode';
import { NAV_TIERS } from '../../config/navigation';
import useSpotlightTransition from '../../hooks/useSpotlightTransition';

/** One-time eye-catcher on Research flyout → Insights */
const INSIGHTS_SPOTLIGHT_KEY = 'tpp_insights_nav_spotlight_done_v1';
/** One-time highlight on the "Medication" term in Supplements & Medication */
const MEDICATION_SPOTLIGHT_KEY = 'tpp_medication_term_spotlight_done_v1';

function isInsightsSpotlightDone() {
  try {
    return localStorage.getItem(INSIGHTS_SPOTLIGHT_KEY) === '1';
  } catch {
    return true;
  }
}

function markInsightsSpotlightDone() {
  try {
    localStorage.setItem(INSIGHTS_SPOTLIGHT_KEY, '1');
  } catch {
    /* ignore */
  }
}

function isMedicationSpotlightDone() {
  try {
    return localStorage.getItem(MEDICATION_SPOTLIGHT_KEY) === '1';
  } catch {
    return true;
  }
}

function markMedicationSpotlightDone() {
  try {
    localStorage.setItem(MEDICATION_SPOTLIGHT_KEY, '1');
  } catch {
    /* ignore */
  }
}

// Haptic feedback helper (works on Capacitor apps)
const triggerHaptic = (style = 'light') => {
  try {
    if (window.Capacitor?.Plugins?.Haptics) {
      if (style === 'light') {
        window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      } else if (style === 'medium') {
        window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
      } else if (style === 'success') {
        window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
      }
    }
  } catch (e) {
    // Haptics not available (web/PWA)
  }
};

/**
 * BottomNavigation Component
 * Native app-style bottom navigation with smooth animations
 * Features:
 * - Glassmorphic design
 * - Haptic feedback
 * - Swipe gestures
 * - Search functionality
 * - iOS/Android native feel
 */
export default function BottomNavigation({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Native apps (iOS/Android) always show mobile bottom nav, even on iPad
  const nativeApp = isNative();
  const hideOnDesktop = nativeApp ? '' : 'lg:hidden';
  const isPearlescent = theme.name === 'Pearlescent';
  const centerNavLogo = isPearlescent ? navCenterPearlLogo : navCenterLogo;
  const { unseenCount: unseenAnnouncementCount } = useAnnouncementsUnseen();
  const { unreadCount: supportUnreadCount } = useSupportInbox();
  const [actionItemCount, setActionItemCount] = useState(0);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [rippleEffect, setRippleEffect] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [pipHandoff, setPipHandoff] = useState(null);
  const [trackingMode, setTrackingMode] = useState(() => getLocalTrackingMode());
  const touchStartY = useRef(null);
  const menuRef = useRef(null);
  const insightsTileRef = useRef(null);
  const insightsTipRef = useRef(null);
  const medicationTermRef = useRef(null);
  const medicationTipRef = useRef(null);
  const [showInsightsSpotlight, setShowInsightsSpotlight] = useState(false);
  const [insightsSpotlightAnchor, setInsightsSpotlightAnchor] = useState(null);
  const [showMedicationSpotlight, setShowMedicationSpotlight] = useState(false);
  const [medicationSpotlightAnchor, setMedicationSpotlightAnchor] = useState(null);

  const dismissInsightsSpotlight = useCallback(() => {
    markInsightsSpotlightDone();
    setShowInsightsSpotlight(false);
  }, []);

  const dismissMedicationSpotlight = useCallback(() => {
    markMedicationSpotlightDone();
    setShowMedicationSpotlight(false);
  }, []);

  const insightsTx = useSpotlightTransition(showInsightsSpotlight);
  const latchedInsightsAnchor = useRef(null);
  if (insightsSpotlightAnchor) latchedInsightsAnchor.current = insightsSpotlightAnchor;
  const insightsPortalAnchor =
    insightsSpotlightAnchor || (insightsTx.mounted ? latchedInsightsAnchor.current : null);

  const medicationTx = useSpotlightTransition(showMedicationSpotlight);
  const latchedMedicationAnchor = useRef(null);
  if (medicationSpotlightAnchor) latchedMedicationAnchor.current = medicationSpotlightAnchor;
  const medicationPortalAnchor =
    medicationSpotlightAnchor || (medicationTx.mounted ? latchedMedicationAnchor.current : null);

  useEffect(() => {
    if (!insightsTx.mounted) setInsightsSpotlightAnchor(null);
  }, [insightsTx.mounted]);

  useEffect(() => {
    if (!medicationTx.mounted) setMedicationSpotlightAnchor(null);
  }, [medicationTx.mounted]);

  useEffect(() => {
    const handler = (e) => {
      const n = e.detail?.count;
      if (typeof n === 'number') setActionItemCount(n);
    };
    window.addEventListener('tpp:action-item-count', handler);
    return () => window.removeEventListener('tpp:action-item-count', handler);
  }, []);

  // Show Insights + Medication spotlights when Research flyout opens (once each)
  useEffect(() => {
    if (expandedMenu !== 'research') {
      setShowInsightsSpotlight(false);
      setShowMedicationSpotlight(false);
      return undefined;
    }
    const timers = [];
    if (!isInsightsSpotlightDone()) {
      timers.push(setTimeout(() => setShowInsightsSpotlight(true), 700));
    }
    if (!isMedicationSpotlightDone()) {
      timers.push(setTimeout(() => setShowMedicationSpotlight(true), 850));
    }
    return () => timers.forEach(clearTimeout);
  }, [expandedMenu]);

  useEffect(() => {
    const onPreviewInsights = () => {
      try {
        localStorage.removeItem(INSIGHTS_SPOTLIGHT_KEY);
      } catch {
        /* ignore */
      }
      if (expandedMenu === 'research') setShowInsightsSpotlight(true);
    };
    const onPreviewMedication = () => {
      try {
        localStorage.removeItem(MEDICATION_SPOTLIGHT_KEY);
      } catch {
        /* ignore */
      }
      if (expandedMenu === 'research') setShowMedicationSpotlight(true);
    };
    window.addEventListener('tpp:dev-preview-insights-spotlight', onPreviewInsights);
    window.addEventListener('tpp:dev-preview-medication-spotlight', onPreviewMedication);
    return () => {
      window.removeEventListener('tpp:dev-preview-insights-spotlight', onPreviewInsights);
      window.removeEventListener('tpp:dev-preview-medication-spotlight', onPreviewMedication);
    };
  }, [expandedMenu]);

  useEffect(() => {
    if (!showInsightsSpotlight) {
      return undefined;
    }
    const measure = () => {
      const btn = insightsTileRef.current;
      if (!btn) {
        setInsightsSpotlightAnchor(null);
        return;
      }
      const r = btn.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        setInsightsSpotlightAnchor(null);
        return;
      }
      setInsightsSpotlightAnchor({
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
  }, [showInsightsSpotlight, expandedMenu]);

  useEffect(() => {
    if (!showMedicationSpotlight) {
      return undefined;
    }
    const measure = () => {
      const el = medicationTermRef.current;
      if (!el) {
        setMedicationSpotlightAnchor(null);
        return;
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        setMedicationSpotlightAnchor(null);
        return;
      }
      setMedicationSpotlightAnchor({
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
  }, [showMedicationSpotlight, expandedMenu]);

  useEffect(() => {
    if (!showInsightsSpotlight) return undefined;
    const onPointerDown = (e) => {
      const tip = insightsTipRef.current;
      const btn = insightsTileRef.current;
      const medTip = medicationTipRef.current;
      const target = e.target;
      if (tip && tip.contains(target)) return;
      if (medTip && medTip.contains(target)) return;
      if (btn && (btn === target || btn.contains(target))) return;
      dismissInsightsSpotlight();
    };
    const attach = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 50);
    return () => {
      clearTimeout(attach);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [showInsightsSpotlight, dismissInsightsSpotlight]);

  useEffect(() => {
    if (!showMedicationSpotlight) return undefined;
    const onPointerDown = (e) => {
      const tip = medicationTipRef.current;
      const term = medicationTermRef.current;
      const insightsTip = insightsTipRef.current;
      const insightsBtn = insightsTileRef.current;
      const target = e.target;
      if (tip && tip.contains(target)) return;
      if (insightsTip && insightsTip.contains(target)) return;
      if (insightsBtn && (insightsBtn === target || insightsBtn.contains(target))) return;
      if (term && (term === target || term.contains(target))) return;
      // Tapping the parent supplements tile also counts as engaging
      const tile = term?.closest('button');
      if (tile && (tile === target || tile.contains(target))) return;
      dismissMedicationSpotlight();
    };
    const attach = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown, true);
    }, 50);
    return () => {
      clearTimeout(attach);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [showMedicationSpotlight, dismissMedicationSpotlight]);

  // Global Ask PiP opener (stack handoff, checklist, etc.)
  useEffect(() => {
    const onOpenPip = (e) => {
      setPipHandoff(e?.detail || {});
      setShowSearch(true);
      setExpandedMenu(null);
    };
    window.addEventListener(PIP_OPEN_EVENT, onOpenPip);
    return () => window.removeEventListener(PIP_OPEN_EVENT, onOpenPip);
  }, []);

  useEffect(() => {
    const onModeChange = (e) => {
      if (e?.detail?.trackingMode) setTrackingMode(e.detail.trackingMode);
      else setTrackingMode(getLocalTrackingMode());
    };
    window.addEventListener('tpp:tracking-mode-changed', onModeChange);
    return () => window.removeEventListener('tpp:tracking-mode-changed', onModeChange);
  }, []);

  // Menu configurations — Research/Inventory filtered by Simple vs Advanced mode.
  // Bottom tabs stay the same; only flyout contents shrink for Simple users.
  const isShareIncentiveEnabled = isFeatureEnabled('ENABLE_SHARE_INCENTIVE');
  const menuItems = useMemo(() => ({
    research: getResearchMenuItems(trackingMode),
    inventory: getInventoryMenuItems(trackingMode),
    more: [
      { action: 'tpp:open-announcements', label: 'Announcements', icon: NewspaperClipping, iconWeight: 'duotone', badge: unseenAnnouncementCount },
      { action: 'tpp:open-action-items', label: 'To-Do', icon: ClipboardText, iconWeight: 'duotone', badge: actionItemCount },
      { path: 'https://thepepplanner.app/shop', label: 'Shop Planners', icon: BookOpen, iconWeight: 'duotone', external: true },
      { action: 'tpp:open-support', label: 'Support', icon: Microscope, iconWeight: 'duotone', badge: supportUnreadCount },
      { action: 'tpp:open-share-incentive', label: '3 Months Free', icon: Gift, iconWeight: 'duotone', isPromo: true, disabled: !isShareIncentiveEnabled },
      { action: 'search', label: 'Search + PiP', icon: ListMagnifyingGlass, iconWeight: 'duotone' },
    ]
  }), [trackingMode, unseenAnnouncementCount, actionItemCount, supportUnreadCount, isShareIncentiveEnabled]);

  // Bottom nav items — same 5 tabs for everyone
  const navItems = [
    { id: 'calendar', label: 'Calendar', icon: CalendarDots, path: '/app/calendar', type: 'direct' },
    { id: 'research', label: 'Research', icon: Flask, type: 'menu', activePaths: ['/app/protocols', '/app/supplements', '/app/recon', '/app/bio-metrics', '/app/goals', '/app/insights'] },
    { id: 'home', label: 'Home', icon: null, path: '/app/dashboard', type: 'direct' },
    { id: 'inventory', label: 'Inventory', icon: Stack, type: 'menu', activePaths: ['/app/stockpile', '/app/orders', '/app/vendors', '/app/wishlist'] },
    { id: 'more', label: 'More', icon: DotsThreeOutline, type: 'menu', activePaths: ['/app/account', '/app/settings'] }
  ];

  const isActive = (item) => {
    if (item.type === 'direct') {
      if (item.id === 'home') {
        return location.pathname === item.path || location.pathname === '/app' || location.pathname === '/app/';
      }
      return location.pathname.startsWith(item.path);
    } else if (item.type === 'menu') {
      return item.activePaths?.some(path => location.pathname.startsWith(path));
    }
    return false;
  };

  const handleNavClick = (item, event) => {
    // Haptic feedback - light tap
    triggerHaptic('light');
    window.dispatchEvent(new CustomEvent('tpp:bottom-nav-click', { detail: { id: item.id, type: item.type } }));

    // Create ripple effect
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setRippleEffect({ x, y, id: item.id });
      setTimeout(() => setRippleEffect(null), 600);
    }

    if (item.type === 'direct') {
      navigate(item.path);
      setExpandedMenu(null);
    } else if (item.type === 'menu') {
      // Medium haptic for menu open
      triggerHaptic('medium');
      // Toggle menu
      setExpandedMenu(expandedMenu === item.id ? null : item.id);
    }
  };

  // Swipe down to close menu
  const handleMenuTouchStart = (event) => {
    touchStartY.current = event.touches[0].clientY;
  };

  const handleMenuTouchMove = (event) => {
    if (!touchStartY.current) return;
    
    const touchY = event.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;
    
    // Swipe down threshold (50px)
    if (deltaY > 50) {
      setExpandedMenu(null);
      touchStartY.current = null;
    }
  };

  // Lock body scroll when menu is open
  useEffect(() => {
    if (expandedMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [expandedMenu]);

  const handleMenuItemClick = (menuItem) => {
    if (menuItem.disabled) return;
    triggerHaptic('light');
    if (menuItem.id === 'insights' && showInsightsSpotlight) dismissInsightsSpotlight();
    if (menuItem.id === 'supplements' && showMedicationSpotlight) dismissMedicationSpotlight();
    window.dispatchEvent(new CustomEvent('tpp:bottom-nav-click', { detail: { menu: true, path: menuItem.path, action: menuItem.action } }));
    if (menuItem.action === 'tpp:open-share-incentive') {
      setExpandedMenu(null);
      setShowShareModal(true);
    } else if (menuItem.action === 'search') {
      setPipHandoff(null);
      setShowSearch(true);
      setExpandedMenu(null);
    } else if (menuItem.external) {
      window.open(menuItem.path, '_blank', 'noopener,noreferrer');
    } else if (menuItem.action) {
      window.dispatchEvent(new CustomEvent(menuItem.action));
      setExpandedMenu(null);
    } else {
      navigate(menuItem.path);
      setExpandedMenu(null);
    }
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setPipHandoff(null);
  };


  return (
    <>
      {/* Search + AI Modal */}
      <SearchAIModal
        open={showSearch}
        onClose={handleCloseSearch}
        theme={theme}
        handoff={pipHandoff}
      />

      {/* Backdrop - click to close expanded menu (below menu + nav) */}
      <div
        className={`${hideOnDesktop} fixed inset-0 z-[9997] transition-all duration-300 ease-in-out`}
        onClick={() => { setExpandedMenu(null); triggerHaptic('light'); }}
        style={{
          backgroundColor: expandedMenu ? (theme.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)') : 'transparent',
          backdropFilter: expandedMenu ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: expandedMenu ? 'blur(8px)' : 'none',
          opacity: expandedMenu ? 1 : 0,
          pointerEvents: expandedMenu ? 'auto' : 'none'
        }}
      />

      {/* Expanded Menu — sits behind the bottom nav / Home button */}
      <div
        ref={menuRef}
        className={`${hideOnDesktop} fixed bottom-16 left-0 right-0 z-[9998] px-3 transition-all duration-300 ease-in-out`}
        onTouchStart={handleMenuTouchStart}
        onTouchMove={handleMenuTouchMove}
        style={{
          // Use comprehensive safe area variable (includes Android detection)
          paddingBottom: `max(0.75rem, calc(0.75rem + var(--safe-area-bottom, 0px)))`,
          maxHeight: expandedMenu ? '600px' : '0',
          opacity: expandedMenu ? 1 : 0,
          transform: expandedMenu ? 'translateY(0)' : 'translateY(20px)',
          pointerEvents: expandedMenu ? 'auto' : 'none'
        }}
      >
          <div
            className="rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
            style={{
              background: theme.isDark 
                ? 'linear-gradient(135deg, rgba(20, 25, 33, 0.97) 0%, rgba(14, 18, 25, 0.98) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)',
              border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              boxShadow: theme.isDark
                ? '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                : '0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          >
            {/* Handle bar - for swipe affordance */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div 
                className="w-10 h-1 rounded-full"
                style={{ 
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'
                }}
              />
            </div>

            {(() => {
              const allItems = menuItems[expandedMenu] || [];
              const inSimple = isSimpleMode(trackingMode);

              // size: 'sm' = compact (simple adv row), 'md' = advanced mode grid, 'lg' = full (simple core row)
              const renderTile = (item, animIndex, compact, size = compact ? 'sm' : 'lg') => {
                const Icon = item.icon;
                const isDisabled = Boolean(item.disabled);
                const isInsights = item.id === 'insights';
                const spotlightHere = isInsights && showInsightsSpotlight;
                const tilePy = size === 'lg' ? 'py-5 px-3' : size === 'md' ? 'py-4 px-2.5' : 'py-3 px-2';
                return (
                  <button
                    key={item.label}
                    ref={isInsights ? insightsTileRef : undefined}
                    onClick={() => handleMenuItemClick(item)}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    className={`group relative flex flex-col items-center justify-center ${tilePy} rounded-2xl transition-all duration-300 touch-manipulation overflow-hidden ${isDisabled ? 'cursor-not-allowed' : 'active:scale-95'} ${spotlightHere ? 'tpp-insights-spotlight-btn' : ''}`}
                    style={{
                      background: item.isPromo
                        ? (theme.isDark ? 'linear-gradient(135deg,rgba(30,36,46,.6),rgba(22,28,38,.6))' : 'linear-gradient(135deg,rgba(255,255,255,.8),rgba(249,250,251,.8))')
                        : (theme.isDark ? 'linear-gradient(135deg,rgba(30,36,46,.6),rgba(22,28,38,.6))' : 'linear-gradient(135deg,rgba(255,255,255,.8),rgba(249,250,251,.8))'),
                      border: spotlightHere
                        ? `1px solid ${theme.primary}80`
                        : item.isPromo
                        ? `1px solid ${theme.primary}50`
                        : `1px solid ${theme.isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'}`,
                      WebkitTapHighlightColor: 'transparent',
                      animation: `popIn ${200 + animIndex * 60}ms cubic-bezier(0.34,1.56,0.64,1) forwards`,
                      opacity: 0,
                      transform: 'scale(0.8) translateY(20px)',
                      pointerEvents: isDisabled ? 'none' : 'auto',
                      filter: isDisabled ? 'grayscale(1)' : 'none',
                      zIndex: spotlightHere ? 2 : undefined,
                    }}
                  >
                    {item.isPromo && !isDisabled && (
                      <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: `linear-gradient(180deg,transparent 0%,${theme.primary}28 50%,transparent 100%)`, backgroundSize: '100% 200%', animation: 'shimmerVertical 2.2s ease-in-out infinite' }} />
                    )}
                    <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${isDisabled ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} style={{ background: `radial-gradient(circle at center,${theme.primary}15 0%,transparent 70%)` }} />

                    <div className={`relative flex items-center justify-center ${size === 'lg' ? 'mb-3' : size === 'md' ? 'mb-2' : 'mb-1.5'} transition-all duration-300 ${isDisabled ? '' : 'group-hover:scale-110 group-active:scale-95'}`} style={{ color: isDisabled ? theme.textLight : theme.primary }}>
                      {item.action === 'search' ? (
                        <div className="flex items-center gap-1">
                          <Icon size={size === 'lg' ? 34 : size === 'md' ? 28 : 24} weight={item.iconWeight || 'duotone'} />
                          <span className={`${size === 'sm' ? 'text-sm' : 'text-base'} font-bold leading-none`} style={{ color: theme.primary, marginTop: '-1px' }}>+</span>
                          <ChatCenteredDots size={size === 'lg' ? 34 : size === 'md' ? 28 : 24} weight="duotone" />
                        </div>
                      ) : (
                        <Icon size={size === 'lg' ? 36 : size === 'md' ? 28 : 22} weight={item.iconWeight || 'duotone'} />
                      )}
                      {item.badge > 0 && (
                        <BadgeBump
                          count={item.badge}
                          pulse={item.action === 'tpp:open-announcements' || item.action === 'tpp:open-action-items' || item.action === 'tpp:open-support'}
                          className="absolute -top-1 -right-2 text-white pointer-events-none"
                          style={{ backgroundColor: theme.primary }}
                        />
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`${size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[11px]'} font-semibold text-center leading-tight`} style={{ color: isDisabled ? theme.textLight : theme.text, opacity: isDisabled ? 0.7 : 1 }}>
                        {item.id === 'supplements' ? (
                          <>
                            Supplements &{' '}
                            <span
                              ref={medicationTermRef}
                              className={`relative inline-block px-0.5 rounded-sm ${showMedicationSpotlight ? 'tpp-medication-term-spotlight' : ''}`}
                              style={showMedicationSpotlight ? { color: theme.primary } : undefined}
                            >
                              Medication
                            </span>
                          </>
                        ) : (
                          item.label
                        )}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-center leading-tight" style={{ color: theme.textLight, opacity: 0.6 }}>{item.subtitle}</span>
                      )}
                    </div>
                  </button>
                );
              };

              // Simple mode: 2-col core section + 4-col advanced section (no chips)
              if (inSimple) {
                const coreItems = allItems.filter(i => i.tier !== NAV_TIERS.ADVANCED);
                const advItems  = allItems.filter(i => i.tier === NAV_TIERS.ADVANCED);
                return (
                  <div className="p-3 space-y-2">
                    {coreItems.length > 0 && (
                      <div className={`grid gap-2 ${coreItems.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {coreItems.map((item, i) => renderTile(item, i, false))}
                      </div>
                    )}
                    {coreItems.length > 0 && advItems.length > 0 && (
                      <div className="h-px mx-1" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }} />
                    )}
                    {advItems.length > 0 && (
                      <div className={`grid gap-1.5 ${advItems.length <= 2 ? 'grid-cols-2' : advItems.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                        {advItems.map((item, i) => renderTile(item, coreItems.length + i, true))}
                      </div>
                    )}
                  </div>
                );
              }

              // Advanced mode: medium tiles — slightly larger than compact
              const useThreeCol = allItems.length >= 5;
              return (
                <div className={`grid gap-2 p-3 ${useThreeCol ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {allItems.map((item, i) => renderTile(item, i, false, useThreeCol ? 'md' : 'lg'))}
                </div>
              );
            })()}
          </div>
        </div>

      {/* Bottom Navigation Bar */}
      <nav
        className={`${hideOnDesktop} fixed bottom-0 left-0 right-0 z-[9999] glass-bar`}
        style={{
          borderTop: theme.name === 'Pearlescent'
            ? '1px solid rgba(107, 163, 200, 0.32)'
            : `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
          paddingBottom: `max(0px, var(--safe-area-bottom, 0px))`,
          boxShadow: theme.name === 'Pearlescent'
            ? '0 -4px 20px rgba(107, 163, 200, 0.14), inset 0 0.5px 0 rgba(255, 255, 255, 0.7)'
            : theme.isDark
            ? '0 -4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 -4px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          overflow: 'visible',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2 relative" style={{ overflow: 'visible' }}>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item);
            const isExpanded = expandedMenu === item.id;
            const hasRipple = rippleEffect?.id === item.id;
            const isHomeButton = item.id === 'home';

            // For home button (center), render as raised floating circle
            if (isHomeButton) {
              return (
                <button
                  key={item.id}
                  onClick={(e) => handleNavClick(item, e)}
                  className="relative flex flex-col items-end justify-center flex-1 touch-manipulation"
                  style={{
                    height: '64px',
                    overflow: 'visible',
                    WebkitTapHighlightColor: 'transparent',
                    paddingBottom: '2px',
                  }}
                >
                  {/* Raised circle — floats above the nav bar */}
                  <div
                    className="absolute left-1/2 transition-all duration-300 active:scale-90"
                    style={{
                      transform: `translateX(-50%) translateY(${active ? '-26px' : '-22px'}) scale(${active ? 1.08 : 1})`,
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'transparent',
                      boxShadow: 'none',
                      border: isPearlescent
                        ? '6px solid rgba(255, 255, 255, 0.78)'
                        : theme.isDark
                          ? '4px solid rgba(20, 25, 33, 0.97)'
                          : '4px solid rgba(255,255,255,0.95)',
                      boxSizing: 'border-box',
                      zIndex: 2,
                    }}
                  >
                    <img
                      src={centerNavLogo}
                      alt="The Pep Planner"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        opacity: active ? 1 : 0.92,
                        imageRendering: 'auto',
                        WebkitTransform: 'translateZ(0)',
                      }}
                    />
                  </div>

                  {/* Label pinned to bottom */}
                  <span
                    className="w-full text-center text-xs transition-all duration-300 absolute bottom-2 left-0"
                    style={{
                      color: active ? theme.primary : (theme.isDark ? '#ffffff' : theme.textLight),
                      fontWeight: active ? 700 : 500,
                      letterSpacing: active ? '0.02em' : '0',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            // For other buttons, render normally
            return (
              <button
                key={item.id}
                onClick={(e) => handleNavClick(item, e)}
                className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 touch-manipulation overflow-hidden"
                style={{
                  color: active || isExpanded ? theme.primary : (theme.isDark ? '#ffffff' : theme.textLight),
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {/* Ripple effect */}
                {hasRipple && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: rippleEffect.x,
                      top: rippleEffect.y,
                      width: '100px',
                      height: '100px',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: `${theme.primary}30`,
                      animation: 'ripple 600ms ease-out'
                    }}
                  />
                )}

                <div
                  className="relative flex flex-col items-center justify-center transition-all duration-300"
                  style={{
                    transform: active || isExpanded ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  {/* Floating line indicator with spacing */}
                  {(active || isExpanded) && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{
                        top: '-8px',
                        width: '32px',
                        height: '3px',
                        borderRadius: '0 0 3px 3px',
                        backgroundColor: theme.primary,
                        boxShadow: `0 1px 4px ${theme.primary}30`,
                        animation: 'slideDown 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                    />
                  )}

                  {item.id === 'calendar' ? (
                    <CalendarDots
                      size={24}
                      weight={active || isExpanded ? 'fill' : 'duotone'}
                      className="mb-1 transition-all duration-300"
                      aria-hidden
                      style={{
                        filter: active || isExpanded
                          ? `drop-shadow(0 1px 2px ${theme.primary}20)`
                          : 'none',
                      }}
                    />
                  ) : item.id === 'research' ? (
                    <Flask
                      size={27}
                      weight={active || isExpanded ? 'fill' : 'duotone'}
                      className="mb-1 transition-all duration-300"
                      aria-hidden
                      style={{
                        filter: active || isExpanded
                          ? `drop-shadow(0 1px 2px ${theme.primary}20)`
                          : 'none',
                      }}
                    />
                  ) : (
                    <div className="relative">
                      <Icon
                        size={24}
                        weight={active || isExpanded ? 'fill' : 'duotone'}
                        className="mb-1 transition-all duration-300"
                        style={{
                          filter: active || isExpanded
                            ? `drop-shadow(0 1px 2px ${theme.primary}20)`
                            : 'none',
                        }}
                      />
                      {item.id === 'more' && (unseenAnnouncementCount > 0 || actionItemCount > 0 || supportUnreadCount > 0) && (
                        <span
                          className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 rounded-full tpp-badge-pulse"
                          style={{ backgroundColor: theme.primary, boxShadow: `0 0 4px ${theme.primary}60` }}
                        />
                      )}
                    </div>
                  )}
                  <span
                    className="text-xs transition-all duration-300"
                    style={{
                      fontWeight: active || isExpanded ? 700 : 500,
                      letterSpacing: active || isExpanded ? '0.02em' : '0'
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding spacer for content removed - handled by main padding in App.jsx */}

      {/* Animations */}
      <style>{`
        @keyframes slideUpBounce {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          60% {
            opacity: 1;
            transform: translateY(-8px);
          }
          80% {
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmerVertical {
          0%   { background-position: 0% 100%; }
          50%  { background-position: 0% 0%;   }
          100% { background-position: 0% 100%; }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          60% {
            transform: scale(1.05) translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideUpSmooth {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDownSmooth {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(100%);
          }
        }

        /* Smooth scrolling for iOS */
        * {
          -webkit-overflow-scrolling: touch;
        }
        @keyframes tppInsightsOval {
          0%, 100% { transform: scale(1, 1); opacity: 0.95; }
          50% { transform: scale(1.025, 1.06); opacity: 0.4; }
        }
        .tpp-insights-spotlight-oval {
          animation: tppInsightsOval 1.4s ease-out infinite;
          transform-origin: center center;
        }
        @keyframes tppInsightsBtn {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.03); }
          70% { transform: scale(1.01); }
        }
        .tpp-insights-spotlight-btn {
          animation: tppInsightsBtn 1.4s ease-in-out infinite;
        }
        @keyframes tppMedicationOval {
          0%, 100% { transform: scale(1, 1); opacity: 0.95; }
          50% { transform: scale(1.06, 1.2); opacity: 0.35; }
        }
        .tpp-medication-spotlight-oval {
          animation: tppMedicationOval 1.4s ease-out infinite;
          transform-origin: center center;
        }
        @keyframes tppMedicationTerm {
          0%, 100% { transform: scale(1); }
          40% { transform: scale(1.06); }
          70% { transform: scale(1.02); }
        }
        .tpp-medication-term-spotlight {
          animation: tppMedicationTerm 1.4s ease-in-out infinite;
          display: inline-block;
        }
      `}</style>
      <ShareIncentiveModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        theme={theme}
      />

      {insightsTx.mounted && insightsPortalAnchor && createPortal(
        (() => {
          const primary = theme?.primary || '#7F9E95';
          const tipBg = theme?.isDark ? 'rgba(20,25,33,0.98)' : '#ffffff';
          const tipText = theme?.text || '#1f2937';
          const tipBorder = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
          const tipW = 168;
          const padX = 2;
          const ovalLeft = Math.max(4, insightsPortalAnchor.left - padX);
          const ovalTop = Math.max(4, insightsPortalAnchor.top - 1);
          const ovalW = insightsPortalAnchor.width + padX * 2;
          const ovalH = Math.max(insightsPortalAnchor.height - 4, 28);
          const tipLeft = Math.max(
            8,
            Math.min(
              insightsPortalAnchor.left + insightsPortalAnchor.width / 2 - tipW / 2,
              window.innerWidth - tipW - 8
            )
          );
          // Prefer tip above the tile (flyout sits near bottom nav)
          const tipH = 78;
          const tipTop = Math.max(8, insightsPortalAnchor.top - tipH - 10);
          return (
            <>
              <div
                aria-hidden
                className={`fixed z-[10050] pointer-events-none ${insightsTx.ovalClass}`}
                style={{
                  top: ovalTop,
                  left: ovalLeft,
                  width: ovalW,
                  height: ovalH,
                }}
              >
                <div
                  className="tpp-insights-spotlight-oval w-full h-full"
                  style={{
                    borderRadius: 9999,
                    boxShadow: `0 0 0 2px ${primary}`,
                  }}
                />
              </div>
              <div
                className={`fixed z-[10051] pointer-events-none ${insightsTx.tipClass}`}
                style={{
                  top: tipTop,
                  left: tipLeft,
                  width: tipW,
                }}
                role="status"
                aria-live="polite"
              >
                <div
                  ref={insightsTipRef}
                  className="pointer-events-auto rounded-xl shadow-2xl border px-3.5 pt-3 pb-3.5 relative text-center"
                  style={{ backgroundColor: tipBg, borderColor: tipBorder }}
                >
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b"
                    style={{ backgroundColor: tipBg, borderColor: tipBorder }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissInsightsSpotlight();
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
                      Insights
                    </p>
                  </div>
                </div>
              </div>
            </>
          );
        })(),
        document.body
      )}

      {medicationTx.mounted && medicationPortalAnchor && createPortal(
        (() => {
          const primary = theme?.primary || '#7F9E95';
          const tipBg = theme?.isDark ? 'rgba(20,25,33,0.98)' : '#ffffff';
          const tipText = theme?.text || '#1f2937';
          const tipBorder = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
          const tipW = 150;
          const padX = 4;
          const padY = 2;
          const ovalLeft = Math.max(4, medicationPortalAnchor.left - padX);
          const ovalTop = Math.max(4, medicationPortalAnchor.top - padY);
          const ovalW = medicationPortalAnchor.width + padX * 2;
          const ovalH = Math.max(medicationPortalAnchor.height + padY * 2, 18);
          const tipLeft = Math.max(
            8,
            Math.min(
              medicationPortalAnchor.left + medicationPortalAnchor.width / 2 - tipW / 2,
              window.innerWidth - tipW - 8
            )
          );
          const tipH = 78;
          const tipTop = Math.max(8, medicationPortalAnchor.top - tipH - 10);
          return (
            <>
              <div
                aria-hidden
                className={`fixed z-[10050] pointer-events-none ${medicationTx.ovalClass}`}
                style={{
                  top: ovalTop,
                  left: ovalLeft,
                  width: ovalW,
                  height: ovalH,
                }}
              >
                <div
                  className="tpp-medication-spotlight-oval w-full h-full"
                  style={{
                    borderRadius: 9999,
                    boxShadow: `0 0 0 1.5px ${primary}`,
                  }}
                />
              </div>
              <div
                className={`fixed z-[10051] pointer-events-none ${medicationTx.tipClass}`}
                style={{
                  top: tipTop,
                  left: tipLeft,
                  width: tipW,
                }}
                role="status"
                aria-live="polite"
              >
                <div
                  ref={medicationTipRef}
                  className="pointer-events-auto rounded-xl shadow-2xl border px-3.5 pt-3 pb-3.5 relative text-center"
                  style={{ backgroundColor: tipBg, borderColor: tipBorder }}
                >
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b"
                    style={{ backgroundColor: tipBg, borderColor: tipBorder }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissMedicationSpotlight();
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
                      Medication
                    </p>
                  </div>
                </div>
              </div>
            </>
          );
        })(),
        document.body
      )}
    </>
  );
}
