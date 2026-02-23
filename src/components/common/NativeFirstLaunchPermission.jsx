import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Sparkles, BellRing } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

/**
 * NativeFirstLaunchPermission
 * 
 * This component triggers notification permission request on FIRST LAUNCH
 * after downloading from Google Play or iOS App Store.
 * 
 * Key behaviors:
 * - Only shows on native apps (Android/iOS), not PWA
 * - Shows immediately on first launch (after brief delay for better UX)
 * - Does NOT require user to be logged in
 * - Only shows ONCE per device installation
 * - Stores permission request state in localStorage
 */
export default function NativeFirstLaunchPermission({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const checkAndShowPrompt = async () => {
      // ONLY run on native platforms (Android/iOS from app stores)
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      const platform = Capacitor.getPlatform();
      console.log(`📱 Native platform detected: ${platform}`);

      // Check if we've already shown this first-launch prompt
      const firstLaunchPromptShown = localStorage.getItem('tpprover_native_first_launch_permission_shown');
      if (firstLaunchPromptShown === 'true') {
        console.log('📱 First launch permission prompt already shown - skipping');
        return;
      }

      // Check if permission is already granted
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permissionStatus = await PushNotifications.checkPermissions();
        
        if (permissionStatus.receive === 'granted') {
          console.log('📱 Push notifications already granted - marking as shown and skipping');
          localStorage.setItem('tpprover_native_first_launch_permission_shown', 'true');
          return;
        }
      } catch (error) {
        console.warn('📱 Could not check push permissions:', error);
        // Continue anyway - we'll show the prompt
      }

      // Show prompt after a very brief delay (500ms) for better UX
      // This allows the app to render first
      const timeoutId = setTimeout(() => {
        console.log('📱 Showing first launch notification permission prompt');
        setShowPrompt(true);
      }, 500);

      return () => clearTimeout(timeoutId);
    };

    checkAndShowPrompt();
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Request permission
      const permissionResult = await PushNotifications.requestPermissions();
      console.log('📱 Permission result:', permissionResult);

      if (permissionResult.receive === 'granted') {
        console.log('✅ Push notification permission granted on first launch!');
        
        // Register for push notifications to get FCM token
        // Set up listener BEFORE registering to catch token immediately
        PushNotifications.addListener('registration', async (token) => {
          console.log('📱 FCM token received on first launch:', token.value);
          
          // Store token temporarily - will be saved to Firestore when user logs in
          localStorage.setItem('tpprover_pending_fcm_token', token.value);
          
          // If user is already logged in, save immediately
          try {
            const user = JSON.parse(localStorage.getItem('tpprover_user') || 'null');
            const userId = user?.uid || user?.email?.toLowerCase();
            
            if (userId) {
              const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
              const { db } = await import('../../config/firebase');
              
              const userRef = doc(db, 'users', userId);
              await setDoc(userRef, {
                fcmToken: token.value,
                pushToken: token.value,
                notificationSettings: {
                  push: true,
                  pushEnabled: true,
                  lastUpdated: serverTimestamp()
                },
                deviceInfo: {
                  platform: Capacitor.getPlatform(),
                  isNative: true,
                  firstLaunchPermissionGranted: true,
                  lastUpdated: serverTimestamp()
                }
              }, { merge: true });
              console.log('✅ FCM token saved to Firestore on first launch');
            }
          } catch (error) {
            console.warn('Could not save FCM token to Firestore (user may not be logged in yet):', error);
            // Token is saved in localStorage, will be synced when user logs in
          }
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('📱 Push registration error:', error);
        });

        // Register to get token
        await PushNotifications.register();

        // Show success toast
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: '🎉 Notifications enabled! Stay on track with your research.', 
            type: 'success' 
          } 
        }));
      } else {
        console.log('❌ Push notification permission denied on first launch');
        
        // Show a gentle reminder that they can enable later
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { 
            message: 'No worries! You can enable notifications anytime in Settings.', 
            type: 'info' 
          } 
        }));
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
    } finally {
      // Mark as shown regardless of outcome
      localStorage.setItem('tpprover_native_first_launch_permission_shown', 'true');
      setIsRequesting(false);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    console.log('📱 User dismissed first launch permission prompt');
    localStorage.setItem('tpprover_native_first_launch_permission_shown', 'true');
    setShowPrompt(false);
    
    // Gentle toast reminder
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { 
        message: 'You can enable notifications anytime in Settings → Notifications', 
        type: 'info',
        duration: 4000
      } 
    }));
  };

  // Don't render if not showing or not mounted
  if (!mounted || !showPrompt) {
    return null;
  }

  const safeTheme = theme || {
    primary: '#7F9E95',
    text: '#2F3B3A',
    textLight: '#6B7280',
    background: '#FFFFFF',
    cardBackground: '#F9FAFB',
    border: '#E5E7EB'
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden bg-white animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'scaleIn 0.3s ease-out forwards'
        }}
      >
        {/* Decorative top gradient */}
        <div 
          className="h-32 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${safeTheme.primary} 0%, #5F7F76 100%)`
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full bg-white/10" />
          
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              <BellRing size={36} className="text-white" />
            </div>
          </div>
          
          {/* Close button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-2 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2" style={{ color: safeTheme.text }}>
            Never Miss a Dose
          </h2>
          
          <p className="text-sm mb-4" style={{ color: safeTheme.textLight }}>
            Get timely reminders for your research protocols, order updates, and important alerts.
          </p>

          {/* Benefits */}
          <div 
            className="rounded-xl p-4 mb-5 text-left"
            style={{
              background: safeTheme.cardBackground,
              border: `1px solid ${safeTheme.border}`
            }}
          >
            <div className="space-y-2.5">
              {[
                { icon: '💉', text: 'Research dose reminders' },
                { icon: '📦', text: 'Order delivery updates' },
                { icon: '⚠️', text: 'Low stock alerts' },
                { icon: '🔄', text: 'Protocol cycle reminders' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="text-base">{item.icon}</span>
                  <span style={{ color: safeTheme.text }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-base shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${safeTheme.primary} 0%, #5F7F76 100%)`
              }}
            >
              <Bell size={18} />
              {isRequesting ? 'Enabling...' : 'Enable Notifications'}
            </button>
            
            <button
              onClick={handleDismiss}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all hover:bg-gray-100"
              style={{ color: safeTheme.textLight }}
            >
              Maybe Later
            </button>
          </div>

          {/* Privacy note */}
          <p className="text-xs mt-4" style={{ color: safeTheme.textLight }}>
            You can change this anytime in Settings
          </p>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
