import React, { Suspense, useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileSidebar'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import './styles/App.css';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { useAppContext } from './context/AppContext';
import DemoDataBanner from './components/ui/DemoDataBanner';
import GlossaryQuickModal from './components/glossary/GlossaryQuickModal';
import BetaEnded from './pages/BetaEnded';

function App() {
  const [themeName] = useState(() => {
    try {
      return localStorage.getItem('tpprover_theme') || defaultThemeName;
    } catch {
      return defaultThemeName;
    }
  });
  const theme = themes[themeName]
  const { hasMockData } = useAppContext();
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('tpprover_has_onboarded');
    if (hasOnboarded !== 'true') {
      setShowWelcome(true);
    }

    const bannerDismissed = localStorage.getItem('tpprover_demo_banner_dismissed');
    if (hasMockData && bannerDismissed !== 'true') {
        setShowDemoBanner(true);
    }
  }, [hasMockData]);

  // Beta access control
  const isBetaActive = () => {
    // Always allow access in development/testing to avoid local lockout
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      return true;
    }

    const phase1EndDate = new Date('2024-09-07T00:00:00Z'); // Sept 6th midnight UTC
    const phase2EndDate = new Date('2024-09-14T00:00:00Z'); // Sept 13th midnight UTC
    const now = new Date();
    return now <= phase2EndDate;
  };

  if (!isBetaActive()) {
    return <BetaEnded />;
  }

  // Capture PWA install prompt for later use
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('tpprover_has_onboarded', 'true');
  };

  const startTour = () => {
    setShowWelcome(false);
    navigate('/?tour=true');
  };

  const glossaryTerm = new URLSearchParams(window.location.search).get('glossary');

  return (
    <div className="h-screen flex bg-gray-100 font-sans antialiased">
      <Sidebar theme={theme} />
      <div className="flex-1 flex flex-col md:ml-24">
        <Topbar theme={theme} onMenuClick={() => setMobileMenuOpen(true)} onGlossaryClick={() => setShowGlossary(true)} />
        {showDemoBanner && <DemoDataBanner theme={theme} sticky />}
        <main className="flex-1 overflow-x-hidden overflow-y-auto main-content p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            <Outlet context={{ theme, installPrompt }} />
          </Suspense>
        </main>
      </div>
      <MobileNav theme={theme} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <WelcomeModal
        open={showWelcome}
        onClose={handleCloseWelcome}
        onStartTour={startTour}
        theme={theme}
      />
      <GlossaryQuickModal open={showGlossary} onClose={() => setShowGlossary(false)} theme={theme} />
    </div>
  )
}

export default App