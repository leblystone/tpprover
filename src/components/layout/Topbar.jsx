import React from 'react';
import { Menu, Search, Upload, BookText, HelpCircle } from 'lucide-react';
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
          <button onClick={onMenuClick} className="md:hidden no-shadow" style={{ color: theme.text }}>
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: theme?.primaryDark }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          {showSearch && (
            <div className="hidden md:block w-full max-w-xl mr-2">
              <GlobalSearchInline theme={theme} onClose={() => setShowSearch(false)} onNavigate={(to) => { setShowSearch(false); window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }} />
            </div>
          )}
          <button className="p-2 rounded-full no-shadow" title="Global Search" onClick={() => setShowSearch(s => !s)} style={{ color: theme.text }}><Search className="h-5 w-5" /></button>
          <button data-tour="topbar-glossary" className="p-2 rounded-full no-shadow" title="Research" onClick={onGlossaryClick} style={{ color: theme.text }}><BookText className="h-5 w-5" /></button>
          {/* Import feature temporarily hidden - uncomment to re-enable
          {onDashboard && (
            <button data-tour="topbar-import" className="p-2 rounded-full no-shadow" title="Import (OCR)" onClick={() => window.dispatchEvent(new CustomEvent('tpp:openImport'))} style={{ color: theme.text }}><Upload className="h-5 w-5" /></button>
          )}
          */}
          <NotificationBell theme={theme} />
          <button className="p-2 rounded-full no-shadow" title="Help" onClick={() => setShowHelp(true)} style={{ color: theme.text }}><HelpCircle className="h-5 w-5" /></button>
        </div>
      </header>
      <HelpTipsModal open={showHelp} onClose={() => setShowHelp(false)} seg={seg} theme={theme} />
    </>
  );
}


