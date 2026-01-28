import React, { useState, useEffect } from 'react';
import { markBetaFeedbackCompleted, isBetaPeriodEnded, getBetaStatusForUser } from '../../utils/betaAccess';
import { getTimeUntilBetaEnd, getDaysUntilBetaEnd } from '../../config/betaConfig';
import { useAppContext } from '../../context/AppContext';

/**
 * Beta Ended Survey Component
 * Shows when beta has ended and user needs to complete survey for lifetime access
 */
export default function BetaEndedSurvey({ theme, onComplete }) {
  const { user } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [daysLeft, setDaysLeft] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [formData, setFormData] = useState({
    // Survey questions - customize these to match your Google Form
    overallExperience: '',
    mostUsefulFeature: '',
    leastUsefulFeature: '',
    suggestedImprovements: '',
    recommendToOthers: '',
    additionalComments: '',
    email: user?.email || ''
  });

  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      setTimeLeft(getTimeUntilBetaEnd());
      setDaysLeft(getDaysUntilBetaEnd());
      setIsEnded(isBetaPeriodEnded());
    };

    // Update immediately
    updateTimer();

    // Update every minute
    const interval = setInterval(updateTimer, 60000);

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
      // Submit to Google Form
      await submitToGoogleForm(formData);
      
      // Mark feedback as completed in the app
      const success = markBetaFeedbackCompleted(user);
      
      if (success) {
        // Show success message
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            message: '🎉 Thank you! Lifetime access activated!', 
            type: 'success' 
          }
        }));

        // Callback to parent
        if (onComplete) {
          onComplete();
        }

        // Refresh to show new subscription status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Survey submission failed:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: 'Survey submission failed. Please try again.', 
          type: 'error' 
        }
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit to your Google Form
  const submitToGoogleForm = async (data) => {
    // Replace with your actual Google Form URL and field IDs
    const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse';
    
    const formDataToSubmit = new FormData();
    // Map your form fields to Google Form field IDs
    // You'll need to inspect your Google Form to get these IDs
    formDataToSubmit.append('entry.123456789', data.overallExperience); // Replace with actual field ID
    formDataToSubmit.append('entry.987654321', data.mostUsefulFeature);
    formDataToSubmit.append('entry.456789123', data.leastUsefulFeature);
    formDataToSubmit.append('entry.789123456', data.suggestedImprovements);
    formDataToSubmit.append('entry.321654987', data.recommendToOthers);
    formDataToSubmit.append('entry.654987321', data.additionalComments);
    formDataToSubmit.append('entry.147258369', data.email);

    // Submit to Google Form (no-cors mode to avoid CORS issues)
    await fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formDataToSubmit
    });
  };

  const betaStatus = getBetaStatusForUser(user);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Dynamic Beta Header */}
      <div className={`bg-gradient-to-r rounded-lg p-6 mb-6 border ${
        isEnded ? 'from-red-50 to-orange-50 border-red-200' :
        daysLeft <= 3 ? 'from-yellow-50 to-orange-50 border-yellow-200' :
        'from-blue-50 to-purple-50 border-blue-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isEnded ? 'bg-gradient-to-r from-red-500 to-orange-500' :
            daysLeft <= 3 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
            'bg-gradient-to-r from-blue-500 to-purple-500'
          }`}>
            <span className="text-white font-bold text-lg">
              {isEnded ? '⏰' : daysLeft <= 3 ? '⚠️' : 'β'}
            </span>
          </div>
          <div>
            <div className={`font-bold text-xl ${
              isEnded ? 'text-red-800' :
              daysLeft <= 3 ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              {betaStatus.title}
            </div>
            <div className={`text-sm ${
              isEnded ? 'text-red-600' :
              daysLeft <= 3 ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              Your feedback shapes the future of The Pep Planner
            </div>
          </div>
        </div>
        
        {/* Countdown or Status Message */}
        {!isEnded && daysLeft > 0 && (
          <div className="mb-4 p-3 bg-white/50 rounded-md">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: theme.primary }}>
                {timeLeft}
              </div>
              <div className="text-sm text-gray-600">until beta ends</div>
            </div>
          </div>
        )}
        
        <div className={`space-y-3 ${
          isEnded ? 'text-red-700' :
          daysLeft <= 3 ? 'text-yellow-700' :
          'text-blue-700'
        }`}>
          {isEnded ? (
            <>
              <p>🎯 <strong>Beta has ended, but don't worry!</strong> Your lifetime access is still guaranteed.</p>
              <p>📝 <strong>Complete this survey</strong> to immediately activate your permanent access.</p>
              <p>✨ <strong>What you'll get:</strong> Lifetime access to all features, priority support, and all future updates - completely free!</p>
            </>
          ) : daysLeft <= 3 ? (
            <>
              <p>⚠️ <strong>Beta ending soon!</strong> Complete your survey before {timeLeft} to secure lifetime access.</p>
              <p>🎯 <strong>Your lifetime access is guaranteed</strong> - just finish this quick survey to activate it.</p>
              <p>✨ <strong>What you'll get:</strong> Permanent access to all features, priority support, and all future updates - completely free!</p>
            </>
          ) : (
            <>
              <p>🎉 <strong>Congratulations!</strong> You've been part of our beta testing journey.</p>
              <p>🎯 <strong>Your lifetime access is guaranteed</strong> - complete this survey anytime to activate it.</p>
              <p>✨ <strong>What you'll get:</strong> Permanent access to all features, priority support, and all future updates - completely free!</p>
            </>
          )}
        </div>
      </div>

      {/* Survey Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border p-6" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>
            Help Us Improve The Pep Planner - Quick Feedback Survey
          </h3>

          {/* Overall Experience */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              How would you rate your overall experience with The Pep Planner? *
            </label>
            <select
              required
              value={formData.overallExperience}
              onChange={(e) => handleInputChange('overallExperience', e.target.value)}
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border, backgroundColor: '#ffffff', color: '#1e293b' }}
            >
              <option value="">Select rating...</option>
              <option value="excellent">Excellent - Exceeded expectations</option>
              <option value="good">Good - Met expectations</option>
              <option value="average">Average - Some room for improvement</option>
              <option value="poor">Poor - Needs significant improvement</option>
            </select>
          </div>

          {/* Most Useful Feature */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              What was the most useful feature for you? *
            </label>
            <select
              required
              value={formData.mostUsefulFeature}
              onChange={(e) => handleInputChange('mostUsefulFeature', e.target.value)}
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border, backgroundColor: '#ffffff', color: '#1e293b' }}
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

          {/* Least Useful Feature */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              What feature needs the most improvement?
            </label>
            <select
              value={formData.leastUsefulFeature}
              onChange={(e) => handleInputChange('leastUsefulFeature', e.target.value)}
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border, backgroundColor: '#ffffff', color: '#1e293b' }}
            >
              <option value="">Select feature...</option>
              <option value="protocol-builder">Protocol Builder</option>
              <option value="recon-calculator">Recon Calculator</option>
              <option value="order-tracking">Order Tracking</option>
              <option value="calendar-planning">Calendar Planning</option>
              <option value="vendor-management">Vendor Management</option>
              <option value="stockpile-tracking">Stockpile Tracking</option>
              <option value="ui-design">User Interface/Design</option>
              <option value="performance">App Performance</option>
              <option value="none">Everything works great!</option>
            </select>
          </div>

          {/* Improvements */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              What improvements would you most like to see? *
            </label>
            <textarea
              required
              value={formData.suggestedImprovements}
              onChange={(e) => handleInputChange('suggestedImprovements', e.target.value)}
              placeholder="Tell us what features, improvements, or changes would make The Pep Planner even better for you..."
              rows={4}
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border, backgroundColor: '#ffffff', color: '#1e293b' }}
            />
          </div>

          {/* Recommendation */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              How likely are you to recommend The Pep Planner to other peptide users? *
            </label>
            <select
              required
              value={formData.recommendToOthers}
              onChange={(e) => handleInputChange('recommendToOthers', e.target.value)}
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border, backgroundColor: '#ffffff', color: '#1e293b' }}
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
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Any additional comments or suggestions?
            </label>
            <textarea
              value={formData.additionalComments}
              onChange={(e) => handleInputChange('additionalComments', e.target.value)}
              placeholder="Share any other thoughts, ideas, or feedback..."
              rows={3}
              className="w-full p-3 border rounded-md"
              style={{ borderColor: theme.border, backgroundColor: '#ffffff', color: '#1e293b' }}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3 rounded-md font-semibold text-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 ${
                isEnded ? 'animate-pulse' : ''
              }`}
              style={{ 
                backgroundColor: isEnded ? '#dc2626' : theme.primary, 
                color: theme.textOnPrimary 
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Submitting...
                </>
              ) : isEnded ? (
                <>
                  🚨 Submit Survey & Activate Lifetime Access Now!
                </>
              ) : daysLeft <= 3 ? (
                <>
                  ⚡ Submit Survey & Secure Lifetime Access
                </>
              ) : (
                <>
                  🎉 Submit Survey & Activate Lifetime Access
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
