import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Send, Microscope, CheckCircle, AlertCircle, Bug, Lightbulb, ArrowLeft, Clock, MessageSquare } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { submitFeedback, createSupportTicket, getUserTickets } from '../../services/firebase';

export default function SupportModal({ open, onClose, theme, showBackButton = false, onBack }) {
    const { user } = useAppContext();
    const [formData, setFormData] = useState({
        email: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [feedbackType, setFeedbackType] = useState(null); // 'bug' or 'suggestion'
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [userTickets, setUserTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(false);
    const [showPreviousTickets, setShowPreviousTickets] = useState(false);
    
    // Track modal state to persist across app lifecycle changes
    const [internalOpen, setInternalOpen] = useState(open);
    const wasOpenBeforeBackground = useRef(false);
    const visibilityChangeTimeoutRef = useRef(null);

    // Monitor document visibility to prevent modal from closing when app is minimized
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // App is going to background - remember if modal was open
                if (internalOpen) {
                    wasOpenBeforeBackground.current = true;
                }
            } else {
                // App is coming back to foreground
                if (visibilityChangeTimeoutRef.current) {
                    clearTimeout(visibilityChangeTimeoutRef.current);
                }
                
                visibilityChangeTimeoutRef.current = setTimeout(() => {
                    // If modal was open before going to background, keep it open
                    if (wasOpenBeforeBackground.current && !open) {
                        console.log('🔄 Restoring SupportModal state after app returned to foreground');
                        setInternalOpen(true);
                        wasOpenBeforeBackground.current = false;
                    }
                }, 200);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (visibilityChangeTimeoutRef.current) {
                clearTimeout(visibilityChangeTimeoutRef.current);
            }
        };
    }, [open, internalOpen]);

    // Sync internal state with prop
    useEffect(() => {
        if (open) {
            setInternalOpen(true);
            wasOpenBeforeBackground.current = false;
        } else if (!wasOpenBeforeBackground.current) {
            setInternalOpen(false);
        }
    }, [open]);

    // Auto-fill email from logged in user
    useEffect(() => {
        if (user?.email && !formData.email) {
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user, open]);

    // Load user's previous tickets when modal opens
    useEffect(() => {
        if (open && user?.email) {
            loadUserTickets();
        }
    }, [open, user?.email]);

    const loadUserTickets = async () => {
        if (!user?.email) return;
        setLoadingTickets(true);
        try {
            const tickets = await getUserTickets(user.email);
            setUserTickets(tickets);
        } catch (error) {
            console.error('❌ Failed to load user tickets:', error);
        } finally {
            setLoadingTickets(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle close with internal state management
    const handleClose = () => {
        setInternalOpen(false);
        wasOpenBeforeBackground.current = false;
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.message.trim()) return;

        setIsSubmitting(true);
        setSubmitStatus(null);
        
        try {
            console.log('📤 Creating support ticket...', {
                userEmail: formData.email || user?.email,
                userId: user?.uid,
                message: formData.message.trim()
            });

            // Create a support ticket instead of sending email
            const ticketId = await createSupportTicket({
                userId: user?.uid || null,
                userEmail: formData.email || user?.email,
                userName: user?.displayName || user?.email?.split('@')[0] || 'App User',
                type: 'support',
                subject: 'Support Request',
                message: formData.message.trim(),
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    userEmail: formData.email || user?.email,
                    userId: user?.uid || null
                }
            });
            
            console.log('✅ Support ticket created:', ticketId);
            setSubmitStatus('success');
            setFormData({ email: '', message: '' });
            
            // Reload user tickets to show the new one
            if (user?.email) {
                await loadUserTickets();
            }
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setSubmitStatus(null);
                handleClose();
            }, 2000);
        } catch (error) {
            console.error('❌ Error creating support ticket:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFeedbackSubmit = async (e) => {
        e.preventDefault();
        if (!feedbackMessage.trim()) return;

        setIsSubmitting(true);
        
        try {
            console.log('📝 Submitting feedback from support modal...', {
                type: feedbackType,
                message: feedbackMessage.trim(),
                userEmail: user?.email || 'anonymous',
                userId: user?.uid || null
            });

            await submitFeedback({
                type: feedbackType,
                message: feedbackMessage.trim(),
                userEmail: user?.email || 'anonymous',
                userId: user?.uid || null,
                userAgent: navigator.userAgent,
                url: window.location.href,
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Feedback submitted successfully');
            
            setSubmitStatus('success');
            setFeedbackMessage('');
            setFeedbackType(null);
            
            // Auto-close after 2 seconds
            setTimeout(() => {
                setSubmitStatus(null);
                handleClose();
            }, 2000);
        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!internalOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 backdrop-blur-md bg-black/30"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col"
                style={{ backgroundColor: theme.cardBackground }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-3">
                        {showBackButton && onBack && (
                            <button
                                onClick={onBack}
                                className="p-2 rounded-full transition-colors hover:opacity-70"
                                style={{ backgroundColor: theme.background }}
                                title="Back to Beta Info"
                            >
                                <ArrowLeft className="w-5 h-5" style={{ color: theme.primary }} />
                            </button>
                        )}
                        <div className="p-2 rounded-full" style={{ backgroundColor: theme.background }}>
                            <Microscope className="w-5 h-5" style={{ color: theme.primary }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: theme.primaryDark }}>Support</h2>
                    </div>
                    <button
                        onClick={handleClose}
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
                                            backgroundColor: theme.isDark ? '#0f172a' : theme.white,
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
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none"
                                        style={{
                                            borderColor: theme.border,
                                            backgroundColor: theme.isDark ? '#0f172a' : theme.white,
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

                            {/* Previous Tickets Section */}
                            {user?.email && userTickets.length > 0 && (
                                <div className="border-t pt-4 mt-6" style={{ borderColor: theme.border }}>
                                    <button
                                        onClick={() => setShowPreviousTickets(!showPreviousTickets)}
                                        className="w-full flex items-center justify-between text-sm font-medium mb-3"
                                        style={{ color: theme.primary }}
                                    >
                                        <span>Your Previous Requests ({userTickets.length})</span>
                                        <span>{showPreviousTickets ? '−' : '+'}</span>
                                    </button>
                                    {showPreviousTickets && (
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {userTickets.map((ticket) => (
                                                <div
                                                    key={ticket.id}
                                                    className="p-3 rounded-lg border text-sm"
                                                    style={{
                                                        borderColor: theme.border,
                                                        backgroundColor: theme.background
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            {ticket.type === 'bug' && <Bug size={14} style={{ color: theme.error }} />}
                                                            {ticket.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                                                            {ticket.type === 'support' && <Mail size={14} style={{ color: theme.info }} />}
                                                            <span className="font-semibold" style={{ color: theme.text }}>
                                                                {ticket.ticketNumber || `#${ticket.id.substring(0, 8)}`}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className="text-xs px-2 py-0.5 rounded-full"
                                                            style={{
                                                                backgroundColor: (ticket.status === 'new' ? theme.warning : ticket.status === 'in-progress' ? theme.info : ticket.status === 'resolved' ? theme.success : theme.textLight) + '20',
                                                                color: ticket.status === 'new' ? theme.warning : ticket.status === 'in-progress' ? theme.info : ticket.status === 'resolved' ? theme.success : theme.textLight
                                                            }}
                                                        >
                                                            {ticket.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs mb-1" style={{ color: theme.textLight }}>
                                                        {ticket.subject}
                                                    </p>
                                                    {ticket.lastMessageAt && (
                                                        <div className="flex items-center gap-1 text-xs" style={{ color: theme.textLight }}>
                                                            <Clock size={10} />
                                                            {ticket.lastMessageAt?.toDate ? new Date(ticket.lastMessageAt.toDate()).toLocaleDateString() : 'Recently'}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="border-t pt-4 mt-6" style={{ borderColor: theme.border }}>
                                <p className="text-sm text-center mb-3" style={{ color: theme.textLight }}>
                                    Report an issue or share an idea:
                                </p>
                                
                                {feedbackType ? (
                                    <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {feedbackType === 'bug' ? (
                                                    <>
                                                        <Bug className="w-5 h-5" style={{ color: theme.error }} />
                                                        <span className="text-sm font-semibold" style={{ color: theme.text }}>
                                                            Report Bug
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lightbulb className="w-5 h-5" style={{ color: theme.warning }} />
                                                        <span className="text-sm font-semibold" style={{ color: theme.text }}>
                                                            Suggest Feature
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFeedbackType(null);
                                                    setFeedbackMessage('');
                                                }}
                                                className="text-xs"
                                                style={{ color: theme.textLight }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        
                                        <textarea
                                            value={feedbackMessage}
                                            onChange={(e) => setFeedbackMessage(e.target.value)}
                                            placeholder={feedbackType === 'bug' ? 'Describe the bug...' : 'Describe your idea...'}
                                            required
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none text-sm"
                                            style={{
                                                borderColor: theme.border,
                                                backgroundColor: theme.isDark ? '#0f172a' : theme.white,
                                                color: theme.text
                                            }}
                                        />
                                        
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !feedbackMessage.trim()}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{
                                                backgroundColor: feedbackType === 'bug' ? theme.error : theme.warning,
                                                color: '#ffffff'
                                            }}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Submit {feedbackType === 'bug' ? 'Bug Report' : 'Suggestion'}
                                                </>
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setFeedbackType('bug')}
                                            className="flex flex-col items-center gap-2 px-4 py-3 border rounded-lg transition-all hover:shadow-md"
                                            style={{ 
                                                borderColor: theme.error,
                                                color: theme.error,
                                                backgroundColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.error + '10';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <Bug className="w-6 h-6" />
                                            <span className="text-sm font-medium">Report Bug</span>
                                        </button>
                                        
                                        <button
                                            onClick={() => setFeedbackType('suggestion')}
                                            className="flex flex-col items-center gap-2 px-4 py-3 border rounded-lg transition-all hover:shadow-md"
                                            style={{ 
                                                borderColor: theme.warning,
                                                color: theme.warning,
                                                backgroundColor: 'transparent'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = theme.warning + '10';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <Lightbulb className="w-6 h-6" />
                                            <span className="text-sm font-medium">Suggest Feature</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

