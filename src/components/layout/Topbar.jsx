import React from 'react';
import { Menu, Search, Upload, BookText, HelpCircle } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';
import { useLocation } from 'react-router-dom';
import GlobalSearchInline from '../search/GlobalSearchInline';
import GlossaryQuickModal from '../glossary/GlossaryQuickModal';
import HelpTipsModal from '../ui/HelpTipsModal';
import NotificationBell from '../common/NotificationBell';

export default function Topbar({ onMenuClick, theme, onGlossaryClick }) {
  const location = useLocation();
  const seg = (location.pathname.split('/')[1] || 'dashboard');
  const onDashboard = seg === 'dashboard';

  const titles = {
    '': 'Welcome to your Pep Planner.',
    dashboard: 'Welcome to your Pep Planner.',
    research: 'Research',
    calendar: 'Calendar',
    recon: 'Reconstitution',
    protocols: 'Protocols',
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
            <span className="sm:hidden">{title.includes('Welcome') ? 'The Pep Planner' : title}</span>
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
          <ModernTooltip text="Glossary" position="bottom">
            <button 
              data-tour="topbar-glossary" 
              className="p-2 rounded-lg no-shadow hover:scale-105 transition-all duration-200" 
              onClick={onGlossaryClick} 
              style={{ 
                color: theme.primary, 
                backgroundColor: theme.primary + '15',
                border: `1px solid ${theme.primary + '30'}`
              }}
              aria-label="Open research glossary"
            >
              <BookText className="h-5 w-5" />
            </button>
          </ModernTooltip>
          {/* Import feature temporarily hidden - uncomment to re-enable
          {onDashboard && (
            <button data-tour="topbar-import" className="p-2 rounded-full no-shadow" title="Import (OCR)" onClick={() => window.dispatchEvent(new CustomEvent('tpp:openImport'))} style={{ color: theme.text }}><Upload className="h-5 w-5" /></button>
          )}
          */}
          <NotificationBell theme={theme} />
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


