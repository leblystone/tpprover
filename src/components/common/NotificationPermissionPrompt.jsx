import React, { useState, useEffect, useRef } from 'react';
import { Smartphone, BellRing } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMobile } from '@fortawesome/free-solid-svg-icons';
import pwaNotificationService from '../../services/pwaNotifications';
import { syncNotificationSettingsToFirestore } from '../../utils/settingsHelpers';
import Modal from './Modal';
import { Capacitor } from '@capacitor/core';

export default function NotificationPermissionPrompt({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [status, setStatus] = useState({
    supported: false,
    permission: 'default',
    enabled: false
  });
  const checkIntervalRef = useRef(null);
  const forceShowRef = useRef(false); // For local testing
  const dismissedRef = useRef(false); // Track if user explicitly dismissed

  // Function to check actual permission status from device
  const checkActualPermissionStatus = async () => {
    try {
      // For native apps, check Capacitor permissions
      if (Capacitor.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permission = await LocalNotifications.checkPermissions();
          return permission.display === 'granted';
        } catch (e) {
          // Fallback to browser permission if Capacitor check fails
          return Notification.permission === 'granted';
        }
      } else {
        // For PWA/web, check browser permission
        return Notification.permission === 'granted';
      }
    } catch (e) {
      console.error('Error checking permission status:', e);
      return Notification.permission === 'granted';
    }
  };

  // Helper function to check test mode (needs to be defined outside useEffect)
  const checkTestMode = () => {
    // Check URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('testNotificationPrompt') === 'true') {
      return true;
    }
    
    // Check localStorage flag
    if (localStorage.getItem('tpp_test_notification_prompt') === 'true') {
      return true;
    }
    
    // Check if test function was called
    return forceShowRef.current;
  };

  useEffect(() => {

    // Check if we should show the prompt
    const shouldShowPrompt = async () => {
      // TEST MODE: Force show for local testing
      if (checkTestMode()) {
        console.log('🧪 TEST MODE: Forcing notification prompt to show');
        dismissedRef.current = false; // Reset dismissal in test mode
        return true;
      }
      
      // Check if user is actively requesting permissions (bypasses cooldown)
      const userRequestingPermissions = localStorage.getItem('tpprover_user_requesting_permissions') === 'true';
      if (userRequestingPermissions) {
        console.log('✅ User actively requesting permissions - bypassing cooldown');
        dismissedRef.current = false;
        sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
        // Don't return true here - continue with normal permission checks
      }
      
      // CRITICAL: Check if dismissed during this session FIRST (unless user is requesting)
      const dismissedThisSession = sessionStorage.getItem('tpprover_notification_dismissed_this_session');
      if (dismissedThisSession === 'true' && !userRequestingPermissions) {
        // Dismissed this session - never show (unless user is actively requesting)
        return false;
      }
      
      // If user explicitly dismissed, check cooldown FIRST before any other checks
      // This prevents the modal from reappearing immediately after dismissal
      // UNLESS user is actively requesting permissions
      const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
      const lastPromptTime = localStorage.getItem('tpprover_notification_prompt_last_shown');
      
      if (lastPromptTime && !userRequestingPermissions) {
        const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime, 10);
        // Only show if 15 days have passed since last dismissal
        if (timeSinceLastPrompt < FIFTEEN_DAYS) {
          // If still in cooldown, ensure modal stays hidden
          dismissedRef.current = true;
          const daysRemaining = Math.ceil((FIFTEEN_DAYS - timeSinceLastPrompt) / (24 * 60 * 60 * 1000));
          console.log(`⏸️ Notification prompt cooldown active. Will show again in ${daysRemaining} day(s).`);
          return false;
        } else {
          // Cooldown expired, reset dismissal flags
          dismissedRef.current = false;
          sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
        }
      }
      
      // Don't show if user explicitly dismissed and we're still in cooldown
      if (dismissedRef.current && lastPromptTime) {
        return false;
      }
      
      // Don't show if notifications are not supported
      if (!('Notification' in window)) return false;
      
      // Check actual device permission status first
      const hasPermission = await checkActualPermissionStatus();
      if (hasPermission) {
        // Permission granted - update settings and don't show
        dismissedRef.current = false; // Reset dismissal if permission granted
        try {
          const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
          if (!settings.notifications) settings.notifications = {};
          settings.notifications.push = true;
          localStorage.setItem('tpprover_settings', JSON.stringify(settings));
        } catch (e) {
          // Ignore
        }
        return false;
      }
      
      // Show if user is logged in
      const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
      if (!user?.email) return false;
      
      // Check if notifications are already enabled in settings (but verify actual permission)
      try {
        const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
        if (settings.notifications?.push === true && hasPermission) return false;
      } catch (e) {
        // Ignore parse errors
      }
      
      // For first-time users, wait at least 2 minutes before showing
      const firstVisit = localStorage.getItem('tpprover_first_visit');
      if (!firstVisit) {
        localStorage.setItem('tpprover_first_visit', Date.now().toString());
        return false;
      }
      
      const timeSinceFirstVisit = Date.now() - parseInt(firstVisit, 10);
      if (timeSinceFirstVisit < 120000) { // 2 minutes
        return false;
      }
      
      // All conditions met - show the prompt
      return true;
    };

    // Update status and check if prompt should show
    const updateStatus = async () => {
      // Check if we're in test mode - if so, don't auto-close
      const isTestMode = checkTestMode();
      
      // CRITICAL: Check if dismissed during this session first
      const dismissedThisSession = sessionStorage.getItem('tpprover_notification_dismissed_this_session');
      if (dismissedThisSession === 'true' && !isTestMode) {
        // Dismissed this session - stay hidden and exit early
        dismissedRef.current = true;
        setShowPrompt(false);
        // Still update status for permission tracking, but don't show modal
        const actualPermission = await checkActualPermissionStatus();
        const pwaStatus = pwaNotificationService.getStatus();
        setStatus({
          ...pwaStatus,
          permission: actualPermission ? 'granted' : Notification.permission,
          enabled: actualPermission
        });
        return; // Exit early
      }
      
      // Check if user is actively requesting permissions (bypasses cooldown)
      const userRequestingPermissions = localStorage.getItem('tpprover_user_requesting_permissions') === 'true';
      
      // CRITICAL: Check cooldown SECOND before doing anything else
      // This prevents the modal from reappearing after dismissal
      // UNLESS user is actively requesting permissions
      const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
      const lastPromptTime = localStorage.getItem('tpprover_notification_prompt_last_shown');
      
      if (lastPromptTime && !isTestMode && !userRequestingPermissions) {
        const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime, 10);
        if (timeSinceLastPrompt < FIFTEEN_DAYS) {
          // Still in cooldown - force modal to stay hidden and exit early
          dismissedRef.current = true;
          setShowPrompt(false);
          // Still update status for permission tracking, but don't show modal
          const actualPermission = await checkActualPermissionStatus();
          const pwaStatus = pwaNotificationService.getStatus();
          setStatus({
            ...pwaStatus,
            permission: actualPermission ? 'granted' : Notification.permission,
            enabled: actualPermission
          });
          return; // Exit early - don't proceed with showing logic
        } else {
          // Cooldown expired, reset dismissal flags
          dismissedRef.current = false;
          sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
        }
      }
      
      // If user is requesting permissions, reset dismissal flags
      if (userRequestingPermissions) {
        dismissedRef.current = false;
        sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
      }
      
      // First, refresh the PWA notification service status
      const pwaStatus = pwaNotificationService.getStatus();
      
      // Check actual device permission status
      const actualPermission = await checkActualPermissionStatus();
      
      // Update status with actual permission
      setStatus({
        ...pwaStatus,
        permission: actualPermission ? 'granted' : Notification.permission,
        enabled: actualPermission
      });
      
      // If permission is actually granted, hide modal immediately (unless in test mode)
      if (actualPermission && !isTestMode) {
        setShowPrompt(false);
        dismissedRef.current = false; // Reset dismissal since permission was granted
        return;
      }
      
      // If in test mode, keep modal open (don't auto-close)
      if (isTestMode) {
        // Don't check other conditions, just ensure it stays open
        if (!showPrompt) {
          setShowPrompt(true);
        }
        return; // Skip normal checks in test mode
      }
      
      // Check if we should show prompt based on all conditions
      const shouldShow = await shouldShowPrompt();
      
      // NEVER show if dismissed (double-check)
      if (dismissedRef.current) {
        setShowPrompt(false);
        return;
      }
      
      setShowPrompt(shouldShow);
    };

    // Initialize dismissed state from localStorage
    const lastPromptTime = localStorage.getItem('tpprover_notification_prompt_last_shown');
    if (lastPromptTime) {
      const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
      const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime, 10);
      // If still in cooldown, mark as dismissed
      if (timeSinceLastPrompt < FIFTEEN_DAYS) {
        dismissedRef.current = true;
      }
    }

    // Initial check
    updateStatus();

    // Set up periodic checks to sync with device permission changes
    // This is important because users can change permissions in system settings
    // Check every 5 seconds, but the updateStatus function will respect dismissal cooldown
    checkIntervalRef.current = setInterval(() => {
      updateStatus();
    }, 5000); // Check every 5 seconds

    // Listen for PWA notification events
    const handleEnabled = () => {
      updateStatus();
    };
    const handleDisabled = () => {
      updateStatus();
    };

    // Listen for app focus/visibility changes (user might have changed permissions while app was in background)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App came to foreground - check permission status
        updateStatus();
      }
    };

    // Listen for focus events
    const handleFocus = () => {
      updateStatus();
    };

    window.addEventListener('pwa-notifications-enabled', handleEnabled);
    window.addEventListener('pwa-notifications-disabled', handleDisabled);
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // TEST HELPER: Expose test function to window for local testing
    // Usage: window.testNotificationPrompt() in browser console
    window.testNotificationPrompt = () => {
      console.log('🧪 TEST: Forcing notification permission prompt to show');
      forceShowRef.current = true;
      // Clear cooldown and other restrictions for testing
      localStorage.removeItem('tpprover_notification_prompt_last_shown');
      sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
      localStorage.setItem('tpp_test_notification_prompt', 'true');
      setShowPrompt(true);
    };

    // TEST HELPER: Clear test mode
    window.clearNotificationPromptTest = () => {
      console.log('🧪 TEST: Clearing notification prompt test mode');
      forceShowRef.current = false;
      localStorage.removeItem('tpp_test_notification_prompt');
      sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
      setShowPrompt(false);
    };

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener('pwa-notifications-enabled', handleEnabled);
      window.removeEventListener('pwa-notifications-disabled', handleDisabled);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    
    try {
      // Request permission based on platform
      let permissionGranted = false;
      
      if (Capacitor.isNativePlatform()) {
        // Native app - use Capacitor
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const result = await LocalNotifications.requestPermissions();
          permissionGranted = result.display === 'granted';
          
          // Also request push notification permissions if available
          try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            // Add listener BEFORE registering to catch token immediately
            PushNotifications.addListener('registration', async (token) => {
              try {
                const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                const { db } = await import('../../config/firebase');
                const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
                const userId = user.uid || user.email?.toLowerCase();
                
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
                  console.log('✅ FCM token saved to Firestore');
                }
              } catch (error) {
                console.error('Failed to save FCM token:', error);
              }
            });
            
            const pushResult = await PushNotifications.requestPermissions();
            if (pushResult.receive === 'granted') {
              await PushNotifications.register();
            }
          } catch (e) {
            // Push notifications not available or failed - continue anyway
            console.warn('Push notifications not available:', e);
          }
        } catch (error) {
          throw new Error('Failed to request native notification permissions');
        }
      } else {
        // PWA - use browser API
        await pwaNotificationService.enable();
        // Check actual permission after request
        permissionGranted = await checkActualPermissionStatus();
      }
      
      if (permissionGranted) {
        // Update settings in localStorage and sync to Firestore
        try {
          const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
          if (!settings.notifications) settings.notifications = {};
          settings.notifications.push = true;
          localStorage.setItem('tpprover_settings', JSON.stringify(settings));
          
          // Sync notification settings to Firestore (enables server-side push notifications)
          await syncNotificationSettingsToFirestore();
        } catch (e) {
          console.error('Error saving notification settings:', e);
        }
        
        // Update status immediately
        setStatus(prev => ({ ...prev, permission: 'granted', enabled: true }));
        setShowPrompt(false);
        dismissedRef.current = false; // Reset dismissal since permission was granted
        
        // Clear the dismissal timestamp since permission was granted
        // We don't want to be in cooldown when permission is granted
        localStorage.removeItem('tpprover_notification_prompt_last_shown');
        sessionStorage.removeItem('tpprover_notification_dismissed_this_session');
        
        // Show success message
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: '🎉 Notifications enabled! You\'ll now receive important updates.', 
            type: 'success' 
          } 
        }));
      } else {
        throw new Error('Permission was not granted');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      
      // Re-check actual permission status (user might have granted it manually)
      const actualPermission = await checkActualPermissionStatus();
      if (actualPermission) {
        // Permission was actually granted (maybe user granted it in system settings)
        setShowPrompt(false);
        setStatus(prev => ({ ...prev, permission: 'granted', enabled: true }));
      } else {
        // Show error message - different for native vs PWA
        let errorMessage = error.message || 'Failed to enable notifications.';
        if (Capacitor.isNativePlatform()) {
          // For native apps, user can try again (will prompt system dialog again)
          // But if they've denied in system settings, they need to enable there
          const platform = Capacitor.getPlatform();
          if (platform === 'ios') {
            errorMessage = error.message || 'Notifications denied. Please enable them in Settings > The Pep Planner > Notifications, or try again to show the permission prompt.';
          } else if (platform === 'android') {
            errorMessage = error.message || 'Notifications denied. Please enable them in Settings > Apps > The Pep Planner > Notifications, or try again to show the permission prompt.';
          } else {
            errorMessage = error.message || 'Notifications denied. Please enable them in your device settings, or try again to show the permission prompt.';
          }
        }
        
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: errorMessage, 
            type: 'error' 
          } 
        }));
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    dismissedRef.current = true; // Mark as explicitly dismissed FIRST
    setShowPrompt(false); // Then hide the modal
    // Record current time - will show again in 15 days
    // This prevents spamming users if they dismiss/close/ignore the modal
    const now = Date.now();
    localStorage.setItem('tpprover_notification_prompt_last_shown', now.toString());
    // Also set in sessionStorage to persist across remounts during this session
    sessionStorage.setItem('tpprover_notification_dismissed_this_session', 'true');
    console.log('📅 Notification prompt dismissed. Will show again in 15 days.');
  };

  // ========================================================================
  // FINAL RENDER GUARD - THIS IS THE ULTIMATE GATEKEEPER
  // Check cooldown BEFORE rendering - this overrides ALL other state
  // ========================================================================
  const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;
  const lastPromptTime = localStorage.getItem('tpprover_notification_prompt_last_shown');
  const dismissedThisSession = sessionStorage.getItem('tpprover_notification_dismissed_this_session');
  const currentTestMode = checkTestMode();
  
  // CRITICAL: If dismissed during this session, NEVER render (unless test mode)
  // This prevents modal from reappearing if component remounts
  if (dismissedThisSession === 'true' && !currentTestMode) {
    return null;
  }
  
  // Check if user is actively requesting permissions (bypasses cooldown)
  const userRequestingPermissions = localStorage.getItem('tpprover_user_requesting_permissions') === 'true';
  
  // CRITICAL: If there's a dismissal timestamp within 15 days, NEVER render (unless test mode or user requesting)
  if (lastPromptTime && !currentTestMode && !userRequestingPermissions) {
    const timeSinceLastPrompt = Date.now() - parseInt(lastPromptTime, 10);
    if (timeSinceLastPrompt < FIFTEEN_DAYS) {
      // In cooldown - absolutely do not render, regardless of any state
      return null;
    }
  }

  // Also check if not supported or not set to show
  if (!showPrompt || !status.supported) {
    return null;
  }

  return (
    <Modal
      open={showPrompt}
      onClose={handleDismiss}
      title="Enable Your Notifications"
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
      titleExtra={
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faMobile} style={{ fontSize: '18px' }} />
        </div>
      }
    >
      <div className="space-y-4">
        {/* Content */}
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold mb-1" style={{ color: theme.text }}>
              Stay on Track
            </h2>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Reminders of your research!
            </p>
          </div>
          {/* Benefits List */}
          <div 
            className="rounded-lg p-4 space-y-2"
            style={{
              background: theme?.cardBackground || '#f9fafb',
              border: `1px solid ${theme?.border || '#e5e7eb'}`
            }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>
              You'll receive notifications for:
            </p>
            <ul className="space-y-1.5 ml-4">
              {[
                'Research reminders and protocol updates',
                'Order delivery status',
                'Cycle reminders when a repeated protocol should be started',
                'Low stock alerts for your peptides',
                'Important app updates and new features'
              ].map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: theme.textLight }}>
                  <span style={{ color: theme.primary }} className="mt-1">•</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="w-full px-6 py-3 rounded-lg text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #5F7F76 0%, #3d5a52 100%)'
              }}
            >
              <BellRing size={18} />
              {isRequesting ? 'Enabling...' : 'Enable Notifications'}
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full px-6 py-3 rounded-lg font-medium text-sm transition-all hover:opacity-80"
              style={{
                background: theme?.cardBackground || '#f3f4f6',
                color: theme?.textLight || '#6b7280'
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
