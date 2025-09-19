import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { themes, defaultThemeName } from '../../theme/themes';

const ProtectedRoute = () => {
  const { user, isLoading } = useAppContext();
  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const theme = themes[defaultThemeName];

  // Track loading time and show recovery options after timeout
  useEffect(() => {
    if (isLoading) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setLoadingTime(elapsed);
        
        // Show recovery options after 15 seconds of loading
        if (elapsed > 15000) {
          setShowRecoveryOptions(true);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setShowRecoveryOptions(false);
      setLoadingTime(0);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="text-center p-8 rounded-lg shadow-lg" style={{ backgroundColor: theme.cardBackground }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.primary }}></div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: theme.primaryDark }}>
            Loading **The Pep Planner**...
          </h2>
          <p className="text-sm mb-4" style={{ color: theme.textLight }}>
            {loadingTime < 5000 ? 'Initializing app...' : 
             loadingTime < 10000 ? 'Syncing your data...' : 
             'This is taking longer than usual...'}
          </p>
          
          {showRecoveryOptions && (
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: theme.warning + '20', borderColor: theme.warning, border: '1px solid' }}>
              <h3 className="font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Having trouble? Try these recovery options:
              </h3>
              <div className="space-y-2 text-sm">
                <button 
                  onClick={() => window.emergencyRecovery?.()}
                  className="block w-full p-2 rounded text-white hover:opacity-90"
                  style={{ backgroundColor: theme.primary }}
                >
                  🚨 Emergency Recovery (Clear & Restart)
                </button>
                <button 
                  onClick={() => window.restoreDataBackup?.()}
                  className="block w-full p-2 rounded text-white hover:opacity-90"
                  style={{ backgroundColor: theme.accent }}
                >
                  💾 Restore Data Backup
                </button>
                <button 
                  onClick={() => window.recoverDataFromFirebase?.()}
                  className="block w-full p-2 rounded text-white hover:opacity-90"
                  style={{ backgroundColor: theme.secondary }}
                >
                  🔄 Try Firebase Recovery
                </button>
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="block w-full p-2 rounded hover:opacity-90"
                  style={{ backgroundColor: theme.border, color: theme.text }}
                >
                  🔑 Go to Login Page
                </button>
              </div>
              <p className="text-xs mt-3" style={{ color: theme.textLight }}>
                If problems persist, try logging out and back in with your password.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
