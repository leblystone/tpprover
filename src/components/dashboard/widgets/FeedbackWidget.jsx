import React, { useState } from 'react';
import { MessageCircle, Send, Heart, Lightbulb, Bug, Star, CheckCircle } from 'lucide-react';
import { submitFeedback } from '../../../services/firebase';
import { useAppContext } from '../../../context/AppContext';

const FeedbackWidget = ({ widget, theme }) => {
  const { user } = useAppContext();
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const feedbackTypes = [
    { id: 'suggestion', label: 'Suggest', icon: Lightbulb, color: theme.primary },
    { id: 'bug', label: 'Bug', icon: Bug, color: theme.error },
    { id: 'improvement', label: 'Improve', icon: Star, color: theme.warning },
    { id: 'general', label: 'General', icon: MessageCircle, color: theme.info }
  ];

  const selectedType = feedbackTypes.find(type => type.id === feedbackType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      console.log('📝 Submitting feedback from widget...', {
        type: feedbackType,
        message: message.trim(),
        userEmail: user?.email || 'anonymous',
        userId: user?.uid || null
      });

      // Submit to Firestore
      const feedbackId = await submitFeedback({
        type: feedbackType,
        message: message.trim(),
        userEmail: user?.email || 'anonymous',
        userId: user?.uid || null,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Feedback submitted successfully with ID:', feedbackId);
      
      setSubmitted(true);
      setMessage('');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFeedbackType('suggestion');
      }, 3000);
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      setError('Failed to submit. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col">
        <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Feedback
            </h3>
            <MessageCircle size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <CheckCircle size={40} className="mb-3" style={{ color: theme.success }} />
          <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
            Thank You!
          </h4>
          <p className="text-xs" style={{ color: theme.textLight }}>
            Your feedback helps us improve The Pep Planner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Feedback
          </h3>
          <MessageCircle size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 p-2 flex flex-col min-h-0" style={{ paddingBottom: '8px' }}>
        {/* Feedback Type Selection - Compact */}
        <div className="grid grid-cols-2 gap-1 mb-2 flex-shrink-0">
          {feedbackTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFeedbackType(type.id)}
              className={`p-2 text-xs rounded-lg action-button-hover flex flex-col items-center justify-center gap-1 ${
                feedbackType === type.id ? 'border-2' : ''
              }`}
              style={{
                border: feedbackType === type.id ? `2px solid ${type.color}` : (theme.isDark ? 'none' : `1px solid ${theme.border}`),
                backgroundColor: feedbackType === type.id ? type.color + '10' : (theme.isDark ? '#1f2937' : 'transparent'),
                color: feedbackType === type.id ? type.color : theme.text
              }}
            >
              <type.icon size={16} className="icon-hover" />
              <span className="text-xs text-hover">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div className="flex-1 flex flex-col min-h-0 mb-2" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Thoughts?"
            className="w-full p-2 text-sm rounded-lg resize-none"
            style={{ 
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || theme.cardBackground),
              color: theme.text,
              minHeight: '60px',
              maxHeight: '100px',
              boxSizing: 'border-box'
            }}
            maxLength={300}
            disabled={isSubmitting}
          />
          {error && (
            <p className="text-xs mt-1" style={{ color: theme.error }}>
              {error}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex-shrink-0">
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium action-button-hover flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: selectedType?.color || theme.primary, 
              color: theme.textOnPrimary 
            }}
          >
            <span className="text-hover">{isSubmitting ? 'Sending...' : 'Send'}</span>
            {selectedType?.icon && !isSubmitting && (
              <selectedType.icon size={12} className="icon-hover" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackWidget;