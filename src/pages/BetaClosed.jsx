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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
      <div className="max-w-4xl w-full mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" 
               style={{ backgroundColor: theme.primary }}>
            <span className="font-bold text-4xl" style={{ color: theme.textOnPrimary }}>🧪</span>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: theme.text }}>
            Beta Testing Complete
          </h1>
          <p className="text-xl" style={{ color: theme.textLight }}>
            Thank you for being part of The Pep Planner's journey
          </p>
        </div>

        {hasCompletedSurvey ? (
          /* Thanks Message - Survey Already Completed */
          <div className="rounded-lg border p-6 content-card shadow-sm" 
               style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            {/* Success Header */}
            <div className="p-8 text-center rounded-lg mb-6" 
                 style={{ backgroundColor: theme.successBg, color: theme.text }}>
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: theme.text }}>Thank You for Your Feedback!</h2>
              <p className="text-lg" style={{ color: theme.textLight }}>Your input is helping shape the future of The Pep Planner</p>
            </div>

            {/* Content */}
            <div className="space-y-6 text-center">
              {/* Lifetime Access Confirmation */}
              <div className="rounded-lg p-6 border" 
                   style={{ backgroundColor: theme.successBg, borderColor: theme.success }}>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: theme.success }}>
                      <span className="font-bold text-xl" style={{ color: theme.textOnPrimary }}>✓</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: theme.text }}>Lifetime Access Secured!</h3>
                      <p className="text-sm" style={{ color: theme.textLight }}>Your beta testing contribution is forever appreciated</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-2" style={{ color: theme.text }}>
                    <p>✅ <strong>Permanent access</strong> to all features when we relaunch</p>
                    <p>✅ <strong>Priority support</strong> and direct feedback channel</p>
                    <p>✅ <strong>No fees ever</strong> - completely free for life</p>
                    <p>✅ <strong>Early access</strong> to new features and updates</p>
                  </div>
                </div>

                {/* What's Next */}
                <div className="rounded-lg p-6 border" 
                     style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: theme.text }}>🚀 What's Happening Now</h3>
                  <div className="space-y-3" style={{ color: theme.text }}>
                    <p><strong>📝 Implementing Your Suggestions:</strong> Our team is hard at work incorporating your valuable feedback into the app.</p>
                    <p><strong>🔧 Final Polish:</strong> We're adding the finishing touches and ensuring everything works perfectly for launch.</p>
                    <p><strong>🎯 Quality Assurance:</strong> Thorough testing to make sure your experience is flawless.</p>
                  </div>
                </div>

                {/* Reopen Timeline */}
                <div className="rounded-lg p-6 border" 
                     style={{ backgroundColor: theme.accent, borderColor: theme.primary }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: theme.text }}>⏰ Grand Reopening</h3>
                  <div className="text-2xl font-bold mb-2" style={{ color: theme.primary }}>
                    {timeUntilReopen === 'very soon' ? 'Very Soon!' : `In ${timeUntilReopen}`}
                  </div>
                  <p style={{ color: theme.textLight }}>
                    We'll email you the moment The Pep Planner is ready for its official launch!
                  </p>
                </div>

                {/* Contact */}
                <div className="text-center pt-4">
                  <p className="mb-4" style={{ color: theme.textLight }}>
                    Have questions or want to stay updated?
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <a 
                      href="mailto:support@thepepplanner.com" 
                      className="px-6 py-2 rounded-lg transition-colors"
                      style={{ 
                        backgroundColor: theme.primary, 
                        color: theme.textOnPrimary 
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = theme.primaryDark}
                      onMouseOut={(e) => e.target.style.backgroundColor = theme.primary}
                    >
                      📧 Contact Support
                    </a>
                    <a 
                      href="https://thepepplanner.com" 
                      className="px-6 py-2 border rounded-lg transition-colors"
                      style={{ 
                        borderColor: theme.primary, 
                        color: theme.primary,
                        backgroundColor: 'transparent'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = theme.accent
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'transparent'
                      }}
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
          <div className="rounded-lg border p-6 content-card shadow-sm" 
               style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            {/* Survey Header */}
            <div className="p-8 text-center rounded-lg mb-6" 
                 style={{ backgroundColor: theme.warningBg, color: theme.text }}>
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: theme.text }}>One Last Step for Lifetime Access</h2>
              <p className="text-lg" style={{ color: theme.textLight }}>Help us improve and secure your permanent access</p>
            </div>

            {/* Survey Content */}
            <div className="space-y-6">
              {/* Lifetime Access Promise */}
              <div className="rounded-lg p-6 border mb-8" 
                   style={{ backgroundColor: theme.successBg, borderColor: theme.success }}>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                       style={{ backgroundColor: theme.success }}>
                    <span className="font-bold text-2xl" style={{ color: theme.textOnPrimary }}>∞</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>🎯 Lifetime Access Guaranteed!</h3>
                  <p style={{ color: theme.textLight }}>Complete this 5-minute survey to activate your permanent access when we relaunch.</p>
                </div>
              </div>

              {/* Survey Preview - Links to Google Form */}
              <div className="space-y-6">
                {/* Important Note */}
                <div className="rounded-lg p-4 border mb-6" 
                     style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📝</span>
                    <h3 className="text-lg font-semibold" style={{ color: theme.text }}>Beta Feedback Survey</h3>
                  </div>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    Click the button below to open your comprehensive 49-question beta feedback survey. 
                    Once completed, your lifetime access will be automatically activated when we relaunch!
                  </p>
                </div>

                {/* Survey Preview */}
                <div className="rounded-lg p-6 border" 
                     style={{ backgroundColor: theme.accent, borderColor: theme.border }}>
                  <h3 className="text-xl font-bold mb-4" style={{ color: theme.text }}>📋 What the Survey Covers</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm" style={{ color: theme.text }}>
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: theme.primary }}>🎯 User Experience</h4>
                      <ul className="space-y-1 text-xs" style={{ color: theme.textLight }}>
                        <li>• First impressions & onboarding</li>
                        <li>• Navigation & dashboard feedback</li>
                        <li>• Design & user interface thoughts</li>
                        <li>• Performance & technical issues</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: theme.primary }}>🔧 Feature Feedback</h4>
                      <ul className="space-y-1 text-xs" style={{ color: theme.textLight }}>
                        <li>• Protocol management experience</li>
                        <li>• Vendor & order tracking</li>
                        <li>• Calendar & scheduling features</li>
                        <li>• Stockpile & recon calculator</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: theme.primary }}>💡 Strategic Insights</h4>
                      <ul className="space-y-1 text-xs" style={{ color: theme.textLight }}>
                        <li>• Most valuable features</li>
                        <li>• Biggest pain points</li>
                        <li>• Feature wishlist</li>
                        <li>• Recommendation likelihood</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2" style={{ color: theme.primary }}>💰 Pricing Feedback</h4>
                      <ul className="space-y-1 text-xs" style={{ color: theme.textLight }}>
                        <li>• Payment preferences</li>
                        <li>• Price point expectations</li>
                        <li>• Subscription vs lifetime</li>
                        <li>• Trial structure preferences</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.infoBg }}>
                    <p className="text-sm font-medium" style={{ color: theme.text }}>
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
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 animate-pulse"
                    style={{ 
                      backgroundColor: theme.primary, 
                      color: theme.textOnPrimary 
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = theme.primaryDark
                      e.target.style.transform = 'translateY(-1px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = theme.primary
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🚀 Complete Survey & Activate Lifetime Access
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <p className="text-sm mt-2" style={{ color: theme.textLight }}>
                    Opens in a new tab • Your feedback helps us build the best peptide planning app possible
                  </p>
                  <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                    After completing the survey, your lifetime access will be activated automatically
                  </p>
                  
                  {/* Already Completed Button */}
                  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
                    <p className="text-sm mb-2" style={{ color: theme.textLight }}>Already completed the survey?</p>
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
                      className="px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      style={{ 
                        backgroundColor: theme.successBg, 
                        color: theme.text,
                        border: `1px solid ${theme.success}`
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = theme.success
                        e.target.style.color = theme.textOnPrimary
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = theme.successBg
                        e.target.style.color = theme.text
                      }}
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
          <p className="text-sm" style={{ color: theme.textLight }}>
            © 2025 The Pep Planner. Thank you for being part of our beta testing journey.
          </p>
        </div>
      </div>
    </div>
  );
}
