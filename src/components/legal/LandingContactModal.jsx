import React, { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';
import { submitContactForm } from '../../services/firebase';
import { executeRecaptcha } from '../../utils/recaptcha';

export default function LandingContactModal({ open, onClose, source = 'landing' }) {
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
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);
        
        try {
            // Get reCAPTCHA token
            let recaptchaToken = null;
            try {
                recaptchaToken = await executeRecaptcha('contact');
            } catch (recaptchaError) {
                console.warn('⚠️ reCAPTCHA execution failed:', recaptchaError);
                // Continue without reCAPTCHA (graceful degradation)
            }
            
            // Submit general contact form (not a support ticket)
            const result = await submitContactForm({
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message.trim(),
                source: source, // Use the source prop (landing, login, signup, etc.)
                recaptchaToken
            });
            
            setSubmitStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setSubmitStatus(null);
                onClose();
            }, 2000);
        } catch (error) {
            console.error('❌ Error submitting contact form:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
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

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#DDE6DE' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full" style={{ backgroundColor: '#F5F5F0' }}>
                            <Mail className="w-5 h-5" style={{ color: '#7F9E95' }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: '#2F3B3A' }}>Contact Us</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ backgroundColor: '#F5F5F0' }}
                    >
                        <X className="w-5 h-5" style={{ color: '#6B7D7A' }} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {submitStatus === 'success' ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#F5F5F0' }}>
                                <Send className="w-8 h-8" style={{ color: '#7F9E95' }} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F3B3A' }}>Message Sent!</h3>
                            <p style={{ color: '#6B7D7A' }}>Thank you for contacting us. We'll get back to you soon.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2" style={{ color: '#2F3B3A' }}>Get in Touch</h3>
                                <p className="text-sm" style={{ color: '#6B7D7A' }}>
                                    Have a question or need support? Send us a message and we'll respond as soon as possible.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ 
                                            borderColor: '#DDE6DE',
                                            backgroundColor: '#FFFFFF',
                                            color: '#2F3B3A'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #7F9E95'}
                                        onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                                        placeholder="Your name"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ 
                                            borderColor: '#DDE6DE',
                                            backgroundColor: '#FFFFFF',
                                            color: '#2F3B3A'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #7F9E95'}
                                        onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                                        placeholder="your.email@example.com"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="subject" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                                        style={{ 
                                            borderColor: '#DDE6DE',
                                            backgroundColor: '#FFFFFF',
                                            color: '#2F3B3A'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #7F9E95'}
                                        onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                                        placeholder="What can we help you with?"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium mb-1" style={{ color: '#2F3B3A' }}>
                                        Message *
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        rows={4}
                                        className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                                        style={{ 
                                            borderColor: '#DDE6DE',
                                            backgroundColor: '#FFFFFF',
                                            color: '#2F3B3A'
                                        }}
                                        onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px #7F9E95'}
                                        onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
                                        placeholder="Tell us more about your question or concern..."
                                    />
                                </div>

                                {submitStatus === 'error' && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-700">
                                            There was an error sending your message. Please try again or contact us directly.
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                        style={{ 
                                            backgroundColor: '#7F9E95',
                                            color: '#FFFFFF'
                                        }}
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
                                    onClick={handleDirectEmail}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-md transition-colors"
                                    style={{ 
                                        color: '#7F9E95',
                                        borderColor: '#7F9E95'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#F5F5F0';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <Mail className="w-4 h-4" />
                                    contact@thepepplanner.com
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
