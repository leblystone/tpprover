import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import BetaEndedSurvey from '../components/beta/BetaEndedSurvey';
import { useAppContext } from '../context/AppContext';
import { hasBetaLifetimeAccess, isBetaTester, isBetaPeriodEnded } from '../utils/betaAccess';

/**
 * Beta Ended Survey Page
 * Shown to beta users who need to complete feedback to get lifetime access
 */
export default function BetaEndedSurveyPage() {
  const { theme } = useOutletContext();
  const { user } = useAppContext();
  const [hasLifetimeAccess, setHasLifetimeAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check lifetime access status
  useEffect(() => {
    const checkAccess = async () => {
      if (user) {
        const hasAccess = await hasBetaLifetimeAccess(user);
        setHasLifetimeAccess(hasAccess);
      }
      setChecking(false);
    };
    checkAccess();
  }, [user]);

  // Check if beta has ended
  const betaEnded = isBetaPeriodEnded();

  // Show loading while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p style={{ color: theme.textLight }}>Checking access status...</p>
        </div>
      </div>
    );
  }

  // Show message if beta hasn't ended yet
  if (!betaEnded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">β</span>
            </div>
            <h1 className="text-xl font-bold text-blue-800 mb-2">Beta Still Active!</h1>
            <p className="text-blue-600 mb-4">
              The feedback survey will be available after beta ends on <strong>September 21st</strong>.
            </p>
            <p className="text-sm text-blue-500 mb-4">
              Continue enjoying all beta features! The survey will appear automatically after beta ends.
            </p>
            <button
              onClick={() => window.location.href = '/account'}
              className="px-6 py-2 rounded-md font-medium hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Back to Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Redirect if user already has lifetime access
  if (hasLifetimeAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-purple-800 mb-2">You Already Have Lifetime Access!</h1>
            <p className="text-purple-600 mb-4">Thank you for completing our beta survey.</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-2 rounded-md font-medium hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message for non-beta users
  if (!isBetaTester(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Survey Not Available</h1>
            <p className="text-gray-600 mb-4">This survey is only available to beta testers.</p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-6 py-2 rounded-md font-medium hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: theme.background }}>
      <BetaEndedSurvey 
        theme={theme} 
        onComplete={() => {
          // Optional: redirect after completion
          setTimeout(() => {
            window.location.href = '/account';
          }, 3000);
        }}
      />
    </div>
  );
}
