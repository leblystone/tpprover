import React from 'react';
import { Menu, Search, Upload, Edit, Plus } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import { useLocation } from 'react-router-dom';
import GlobalSearchInline from '../search/GlobalSearchInline';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import NotificationBell from '../common/NotificationBell';

export default function Topbar({ onMenuClick, theme, onDashboardCustomize, isCustomizing = false, tabs, activeTab, onTabChange, onActionClick, actionDisabled, autoSaveIndicator }) {
  const location = useLocation();
  // Handle both /page and /app/page routing patterns
  const pathParts = location.pathname.split('/').filter(Boolean);
  const seg = pathParts[0] === 'app' ? (pathParts[1] || 'dashboard') : (pathParts[0] || 'dashboard');
  const onDashboard = seg === 'dashboard' || location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/dashboard');
  const [customizingState, setCustomizingState] = React.useState(false);

  // Listen for customizing state changes from dashboard
  React.useEffect(() => {
    const handleCustomizingChange = (event) => {
      setCustomizingState(event.detail.isCustomizing);
    };
    window.addEventListener('tpp:dashboard-customizing-changed', handleCustomizingChange);
    return () => window.removeEventListener('tpp:dashboard-customizing-changed', handleCustomizingChange);
  }, []);

  const titles = {
    '': 'Dashboard',
    dashboard: 'Dashboard',
    research: 'Research',
    calendar: 'Calendar',
    recon: 'Recon',
    protocols: 'Protocols',
    orders: 'Orders',
    vendors: 'Vendors',
    stockpile: 'Stockpile',
    glossary: 'Glossary',
    imports: 'Import Review',
    settings: 'Settings',
    account: 'Account',
    login: 'Login',
    announcements: 'Announcements',
    badges: 'Badges',
  };
  
  // Desktop titles for pages that need longer names
  const desktopTitles = {
    recon: 'Reconstitute',
  };
  
  const mobileTitle = titles[seg] || 'Dashboard';
  const desktopTitle = desktopTitles[seg] || mobileTitle;

  const [showSearch, setShowSearch] = React.useState(false);


  return (
    <>
      <header className="backdrop-blur border-b h-12 md:h-16 flex items-center justify-between px-3 md:px-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={onMenuClick} 
            className="md:hidden no-shadow" 
            style={{ color: theme.text }}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu size={20} className="md:hidden" />
          </button>
          {/* Show page title - responsive for some pages */}
          <h1 className="text-lg md:text-xl font-bold tracking-tight truncate" style={{ color: theme?.primaryDark }}>
            <span className="md:hidden">{mobileTitle}</span>
            <span className="hidden md:inline">{desktopTitle}</span>
          </h1>
        </div>
          
        {/* Tabs in Topbar - Right aligned */}
        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 md:gap-2 px-2 py-1 rounded-lg" style={{ backgroundColor: `${theme.primary}08` }}>
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm uppercase tracking-tight md:tracking-wider rounded-lg transition-all duration-200 relative whitespace-nowrap ${
                  activeTab === tab.value 
                    ? 'shadow-sm' 
                    : 'hover:bg-gray-800 hover:text-white hover:shadow'
                }`}
                style={{
                  backgroundColor: activeTab === tab.value ? `${theme.primary}20` : 'transparent',
                  color: activeTab === tab.value ? theme.primary : theme.textLight,
                  fontWeight: activeTab === tab.value ? 600 : 500
                }}
              >
                {tab.label}
                {/* Active indicator line */}
                {activeTab === tab.value && (
                  <span 
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                    style={{ backgroundColor: theme.primary }}
                  />
                )}
              </button>
            ))}
            {onActionClick && (
              <div 
                className="h-6 md:h-7 w-px mx-1 md:mx-2" 
                style={{ backgroundColor: theme.border }}
              />
            )}
            {onActionClick && (
              <button 
                className="p-1.5 md:p-2 rounded-lg hover:opacity-90 hover:shadow transition-all duration-200" 
                style={{ 
                  color: actionDisabled ? theme.textLight : '#ffffff', 
                  backgroundColor: actionDisabled ? theme.textLight : theme.primary,
                  opacity: actionDisabled ? 0.6 : 1,
                  cursor: actionDisabled ? 'not-allowed' : 'pointer'
                }} 
                onClick={onActionClick}
                disabled={actionDisabled}
                title="Add New"
              >
                <Plus className="h-4 w-4 md:h-4 md:w-4" />
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-1 md:gap-2">
          {/* Auto Save Indicator */}
          {autoSaveIndicator && (
            <div className="mr-2">
              {autoSaveIndicator}
            </div>
          )}
          {showSearch && (
            <div className="hidden md:block w-full max-w-xl mr-2">
              <GlobalSearchInline theme={theme} onClose={() => setShowSearch(false)} onNavigate={(to) => { setShowSearch(false); window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }} />
            </div>
          )}
          <ModernTooltip text="Search" position="bottom">
            <button 
              className="p-1.5 md:p-2 rounded-full no-shadow" 
              onClick={() => setShowSearch(s => !s)} 
              style={{ color: theme.text }}
              aria-label="Toggle global search"
              aria-expanded={showSearch}
            >
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </ModernTooltip>
          {/* Import feature temporarily hidden - uncomment to re-enable
          {onDashboard && (
            <button data-tour="topbar-import" className="p-2 rounded-full no-shadow" title="Import (OCR)" onClick={() => window.dispatchEvent(new CustomEvent('tpp:openImport'))} style={{ color: theme.text }}><Upload className="h-5 w-5" /></button>
          )}
          */}
          {/* Notifications temporarily hidden - future feature
          <NotificationBell theme={theme} />
          */}
          {onDashboard && onDashboardCustomize && (
            <ModernTooltip text={customizingState ? "Done Editing" : "Customize Dashboard"} position="bottom">
              <button 
                className={`p-1.5 md:p-2 rounded-full no-shadow transition-all duration-200 ${
                  customizingState ? 'ring-2 ring-opacity-50' : ''
                }`}
                onClick={onDashboardCustomize}
                style={{ 
                  color: theme.text,
                  backgroundColor: customizingState ? theme.primary : 'transparent',
                  ringColor: customizingState ? theme.primary : 'transparent'
                }}
                aria-label={customizingState ? "Done editing dashboard" : "Customize dashboard"}
                title="Customize Dashboard"
              >
                <Edit className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </ModernTooltip>
          )}
        </div>
      </header>
    </>
  );
}


