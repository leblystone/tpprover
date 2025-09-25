import React, { Suspense, useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileSidebar'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import './styles/App.css';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { useAppContext } from './context/AppContext';
import { hasBetaLifetimeAccess } from './utils/betaAccess'; // Keep for existing beta users
import DemoDataBanner from './components/ui/DemoDataBanner';
import SuccessModal from './components/ui/SuccessModal';
// Beta pages no longer needed - app is live
// import BetaEnded from './pages/BetaEnded';
// import BetaClosed from './pages/BetaClosed';
import TourController from './components/onboarding/TourController';
import FeedbackModal from './components/common/FeedbackModal';
import InstallInstructionsModal from './components/common/InstallInstructionsModal';
import PwaUnsupportedModal from './components/common/PwaUnsupportedModal';
import './utils/debugUtils'; // Load debug utilities globally

function App() {
  const [themeName] = useState(() => {
    try {
      return localStorage.getItem('tpprover_theme') || defaultThemeName;
    } catch {
      return defaultThemeName;
    }
  });
  const theme = themes[themeName]
  const { hasMockData, user } = useAppContext();
  const [showWelcome, setShowWelcome] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [showDemoBanner, setShowDemoBanner] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isPwaSupported, setIsPwaSupported] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [showDemoSuccessModal, setShowDemoSuccessModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

  // App is now live - no beta restrictions

  useEffect(() => {
    // A simple check for service worker support can be an indicator of PWA capability.
    if ('serviceWorker' in navigator) {
        setIsPwaSupported(true);
    }

    // Check if the app is running in standalone mode (i.e., installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsPwaInstalled(true);
    }
  }, []);

  useEffect(() => {
    const hasOnboarded = localStorage.getItem('tpprover_has_onboarded');
    if (hasOnboarded !== 'true') {
      setShowWelcome(true);
    }

    const bannerDismissed = localStorage.getItem('tpprover_demo_banner_dismissed');
    const dataCleared = localStorage.getItem('tpprover_demo_data_cleared');
    
    // Show banner if there's mock data and it hasn't been dismissed or cleared
    if (hasMockData && bannerDismissed !== 'true' && dataCleared !== 'true') {
        setShowDemoBanner(true);
    } else {
        setShowDemoBanner(false);
    }
  }, [hasMockData]);

  // Listen for demo data success events from banner
  useEffect(() => {
    const handleDemoSuccess = () => {
      setShowDemoSuccessModal(true);
    };
    window.addEventListener('demo-data-cleared', handleDemoSuccess);
    return () => window.removeEventListener('demo-data-cleared', handleDemoSuccess);
  }, []);


  // App is now live - no beta restrictions
  // Beta testers maintain their lifetime access

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

  const handleModalInstall = () => {
    setShowInstallModal(false);
    if (installPrompt) {
      installPrompt.prompt();
    }
  };

  return (
    <div className="h-screen flex bg-gray-100 font-sans antialiased">
      <Sidebar theme={theme} installPrompt={installPrompt} isPwaSupported={isPwaSupported} isPwaInstalled={isPwaInstalled} />
      <div className="flex-1 flex flex-col md:ml-24 min-w-0">
        <Topbar theme={theme} onMenuClick={() => setMobileMenuOpen(true)} onGlossaryClick={() => window.dispatchEvent(new CustomEvent('tpp:open_glossary', { detail: { tab: 'search' } }))} />
        {showDemoBanner && <DemoDataBanner theme={theme} sticky />}
        <main className="flex-1 overflow-y-auto main-content p-6" style={{ backgroundColor: theme.background, color: theme.text }}>
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            <Outlet context={{ theme, installPrompt }} />
          </Suspense>
        </main>
      </div>
      <MobileNav 
        theme={theme} 
        open={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
      />
      <WelcomeModal
        open={showWelcome}
        onClose={handleCloseWelcome}
        onStartTour={startTour}
        theme={theme}
      />
      <TourController theme={theme} installPrompt={installPrompt} />
      <SuccessModal
        open={showDemoSuccessModal}
        onClose={() => setShowDemoSuccessModal(false)}
        title="Demo Data Removed!"
        message="All sample data has been successfully removed. Your personal entries remain safe and intact."
        theme={theme}
      />
      <FeedbackModal 
        open={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
        theme={theme} 
      />
      <InstallInstructionsModal 
        open={showInstallModal} 
        onClose={() => setShowInstallModal(false)} 
        onInstall={handleModalInstall} 
        theme={theme} 
      />
      <PwaUnsupportedModal 
        open={showUnsupportedModal} 
        onClose={() => setShowUnsupportedModal(false)} 
        theme={theme} 
      />
    </div>
  )
}

export default App