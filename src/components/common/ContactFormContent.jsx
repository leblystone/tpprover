import React, { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { PaperPlaneTilt } from '@phosphor-icons/react';
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
    // 'idle' | 'loading' | 'exiting' | 'sent' — mirrors the passwordless send-button phase
    const [sendPhase, setSendPhase] = useState('idle');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSendPhase('loading');
        setSubmitStatus(null);
        const minSpinMs = 1400;
        const start = Date.now();
        let succeeded = false;
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
            succeeded = true;
            setFormData({ name: '', email: '', subject: '', message: '' });
            const elapsed = Date.now() - start;
            if (elapsed < minSpinMs) {
                await new Promise(res => setTimeout(res, minSpinMs - elapsed));
            }
        } catch (error) {
            console.error('❌ Error submitting contact form:', error);
            setSubmitStatus('error');
        }
        setIsSubmitting(false);
        if (succeeded) {
            setSendPhase('exiting');
            await new Promise(res => setTimeout(res, 240));
            setSendPhase('sent');
            setSubmitStatus('success');
            if (typeof onSuccess === 'function') {
                setTimeout(onSuccess, 2000);
            }
        } else {
            setSendPhase('idle');
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
                        disabled={sendPhase === 'loading' || sendPhase === 'exiting'}
                        className="flex-1 py-2 px-4 rounded-md focus:outline-none disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#7F9E95', color: '#FFFFFF', opacity: (sendPhase === 'loading' || sendPhase === 'exiting') ? 0.85 : 1 }}
                        onMouseEnter={(e) => { if (sendPhase === 'idle') e.currentTarget.style.backgroundColor = '#6b8b78'; }}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7F9E95'}
                    >
                        {/* Icon slot — all three always mounted, CSS transitions crossfade */}
                        <span style={{ position: 'relative', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {/* Paper plane */}
                            <PaperPlaneTilt weight="duotone" size={18} style={{
                                position: 'absolute',
                                opacity: sendPhase === 'idle' ? 1 : 0,
                                transform: sendPhase === 'idle' ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-30deg)',
                                transition: 'opacity 200ms ease, transform 200ms ease',
                            }} />
                            {/* Spinner wrapper (outer handles scale, inner spins) */}
                            <span style={{
                                position: 'absolute',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: sendPhase === 'loading' ? 1 : 0,
                                transform: sendPhase === 'loading' ? 'scale(1)' : 'scale(0.3)',
                                transition: 'opacity 220ms ease, transform 220ms ease',
                            }}>
                                <span className="w-[14px] h-[14px] border-2 border-white border-t-transparent rounded-full animate-spin block" />
                            </span>
                            {/* Checkmark */}
                            <CheckCircle size={18} style={{
                                position: 'absolute',
                                opacity: sendPhase === 'sent' ? 1 : 0,
                                transform: sendPhase === 'sent' ? 'scale(1)' : 'scale(0.3)',
                                transition: 'opacity 260ms ease, transform 260ms cubic-bezier(0.34,1.3,0.64,1)',
                            }} />
                        </span>
                        <span style={{ transition: 'opacity 200ms ease', opacity: sendPhase === 'exiting' ? 0 : 1 }}>
                            {sendPhase === 'sent' ? 'Sent!' : sendPhase === 'loading' ? 'Sending…' : 'Send Message'}
                        </span>
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
