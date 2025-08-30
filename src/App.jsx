import React, { Suspense, useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileSidebar'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import './styles/App.css';
import Tour from './components/onboarding/Tour';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { useAppContext } from './context/AppContext';
import DemoDataBanner from './components/ui/DemoDataBanner';
import GlossaryQuickModal from './components/glossary/GlossaryQuickModal';
import DashboardOnboarding from './components/onboarding/DashboardOnboarding';
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
  const [startTour, setStartTour] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showDashboardOnboarding, setShowDashboardOnboarding] = useState(false);
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
    const phase1EndDate = new Date('2024-09-07T00:00:00Z'); // Sept 6th midnight UTC
    const phase2EndDate = new Date('2024-09-14T00:00:00Z'); // Sept 13th midnight UTC
    const now = new Date();
    // For testing, you can uncomment the line below to simulate the beta having ended.
    // return false;
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

  const handleStartTour = () => {
    setShowWelcome(false);
    localStorage.setItem('tpprover_has_onboarded', 'true');
    // We're usually already on /dashboard; ensure navigation happens, then start next tick
    navigate('/dashboard');
    setTimeout(() => setShowDashboardOnboarding(true), 0);
  };

  const handleTourEnd = async () => {
    setStartTour(false);
    try {
      const already = localStorage.getItem('tpprover_pwa_prompted');
      if (!already && installPrompt) {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        localStorage.setItem('tpprover_pwa_prompted', 'true');
        setInstallPrompt(null);
      }
    } catch {}
  };

  return (
    <div className="h-screen flex bg-gray-100 font-sans antialiased">
      <Sidebar theme={theme} />
      <div className="flex-1 flex flex-col md:ml-24">
        <Topbar theme={theme} onMenuClick={() => setMobileMenuOpen(true)} onGlossaryClick={() => setShowGlossary(true)} />
        {showDemoBanner && <DemoDataBanner theme={theme} sticky />}
        <main className="flex-1 overflow-x-hidden overflow-y-auto main-content p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            <Outlet context={{ theme }} />
          </Suspense>
        </main>
      </div>
      <MobileNav theme={theme} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <WelcomeModal
        open={showWelcome}
        onClose={handleCloseWelcome}
        onStartTour={handleStartTour}
        theme={theme}
      />
      <Tour
        theme={theme}
        startTour={startTour}
        onTourEnd={handleTourEnd}
        installPrompt={installPrompt}
      />
      <GlossaryQuickModal open={showGlossary} onClose={() => setShowGlossary(false)} theme={theme} />
      <DashboardOnboarding
        open={showDashboardOnboarding}
        theme={theme}
        onComplete={() => {
          setShowDashboardOnboarding(false);
          setStartTour(true);
        }}
      />
    </div>
  )
}

export default App