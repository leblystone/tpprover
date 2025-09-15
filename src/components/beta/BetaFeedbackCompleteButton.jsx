import React from 'react';
import { markBetaFeedbackCompleted } from '../../utils/betaAccess';
import { useAppContext } from '../../context/AppContext';

/**
 * Button component for marking beta feedback as completed
 * This grants the user lifetime access
 */
export default function BetaFeedbackCompleteButton({ theme, onComplete }) {
  const { user } = useAppContext();

  const handleMarkComplete = () => {
    if (!user) {
      alert('Please log in first to complete beta feedback.');
      return;
    }

    const success = markBetaFeedbackCompleted(user);
    
    if (success) {
      // Callback to parent component
      if (onComplete) {
        onComplete();
      }
      
      // Refresh page to show new subscription status
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  return (
    <button
      onClick={handleMarkComplete}
      className="px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
      style={{ 
        backgroundColor: theme.primary, 
        color: theme.textOnPrimary 
      }}
    >
      🎉 I Completed Beta Feedback - Grant Lifetime Access
    </button>
  );
}
