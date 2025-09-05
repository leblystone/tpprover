import React, { useState } from 'react';
import Modal from './Modal';

export default function FeedbackModal({ open, onClose, theme }) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('form-name', 'feedback');
        formData.append('message', message);

        fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(formData).toString(),
        })
        .then(() => {
            setIsSubmitting(false);
            setIsSubmitted(true);
            setMessage('');
            setTimeout(() => {
                onClose();
                setIsSubmitted(false);
            }, 3000); // Close modal after 3 seconds
        })
        .catch((error) => {
            setIsSubmitting(false);
            // You could add more robust error handling here
            alert('Error submitting feedback. Please try again.');
        });
    };
    
    // This is a hidden form that Netlify's bots will detect on deploy
    const netlifyHiddenForm = (
        <form name="feedback" data-netlify="true" netlify-honeypot="bot-field" hidden>
            <input type="hidden" name="form-name" value="feedback" />
            <input type="text" name="bot-field" />
            <textarea name="message"></textarea>
        </form>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Submit Feedback"
            theme={theme}
            maxWidth="max-w-lg"
        >
            {netlifyHiddenForm}
            {isSubmitted ? (
                <div className="text-center p-8">
                    <h3 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Thank You!</h3>
                    <p className="mt-2 text-sm" style={{ color: theme.text }}>Your feedback has been sent. We appreciate you helping us improve.</p>
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
