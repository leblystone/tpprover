import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Microscope, CheckCircle, AlertCircle } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAppContext } from '../../context/AppContext';

export default function SupportModal({ open, onClose, theme }) {
    const { user } = useAppContext();
    const [formData, setFormData] = useState({
        email: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    // Auto-fill email from logged in user
    useEffect(() => {
        if (user?.email && !formData.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user, open]);

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
            // Call Firebase Function to send contact form email
            const functions = getFunctions();
            const submitContactForm = httpsCallable(functions, 'submitContactForm');
            
            const payload = {
                name: user?.displayName || user?.email?.split('@')[0] || 'App User',
                email: formData.email || user?.email,
                subject: 'In-App Support',
                message: formData.message
            };
            
            console.log('📤 Sending support request:', payload);
            
            const result = await submitContactForm(payload);
            
            console.log('📥 Support response:', result);
            
            if (result.data.success) {
                setSubmitStatus('success');
                setFormData({ email: '', message: '' });
                
                // Auto-close after 2 seconds
                setTimeout(() => {
                    setSubmitStatus(null);
                    onClose();
                }, 2000);
            } else {
                console.error('Support submission failed:', result.data);
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Error submitting support form:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details
            });
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDirectEmail = () => {
        const subject = encodeURIComponent('In-App Support');
        const body = encodeURIComponent(formData.message || 'Hello,\n\nI need assistance with The Pep Planner.\n\nBest regards,');
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
            <div className="relative rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
                style={{ backgroundColor: theme.cardBackground }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full" style={{ backgroundColor: theme.background }}>
                            <Microscope className="w-5 h-5" style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: theme.primaryDark }}>Support</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ backgroundColor: theme.background }}
                    >
                        <X className="w-5 h-5" style={{ color: theme.textLight }} />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {submitStatus === 'success' ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                style={{ backgroundColor: theme.success + '20' }}>
                                <CheckCircle className="w-8 h-8" style={{ color: theme.success }} />
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>
                                Message Sent!
                            </h3>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                We'll get back to you as soon as possible.
                            </p>
                        </div>
                    ) : submitStatus === 'error' ? (
                        <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                                style={{ backgroundColor: theme.error + '20' }}>
                                <AlertCircle className="w-8 h-8" style={{ color: theme.error }} />
                            </div>
                            <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text }}>
                                Something went wrong
                            </h3>
                            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                                Please try again or email us directly.
                            </p>
                            <button
                                onClick={() => setSubmitStatus(null)}
                                className="px-4 py-2 rounded-lg font-medium transition-colors"
                                style={{
                                    backgroundColor: theme.primary,
                                    color: theme.textOnPrimary
                                }}
                            >
                                Try Again
                            </button>
                        </div>
                    ) : (
                        <div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                                        style={{
                                            borderColor: theme.border,
                                            backgroundColor: theme.white,
                                            color: theme.text
                                        }}
                                        placeholder="your@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                        Message *
                                    </label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleInputChange}
                                        required
                                        rows={5}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
                                        style={{
                                            borderColor: theme.border,
                                            backgroundColor: theme.white,
                                            color: theme.text
                                        }}
                                        placeholder="Describe your question or issue..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                                        color: '#ffffff'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSubmitting) {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSubmitting) {
                                            e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                                        }
                                    }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className="border-t pt-4 mt-6" style={{ borderColor: theme.border }}>
                                <p className="text-sm text-center mb-3" style={{ color: theme.textLight }}>
                                    Or contact us directly:
                                </p>
                                <button
                                    onClick={handleDirectEmail}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors"
                                    style={{ 
                                        color: theme.primary,
                                        borderColor: theme.primary
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = theme.background;
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

