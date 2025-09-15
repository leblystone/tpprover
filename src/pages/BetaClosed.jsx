import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { hasBetaLifetimeAccess, markBetaFeedbackCompleted } from '../utils/betaAccess';
import { themes, defaultThemeName } from '../theme/themes';
import { REOPEN_DATE } from '../config/betaConfig';

/**
 * Beta Closed Page
 * Shown to all users after beta ends (Sept 21st)
 * Shows either survey prompt OR thanks message based on completion status
 */
export default function BetaClosed() {
  const { user } = useAppContext();
  const [theme] = useState(themes[defaultThemeName]);
  const [timeUntilReopen, setTimeUntilReopen] = useState('');

  // Update countdown to reopen
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const diffTime = REOPEN_DATE.getTime() - now.getTime();
      
      if (diffTime <= 0) {
        setTimeUntilReopen('very soon');
        return;
      }
      
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeUntilReopen(`${days} day${days !== 1 ? 's' : ''}`);
      } else if (hours > 0) {
        setTimeUntilReopen(`${hours} hour${hours !== 1 ? 's' : ''}`);
      } else {
        setTimeUntilReopen('very soon');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);



  const hasCompletedSurvey = hasBetaLifetimeAccess(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-4xl">🧪</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Beta Testing Complete
          </h1>
          <p className="text-xl text-gray-600">
            Thank you for being part of The Pep Planner's journey
          </p>
        </div>

        {hasCompletedSurvey ? (
          /* Thanks Message - Survey Already Completed */
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-blue-500 p-8 text-white text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2">Thank You for Your Feedback!</h2>
              <p className="text-green-100 text-lg">Your input is helping shape the future of The Pep Planner</p>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="space-y-6 text-center">
                {/* Lifetime Access Confirmation */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">✓</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-green-800">Lifetime Access Secured!</h3>
                      <p className="text-sm text-green-600">Your beta testing contribution is forever appreciated</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-700 space-y-2">
                    <p>✅ <strong>Permanent access</strong> to all features when we relaunch</p>
                    <p>✅ <strong>Priority support</strong> and direct feedback channel</p>
                    <p>✅ <strong>No fees ever</strong> - completely free for life</p>
                    <p>✅ <strong>Early access</strong> to new features and updates</p>
                  </div>
                </div>

                {/* What's Next */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">🚀 What's Happening Now</h3>
                  <div className="text-blue-700 space-y-3">
                    <p><strong>📝 Implementing Your Suggestions:</strong> Our team is hard at work incorporating your valuable feedback into the app.</p>
                    <p><strong>🔧 Final Polish:</strong> We're adding the finishing touches and ensuring everything works perfectly for launch.</p>
                    <p><strong>🎯 Quality Assurance:</strong> Thorough testing to make sure your experience is flawless.</p>
                  </div>
                </div>

                {/* Reopen Timeline */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-purple-800 mb-4">⏰ Grand Reopening</h3>
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {timeUntilReopen === 'very soon' ? 'Very Soon!' : `In ${timeUntilReopen}`}
                  </div>
                  <p className="text-purple-700">
                    We'll email you the moment The Pep Planner is ready for its official launch!
                  </p>
                </div>

                {/* Contact */}
                <div className="text-center pt-4">
                  <p className="text-gray-600 mb-4">
                    Have questions or want to stay updated?
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <a 
                      href="mailto:support@thepepplanner.com" 
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      📧 Contact Support
                    </a>
                    <a 
                      href="https://thepepplanner.com" 
                      className="px-6 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      🌐 Visit Website
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Survey Form - Not Yet Completed */
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden">
            {/* Survey Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-3xl font-bold mb-2">One Last Step for Lifetime Access</h2>
              <p className="text-red-100 text-lg">Help us improve and secure your permanent access</p>
            </div>

            {/* Survey Content */}
            <div className="p-8">
              {/* Lifetime Access Promise */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">∞</span>
                  </div>
                  <h3 className="text-xl font-bold text-green-800 mb-2">🎯 Lifetime Access Guaranteed!</h3>
                  <p className="text-green-700">Complete this 5-minute survey to activate your permanent access when we relaunch.</p>
                </div>
              </div>

              {/* Survey Preview - Links to Google Form */}
              <div className="space-y-6">
                {/* Important Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 text-xl">📝</span>
                    <h3 className="text-lg font-semibold text-blue-800">Beta Feedback Survey</h3>
                  </div>
                  <p className="text-blue-700 text-sm">
                    Click the button below to open your comprehensive 49-question beta feedback survey. 
                    Once completed, your lifetime access will be automatically activated when we relaunch!
                  </p>
                </div>

                {/* Survey Preview */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📋 What the Survey Covers</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">🎯 User Experience</h4>
                      <ul className="space-y-1 text-xs">
                        <li>• First impressions & onboarding</li>
                        <li>• Navigation & dashboard feedback</li>
                        <li>• Design & user interface thoughts</li>
                        <li>• Performance & technical issues</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">🔧 Feature Feedback</h4>
                      <ul className="space-y-1 text-xs">
                        <li>• Protocol management experience</li>
                        <li>• Vendor & order tracking</li>
                        <li>• Calendar & scheduling features</li>
                        <li>• Stockpile & recon calculator</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">💡 Strategic Insights</h4>
                      <ul className="space-y-1 text-xs">
                        <li>• Most valuable features</li>
                        <li>• Biggest pain points</li>
                        <li>• Feature wishlist</li>
                        <li>• Recommendation likelihood</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-2">💰 Pricing Feedback</h4>
                      <ul className="space-y-1 text-xs">
                        <li>• Payment preferences</li>
                        <li>• Price point expectations</li>
                        <li>• Subscription vs lifetime</li>
                        <li>• Trial structure preferences</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      ⏱️ Estimated time: 10-15 minutes • 49 comprehensive questions
                    </p>
                  </div>
                </div>

                {/* Submit Button - Link to Google Form */}
                <div className="text-center">
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSfpJ4cqo0ND5Yz_KOZqpRL2xXVGtNCWA91XNtEIkYsVOg5sBg/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity animate-pulse"
                  >
                    🚀 Complete Survey & Activate Lifetime Access
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <p className="text-sm text-gray-500 mt-2">
                    Opens in a new tab • Your feedback helps us build the best peptide planning app possible
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    After completing the survey, your lifetime access will be activated automatically
                  </p>
                  
                  {/* Already Completed Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Already completed the survey?</p>
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(
                          'Have you completed the Google Form survey? This will activate your lifetime access.'
                        );
                        if (confirmed) {
                          markBetaFeedbackCompleted(user);
                          window.location.reload();
                        }
                      }}
                      className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                    >
                      ✅ I Completed the Survey - Activate Lifetime Access
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2025 The Pep Planner. Thank you for being part of our beta testing journey.
          </p>
        </div>
      </div>
    </div>
  );
}
