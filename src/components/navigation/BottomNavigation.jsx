import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, FlaskConical, Boxes, MoreHorizontal, TestTube, Calculator, Package, ShoppingCart, Store, User, Settings, BookOpen, Microscope } from 'lucide-react';

/**
 * BottomNavigation Component
 * Native app-style bottom navigation with smooth animations
 * Features:
 * - Glassmorphic design
 * - Smooth haptic-style feedback
 * - Floating action buttons in expanded menu
 * - iOS/Android native feel
 */
export default function BottomNavigation({ theme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [rippleEffect, setRippleEffect] = useState(null);

  // Menu configurations
  const menuItems = {
    research: [
      { path: '/app/protocols', label: 'Protocols', icon: TestTube },
      { path: '/app/recon', label: 'Recon', icon: Calculator }
    ],
    inventory: [
      { path: '/app/stockpile', label: 'Stockpile', icon: Package },
      { path: '/app/orders', label: 'Orders', icon: ShoppingCart },
      { path: '/app/vendors', label: 'Vendors', icon: Store }
    ],
    more: [
      { path: '/app/account', label: 'Account', icon: User },
      { path: '/app/settings', label: 'Settings', icon: Settings },
      { path: 'https://thepepplanner.com', label: 'Shop', icon: BookOpen, external: true },
      { action: 'tpp:open-support', label: 'Support', icon: Microscope }
    ]
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
      // Toggle menu
      setExpandedMenu(expandedMenu === item.id ? null : item.id);
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
    if (menuItem.external) {
      window.open(menuItem.path, '_blank', 'noopener,noreferrer');
    } else if (menuItem.action) {
      window.dispatchEvent(new CustomEvent(menuItem.action));
    } else {
      navigate(menuItem.path);
    }
    setExpandedMenu(null);
  };

  return (
    <>
      {/* Backdrop - click to close expanded menu */}
      {expandedMenu && (
        <div
          className="lg:hidden fixed inset-0 z-[9998]"
          onClick={() => setExpandedMenu(null)}
          style={{
            backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 250ms ease-out'
          }}
        />
      )}

      {/* Expanded Menu (appears above bottom nav) */}
      {expandedMenu && (
        <div
          className="lg:hidden fixed bottom-16 left-0 right-0 z-[9999] px-3"
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
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
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

                    <div
                      className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-2.5 transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}dd 100%)`,
                        boxShadow: `0 4px 16px ${theme.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                        color: theme.textOnPrimary
                      }}
                    >
                      <Icon size={26} strokeWidth={2.5} />
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
                className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 touch-manipulation overflow-hidden"
                style={{
                  color: active || isExpanded ? theme.primary : theme.textLight,
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

                {/* Active background pill */}
                {(active || isExpanded) && (
                  <div
                    className="absolute inset-x-2 inset-y-2 rounded-2xl transition-all duration-300"
                    style={{
                      backgroundColor: theme.isDark 
                        ? `${theme.primary}15` 
                        : `${theme.primary}10`,
                      boxShadow: `inset 0 0 0 1px ${theme.primary}30`
                    }}
                  />
                )}

                <div
                  className="relative flex flex-col items-center justify-center transition-all duration-300"
                  style={{
                    transform: active || isExpanded ? 'scale(1.1) translateY(-2px)' : 'scale(1)'
                  }}
                >
                  <Icon
                    size={24}
                    strokeWidth={active || isExpanded ? 2.8 : 2.2}
                    className="mb-1 transition-all duration-300"
                    style={{
                      filter: active || isExpanded 
                        ? `drop-shadow(0 2px 4px ${theme.primary}40)` 
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

        /* Smooth scrolling for iOS */
        * {
          -webkit-overflow-scrolling: touch;
        }
      `}</style>
    </>
  );
}
