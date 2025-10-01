import React from 'react';
import { Menu, Search, Upload, HelpCircle, Edit, Settings } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import { useLocation } from 'react-router-dom';
import GlobalSearchInline from '../search/GlobalSearchInline';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import HelpTipsModal from '../ui/HelpTipsModal';
import NotificationBell from '../common/NotificationBell';

export default function Topbar({ onMenuClick, theme, onDashboardCustomize, onDashboardSettings, isCustomizing = false }) {
  const location = useLocation();
  const seg = (location.pathname.split('/')[1] || 'dashboard');
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
    '': 'Welcome to your Pep Planner.',
    dashboard: 'Welcome to your Pep Planner.',
    research: 'Research',
    calendar: 'Calendar',
    recon: 'Reconstitute',
    protocols: 'Protocols - The Pep Planner',
    orders: 'Orders',
    vendors: 'Vendors',
    stockpile: 'Stockpile',
    glossary: 'Glossary',
    imports: 'Import Review',
    settings: 'Settings',
    account: 'Account',
    login: 'Login',
    announcements: 'From: The Pep Planner',
    badges: 'Badges',
  };
  const title = titles[seg] || 'The Pep Planner';

  const [showSearch, setShowSearch] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);


  return (
    <>
      <header className="backdrop-blur border-b h-16 flex items-center px-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick} 
            className="md:hidden no-shadow" 
            style={{ color: theme.text }}
            aria-label="Open navigation menu"
            aria-expanded="false"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight truncate" style={{ color: theme?.primaryDark }}>
            <span className="hidden sm:inline">{title}</span>
            <span className="sm:hidden">{title}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          {showSearch && (
            <div className="hidden md:block w-full max-w-xl mr-2">
              <GlobalSearchInline theme={theme} onClose={() => setShowSearch(false)} onNavigate={(to) => { setShowSearch(false); window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }} />
            </div>
          )}
          <ModernTooltip text="Search" position="bottom">
            <button 
              className="p-2 rounded-full no-shadow" 
              onClick={() => setShowSearch(s => !s)} 
              style={{ color: theme.text }}
              aria-label="Toggle global search"
              aria-expanded={showSearch}
            >
              <Search className="h-5 w-5" />
            </button>
          </ModernTooltip>
          {/* Import feature temporarily hidden - uncomment to re-enable
          {onDashboard && (
            <button data-tour="topbar-import" className="p-2 rounded-full no-shadow" title="Import (OCR)" onClick={() => window.dispatchEvent(new CustomEvent('tpp:openImport'))} style={{ color: theme.text }}><Upload className="h-5 w-5" /></button>
          )}
          */}
          <NotificationBell theme={theme} />
          {onDashboard && onDashboardCustomize && (
            <ModernTooltip text={customizingState ? "Done Editing" : "Customize Dashboard"} position="bottom">
              <button 
                className={`p-2 rounded-full no-shadow transition-all duration-200 ${
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
                <Edit className="h-5 w-5" />
              </button>
            </ModernTooltip>
          )}
          {onDashboard && onDashboardSettings && (
            <ModernTooltip text="Dashboard Settings" position="bottom">
              <button 
                className="p-2 rounded-full no-shadow transition-all duration-200" 
                onClick={onDashboardSettings}
                style={{ color: theme.text }}
                aria-label="Open dashboard settings"
                title="Dashboard Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </ModernTooltip>
          )}
          <ModernTooltip text="Help" position="bottom">
            <button 
              className="p-2 rounded-full no-shadow" 
              onClick={() => setShowHelp(true)} 
              style={{ color: theme.text }}
              aria-label="Open help and tips"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </ModernTooltip>
        </div>
      </header>
      <HelpTipsModal open={showHelp} onClose={() => setShowHelp(false)} seg={seg} theme={theme} />
    </>
  );
}


