import React, { useState } from 'react';
import Modal from './Modal';

export default function FeedbackModal({ open, onClose, theme }) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setIsSubmitting(true);

        try {
            // Create mailto link with FEEDBACK/BUG subject
            const subject = encodeURIComponent('FEEDBACK/BUG');
            const body = encodeURIComponent(message);
            const mailtoLink = `mailto:contact@thepepplanner.com?subject=${subject}&body=${body}`;
            
            // Open email client
            window.location.href = mailtoLink;
            
            // Show success message
            setIsSubmitting(false);
            setIsSubmitted(true);
            setMessage('');
            
            setTimeout(() => {
                onClose();
                setIsSubmitted(false);
            }, 3000);
        } catch (error) {
            setIsSubmitting(false);
            alert('Error opening email client. Please manually email contact@thepepplanner.com');
        }
    };
    
    // Using mailto: link instead of Netlify forms for direct email

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
                    <p className="mt-2 text-sm" style={{ color: theme.text }}>Your email client should have opened with your feedback. Please send the email to complete the submission.</p>
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
                            {isSubmitting ? 'Sending...' : 'Send Feedback'}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
