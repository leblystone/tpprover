import React, { useState, useEffect } from 'react';
import { X, Apple, Share, Plus, Home } from 'lucide-react';
import { isNative, isIOSBrowser, isIOSPWAInstalled } from '../../utils/platform';

/**
 * iOS PWA Install Prompt
 * Shows iOS Safari users how to add the app to their home screen (PWA).
 * Never shows when running in the native iOS app (Capacitor/App Store).
 */
export default function IOSInstallPrompt({ theme }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Never show when running in native iOS app (App Store) - user already has the app
    if (isNative()) {
      return;
    }
    // Only show if on iOS Safari (browser) and not already installed as PWA
    if (!isIOSBrowser() || isIOSPWAInstalled()) {
      return;
    }

    // Check if user has dismissed the prompt
    const dismissed = localStorage.getItem('tpp_ios_install_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Show prompt after a short delay (so it doesn't interrupt landing page)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('tpp_ios_install_dismissed', 'true');
    setShowPrompt(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Backdrop */}
      {!isMinimized && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm"
          onClick={handleDismiss}
        />
      )}

      {/* Prompt */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          isMinimized ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{
          transform: isMinimized ? 'translateY(calc(100% - 60px))' : 'translateY(0)',
          // Add bottom padding for Android navigation bar (edge-to-edge display support)
          paddingBottom: `max(1rem, calc(1rem + var(--safe-area-bottom, 0px)))`
        }}
      >
        <div 
          className="mx-4 mb-4 rounded-2xl shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: theme.cardBackground,
            border: `2px solid ${theme.primary}`,
          }}
        >
          {/* Header - Always visible when minimized */}
          <div 
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={handleMinimize}
            style={{ backgroundColor: theme.primary }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-2 shadow-md">
                <Apple size={24} className="text-gray-800" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Install The Pep Planner
                </h3>
                <p className="text-white text-opacity-90 text-sm">
                  Get the full app experience
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Content - Hidden when minimized */}
          {!isMinimized && (
            <div className="p-6 space-y-4">
              <p style={{ color: theme.text }} className="text-center">
                Add <strong>The Pep Planner</strong> to your iPhone's home screen for quick access and a better experience!
              </p>

              {/* Instructions */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primary }}
                  >
                    1
                  </div>
                  <div className="flex-1">
                    <p style={{ color: theme.text }} className="font-medium mb-2">
                      Tap the Share button
                    </p>
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ backgroundColor: theme.background }}
                    >
                      <Share size={24} style={{ color: theme.primary }} />
                      <span style={{ color: theme.textLight }} className="text-sm">
                        (at the bottom of Safari)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primary }}
                  >
                    2
                  </div>
                  <div className="flex-1">
                    <p style={{ color: theme.text }} className="font-medium mb-2">
                      Tap "Add to Home Screen"
                    </p>
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                      style={{ backgroundColor: theme.background }}
                    >
                      <Plus size={24} style={{ color: theme.primary }} />
                      <Home size={24} style={{ color: theme.primary }} />
                      <span style={{ color: theme.textLight }} className="text-sm">
                        Add to Home Screen
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div 
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: theme.primary }}
                  >
                    3
                  </div>
                  <div className="flex-1">
                    <p style={{ color: theme.text }} className="font-medium mb-2">
                      Tap "Add" to confirm
                    </p>
                    <p style={{ color: theme.textLight }} className="text-sm">
                      The app will appear on your home screen!
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div 
                className="mt-6 p-4 rounded-lg"
                style={{ backgroundColor: theme.background }}
              >
                <p style={{ color: theme.text }} className="font-medium mb-2 text-center">
                  ✨ Why install?
                </p>
                <ul className="space-y-1 text-sm" style={{ color: theme.textLight }}>
                  <li>✅ Quick access from home screen</li>
                  <li>✅ Full-screen app experience</li>
                  <li>✅ Works offline (when available)</li>
                  <li>✅ Faster loading</li>
                  <li>✅ No App Store required</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-3 px-4 rounded-lg font-medium transition-colors"
                  style={{ 
                    backgroundColor: theme.background,
                    color: theme.textLight,
                  }}
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-3 px-4 rounded-lg font-medium transition-opacity hover:opacity-90"
                  style={{ 
                    backgroundColor: theme.primary,
                    color: 'white',
                  }}
                >
                  Got It!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

