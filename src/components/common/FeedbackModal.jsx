import React, { useState } from 'react';
import Modal from './Modal';
import { submitFeedback } from '../../services/firebase';
import { useAppContext } from '../../context/AppContext';

export default function FeedbackModal({ open, onClose, theme }) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAppContext();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setIsSubmitting(true);
        setError('');

        try {
            console.log('📝 Submitting feedback...', {
                message: message.trim(),
                userEmail: user?.email || 'anonymous',
                userId: user?.uid || null,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });

            const feedbackId = await submitFeedback({
                message: message.trim(),
                userEmail: user?.email || 'anonymous',
                userId: user?.uid || null,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Feedback submitted successfully with ID:', feedbackId);
            
            // Show success message
            setIsSubmitted(true);
            setMessage('');
            
            setTimeout(() => {
                onClose();
                setIsSubmitted(false);
            }, 3000);
        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Submit Feedback"
            theme={theme}
            maxWidth="max-w-lg"
        >
            {isSubmitted ? (
                <div className="text-center p-8">
                    <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Thank You!</h3>
                    <p className="mt-2 text-sm" style={{ color: theme.text }}>Your feedback has been submitted successfully. We'll review it and get back to you if needed.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="feedback-message" className="block text-sm font-medium" style={{ color: theme.text }}>
                            Your Feedback
                        </label>
                        <p className="text-xs mb-2" style={{ color: theme.textLight }}>
                            Have a suggestion, found a bug, or want to request a feature? Let us know!
                        </p>
                        <textarea
                            id="feedback-message"
                            name="message"
                            rows="6"
                            className="w-full p-2 border rounded-md"
                            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            placeholder="I noticed that..."
                        />
                    </div>
                    {error && (
                        <div className="text-sm p-2 rounded" style={{ color: theme.error, backgroundColor: `${theme.error}10` }}>
                            {error}
                        </div>
                    )}
                    <div className="text-right">
                        <button
                            type="submit"
                            disabled={isSubmitting || !message}
                            className="px-4 py-2 rounded-md font-semibold text-sm transition-opacity"
                            style={{ 
                                backgroundColor: theme.primary, 
                                color: theme.textOnPrimary,
                                opacity: (isSubmitting || !message) ? 0.6 : 1,
                                cursor: (isSubmitting || !message) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
