import React, { useState } from 'react';
import { markBetaFeedbackCompleted } from '../../utils/betaAccess';

/**
 * Beta Ended Popup Modal
 * Shows prominently when beta users login after Sept 21st
 */
export default function BetaEndedPopup({ user, theme, onClose }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleViewLaunchInfo = () => {
    // Navigate to launch coming soon page
    window.location.href = '/launch-coming-soon';
  };

  const handleRemindLater = () => {
    // Set a flag to remind them later (maybe in a few hours)
    try {
      const remindTime = new Date();
      remindTime.setHours(remindTime.getHours() + 6); // Remind in 6 hours
      localStorage.setItem('tpprover_beta_survey_remind_later', remindTime.toISOString());
    } catch (error) {
      console.error('Failed to set reminder:', error);
    }
    onClose();
  };

  const handleSkipForNow = () => {
    // Just close for now, will show again on next login
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Blurred backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative max-w-2xl w-full mx-auto">
        <div 
          className="rounded-2xl shadow-2xl overflow-hidden border-2"
          style={{ 
            backgroundColor: theme.cardBackground,
            borderColor: '#dc2626'
          }}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">⏰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">Beta Testing Complete!</h1>
                <p className="text-red-100">Full launch coming soon - Thank you for testing!</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="space-y-6">
              {/* Thank you message */}
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: theme.primaryDark }}>
                  Thank You for Beta Testing The Pep Planner!
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  You've been an essential part of our journey. The beta testing phase has concluded, 
                  and we're preparing for our full public launch.
                </p>
              </div>

              {/* Lifetime access offer */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">∞</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 mb-2">🎯 Lifetime Access Guaranteed!</h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>✅ <strong>Permanent access</strong> to all current and future features</p>
                      <p>✅ <strong>Priority support</strong> and direct feedback channel</p>
                      <p>✅ <strong>No monthly fees</strong> - completely free forever</p>
                      <p>✅ <strong>Early access</strong> to new features and updates</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* What we need */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-800 mb-3">📝 Quick Feedback Survey (5 minutes)</h3>
                <div className="text-sm text-blue-700 space-y-2">
                  <p><strong>Help us improve:</strong> Share what worked well and what could be better</p>
                  <p><strong>Shape the future:</strong> Your suggestions will guide our next updates</p>
                  <p><strong>Join our community:</strong> Become part of our ongoing development process</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={handleViewLaunchInfo}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 rounded-xl font-semibold text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
              >
                🚀 View Launch Information
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRemindLater}
                  className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50"
                  style={{ 
                    borderColor: theme.border,
                    color: theme.text 
                  }}
                >
                  ⏰ Remind me in 6 hours
                </button>
                
                <button
                  onClick={handleSkipForNow}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </button>
              </div>
            </div>

            {/* Small disclaimer */}
            <p className="text-xs text-gray-400 text-center mt-4">
              Don't worry - your lifetime access is guaranteed! You can complete the survey anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
