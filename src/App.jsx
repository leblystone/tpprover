import React, { Suspense, useState, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileSidebar'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import './styles/App.css';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { useAppContext } from './context/AppContext';
import { isBetaTester, hasBetaLifetimeAccess, isBetaPeriodEnded } from './utils/betaAccess';
import DemoDataBanner from './components/ui/DemoDataBanner';
import GlossaryQuickModal from './components/glossary/GlossaryQuickModal';
import SuccessModal from './components/ui/SuccessModal';
import BetaEnded from './pages/BetaEnded';
import TourController from './components/onboarding/TourController';
import FeedbackModal from './components/common/FeedbackModal';
import InstallInstructionsModal from './components/common/InstallInstructionsModal';
import PwaUnsupportedModal from './components/common/PwaUnsupportedModal';
import BetaEndedPopup from './components/beta/BetaEndedPopup';

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
  const [showGlossary, setShowGlossary] = useState(false);
  const [showBetaEndedPopup, setShowBetaEndedPopup] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isPwaSupported, setIsPwaSupported] = useState(false);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [showDemoSuccessModal, setShowDemoSuccessModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

  // Check for beta ended popup on user login
  useEffect(() => {
    if (user && isBetaTester(user) && !hasBetaLifetimeAccess(user) && isBetaPeriodEnded()) {
      // Check if we should show the popup
      const lastShown = localStorage.getItem('tpprover_beta_popup_last_shown');
      const remindLater = localStorage.getItem('tpprover_beta_survey_remind_later');
      const now = new Date();

      let shouldShow = false;

      if (!lastShown) {
        // Never shown before, show it
        shouldShow = true;
      } else if (remindLater) {
        // Check if remind time has passed
        const remindTime = new Date(remindLater);
        if (now >= remindTime) {
          shouldShow = true;
          localStorage.removeItem('tpprover_beta_survey_remind_later');
        }
      } else {
        // Show again if it's been more than 24 hours since last shown
        const lastShownTime = new Date(lastShown);
        const hoursSinceLastShown = (now - lastShownTime) / (1000 * 60 * 60);
        if (hoursSinceLastShown >= 24) {
          shouldShow = true;
        }
      }

      if (shouldShow) {
        // Small delay to let the app load
        setTimeout(() => {
          setShowBetaEndedPopup(true);
          localStorage.setItem('tpprover_beta_popup_last_shown', now.toISOString());
        }, 1000);
      }
    }
  }, [user]);

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

  // Beta access control
  const isBetaActive = () => {
    // Always allow access in development/testing to avoid local lockout
    if (import.meta && import.meta.env && import.meta.env.DEV) {
      return true;
    }

    const phase1EndDate = new Date('2024-09-11T00:00:00Z'); // Sept 10th midnight UTC
    const phase2EndDate = new Date('2024-09-18T00:00:00Z'); // Sept 17th midnight UTC
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
        <Topbar theme={theme} onMenuClick={() => setMobileMenuOpen(true)} onGlossaryClick={() => setShowGlossary(true)} />
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
        installPrompt={installPrompt} 
        isPwaSupported={isPwaSupported} 
        isPwaInstalled={isPwaInstalled} 
        onShowFeedback={() => setShowFeedbackModal(true)}
        onShowInstall={() => setShowInstallModal(true)}
        onShowUnsupported={() => setShowUnsupportedModal(true)}
      />
      <WelcomeModal
        open={showWelcome}
        onClose={handleCloseWelcome}
        onStartTour={startTour}
        theme={theme}
      />
      <GlossaryQuickModal open={showGlossary} onClose={() => setShowGlossary(false)} theme={theme} />
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
      
      {/* Beta Ended Popup */}
      {showBetaEndedPopup && (
        <BetaEndedPopup 
          user={user}
          theme={theme}
          onClose={() => setShowBetaEndedPopup(false)}
        />
      )}
    </div>
  )
}

export default App