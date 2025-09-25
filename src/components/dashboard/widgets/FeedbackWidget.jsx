import React, { useState } from 'react';
import { MessageCircle, Send, Heart, Lightbulb, Bug, Star } from 'lucide-react';

const FeedbackWidget = ({ widget, theme }) => {
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const feedbackTypes = [
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: theme.primary },
    { id: 'bug', label: 'Bug Report', icon: Bug, color: theme.error },
    { id: 'improvement', label: 'Improvement', icon: Star, color: theme.warning },
    { id: 'general', label: 'General', icon: MessageCircle, color: theme.accent }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Here you could integrate with your feedback system
    // For now, we'll simulate submission
    console.log('Feedback submitted:', { type: feedbackType, message });
    
    // Save to localStorage for now (could be sent to a backend)
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
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              Feedback & Suggestions
            </h3>
            <MessageCircle size={20} style={{ color: theme.primary }} />
          </div>
        </div>
        
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="text-center">
            <Heart size={48} className="mx-auto mb-4" style={{ color: theme.success }} />
            <h4 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
              Thank You!
            </h4>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Your feedback has been submitted and helps make The Pep Planner better for everyone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Feedback & Suggestions
          </h3>
          <MessageCircle size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Feedback Type Selection */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>
              What type of feedback?
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFeedbackType(type.id)}
                  className={`p-2 text-xs rounded-lg border transition-colors flex items-center gap-2 ${
                    feedbackType === type.id ? 'border-2' : ''
                  }`}
                  style={{
                    borderColor: feedbackType === type.id ? type.color : theme.border,
                    backgroundColor: feedbackType === type.id ? type.color + '10' : 'transparent',
                    color: feedbackType === type.id ? type.color : theme.text
                  }}
                >
                  <type.icon size={14} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="flex-1 flex flex-col">
            <label className="text-sm font-medium mb-2" style={{ color: theme.text }}>
              Your message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share your thoughts, suggestions, or report issues..."
              className="flex-1 p-3 text-sm border rounded-lg resize-none min-h-[80px]"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.cardBackground 
              }}
              maxLength={500}
            />
            <div className="text-xs mt-1" style={{ color: theme.textLight }}>
              {message.length}/500 characters
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!message.trim()}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: theme.primary, 
              color: theme.textOnPrimary 
            }}
          >
            <Send size={14} />
            Send Feedback
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackWidget;

