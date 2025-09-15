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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeUntilReopen, setTimeUntilReopen] = useState('');
  const [formData, setFormData] = useState({
    overallExperience: '',
    mostUsefulFeature: '',
    leastUsefulFeature: '',
    suggestedImprovements: '',
    recommendToOthers: '',
    additionalComments: '',
    email: user?.email || ''
  });

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit to Google Form (replace with your actual form URL and field IDs)
      await submitToGoogleForm(formData);
      
      // Mark feedback as completed
      const success = markBetaFeedbackCompleted(user);
      
      if (success) {
        // Refresh to show thanks message
        window.location.reload();
      }
    } catch (error) {
      console.error('Survey submission failed:', error);
      alert('Survey submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit to Google Form
  const submitToGoogleForm = async (data) => {
    // Replace with your actual Google Form URL and field IDs
    const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';
    
    const formDataToSubmit = new FormData();
    // Map your form fields to Google Form field IDs
    formDataToSubmit.append('entry.123456789', data.overallExperience);
    formDataToSubmit.append('entry.987654321', data.mostUsefulFeature);
    formDataToSubmit.append('entry.456789123', data.leastUsefulFeature);
    formDataToSubmit.append('entry.789123456', data.suggestedImprovements);
    formDataToSubmit.append('entry.321654987', data.recommendToOthers);
    formDataToSubmit.append('entry.654987321', data.additionalComments);
    formDataToSubmit.append('entry.147258369', data.email);

    await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formDataToSubmit
    });
  };

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

              {/* Survey Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Overall Experience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you rate your overall experience with The Pep Planner? *
                  </label>
                  <select
                    required
                    value={formData.overallExperience}
                    onChange={(e) => handleInputChange('overallExperience', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select rating...</option>
                    <option value="excellent">Excellent - Exceeded expectations</option>
                    <option value="good">Good - Met expectations</option>
                    <option value="average">Average - Some room for improvement</option>
                    <option value="poor">Poor - Needs significant improvement</option>
                  </select>
                </div>

                {/* Most Useful Feature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What was the most useful feature for you? *
                  </label>
                  <select
                    required
                    value={formData.mostUsefulFeature}
                    onChange={(e) => handleInputChange('mostUsefulFeature', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select feature...</option>
                    <option value="protocol-builder">Protocol Builder</option>
                    <option value="recon-calculator">Recon Calculator</option>
                    <option value="order-tracking">Order Tracking</option>
                    <option value="calendar-planning">Calendar Planning</option>
                    <option value="vendor-management">Vendor Management</option>
                    <option value="stockpile-tracking">Stockpile Tracking</option>
                    <option value="other">Other (please specify in comments)</option>
                  </select>
                </div>

                {/* Improvements */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What improvements would you most like to see? *
                  </label>
                  <textarea
                    required
                    value={formData.suggestedImprovements}
                    onChange={(e) => handleInputChange('suggestedImprovements', e.target.value)}
                    placeholder="Tell us what features, improvements, or changes would make The Pep Planner even better for you..."
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Recommendation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How likely are you to recommend The Pep Planner to other peptide users? *
                  </label>
                  <select
                    required
                    value={formData.recommendToOthers}
                    onChange={(e) => handleInputChange('recommendToOthers', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select likelihood...</option>
                    <option value="very-likely">Very likely - I'd actively recommend it</option>
                    <option value="likely">Likely - I'd recommend if asked</option>
                    <option value="neutral">Neutral - Might recommend with improvements</option>
                    <option value="unlikely">Unlikely - Needs significant improvements</option>
                    <option value="very-unlikely">Very unlikely - Would not recommend</option>
                  </select>
                </div>

                {/* Additional Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Any additional comments or suggestions?
                  </label>
                  <textarea
                    value={formData.additionalComments}
                    onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                    placeholder="Share any other thoughts, ideas, or feedback..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold text-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto animate-pulse"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        🚀 Submit Survey & Activate Lifetime Access
                      </>
                    )}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Your feedback helps us build the best peptide planning app possible
                  </p>
                </div>
              </form>
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
