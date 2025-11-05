import React, { Suspense, useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileSidebar'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import './styles/App.css';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { useAppContext } from './context/AppContext';
import { hasBetaLifetimeAccess } from './utils/betaAccess'; // Keep for existing beta users
import SuccessModal from './components/ui/SuccessModal';
// Beta pages no longer needed - app is live
// import BetaEnded from './pages/BetaEnded';
// import BetaClosed from './pages/BetaClosed';
import TourController from './components/onboarding/TourController';
import FeedbackModal from './components/common/FeedbackModal';
import InstallInstructionsModal from './components/common/InstallInstructionsModal';
import PwaUnsupportedModal from './components/common/PwaUnsupportedModal';
import NotificationPermissionPrompt from './components/common/NotificationPermissionPrompt';
import IOSInstallPrompt from './components/common/IOSInstallPrompt';
import FirstLaunchDisclaimer from './components/legal/FirstLaunchDisclaimer';
import './utils/debugUtils'; // Load debug utilities globally
import { useSubscriptionAccess } from './utils/useSubscriptionAccess'
import { handleCheckoutReturn } from './utils/checkoutNavigation';
import SubscriptionModal from './components/common/SubscriptionModal';
import { ModernToastContainer } from './components/ui/ModernToast';
import { useBackButtonHandler } from './utils/useBackButtonHandler';

function App() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [themeName] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
      // Migrate users from beekeeper theme to sage theme
      if (savedTheme === 'beekeeper') {
        localStorage.setItem('tpprover_theme', defaultThemeName);
        return defaultThemeName;
      }
      // Ensure the theme exists in the themes object
      if (themes[savedTheme]) {
        return savedTheme;
      }
      return defaultThemeName;
    } catch {
      return defaultThemeName;
    }
  });
  const theme = themes[themeName]
  const { hasMockData, user } = useAppContext();
  const { daysRemaining, isTrialExpired, showUpgradePrompt, subscriptionInterval, isLoading } = useSubscriptionAccess();
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
  const [topbarTabs, setTopbarTabs] = useState(null);
  const [topbarAutoSave, setTopbarAutoSave] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Hardware back button handler for mobile apps
  useBackButtonHandler();

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

  // Handle checkout return navigation at the App level
  useEffect(() => {
    handleCheckoutReturn(navigate, searchParams);
  }, [navigate, searchParams]);

  useEffect(() => {
    // Show welcome modal for all new Firebase users - wait for user to be loaded
    if (!user) return; // Wait for user to be loaded
    
    // Prevent showing modal multiple times in the same session
    const welcomeShownThisSession = sessionStorage.getItem('tpp_welcome_shown');
    if (welcomeShownThisSession === 'true') {
      console.log('🎉 Welcome modal already shown this session - skipping');
      return;
    }
    
    // Add a small delay to ensure auth token and cloud data is loaded
    const checkWelcomeModal = async () => {
      try {
        // Wait for initial data load to complete to prevent interference
        const initialLoadInProgress = sessionStorage.getItem('tpp_initial_data_loading');
        if (initialLoadInProgress === 'true') {
          console.log('⏸️ Welcome modal check: Waiting for initial data load to complete');
          // Retry after a short delay
          setTimeout(checkWelcomeModal, 200);
          return;
        }
        
        // Double check the session flag in case another render beat us here
        if (sessionStorage.getItem('tpp_welcome_shown') === 'true') {
          return;
        }
        
        const isFirebaseUser = localStorage.getItem('tpprover_auth_token') === 'firebase_token';
        
        // Load user state from cloud storage
        const { loadUserState } = await import('./services/cloudStorage');
        const { firebaseUser } = await import('./config/firebase').then(m => ({ firebaseUser: user }));
        
        if (user?.uid) {
          const userState = await loadUserState(user.uid);
          const hasOnboarded = userState?.hasOnboarded || false;
          const sampleDataCleared = userState?.sampleDataCleared || false;
          
          // Show welcome for new users:
          // 1. User hasn't onboarded AND
          // 2. User is a Firebase user (authenticated) AND
          // 3. Sample data hasn't been explicitly cleared
          if (!hasOnboarded && isFirebaseUser && !sampleDataCleared) {
            // Don't set session flag here - let the modal component set it when actually displayed
            setShowWelcome(true);
          }
        }
      } catch (error) {
        console.error('❌ Failed to check welcome modal state:', error);
      }
    };
    
    // Only check once with a small delay for Firestore to sync
    const timeoutId = setTimeout(checkWelcomeModal, 300);
    
    return () => clearTimeout(timeoutId);
  }, [user]);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem('tpprover_sample_banner_dismissed');
    const dataCleared = localStorage.getItem('tpprover_sample_data_cleared');
    
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
    window.addEventListener('sample-data-cleared', handleDemoSuccess);
    return () => window.removeEventListener('sample-data-cleared', handleDemoSuccess);
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

  // Listen for topbar tabs from pages
  useEffect(() => {
    const handleSetTabs = (event) => {
      setTopbarTabs(event.detail);
    };
    const handleClearTabs = () => {
      setTopbarTabs(null);
    };
    const handleSetAutoSave = (event) => {
      setTopbarAutoSave(event.detail.autoSaveIndicator);
    };
    const handleClearAutoSave = () => {
      setTopbarAutoSave(null);
    };
    window.addEventListener('tpp:set-topbar-tabs', handleSetTabs);
    window.addEventListener('tpp:clear-topbar-tabs', handleClearTabs);
    window.addEventListener('tpp:set-topbar-autosave', handleSetAutoSave);
    window.addEventListener('tpp:clear-topbar-autosave', handleClearAutoSave);
    return () => {
      window.removeEventListener('tpp:set-topbar-tabs', handleSetTabs);
      window.removeEventListener('tpp:clear-topbar-tabs', handleClearTabs);
      window.removeEventListener('tpp:set-topbar-autosave', handleSetAutoSave);
      window.removeEventListener('tpp:clear-topbar-autosave', handleClearAutoSave);
    };
  }, []);

  const handleCloseWelcome = async () => {
    setShowWelcome(false);
    // Session flag already set when modal was shown - no need to set again
    // Save to cloud storage
    if (user?.uid) {
      try {
        const { saveUserState, loadUserState } = await import('./services/cloudStorage');
        const currentState = await loadUserState(user.uid) || {};
        await saveUserState(user.uid, { ...currentState, hasOnboarded: true });
        console.log('☁️ Saved onboarding state to cloud');
      } catch (error) {
        console.error('❌ Failed to save onboarding state:', error);
      }
    }
  };

  const startTour = async () => {
    setShowWelcome(false);
    // Session flag already set when modal was shown - no need to set again
    // Save to cloud storage
    if (user?.uid) {
      try {
        const { saveUserState, loadUserState } = await import('./services/cloudStorage');
        const currentState = await loadUserState(user.uid) || {};
        await saveUserState(user.uid, { ...currentState, hasOnboarded: true });
        console.log('☁️ Saved onboarding state to cloud');
      } catch (error) {
        console.error('❌ Failed to save onboarding state:', error);
      }
    }
    // Navigate to dashboard with tour query param
    navigate('/app/dashboard?tour=true', { replace: true });
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
      <div className="flex-1 flex flex-col lg:ml-24 min-w-0" style={{
        // Add padding for mobile status bar
        paddingTop: window.innerWidth < 1024 ? 'env(safe-area-inset-top, 24px)' : '0px'
      }}>
        <Topbar 
          theme={theme} 
          onMenuClick={() => setMobileMenuOpen(true)}
          onDashboardCustomize={(location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/dashboard')) ? () => {
            // Dispatch custom event for dashboard customize
            window.dispatchEvent(new CustomEvent('tpp:dashboard-customize'));
          } : undefined}
          onDashboardSettings={(location.pathname === '/app' || location.pathname === '/app/' || location.pathname.includes('/dashboard')) ? () => {
            // Dispatch custom event for dashboard settings
            window.dispatchEvent(new CustomEvent('tpp:dashboard-settings'));
          } : undefined}
          isCustomizing={false} // This will be managed by the dashboard component
          tabs={topbarTabs?.tabs}
          activeTab={topbarTabs?.activeTab}
          onTabChange={topbarTabs?.onTabChange}
          onActionClick={topbarTabs?.onActionClick}
          actionDisabled={topbarTabs?.actionDisabled}
          autoSaveIndicator={topbarAutoSave}
          trialInfo={showUpgradePrompt && user && !isLoading ? {
            daysRemaining,
            isTrialExpired,
            onUpgradeClick: () => setShowSubscriptionModal(true)
          } : null}
          showSampleData={showDemoBanner}
        />
               <main className="flex-1 overflow-y-auto overflow-x-hidden main-content p-2 min-h-0" style={{ backgroundColor: theme.background, color: theme.text }}>
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
        title="Sample Data Removed!"
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
      <FirstLaunchDisclaimer 
        open={false} 
        onAccept={() => {}} 
      />
      <NotificationPermissionPrompt theme={theme} />
      <IOSInstallPrompt theme={theme} />
      <SubscriptionModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        theme={theme}
        currentPlan={subscriptionInterval}
      />
      
      {/* Toast Notifications */}
      <ModernToastContainer theme={theme} />
      
    </div>
  )
}

export default App