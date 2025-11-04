import React, { useState } from 'react';
import { MessageCircle, Send, Heart, Lightbulb, Bug, Star, CheckCircle } from 'lucide-react';

const FeedbackWidget = ({ widget, theme }) => {
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'suggestion', label: 'Suggest', icon: Lightbulb, color: theme.primary },
    { id: 'bug', label: 'Bug Report', icon: Bug, color: theme.error },
    { id: 'improvement', label: 'Improve', icon: Star, color: theme.warning },
    { id: 'general', label: 'General', icon: MessageCircle, color: theme.info }
  ];

  const selectedType = feedbackTypes.find(type => type.id === feedbackType);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Save feedback
    const feedback = {
      id: Date.now(),
      type: feedbackType,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      status: 'submitted'
    };
    
    const existingFeedback = JSON.parse(localStorage.getItem('tpp_user_feedback') || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem('tpp_user_feedback', JSON.stringify(existingFeedback));
    
    setSubmitted(true);
    setMessage('');
    
    // Reset after 3 seconds
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (submitted) {
    return (
      <div className="h-full flex flex-col">
        <div className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
              Feedback & Suggestions
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
            Feedback & Suggestions
          </h3>
          <MessageCircle size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex-1 p-2 flex flex-col space-y-2 min-h-0">
        {/* Feedback Type Selection - Compact */}
        <div className="grid grid-cols-2 gap-1">
          {feedbackTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setFeedbackType(type.id)}
              className={`p-1.5 text-xs rounded-lg action-button-hover ${
                feedbackType === type.id ? 'border-2' : ''
              }`}
              style={{
                border: feedbackType === type.id ? `2px solid ${type.color}` : (theme.isDark ? 'none' : `1px solid ${theme.border}`),
                backgroundColor: feedbackType === type.id ? type.color + '10' : (theme.isDark ? '#1f2937' : 'transparent'),
                color: feedbackType === type.id ? type.color : theme.text
              }}
            >
              <type.icon size={10} className="icon-hover" />
              <span className="truncate text-xs text-hover">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Message Input */}
        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Share your ${selectedType?.label.toLowerCase() || 'feedback'}...`}
            className="w-full p-2 text-sm rounded-lg resize-none flex-1"
            style={{ 
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || theme.cardBackground),
              color: theme.text,
              minHeight: '70px'
            }}
            maxLength={300}
          />
        </div>

        {/* Submit Button */}
        <div className="flex-shrink-0">
          <button
            type="submit"
            disabled={!message.trim()}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium action-button-hover flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: selectedType?.color || theme.primary, 
              color: theme.textOnPrimary 
            }}
          >
            <Send size={12} className="icon-hover" />
            <span className="text-hover">Send {selectedType?.label || 'Feedback'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedbackWidget;