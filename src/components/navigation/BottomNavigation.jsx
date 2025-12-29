import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Calendar, FlaskConical, Boxes, MoreHorizontal, TestTube, Calculator, Package, ShoppingCart, Store, User, Settings, BookOpen, Microscope } from 'lucide-react';
import BottomNavMenu from './BottomNavMenu';

/**
 * BottomNavigation Component
 * Level 1 Navigation: Primary app sections with animated bottom sheet menus
 * Always visible on mobile/tablet, hidden on desktop (lg breakpoint)
 */
export default function BottomNavigation({ theme }) {
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);

  // Menu configurations
  const researchMenu = [
    { 
      path: '/app/protocols', 
      label: 'Protocols', 
      icon: TestTube,
      description: 'Manage your research protocols',
      primary: true
    },
    { 
      path: '/app/recon', 
      label: 'Reconstitute Calculator', 
      icon: Calculator,
      description: 'Calculate reconstitution doses',
      primary: true
    }
  ];

  const inventoryMenu = [
    { 
      path: '/app/stockpile', 
      label: 'Stockpile', 
      icon: Package,
      description: 'View your inventory',
      primary: true
    },
    { 
      path: '/app/orders', 
      label: 'Orders', 
      icon: ShoppingCart,
      description: 'Track your orders',
      primary: true
    },
    { 
      path: '/app/vendors', 
      label: 'Vendors', 
      icon: Store,
      description: 'Manage vendors',
      primary: true
    }
  ];

  const moreMenu = [
    {
      path: '/app/account',
      label: 'Account',
      icon: User,
      description: 'Profile and subscription',
      primary: true
    },
    {
      path: '/app/settings',
      label: 'Settings',
      icon: Settings,
      description: 'App preferences',
      primary: true
    },
    {
      path: 'https://thepepplanner.com',
      label: 'Shop Planners',
      icon: BookOpen,
      description: 'Physical planners',
      external: true
    },
    {
      label: 'Support',
      icon: Microscope,
      description: 'Get help',
      action: 'tpp:open-support'
    }
  ];

  const navItems = [
    { 
      path: '/app/dashboard', 
      label: 'Home', 
      icon: Home,
      type: 'direct'
    },
    { 
      path: '/app/calendar', 
      label: 'Calendar', 
      icon: Calendar,
      type: 'direct'
    },
    { 
      label: 'Research', 
      icon: FlaskConical,
      type: 'menu',
      menuId: 'research',
      menuItems: researchMenu,
      activePaths: ['/app/protocols', '/app/recon', '/app/research']
    },
    { 
      label: 'Inventory', 
      icon: Boxes,
      type: 'menu',
      menuId: 'inventory',
      menuItems: inventoryMenu,
      activePaths: ['/app/stockpile', '/app/orders', '/app/vendors', '/app/inventory']
    },
    { 
      label: 'More', 
      icon: MoreHorizontal,
      type: 'menu',
      menuId: 'more',
      menuItems: moreMenu,
      activePaths: ['/app/account', '/app/settings', '/app/more']
    },
  ];

  const isActive = (item) => {
    const currentPath = location.pathname;
    
    if (item.type === 'direct') {
      // Exact match for direct navigation
      if (item.label === 'Home') {
        return currentPath === item.path || currentPath === '/app' || currentPath === '/app/';
      }
      return currentPath.startsWith(item.path);
    } else if (item.type === 'menu') {
      // Check if any of the menu paths are active
      return item.activePaths?.some(path => currentPath.startsWith(path));
    }
    
    return false;
  };

  const handleNavClick = (item, e) => {
    if (item.type === 'menu') {
      e.preventDefault();
      setOpenMenu(item.menuId);
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar - Mobile & Tablet Only */}
      <nav 
        className="lg:hidden fixed bottom-0 left-0 right-0 border-t z-[9999] backdrop-blur-lg"
        style={{ 
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
        }}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            // For direct navigation, use NavLink
            if (item.type === 'direct') {
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className="flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 touch-manipulation"
                  style={{
                    color: active ? theme.primary : theme.textLight,
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <div 
                    className="flex flex-col items-center justify-center transition-transform duration-200"
                    style={{
                      transform: active ? 'scale(1.05)' : 'scale(1)'
                    }}
                  >
                    <Icon 
                      size={24} 
                      strokeWidth={active ? 2.5 : 2}
                      className="mb-1"
                    />
                    <span 
                      className="text-xs font-medium"
                      style={{
                        fontWeight: active ? 600 : 500
                      }}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <div 
                        className="w-1 h-1 rounded-full mt-0.5"
                        style={{ backgroundColor: theme.primary }}
                      />
                    )}
                  </div>
                </NavLink>
              );
            }
            
            // For menu items, use button
            return (
              <button
                key={item.label}
                onClick={(e) => handleNavClick(item, e)}
                className="flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 touch-manipulation"
                style={{
                  color: active ? theme.primary : theme.textLight,
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <div 
                  className="flex flex-col items-center justify-center transition-transform duration-200"
                  style={{
                    transform: active ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <Icon 
                    size={24} 
                    strokeWidth={active ? 2.5 : 2}
                    className="mb-1"
                  />
                  <span 
                    className="text-xs font-medium"
                    style={{
                      fontWeight: active ? 600 : 500
                    }}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <div 
                      className="w-1 h-1 rounded-full mt-0.5"
                      style={{ backgroundColor: theme.primary }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding spacer for content - Mobile & Tablet Only */}
      <div 
        className="lg:hidden" 
        style={{ 
          height: 'calc(4rem + max(env(safe-area-inset-bottom, 0px), 0px))'
        }} 
      />

      {/* Bottom Sheet Menus */}
      <BottomNavMenu
        isOpen={openMenu === 'research'}
        onClose={() => setOpenMenu(null)}
        items={researchMenu}
        title="Research"
        theme={theme}
      />
      
      <BottomNavMenu
        isOpen={openMenu === 'inventory'}
        onClose={() => setOpenMenu(null)}
        items={inventoryMenu}
        title="Inventory"
        theme={theme}
      />
      
      <BottomNavMenu
        isOpen={openMenu === 'more'}
        onClose={() => setOpenMenu(null)}
        items={moreMenu}
        title="More Options"
        theme={theme}
      />
    </>
  );
}

