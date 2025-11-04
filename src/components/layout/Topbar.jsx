import React from 'react';
import { Menu, Search, Upload, Edit, Plus } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import { useLocation } from 'react-router-dom';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import NotificationBell from '../common/NotificationBell';
import TrialButton from '../common/TrialButton';

export default function Topbar({ onMenuClick, theme, onDashboardCustomize, isCustomizing = false, tabs, activeTab, onTabChange, onActionClick, actionDisabled, autoSaveIndicator, trialInfo }) {
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

  const getPlaceholderForPage = (pageSeg) => {
    const placeholders = {
      recon: 'Search recon entries...',
      orders: 'Search orders...',
      protocols: 'Search protocols...',
      stockpile: 'Search stockpile...',
      vendors: 'Search vendors...',
      glossary: 'Search glossary...',
      research: 'Search supplements...',
      calendar: 'Search events...',
      imports: 'Search imports...',
    };
    return placeholders[pageSeg] || 'Search...';
  };
  const desktopTitle = desktopTitles[seg] || mobileTitle;

  const [searchQuery, setSearchQuery] = React.useState('');
  const searchInputRef = React.useRef(null);



  return (
    <>
      <header className="backdrop-blur border-b h-12 md:h-16 flex items-center px-3 md:px-6 relative" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Mobile Menu Button - back on left side for consistency */}
          <button 
            onClick={onMenuClick} 
            className="md:hidden no-shadow p-2" 
            style={{ color: theme.text }}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu size={28} className="md:hidden" />
          </button>
          {/* Show page title - responsive for some pages */}
          <h1 className="text-lg md:text-xl font-bold tracking-tight truncate" style={{ color: theme?.primaryDark }}>
            <span className="md:hidden">{mobileTitle}</span>
            <span className="hidden md:inline">{desktopTitle}</span>
          </h1>
        </div>
          
        {/* Tabs in Topbar - Center position */}
        {tabs && tabs.length > 0 && (
          <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg flex-1 justify-center mx-4" style={{ backgroundColor: `${theme.primary}08` }}>
            {tabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`px-3 py-1.5 text-xs uppercase tracking-tight rounded-lg transition-all duration-200 relative whitespace-nowrap ${
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
        
        {/* Spacer to push icons to the right when no tabs */}
        {(!tabs || tabs.length === 0) && <div className="flex-1" />}
        
        {/* Mobile tabs - show only active tab with dropdown */}
        {tabs && tabs.length > 0 && (
          <div className="md:hidden flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-xs uppercase tracking-tight rounded-lg shadow-sm relative whitespace-nowrap"
              style={{
                backgroundColor: `${theme.primary}20`,
                color: theme.primary,
                fontWeight: 600
              }}
            >
              {tabs.find(t => t.value === activeTab)?.label || tabs[0].label}
            </button>
            {onActionClick && (
              <button 
                className="p-1.5 rounded-lg hover:opacity-90 hover:shadow transition-all duration-200" 
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
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-auto">
          {/* Auto Save Indicator */}
          {autoSaveIndicator && (
            <div className="mr-2">
              {autoSaveIndicator}
            </div>
          )}
          {/* Trial Button - Only show on dashboard */}
          {onDashboard && trialInfo && (trialInfo.daysRemaining <= 2 || trialInfo.isTrialExpired) && (
            <TrialButton
              daysRemaining={trialInfo.daysRemaining}
              isTrialExpired={trialInfo.isTrialExpired}
              onUpgradeClick={trialInfo.onUpgradeClick}
              theme={theme}
            />
          )}
          {/* Dashboard-specific expanding search box */}
          {onDashboard && (
            <form 
              className="search-box-wrapper" 
              style={{ color: theme.text, backgroundColor: theme.cardBackground }}
              onSubmit={(e) => { e.preventDefault(); }}
            >
              <button
                type="button"
                className="search-icon-button"
                onClick={() => searchInputRef.current?.focus()}
                style={{ color: theme.textLight, opacity: 0.7 }}
              >
                <Search size={18} />
              </button>
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Search..."
                style={{ color: theme.text }}
              />
              <button 
                type="reset"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.blur();
                }}
              />
            </form>
          )}
          {/* Search for other pages */}
          {!onDashboard && seg !== 'settings' && seg !== 'account' && (
            <form 
              className="search-box-wrapper" 
              style={{ color: theme.text, backgroundColor: theme.cardBackground }}
              onSubmit={(e) => { e.preventDefault(); }}
            >
              <button
                type="button"
                className="search-icon-button"
                onClick={() => {
                  const input = document.querySelector(`.search-box-wrapper input[data-page="${seg}"]`);
                  input?.focus();
                }}
                style={{ color: theme.textLight, opacity: 0.7 }}
              >
                <Search size={18} />
              </button>
              <input 
                type="text" 
                data-page={seg}
                onChange={(e) => window.dispatchEvent(new CustomEvent(`tpp:${seg}-search`, { detail: { query: e.target.value } }))} 
                placeholder={getPlaceholderForPage(seg)}
                style={{ color: theme.text }}
              />
              <button 
                type="reset"
                onClick={() => {
                  const input = document.querySelector(`.search-box-wrapper input[data-page="${seg}"]`);
                  if (input) {
                    input.value = '';
                    input.blur();
                    window.dispatchEvent(new CustomEvent(`tpp:${seg}-search`, { detail: { query: '' } }));
                  }
                }}
              />
            </form>
          )}
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


