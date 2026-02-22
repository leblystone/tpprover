import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { submitContactForm } from '../../services/firebase';
import { executeRecaptcha } from '../../utils/recaptcha';

/**
 * Shared contact form content. Used by LandingContactModal and the public Contact page.
 * @param {string} source - Source label for submission (e.g. 'landing', 'contact_page')
 * @param {function} [onSuccess] - Optional callback after successful submit (e.g. modal closes)
 */
export default function ContactFormContent({ source = 'landing', onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);
        try {
            let recaptchaToken = null;
            try {
                recaptchaToken = await executeRecaptcha('contact');
            } catch (recaptchaError) {
                console.warn('⚠️ reCAPTCHA execution failed:', recaptchaError);
            }
            await submitContactForm({
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message.trim(),
                source,
                recaptchaToken
            });
            setSubmitStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            if (typeof onSuccess === 'function') {
                setTimeout(onSuccess, 2000);
            }
        } catch (error) {
            console.error('❌ Error submitting contact form:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDirectEmail = () => {
        const subject = encodeURIComponent('Contact from The Pep Planner Website');
        const body = encodeURIComponent('Hello,\n\nI would like to get in touch regarding The Pep Planner.\n\nBest regards,');
        window.open(`mailto:contact@thepepplanner.com?subject=${subject}&body=${body}`);
    };

    const inputStyle = {
        borderColor: '#DDE6DE',
        backgroundColor: '#FFFFFF',
        color: '#2F3B3A'
    };
    const focusRing = (e) => { e.currentTarget.style.boxShadow = '0 0 0 2px #7F9E95'; };
    const blurRing = (e) => { e.currentTarget.style.boxShadow = 'none'; };

    if (submitStatus === 'success') {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F5F5F0' }}>
                    <Send className="w-8 h-8" style={{ color: '#7F9E95' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F3B3A' }}>Message Sent!</h3>
                <p style={{ color: '#6B7D7A' }}>Thank you for contacting us. We'll get back to you soon.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F3B3A' }}>Get in Touch</h3>
                <p className="text-sm" style={{ color: '#6B7D7A' }}>
                    Have a question or need support? Send us a message and we'll respond as soon as possible.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>Name *</label>
                    <input
                        type="text"
                        id="contact-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                        style={inputStyle}
                        onFocus={focusRing}
                        onBlur={blurRing}
                        placeholder="Your name"
                    />
                </div>
                <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>Email *</label>
                    <input
                        type="email"
                        id="contact-email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                        style={inputStyle}
                        onFocus={focusRing}
                        onBlur={blurRing}
                        placeholder="your.email@example.com"
                    />
                </div>
                <div>
                    <label htmlFor="contact-subject" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>Subject *</label>
                    <input
                        type="text"
                        id="contact-subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                        style={inputStyle}
                        onFocus={focusRing}
                        onBlur={blurRing}
                        placeholder="What can we help you with?"
                    />
                </div>
                <div>
                    <label htmlFor="contact-message" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>Message *</label>
                    <textarea
                        id="contact-message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                        style={inputStyle}
                        onFocus={focusRing}
                        onBlur={blurRing}
                        placeholder="Tell us more about your question or concern..."
                    />
                </div>

                {submitStatus === 'error' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">There was an error sending your message. Please try again or contact us directly.</p>
                    </div>
                )}

                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6b8b78'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7F9E95'}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                Send Message
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="border-t pt-4" style={{ borderColor: '#DDE6DE' }}>
                <p className="text-sm text-center mb-3" style={{ color: '#6B7D7A' }}>Or contact us directly:</p>
                <button
                    type="button"
                    onClick={handleDirectEmail}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md transition-colors"
                    style={{ color: '#7F9E95', borderColor: '#7F9E95' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F5F5F0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    <Mail className="w-4 h-4" />
                    contact@thepepplanner.com
                </button>
            </div>
        </div>
    );
}
