import React, { Suspense, useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileSidebar'
import BottomNavigation from './components/navigation/BottomNavigation'
import Topbar from './components/layout/Topbar'
import { themes, defaultThemeName } from './theme/themes'
import './styles/App.css';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { useAppContext } from './context/AppContext';
import { hasBetaLifetimeAccess } from './utils/betaAccess'; // Keep for existing beta users
import SuccessModal from './components/ui/SuccessModal';
// Beta pages no longer needed - app is live
// import BetaEnded from './pages/BetaEnded';
// import BetaClosed from './pages/BetaClosed';
import FeedbackModal from './components/common/FeedbackModal';
import InstallInstructionsModal from './components/common/InstallInstructionsModal';
import PwaUnsupportedModal from './components/common/PwaUnsupportedModal';
import NotificationPermissionPrompt from './components/common/NotificationPermissionPrompt';
import AndroidPermissionPrompt from './components/common/AndroidPermissionPrompt';
import NativeFirstLaunchPermission from './components/common/NativeFirstLaunchPermission';
import IOSInstallPrompt from './components/common/IOSInstallPrompt';
import FirstLaunchDisclaimer from './components/legal/FirstLaunchDisclaimer';
import './utils/debugUtils'; // Load debug utilities globally
import { useSubscriptionAccess } from './utils/useSubscriptionAccess'
import { handleCheckoutReturn } from './utils/checkoutNavigation';
import SubscriptionModal from './components/common/SubscriptionModal';
import SubscriptionGuard from './components/common/SubscriptionGuard';
import SupportModal from './components/common/SupportModal';
import { ModernToastContainer } from './components/ui/ModernToast';
import { useBackButtonHandler } from './utils/useBackButtonHandler';
import UpdatePromptModal from './components/common/UpdatePromptModal';
import { checkForUpdates } from './utils/versionChecker';
import { logDataBleedDiagnostic } from './utils/dataBleedDiagnostic';
import FeatureAnnouncementModal, { shouldShowAnnouncement } from './components/common/FeatureAnnouncementModal';
import { initTimezoneAutoUpdate } from './utils/timezoneAutoUpdate';
import ReConsentModal from './components/legal/ReConsentModal';
import { needsReconsentAsync, recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from './services/agreementTracking';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Mock update data for testing (local development only)
const mockUpdates = {
  optional: {
    currentVersion: "1.0.5",
    latestVersion: "1.0.6",
    urgency: "optional",
    isRequired: false,
    releaseNotes: "Bug fixes and performance improvements\nSmall UI tweaks\nBetter error handling",
    storeUrls: { ios: "https://apps.apple.com/us/app/the-pep-planner/id6759207981", android: "https://play.google.com/store/apps/details?id=com.thepepplanner.app" }
  },
  recommended: {
    currentVersion: "1.0.5",
    latestVersion: "1.1.0",
    urgency: "recommended",
    isRequired: false,
    releaseNotes: "Fixed those pesky bugs from yesterday\nMade the dashboard even prettier\nProtocols load faster now\nLots of small improvements you'll love",
    storeUrls: { ios: "https://apps.apple.com/us/app/the-pep-planner/id6759207981", android: "https://play.google.com/store/apps/details?id=com.thepepplanner.app" }
  },
  critical: {
    currentVersion: "1.0.5",
    latestVersion: "2.0.0",
    minimumVersion: "1.0.6",
    urgency: "critical",
    isRequired: true,
    releaseNotes: "Important security updates to keep your data safe\nFixed critical issues\nYour app will be safer and faster",
    storeUrls: { ios: "https://apps.apple.com/us/app/the-pep-planner/id6759207981", android: "https://play.google.com/store/apps/details?id=com.thepepplanner.app" }
  }
};

/** Default `/app` main gradient for dark themes when `theme.mainGradient` is omitted (softDark). */
const DEFAULT_DARK_MAIN_GRADIENT =
  'linear-gradient(180deg, #2f3845 0%, #1c222c 50%, #151a22 100%)';

function App() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [themeName] = useState(() => {
    try {
      let savedTheme = localStorage.getItem('tpprover_theme') || defaultThemeName;
      // Migrate old twilight / pastel keys to pearlescent
      if (savedTheme === 'twilight' || savedTheme === 'pastel') {
        savedTheme = 'pearlescent';
        localStorage.setItem('tpprover_theme', 'pearlescent');
      }
      // Migrate users from deprecated themes to sage theme
      if (savedTheme === 'beekeeper' || savedTheme === 'mauve' || savedTheme === 'taupe') {
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
  const [showReConsentModal, setShowReConsentModal] = useState(false);

  // Signal Capgo that the JS bundle loaded successfully — prevents auto-rollback
  useEffect(() => {
    CapacitorUpdater.notifyAppReady();
  }, []);

  // Apply dark mode class + data-theme on <html> for ALL themes (enables [data-theme="pearlescent"] CSS)
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', themeName);
    if (theme.isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme, themeName]);

  // Initialize status bar on mount - disable overlay so WebView starts below status bar
  useEffect(() => {
    const initStatusBar = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.show();

        // Android 15+ (API 35) may enforce edge-to-edge despite opt-out.
        // Detect if overlay is still active and apply a manual safe area.
        if (Capacitor.getPlatform() === 'android') {
          await new Promise(r => setTimeout(r, 150));
          try {
            const info = await StatusBar.getInfo();
            if (info.overlays) {
              document.documentElement.style.setProperty('--android-safe-area-top', '36px');
            }
          } catch {
            // getInfo not available - apply safe default for Android
            document.documentElement.style.setProperty('--android-safe-area-top', '36px');
          }
        }
      } catch (e) {
        console.warn('StatusBar init error:', e);
        if (Capacitor.getPlatform() === 'android') {
          document.documentElement.style.setProperty('--android-safe-area-top', '36px');
        }
      }
    };
    initStatusBar();
  }, []);

  // Update status bar style based on theme (mobile apps only)
  useEffect(() => {
    const updateStatusBar = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const isDarkTheme = theme.isDark;
        const statusBarStyle = isDarkTheme ? Style.Dark : Style.Light;
        const statusBarBgColor = isDarkTheme
          ? (theme.statusBarColor ?? '#12161e')
          : theme.background;

        await StatusBar.setStyle({ style: statusBarStyle });
        await StatusBar.setBackgroundColor({ color: statusBarBgColor });
      } catch (error) {
        console.warn('Status bar update skipped:', error.message);
      }
    };

    updateStatusBar();
  }, [theme]);

  // Auto-update timezone when it changes (travel, daylight saving)
  useEffect(() => {
    const cleanup = initTimezoneAutoUpdate();
    return cleanup;
  }, []);

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
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [showFeatureAnnouncement, setShowFeatureAnnouncement] = useState(false);

  // Hardware back button handler for mobile apps
  useBackButtonHandler();

  // Check for app updates on launch (NATIVE APPS ONLY - not PWA)
  // PWA users get instant updates automatically via service worker
  // They only see the FeatureAnnouncementModal (What's New modal)
  useEffect(() => {
    const performUpdateCheck = async () => {
      try {
        // SAFETY CHECK: Only check for updates on native apps (Android/iOS)
        // checkForUpdates() returns null for PWA, but double-check here for clarity
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
        if (!isNative) {
          return; // PWA users never see UpdatePromptModal
        }
        
        const update = await checkForUpdates();
        if (update) {
          console.log('📱 Native app update available - showing update prompt');
          setUpdateInfo(update);
          setShowUpdatePrompt(true);
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };
    
    // Check after a short delay to not interfere with initial load
    const timeoutId = setTimeout(performUpdateCheck, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Check if feature announcement should be shown
  useEffect(() => {
    const checkFeatureAnnouncement = () => {
      // Change this ID when you have a new announcement to show
      const CURRENT_ANNOUNCEMENT_ID = 'v1.0.18-smart-update';
      
      if (shouldShowAnnouncement(CURRENT_ANNOUNCEMENT_ID)) {
        // Show after a slight delay to not overwhelm on first load
        const timeoutId = setTimeout(() => {
          setShowFeatureAnnouncement(true);
        }, 3000); // 3 second delay
        return () => clearTimeout(timeoutId);
      }
    };
    
    checkFeatureAnnouncement();
  }, []);

  // Initialize push notifications on app start (if user is logged in and permissions granted)
  useEffect(() => {
    if (!user) return; // Wait for user to load
    
    const initializePushNotifications = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        
        // Only initialize for native Android/iOS apps
        if (!Capacitor.isNativePlatform()) return;
        
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        // Check if permissions are already granted
        const permissionResult = await PushNotifications.checkPermissions();
        
        if (permissionResult.receive === 'granted') {
          console.log('📱 Push notifications already granted, registering for token...');
          
          // Set up listener BEFORE registering to catch token immediately
          PushNotifications.addListener('registration', async (token) => {
            console.log('📱 FCM token received on app start:', token.value);
            
            try {
              const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
              const { db } = await import('./config/firebase');
              const storedUser = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
              const userId = storedUser?.uid || storedUser?.email?.toLowerCase();
              
              if (userId) {
                const userRef = doc(db, 'users', userId);
                await setDoc(userRef, {
                  fcmToken: token.value,
                  pushToken: token.value, // Backward compatibility
                  notificationSettings: {
                    push: true,
                    pushEnabled: true,
                    lastUpdated: serverTimestamp()
                  },
                  deviceInfo: {
                    platform: Capacitor.getPlatform(),
                    isNative: true,
                    lastUpdated: serverTimestamp()
                  }
                }, { merge: true });
                console.log('✅ FCM token saved to Firestore on app start');
              }
            } catch (error) {
              console.error('❌ Failed to save FCM token on app start:', error);
            }
          });
          
          // Listen for registration errors (e.g., APNs not configured, no internet)
          PushNotifications.addListener('registrationError', (error) => {
            console.error('❌ Push registration error on app start:', JSON.stringify(error));
          });
          
          // Register to get/refresh token
          await PushNotifications.register();
        }
      } catch (error) {
        // Silently fail - push notifications might not be available
        console.warn('Push notifications initialization skipped:', error.message);
      }
    };
    
    // Initialize after a short delay to not interfere with app startup
    const timeoutId = setTimeout(initializePushNotifications, 2000);
    return () => clearTimeout(timeoutId);
  }, [user]);

  // Test function to trigger update modal
  const testUpdateModal = useCallback((type = 'recommended') => {
    const mockData = mockUpdates[type] || mockUpdates.recommended;
    console.log('🧪 Testing update prompt:', type, mockData);
    setUpdateInfo(mockData);
    setShowUpdatePrompt(true);
  }, []);

  // TEST HELPER: Manual test trigger (remove in production)
  useEffect(() => {
    window.testUpdatePrompt = testUpdateModal;
    window.testWelcomeModal = () => {
      console.log('🧪 Testing welcome modal');
      setShowWelcome(true);
    };
    window.testFeatureAnnouncement = () => {
      console.log('🧪 Testing feature announcement');
      setShowFeatureAnnouncement(true);
    };
    // Utility to reset announcement (for testing)
    window.resetFeatureAnnouncement = async () => {
      const { resetAnnouncement } = await import('./components/common/FeatureAnnouncementModal');
      resetAnnouncement('v1.0.18-smart-update');
      console.log('✅ Feature announcement reset - refresh to see it again');
    };
    // Test error boundary
    window.testErrorBoundary = () => {
      console.log('🧪 Triggering error boundary...');
      throw new Error('Test error - This will trigger the ChunkErrorBoundary');
    };
  }, [testUpdateModal]);

  // App is now live - no beta restrictions

  useEffect(() => {
    // Force welcome modal if query param is present
    if (searchParams.get('testWelcome') === 'true') {
      setShowWelcome(true);
    }
  }, [searchParams]);

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

  // Data bleed diagnostic in development mode
  useEffect(() => {
    if (import.meta.env.DEV && user) {
      // Run diagnostic after a short delay to allow data to load
      const timeoutId = setTimeout(() => {
        logDataBleedDiagnostic();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [user]);

  useEffect(() => {
    // Show welcome modal for all new Firebase users - wait for user to be loaded
    if (!user) return; // Wait for user to be loaded
    
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
        
        const isFirebaseUser = localStorage.getItem('tpprover_auth_token') === 'firebase_token';
        
        // Load user state from cloud storage FIRST to check onboarding status
        const { loadUserState } = await import('./services/cloudStorage');
        const { firebaseUser } = await import('./config/firebase').then(m => ({ firebaseUser: user }));
        
        if (user?.uid) {
          const userState = await loadUserState(user.uid);
          const hasOnboarded = userState?.hasOnboarded || false;
          const sampleDataCleared = userState?.sampleDataCleared || false;
          
          // For users who have already onboarded, respect sessionStorage flag
          // (prevent showing modal multiple times in same session)
          if (hasOnboarded) {
            const welcomeShownThisSession = sessionStorage.getItem('tpp_welcome_shown');
            if (welcomeShownThisSession === 'true') {
              console.log('🎉 Welcome modal already shown this session for onboarded user - skipping');
              return;
            }
            // User is onboarded, don't show welcome modal
            return;
          }
          
          // For new users who haven't onboarded:
          // Clear any stale sessionStorage flag (from previous test sessions)
          // This ensures the modal can show even after page refreshes during testing
          sessionStorage.removeItem('tpp_welcome_shown');
          
          // Show welcome for new users:
          // 1. User hasn't onboarded AND
          // 2. User is a Firebase user (authenticated) AND
          // 3. Sample data hasn't been explicitly cleared
          if (!hasOnboarded && isFirebaseUser && !sampleDataCleared) {
            console.log('✅ New user detected - showing welcome modal');
            setShowWelcome(true);
          } else {
            console.log('ℹ️ Welcome modal conditions not met:', { hasOnboarded, isFirebaseUser, sampleDataCleared });
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

  // Re-consent: show modal when user has not accepted current ToS/Privacy versions (uses Firebase for cross-device)
  useEffect(() => {
    if (!user?.uid || !location.pathname.startsWith('/app')) return;
    let cancelled = false;
    needsReconsentAsync(user?.email ?? null).then((needed) => {
      if (!cancelled) setShowReConsentModal(needed);
    });
    return () => { cancelled = true; };
  }, [user?.uid, user?.email, location.pathname]);

  const handleReConsentAgree = async () => {
    try {
      await recordAgreement(
        AGREEMENT_TYPES.TERMS_UPDATE,
        AGREEMENT_VERSIONS.TERMS_OF_SERVICE,
        { contentUpdateDate: AGREEMENT_VERSIONS.TERMS_OF_SERVICE.split('-')[1] + '-' + AGREEMENT_VERSIONS.TERMS_OF_SERVICE.split('-')[2] },
        user?.email
      );
      await recordAgreement(
        AGREEMENT_TYPES.PRIVACY_UPDATE,
        AGREEMENT_VERSIONS.PRIVACY_POLICY,
        { contentUpdateDate: AGREEMENT_VERSIONS.PRIVACY_POLICY.split('-')[1] + '-' + AGREEMENT_VERSIONS.PRIVACY_POLICY.split('-')[2] },
        user?.email
      );
      setShowReConsentModal(false);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Thanks for accepting our updated Terms and Privacy Policy.', type: 'success' } }));
    } catch (error) {
      console.error('Error recording re-consent:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Something went wrong. Please try again.', type: 'error' } }));
    }
  };

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
    const handleOpenSupport = () => {
      setShowSupportModal(true);
    };
    window.addEventListener('tpp:set-topbar-tabs', handleSetTabs);
    window.addEventListener('tpp:clear-topbar-tabs', handleClearTabs);
    window.addEventListener('tpp:set-topbar-autosave', handleSetAutoSave);
    window.addEventListener('tpp:clear-topbar-autosave', handleClearAutoSave);
    window.addEventListener('tpp:open-support', handleOpenSupport);
    return () => {
      window.removeEventListener('tpp:set-topbar-tabs', handleSetTabs);
      window.removeEventListener('tpp:clear-topbar-tabs', handleClearTabs);
      window.removeEventListener('tpp:set-topbar-autosave', handleSetAutoSave);
      window.removeEventListener('tpp:clear-topbar-autosave', handleClearAutoSave);
      window.removeEventListener('tpp:open-support', handleOpenSupport);
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


  const glossaryTerm = new URLSearchParams(window.location.search).get('glossary');

  const handleModalInstall = () => {
    setShowInstallModal(false);
    if (installPrompt) {
      installPrompt.prompt();
    }
  };

  return (
    <div className={`app-layout h-screen flex font-sans antialiased w-full max-w-full overflow-x-hidden ${Capacitor.isNativePlatform() ? 'native-app' : ''}`} style={{ backgroundColor: theme.background, boxSizing: 'border-box' }}>
      <Sidebar theme={theme} installPrompt={installPrompt} isPwaSupported={isPwaSupported} isPwaInstalled={isPwaInstalled} onSupportClick={() => setShowSupportModal(true)} />
        <div className="relative flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden" style={{
          boxSizing: 'border-box',
        }}>
          <div className="absolute top-0 left-0 right-0 z-30">
            <Topbar 
              theme={theme} 
              onMenuClick={() => setMobileMenuOpen(true)}
              tabs={topbarTabs?.tabs}
              activeTab={topbarTabs?.activeTab}
              onTabChange={topbarTabs?.onTabChange}
              onActionClick={topbarTabs?.onActionClick}
              actionDisabled={topbarTabs?.actionDisabled}
              autoSaveIndicator={topbarAutoSave}
              showSampleData={showDemoBanner}
            />
          </div>

          <main className={`flex-1 main-content min-h-0 w-full max-w-full relative ${location.pathname.includes('/calendar') ? 'overflow-hidden flex flex-col calendar-page' : 'overflow-y-auto'}`} 
            style={{ 
              background: location.pathname.startsWith('/app')
                ? (theme.isDark 
                    ? (theme.mainGradient ?? DEFAULT_DARK_MAIN_GRADIENT)
                    : theme.lightMainGradient
                      ? theme.lightMainGradient
                      : theme.name === 'Sage'
                        ? 'linear-gradient(180deg, #DAE0DB 0%, #D2DAD4 25%, #CCD5CD 50%, #D2DAD4 75%, #DAE0DB 100%)'
                        : `linear-gradient(180deg, ${theme.accent} 0%, ${theme.primaryLight}BB 30%, ${theme.primary}88 55%, ${theme.primaryLight}BB 75%, ${theme.accent} 100%)`)
                : theme.background, 
              color: theme.text, 
              minWidth: 0, 
              boxSizing: 'border-box',
              paddingTop: Capacitor.isNativePlatform() ? 'calc(3.5rem + var(--safe-area-top, 0px))' : '3.5rem',
              paddingBottom: location.pathname.startsWith('/app') 
                ? (location.pathname.includes('/calendar') 
                    ? 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' 
                    : '4.5rem') 
                : '0'
            }}>
            
            <Suspense fallback={<div className="p-8">Loading...</div>}>
              <SubscriptionGuard>
                <Outlet context={{ theme, installPrompt }} />
              </SubscriptionGuard>
            </Suspense>
          </main>
          
          {/* Bottom Navigation - Mobile & Tablet Only - Only show on protected /app routes */}
          {location.pathname.startsWith('/app') && (
            <div className="absolute bottom-0 left-0 right-0 z-[9995]">
              <BottomNavigation theme={theme} />
            </div>
          )}
        </div>
      <MobileNav 
        theme={theme} 
        open={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)}
        onSupportClick={() => setShowSupportModal(true)}
      />
      <WelcomeModal
        open={showWelcome}
        onClose={handleCloseWelcome}
        theme={theme}
      />
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
      {/* Native first launch permission - shows IMMEDIATELY on first app open from Play Store/App Store */}
      <NativeFirstLaunchPermission theme={theme} />
      {/* PWA notification prompt - for web users, shows after 2 minutes */}
      <NotificationPermissionPrompt theme={theme} />
      {/* Android follow-up prompt - only shows if first launch was dismissed and user is logged in */}
      <AndroidPermissionPrompt theme={theme} />
      <IOSInstallPrompt theme={theme} />
      <SubscriptionModal 
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        theme={theme}
        currentPlan={subscriptionInterval}
      />
      <SupportModal 
        open={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        theme={theme}
      />
      
      {/* NATIVE APPS ONLY: Update prompt modal for App Store/Play Store updates */}
      {/* PWA users never see this - they get automatic updates via service worker */}
      <UpdatePromptModal
        open={showUpdatePrompt}
        onClose={() => setShowUpdatePrompt(false)}
        updateInfo={updateInfo}
        theme={theme}
      />
      
      {/* ALL USERS: Feature announcement modal (What's New style) */}
      {/* This is the ONLY update-related modal PWA users see */}
      <FeatureAnnouncementModal
        open={showFeatureAnnouncement}
        onClose={() => setShowFeatureAnnouncement(false)}
        announcementId="redesign-2024"
        theme={theme}
      />
      
      {/* Re-consent: existing users must accept updated ToS/Privacy after legal/version update */}
      <ReConsentModal
        open={showReConsentModal}
        onClose={() => setShowReConsentModal(false)}
        onAgree={handleReConsentAgree}
        theme={theme}
      />
      
      {/* Toast Notifications */}
      <ModernToastContainer theme={theme} />
      
    </div>
  )
}

export default App