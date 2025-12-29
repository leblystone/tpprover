import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, FlaskConical, Boxes, MoreHorizontal, TestTube, Calculator, Package, ShoppingCart, Store, User, Settings, BookOpen, Microscope, Search, Plus, History } from 'lucide-react';

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
 * - Long-press quick actions
 * - Swipe gestures
 * - Search functionality
 * - iOS/Android native feel
 */
export default function BottomNavigation({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [rippleEffect, setRippleEffect] = useState(null);
  const [longPressItem, setLongPressItem] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const longPressTimer = useRef(null);
  const touchStartY = useRef(null);
  const menuRef = useRef(null);

  // Menu configurations
  const menuItems = {
    research: [
      { path: '/app/protocols', label: 'Protocols', icon: TestTube },
      { path: '/app/recon', label: 'Peptide Calculator', icon: Calculator }
    ],
    inventory: [
      { path: '/app/stockpile', label: 'Stockpile', icon: Package },
      { path: '/app/orders', label: 'Orders', icon: ShoppingCart },
      { path: '/app/vendors', label: 'Vendors', icon: Store }
    ],
    more: [
      { action: 'search', label: 'Search', icon: Search },
      { path: '/app/account', label: 'Account', icon: User },
      { path: '/app/settings', label: 'Settings', icon: Settings },
      { path: 'https://thepepplanner.com', label: 'Shop Planners', icon: BookOpen, external: true },
      { action: 'tpp:open-support', label: 'Support', icon: Microscope }
    ]
  };

  // Long-press quick actions
  const quickActions = {
    home: { action: () => navigate('/app/protocols?new=true'), label: 'Quick Add Protocol', icon: Plus },
    research: { action: () => navigate('/app/protocols'), label: 'Recent Protocol', icon: History },
    inventory: { action: () => navigate('/app/stockpile?new=true'), label: 'Quick Add to Stockpile', icon: Plus },
    calendar: { action: () => navigate('/app/calendar'), label: 'Jump to Today', icon: Calendar }
  };

  // Bottom nav items
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/app/dashboard', type: 'direct' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/app/calendar', type: 'direct' },
    { id: 'research', label: 'Research', icon: FlaskConical, type: 'menu', activePaths: ['/app/protocols', '/app/recon'] },
    { id: 'inventory', label: 'Inventory', icon: Boxes, type: 'menu', activePaths: ['/app/stockpile', '/app/orders', '/app/vendors'] },
    { id: 'more', label: 'More', icon: MoreHorizontal, type: 'menu', activePaths: ['/app/account', '/app/settings'] }
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

  // Long-press handlers
  const handleTouchStart = (item, event) => {
    if (quickActions[item.id]) {
      touchStartY.current = event.touches[0].clientY;
      longPressTimer.current = setTimeout(() => {
        triggerHaptic('medium');
        setLongPressItem(item.id);
      }, 500); // 500ms long-press
    }
  };

  const handleTouchEnd = (item) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (longPressItem === item.id) {
      // Execute quick action
      triggerHaptic('success');
      quickActions[item.id].action();
      setLongPressItem(null);
    }
  };

  const handleTouchMove = () => {
    // Cancel long-press if finger moves
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
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
    triggerHaptic('light');
    if (menuItem.action === 'search') {
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

  // Close search modal
  const handleCloseSearch = () => {
    setShowSearch(false);
  };

  return (
    <>
      {/* Search Modal - Half Screen */}
      {showSearch && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-[10000]"
            onClick={handleCloseSearch}
            style={{
              backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              animation: 'fadeIn 250ms ease-out'
            }}
          />
          
          {/* Half-screen search modal */}
          <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[10001] rounded-t-3xl shadow-2xl backdrop-blur-xl"
            style={{
              height: '50vh',
              background: theme.isDark 
                ? 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)',
              border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              boxShadow: theme.isDark
                ? '0 -20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 -20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              animation: 'slideUpBounce 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)'
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div 
                className="w-10 h-1 rounded-full"
                style={{ 
                  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)'
                }}
              />
            </div>

            {/* Search header */}
            <div className="px-4 pb-4 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search 
                    size={18} 
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: theme.textLight }}
                  />
                  <input
                    type="text"
                    placeholder="Search protocols, inventory, orders..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    style={{
                      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      color: theme.text,
                      border: `1px solid ${theme.border}`
                    }}
                  />
                </div>
                <button
                  onClick={handleCloseSearch}
                  className="p-2 rounded-lg font-semibold text-sm"
                  style={{ color: theme.primary }}
                >
                  Done
                </button>
              </div>
            </div>

            {/* Search results */}
            <div className="flex-1 overflow-auto p-4">
              <p className="text-sm text-center" style={{ color: theme.textLight }}>
                Start typing to search...
              </p>
            </div>
          </div>
        </>
      )}

      {/* Backdrop - click to close expanded menu */}
      {expandedMenu && (
        <div
          className="lg:hidden fixed inset-0 z-[9998]"
          onClick={() => { setExpandedMenu(null); triggerHaptic('light'); }}
          style={{
            backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 250ms ease-out'
          }}
        />
      )}

      {/* Expanded Menu (appears above bottom nav) - with swipe support */}
      {expandedMenu && (
        <div
          ref={menuRef}
          className="lg:hidden fixed bottom-16 left-0 right-0 z-[9999] px-3"
          onTouchStart={handleMenuTouchStart}
          onTouchMove={handleMenuTouchMove}
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            animation: 'slideUpBounce 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}
        >
          <div
            className="rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
            style={{
              background: theme.isDark 
                ? 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)',
              border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
              boxShadow: theme.isDark
                ? '0 20px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
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

            <div className="grid grid-cols-2 gap-2 p-3">
              {menuItems[expandedMenu]?.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleMenuItemClick(item)}
                    className="group relative flex flex-col items-center justify-center py-5 px-3 rounded-2xl transition-all duration-300 touch-manipulation active:scale-95"
                    style={{
                      background: theme.isDark
                        ? 'linear-gradient(135deg, rgba(55, 65, 81, 0.5) 0%, rgba(31, 41, 55, 0.5) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(249, 250, 251, 0.8) 100%)',
                      border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}`,
                      WebkitTapHighlightColor: 'transparent',
                      animation: `popIn ${200 + index * 75}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
                      opacity: 0,
                      transform: 'scale(0.8) translateY(20px)'
                    }}
                  >
                    {/* Gradient overlay on hover */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${theme.primary}15 0%, transparent 70%)`
                      }}
                    />

                    {/* Icon - standalone with theme color */}
                    <div
                      className="relative flex items-center justify-center mb-3 transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                      style={{
                        color: theme.primary
                      }}
                    >
                      <Icon size={36} strokeWidth={2.5} />
                    </div>
                    
                    <span 
                      className="text-sm font-semibold text-center leading-tight"
                      style={{ color: theme.text }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] backdrop-blur-xl"
        style={{
          background: theme.isDark 
            ? 'linear-gradient(180deg, rgba(17, 24, 39, 0.85) 0%, rgba(17, 24, 39, 0.95) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.95) 100%)',
          borderTop: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
          boxShadow: theme.isDark
            ? '0 -4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
            : '0 -4px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const isExpanded = expandedMenu === item.id;
            const hasRipple = rippleEffect?.id === item.id;

            return (
              <button
                key={item.id}
                onClick={(e) => handleNavClick(item, e)}
                onTouchStart={(e) => handleTouchStart(item, e)}
                onTouchEnd={() => handleTouchEnd(item)}
                onTouchMove={handleTouchMove}
                className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 touch-manipulation overflow-hidden"
                style={{
                  color: active || isExpanded ? theme.primary : theme.textLight,
                  WebkitTapHighlightColor: 'transparent',
                  transform: longPressItem === item.id ? 'scale(0.92)' : 'scale(1)'
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

                  {/* Long-press tooltip */}
                  {longPressItem === item.id && quickActions[item.id] && (
                    <div
                      className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.textOnPrimary,
                        boxShadow: `0 4px 12px ${theme.primary}40`,
                        animation: 'popIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                      }}
                    >
                      {quickActions[item.id].label}
                    </div>
                  )}

                  <Icon
                    size={24}
                    strokeWidth={active || isExpanded ? 2.8 : 2.2}
                    className="mb-1 transition-all duration-300"
                    style={{
                      filter: active || isExpanded 
                        ? `drop-shadow(0 1px 2px ${theme.primary}20)` 
                        : 'none'
                    }}
                  />
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

      {/* Bottom padding spacer for content */}
      <div
        className="lg:hidden"
        style={{
          height: 'calc(4rem + max(env(safe-area-inset-bottom, 0px), 0px))'
        }}
      />

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

        @keyframes slideUpFast {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Smooth scrolling for iOS */
        * {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </>
  );
}
